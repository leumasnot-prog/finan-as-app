import { describe, expect, it } from "vitest";
import { cleanName, detectColumns, guessCategory, matchTransactions, merchantKey, parseAmount, parseCSV, parseDate, parseInstallment, prepareImport, readStatement } from "./importer.js";

// Arquivos de exemplo no formato que os bancos costumam exportar. Os bancos não
// documentam o layout; o importador acha as colunas pelo nome, então variações
// de ordem, aspas, separador e cabeçalho extra são cobertas aqui.
const NUBANK_CARTAO = `date,title,amount
2026-12-02,IFD*BURGER KING,45.90
2026-12-03,Uber *Trip,23.10
2026-12-05,Pagamento recebido,-3200.00
2026-12-08,PAG*PadariaSaoJorge,18.50
2026-12-10,Mercadolivre*Fone - Parcela 2/3,300.00`;

const NUBANK_CONTA = `Data,Valor,Identificador,Descrição
01/12/2026,28000.00,a1,Transferência recebida pelo Pix - EMPRESA LTDA
05/12/2026,-2400.00,a2,Transferência enviada pelo Pix - IMOBILIARIA SOL - 12.345.678/0001-90
09/12/2026,-189.90,a3,Compra no débito - DROGASIL 1234 SAO PAULO`;

const INTER_EXTRATO = `Extrato Conta Corrente
Conta ;12345678
Período ;01/12/2026 a 31/12/2026

Data Lançamento;Histórico;Descrição;Valor;Saldo
02/12/2026;Compra no debito;SUPERMERCADO DIA 123;-312,45;9.687,55
04/12/2026;Pix enviado;Fulano de Tal;-1.200,00;8.487,55`;

const C6_FATURA = `Data de Compra;Nome no Cartão;Final do Cartão;Categoria;Descrição;Parcela;Valor (em US$);Cotação (em R$);Valor (em R$)
03/12/2026;FULANO;1234;Restaurante;SumUp *CANTINA DA NONNA;Única;0;0;"128,00"
06/12/2026;FULANO;1234;Departamento;AMAZON MARKETPLACE;1/4;0;0;"250,00"
08/12/2026;FULANO;1234;Assinatura;NETFLIX.COM;Única;0;0;"55,90"`;

const OFX = `OFXHEADER:100
<OFX><CREDITCARDMSGSRSV1><CCSTMTTRNRS><CCSTMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261204000000[-3:BRT]<TRNAMT>-89.90<FITID>x1<MEMO>EC *POSTO IPIRANGA SP</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261210<TRNAMT>500.00<FITID>x2<MEMO>Pagamento de fatura</STMTTRN>
</BANKTRANLIST></CCSTMTRS></CCSTMTTRNRS></CREDITCARDMSGSRSV1></OFX>`;

describe("números e datas", () => {
  it("lê os formatos de valor dos bancos", () => {
    expect([parseAmount("R$ -1.234,56"), parseAmount("1234.56"), parseAmount("1,234.56"), parseAmount("(12,00)"), parseAmount("12,00 D"), parseAmount("−5,00")])
      .toEqual([-1234.56, 1234.56, 1234.56, -12, -12, -5]);
  });
  it("lê os formatos de data", () => {
    expect([parseDate("05/12/2026"), parseDate("05-12-26"), parseDate("2026-12-05"), parseDate("20261205120000"), parseDate("05 dez", 2026), parseDate("31/02/x")])
      .toEqual(["2026-12-05", "2026-12-05", "2026-12-05", "2026-12-05", "2026-12-05", null]);
  });
});

describe("leitura por banco", () => {
  it("Nubank cartão: compras positivas, pagamento vira não-despesa", () => {
    const r = readStatement(NUBANK_CARTAO);
    expect(r.transactions).toHaveLength(5);
    expect(r.transactions[0]).toMatchObject({ raw: "IFD*BURGER KING", amount: 45.9, date: "2026-12-02", source: "card" });
  });
  it("Nubank conta: saídas negativas viram despesa positiva", () => {
    const t = readStatement(NUBANK_CONTA).transactions;
    expect(t.map((x) => x.amount)).toEqual([-28000, 2400, 189.9]);
  });
  it("Inter: pula as linhas antes do cabeçalho, ; e vírgula decimal", () => {
    const r = readStatement(INTER_EXTRATO);
    expect(r.detected.headerRow).toBe(3);
    expect(r.transactions.map((x) => [x.raw, x.amount])).toEqual([["SUPERMERCADO DIA 123", 312.45], ["Fulano de Tal", 1200]]);
  });
  it("C6: usa o valor em R$ e não o em US$, lê parcela e categoria do banco", () => {
    const rows = parseCSV(C6_FATURA);
    const { map } = detectColumns(rows);
    expect(rows[0][map.amount]).toBe("Valor (em R$)");
    const t = readStatement(C6_FATURA).transactions;
    expect(t.map((x) => x.amount)).toEqual([128, 250, 55.9]);
    expect(t[1]).toMatchObject({ installmentText: "1/4", bankCategory: "Departamento" });
  });
  it("OFX de cartão", () => {
    const t = readStatement(OFX).transactions;
    expect(t.map((x) => [x.raw, x.amount, x.date])).toEqual([["EC *POSTO IPIRANGA SP", 89.9, "2026-12-04"], ["Pagamento de fatura", -500, "2026-12-10"]]);
  });
  it("arquivo sem colunas conhecidas pede o mapeamento", () => {
    expect(readStatement("a;b;c\n1;2;3").needsMapping).toBe(true);
    const r = readStatement("a;b;c\n05/12/2026;LOJA X;10,00", { mapping: { headerRow: 0, map: { date: 0, description: 1, amount: 2 } } });
    expect(r.transactions[0]).toMatchObject({ raw: "LOJA X", amount: 10 });
  });
});

describe("nomes", () => {
  it("limpa nome de maquininha e reconhece os conhecidos", () => {
    expect(cleanName("PAG*PadariaSaoJorge")).toBe("Padaria Sao Jorge");
    expect(cleanName("SumUp *CANTINA DA NONNA")).toBe("Cantina da Nonna");
    expect(cleanName("EC *POSTO IPIRANGA SP")).toBe("Posto Ipiranga");
    expect(cleanName("IFD*BURGER KING")).toBe("iFood");
    expect(cleanName("Uber *Trip")).toBe("Uber");
    expect(cleanName("MP *LOJADOJOAO 4002 SAO PAULO BR")).toBe("Lojadojoao");
    expect(cleanName("Transferência enviada pelo Pix - IMOBILIARIA SOL - 12.345.678/0001-90")).toBe("Pix Imobiliaria Sol");
  });
  it("chave do estabelecimento ignora prefixo, número e parcela", () => {
    expect(merchantKey("MP *LOJA 1234 Parcela 2/3")).toBe(merchantKey("LOJA 99"));
  });
  it("parcela no texto", () => {
    expect([parseInstallment("2/10"), parseInstallment("Parcela 3 de 5"), parseInstallment("Única"), parseInstallment("13/12")]).toEqual([{ current: 2, total: 10 }, { current: 3, total: 5 }, null, null]);
  });
  it("categoria pelo nome e pela categoria do banco", () => {
    const cats = [{ id: "alimentacao", name: "Alimentação" }, { id: "transporte", name: "Transporte" }, { id: "pets", name: "Pets" }, { id: "outros", name: "Outros" }];
    expect(guessCategory("IFD*BURGER KING", "", cats)).toBe("alimentacao");
    expect(guessCategory("EC *POSTO IPIRANGA", "", cats)).toBe("transporte");
    expect(guessCategory("PETZ LOJA 12", "pets", cats)).toBe("pets");
    expect(guessCategory("LOJA QUALQUER", "", cats)).toBe("outros");
  });
});

describe("casamento com o que já foi lançado", () => {
  const accounts = [
    { id: "a", name: "Fone novo", amount: 300, dueDay: 10 },
    { id: "b", name: "Mercado", amount: 45.9, dueDay: 20 },
    { id: "c", name: "Burger", amount: 45.9, dueDay: 2 },
  ];
  it("mesmo valor; nome e dia desempatam; cada conta casa uma vez só", () => {
    const r = matchTransactions([
      { id: 1, raw: "IFD*BURGER KING", name: "Burger King", amount: 45.9, date: "2026-12-02" },
      { id: 2, raw: "OUTRA", name: "Outra", amount: 45.9, date: "2026-12-21" },
      { id: 3, raw: "X", name: "X", amount: 45.9, date: "2026-12-21" },
      { id: 4, raw: "Mercadolivre*Fone", name: "Mercado Livre", amount: 300, date: "2026-12-10" },
    ], accounts);
    expect(r.map((x) => x.match?.id ?? null)).toEqual(["c", "b", null, "a"]);
  });
  it("prepareImport: aplica regra aprendida, marca pagamento como ignorado e casa", () => {
    const t = readStatement(NUBANK_CARTAO).transactions;
    const rows = prepareImport(t, {
      categories: [{ id: "alimentacao", name: "Alimentação" }, { id: "lazer", name: "Lazer" }, { id: "outros", name: "Outros" }],
      rules: [{ key: merchantKey("PAG*PadariaSaoJorge"), name: "Padaria São Jorge", category: "alimentacao" }],
      accounts,
    });
    expect(rows.find((r) => r.raw.startsWith("PAG")).name).toBe("Padaria São Jorge");
    expect(rows.find((r) => r.raw === "Pagamento recebido")).toMatchObject({ include: false });
    const fone = rows.find((r) => r.raw.startsWith("Mercadolivre"));
    expect(fone.match?.id).toBe("a");
    expect(fone.installment).toEqual({ current: 2, total: 3 });
  });
});
