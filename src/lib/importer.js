// Importação de extrato e fatura (CSV e OFX) dos bancos.
//
// Os bancos não publicam o formato dos arquivos, e ele muda sem aviso. Por isso
// nada aqui depende de um layout fixo:
//   1. CSV: o separador (; , tab) e o formato do número (1.234,56 ou 1234.56) são
//      detectados; as colunas são achadas pelo NOME, comparado com uma lista de
//      sinônimos (data / descrição / valor / parcela / categoria / tipo).
//   2. OFX: é um padrão de verdade (STMTTRN com DTPOSTED, TRNAMT, MEMO, FITID);
//      quase todo banco brasileiro exporta. Preferir OFX quando houver.
//   3. Se as colunas não forem reconhecidas, a tela pede para a pessoa apontar
//      qual é qual (mapping) — o mesmo parser roda com esse mapa.
//
// Tudo puro e testado em importer.test.js.

// ── leitura de CSV ─────────────────────────────────────────
const strip = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function sniffSeparator(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 15);
  const score = (sep) => {
    const counts = lines.map((l) => splitLine(l, sep).length);
    const common = counts.sort((a, b) => counts.filter((c) => c === b).length - counts.filter((c) => c === a).length)[0];
    return common > 1 ? counts.filter((c) => c === common).length * common : 0;
  };
  return [";", ",", "\t"].reduce((best, s) => (score(s) > score(best) ? s : best), ";");
}

// Uma linha, respeitando aspas ("a;b" fica junto, "" vira ").
function splitLine(line, sep) {
  const out = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === sep) { out.push(cur.trim()); cur = ""; }
    else cur += c;
  }
  out.push(cur.trim());
  return out;
}

export function parseCSV(text) {
  const clean = text.replace(/^﻿/, "");
  const sep = sniffSeparator(clean);
  return clean.split(/\r?\n/).filter((l) => l.trim()).map((l) => splitLine(l, sep));
}

// ── números e datas ────────────────────────────────────────
// "R$ -1.234,56" | "-1234.56" | "1,234.56" | "(12,00)" | "12,00 D" → número
export function parseAmount(raw) {
  if (raw == null) return NaN;
  let s = String(raw).trim();
  if (!s) return NaN;
  const neg = /^\(.*\)$/.test(s) || /^[^\d]*[-−]/.test(s) || /[-−]$|\sD$/i.test(s);
  s = s.replace(/[^\d.,]/g, "");
  if (!s) return NaN;
  const lastComma = s.lastIndexOf(","), lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
  else if (lastDot > lastComma && lastComma >= 0) s = s.replace(/,/g, "");
  else if (lastComma < 0 && (s.match(/\./g) || []).length > 1) s = s.replace(/\./g, "");
  const n = parseFloat(s);
  return Number.isNaN(n) ? NaN : Math.round((neg ? -n : n) * 100) / 100;
}

const MONTHS = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
// → "AAAA-MM-DD" ou null. Aceita 05/12/2026, 05-12-26, 2026-12-05, 20261205 (OFX), "05 dez".
export function parseDate(raw, fallbackYear) {
  const s = String(raw ?? "").trim();
  let m;
  const pad = (n) => String(n).padStart(2, "0");
  const ok = (y, mo, d) => (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 ? `${y}-${pad(mo)}-${pad(d)}` : null);
  if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) return ok(+m[1], +m[2], +m[3]);
  if ((m = /^(\d{4})(\d{2})(\d{2})/.exec(s))) return ok(+m[1], +m[2], +m[3]);
  if ((m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(s))) return ok(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  if ((m = /^(\d{1,2})[/.-](\d{1,2})$/.exec(s)) && fallbackYear) return ok(fallbackYear, +m[2], +m[1]);
  if ((m = /^(\d{1,2})\s*(?:de\s*)?([a-zç]{3})/i.exec(strip(s))) && MONTHS[m[2]] && fallbackYear) return ok(fallbackYear, MONTHS[m[2]], +m[1]);
  return null;
}

// ── colunas ────────────────────────────────────────────────
// Sinônimos vistos nos arquivos dos bancos (Nubank, Inter, C6, Itaú, BB, Bradesco,
// Santander, Caixa, XP, PicPay, Mercado Pago…). Comparados sem acento/maiúscula.
const SYNONYMS = {
  date: ["data de compra", "data da compra", "data lancamento", "data do lancamento", "data de lancamento", "data movimento", "data", "date", "dt"],
  description: ["descricao", "estabelecimento", "lancamento", "historico", "title", "titulo", "detalhes", "memo", "nome", "description", "transacao"],
  amount: ["valor (em r$)", "valor em r$", "valor r$", "valor", "amount", "quantia", "montante", "value"],
  credit: ["credito", "entrada", "creditos"],
  debit: ["debito", "saida", "debitos"],
  installment: ["parcela", "parcelas", "installment"],
  category: ["categoria", "category"],
  kind: ["tipo lancamento", "tipo", "type", "natureza"],
  history: ["historico", "operacao", "tipo de transacao"],
};

// Nome igual vale mais que nome contido; entre iguais, vence o sinônimo que vem
// antes na lista ("Descrição" ganha de "Histórico" quando o arquivo tem os dois).
const matchCol = (header, names) => {
  const h = strip(header);
  const exact = names.indexOf(h);
  if (exact >= 0) return 200 - exact;
  const part = names.findIndex((n) => h.startsWith(n) || h.includes(n));
  return part >= 0 ? 100 - part : 0;
};

// Acha a linha de cabeçalho (bancos às vezes põem título, conta e período antes)
// e devolve { headerRow, map: { date, description, amount, ... } } ou null.
export function detectColumns(rows) {
  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const map = {};
    const used = new Set();
    for (const field of ["date", "amount", "description", "installment", "category", "kind", "credit", "debit", "history"]) {
      let best = -1, bestScore = 0;
      rows[r].forEach((h, i) => {
        if (used.has(i)) return;
        const sc = matchCol(h, SYNONYMS[field]);
        // "valor (em us$)" não é o valor em reais
        if (field === "amount" && /us\$|usd|dolar/.test(strip(h))) return;
        if (sc > bestScore) { best = i; bestScore = sc; }
      });
      if (best >= 0) { map[field] = best; used.add(best); }
    }
    if (map.date != null && map.description != null && (map.amount != null || map.debit != null)) return { headerRow: r, map };
  }
  return null;
}

// ── OFX ────────────────────────────────────────────────────
export const isOFX = (text) => /<OFX>|OFXHEADER/i.test(text);

export function parseOFX(text) {
  const tag = (block, name) => {
    const m = new RegExp(`<${name}>([^<\\r\\n]*)`, "i").exec(block);
    return m ? m[1].trim() : "";
  };
  const isCard = /<CCSTMTRS>/i.test(text);
  return [...text.matchAll(/<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|<\/BANKTRANLIST>)/gi)].map((m, i) => {
    const b = m[1];
    const amount = parseAmount(tag(b, "TRNAMT").replace(",", "."));
    return {
      raw: tag(b, "MEMO") || tag(b, "NAME") || "Sem descrição",
      date: parseDate(tag(b, "DTPOSTED")),
      // OFX: negativo = saiu dinheiro, em extrato e em cartão.
      amount: -amount,
      fitid: tag(b, "FITID") || `ofx-${i}`,
      bankCategory: "",
      source: isCard ? "card" : "account",
    };
  });
}

// ── linhas → transações ────────────────────────────────────
// Sinal: em extrato de conta a saída vem negativa; em fatura de cartão a compra
// vem positiva e o pagamento/estorno negativo. `expenseSign` diz qual é qual;
// sem ele, decide pela maioria (fatura tem quase tudo positivo).
export function rowsToTransactions(rows, { headerRow, map }, { fallbackYear, expenseSign } = {}) {
  const body = rows.slice(headerRow + 1).filter((r) => r.some((c) => c));
  const raw = body.map((r, i) => {
    let amount;
    if (map.amount != null) amount = parseAmount(r[map.amount]);
    else amount = (parseAmount(r[map.credit]) || 0) - (Math.abs(parseAmount(r[map.debit])) || 0);
    const kind = map.kind != null ? strip(r[map.kind] ?? "") : "";
    if (map.amount != null && /^(d|debito|saida)$/.test(kind) && amount > 0) amount = -amount;
    const desc = (r[map.description] ?? "").replace(/\s+/g, " ").trim();
    const hist = map.history != null && map.history !== map.description ? (r[map.history] ?? "").replace(/\s+/g, " ").trim() : "";
    return {
      // Extrato do Inter traz o tipo ("Pix enviado", "Compra no débito") em
      // Histórico e às vezes deixa a Descrição vazia.
      raw: desc || hist || "Sem descrição",
      operation: hist,
      date: parseDate(r[map.date], fallbackYear),
      amount,
      installmentText: map.installment != null ? r[map.installment] : "",
      bankCategory: map.category != null ? r[map.category] ?? "" : hist,
      fitid: `csv-${i}`,
    };
  }).filter((t) => t.date && !Number.isNaN(t.amount) && t.amount !== 0);
  const positives = raw.filter((t) => t.amount > 0).length;
  const sign = expenseSign ?? (positives >= raw.length / 2 ? 1 : -1);
  return raw.map((t) => ({ ...t, amount: t.amount * sign, source: sign === 1 ? "card" : "account" }));
}

// Lê o arquivo inteiro. → { transactions, needsMapping, rows, detected }
export function readStatement(text, opts = {}) {
  if (isOFX(text)) return { transactions: parseOFX(text), needsMapping: false, format: "OFX" };
  const rows = parseCSV(text);
  const detected = opts.mapping ?? detectColumns(rows);
  if (!detected) return { transactions: [], needsMapping: true, rows, format: "CSV" };
  return { transactions: rowsToTransactions(rows, detected, opts), needsMapping: false, rows, detected, format: "CSV" };
}

// ── limpeza do nome ────────────────────────────────────────
// Prefixo de maquininha/subadquirente que suja o nome: "IFD*", "PAG*", "MP *",
// "SumUp *", "EC *", "PG *", "IZ *", "STONE*", "MERCADOPAGO*", "PICPAY*", "CIELO*"…
const ACQUIRERS = /^(?:ifd|ifood|pag|pg|mp|mercadopago|mercpago|merc\s?pago|sumup|sum\s?up|ec|iz|izettle|stone|stn|picpay|pp|cielo|getnet|gn|rede|ton|ppro|paypal|ppl|dl|dlocal|ebanx|hipercard|pagseguro|pagbank|pags|inf|bpag|zp|zoop|asaas|vindi|cloudwalk|infinitepay|lj|jim\.com|jim|vmt|ebn|ebanx|nupay|pp3)\s*\*\s*/i;
const NOISE = [
  /\s*(?:ribeirao\s*pret\w*|sertaozinho|pradopolis|sao\s*paulo|campinas)\s*(?:bra?)?\s*$/i,
  /\s+(?:parc(?:ela)?\.?\s*)?\d{1,2}\s*\/\s*\d{1,2}\s*$/i, // "Parcela 2/10" no fim
  /\s+-?\s*(?:sao paulo|são paulo|rio de janeiro|belo horizonte|curitiba|porto alegre|brasilia|brasília|salvador|recife|fortaleza|campinas|osasco|barueri|santo andre|guarulhos|niteroi)\b.*$/i,
  /\s+(?:sp|rj|mg|pr|rs|sc|ba|pe|ce|df|go|es|pa|am|ma|mt|ms|pb|rn|al|se|pi|ro|to|ac|ap|rr)\s*(?:br[a]?)?$/i,
  /\s+br[a]?$/i,
  /\s+\d{4,}$/, // código/terminal no fim
  /\s{2,}/g,
];
const KEEP_UPPER = new Set(["ltda", "me", "sa", "s/a", "eireli", "tv", "app", "bk", "kfc", "c&a", "ifood", "99"]);
const titleCase = (s) =>
  s.toLowerCase().split(" ").map((w, i) => {
    if (["de", "da", "do", "das", "dos", "e"].includes(w) && i > 0) return w;
    if (["bk", "kfc", "tv"].includes(w)) return w.toUpperCase();
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(" ");

// Nomes conhecidos que a limpeza sozinha não acerta.
const KNOWN = [
  [/uber\s*\*?\s*eats/i, "Uber Eats"],
  [/uber\s*\*?\s*(trip|uber|viagem)?|uber\.com/i, "Uber"],
  [/anthropic|claude\.ai/i, "Claude (Anthropic)"],
  [/openai|chatgpt/i, "ChatGPT"],
  [/hostinger/i, "Hostinger"],
  [/google\s*cloud/i, "Google Cloud"],
  [/google\s*\*?\s*one/i, "Google One"],
  [/melimais|meli\+|meli\s*mais/i, "Meli+ (Mercado Livre)"],
  [/plano\s*nu\s*cel|nucel/i, "NuCel (celular)"],
  [/savegnago/i, "Savegnago"],
  [/ja[uú]\s*serve/i, "Jaú Serve"],
  [/capcut/i, "CapCut"],
  [/parcelamento\s*de\s*fatura/i, "Parcelamento de fatura"],
  [/^cea\b|c&a\b|c\s*e\s*a\s*modas/i, "C&A"],
  [/inditex|zara\b/i, "Zara"],
  [/renner/i, "Renner"],
  [/riachuelo/i, "Riachuelo"],
  [/^raia\s*\d|drogaraia|droga\s*raia/i, "Droga Raia"],
  [/^filial\s*\d*\s*drogal|^drogal\b/i, "Drogal"],
  [/cinepolis/i, "Cinépolis"],
  [/cinemark/i, "Cinemark"],
  [/airbnb/i, "Airbnb"],
  [/steam/i, "Steam"],
  [/zigpay|\bzig\b/i, "Zig (evento)"],
  [/entrevias/i, "Entrevias (pedágio)"],
  [/sympla/i, "Sympla"],
  [/^99\s*\*?|99\s?(app|pop|taxi|tecnologia)/i, "99"],
  [/ifood|^ifd\b/i, "iFood"],
  [/netflix/i, "Netflix"],
  [/spotify/i, "Spotify"],
  [/amazon\s*prime|primevideo|prime video/i, "Amazon Prime"],
  [/amazon|amzn/i, "Amazon"],
  [/mercado\s*livre|mercadolivre|meli\b/i, "Mercado Livre"],
  [/google\s*\*?\s*youtube|youtubepremium/i, "YouTube Premium"],
  [/apple\.com\/bill|apple\s*\.?\s*com/i, "Apple"],
  [/disney\s*\+|disneyplus/i, "Disney+"],
  [/hbo\s*max|max\.com/i, "Max"],
  [/shopee/i, "Shopee"],
  [/aliexpress/i, "AliExpress"],
  [/rappi/i, "Rappi"],
  [/drogasil/i, "Drogasil"],
  [/droga\s*raia|drogaraia|raia\s*drogasil/i, "Droga Raia"],
  [/pague\s*menos/i, "Pague Menos"],
  [/carrefour/i, "Carrefour"],
  [/assai|assaí/i, "Assaí"],
  [/pao\s*de\s*acucar|pão de açúcar|gpa\b/i, "Pão de Açúcar"],
  [/smart\s*fit|smartfit/i, "Smart Fit"],
  [/sem\s*parar/i, "Sem Parar"],
  [/conectcar/i, "ConectCar"],
  [/shell\b|raizen/i, "Posto Shell"],
  [/ipiranga/i, "Posto Ipiranga"],
  [/petrobras|posto\s*br\b/i, "Posto Petrobras"],
  [/mc\s*donald|mcdonald|arcos dourados/i, "McDonald's"],
  [/burger\s*king|\bbk\b/i, "Burger King"],
  [/starbucks/i, "Starbucks"],
  [/claro\b/i, "Claro"],
  [/\bvivo\b|telefonica/i, "Vivo"],
  [/\btim\b/i, "TIM"],
];

// Palavras que o banco corta no meio por limite de caracteres.
const TRUNCATED = {
  supermercad: "Supermercado", supermerc: "Supermercado", concessionar: "Concessionária", restaurant: "Restaurante",
  restaura: "Restaurante", farmac: "Farmácia", drogari: "Drogaria", conveni: "Conveniência", conven: "Conveniência",
  confeitari: "Confeitaria", lanchonet: "Lanchonete", panificad: "Panificadora", distribuid: "Distribuidora",
  pret: "Preto", ribeirao: "Ribeirão", sertaozi: "Sertãozinho", sertaozinho: "Sertãozinho", fresc: "Fresca", paulist: "Paulista",
};

export function cleanName(raw) {
  let s = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "Sem nome";
  const iof = /^iof\s*(?:de|sobre)?\s*"(.+)"\s*$/i.exec(s);
  if (iof) return `IOF · ${cleanName(iof[1])}`;
  const est = /^estorno\s*(?:de)?\s*"(.+?)"/i.exec(s);
  if (est) return `Estorno · ${cleanName(est[1])}`;
  const ifd = /^(?:ifd|ifood)\s*\*\s*(.+)$/i.exec(s);
  if (ifd) return `iFood · ${cleanName(ifd[1])}`;
  for (const [re, name] of KNOWN) if (re.test(s)) return name;
  // PIX / transferência: guarda o destinatário
  if (/\bpix\b|transfer[eê]ncia|\bted\b/i.test(s)) {
    const who = s.split(/\s+-\s+/).slice(1).find((p) => !/^[\d.*/-]+$|pix|enviad|recebid|transfer/i.test(p.trim()));
    const tail = who ?? s.replace(/.*(?:pix|transfer[eê]ncia|ted)\s*(?:enviad[oa]|recebid[oa])?\s*(?:pelo pix)?\s*(?:para|de)?\s*/i, "");
    return tail.trim() ? `Pix ${titleCase(tail.replace(/\d[\d.*/-]{5,}/g, "").trim())}` : "Pix";
  }
  while (ACQUIRERS.test(s)) s = s.replace(ACQUIRERS, ""); // "Ec *Mp*Melimais"
  s = s.replace(/\s*-?\s*(?:parc(?:ela)?\.?\s*)?\d{1,2}\s*(?:\/|de)\s*\d{1,2}\s*$/i, ""); // " - Parcela 1/2", " - 1/2"
  s = s.replace(/([a-zà-ú])([A-ZÀ-Ú])/g, "$1 $2"); // "PadariaSaoJorge" → "Padaria Sao Jorge"
  s = s.replace(/\*/g, " ");
  for (const re of NOISE) s = s.replace(re, re.flags.includes("g") ? " " : "");
  s = s.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  s = s.split(" ").map((w) => TRUNCATED[strip(w)] ?? w).join(" ");
  s = s.replace(/\s+(?:comercio|com|varejist\w*|vareji\w*|ltda|eireli|me|s\/?a)(?:\s+\w{0,3})*$/i, "") // "Assb Comercio Varejist"
    .replace(/\s+(?:de|do|da|dos|das|e|\w)$/i, "").replace(/\s+(?:de|do|da|dos|das|e|\w)$/i, "").trim(); // "Operadora de", "Barbearia e T"
  return titleCase(s || raw);
}

// Chave estável de um estabelecimento, para lembrar o nome e a categoria que a
// pessoa escolheu: sem prefixo de maquininha, sem números, sem parcela.
export const merchantKey = (raw) =>
  strip(String(raw ?? "").replace(ACQUIRERS, "")).replace(/parc\w*\s*\d+\s*\/\s*\d+/g, "").replace(/\d+/g, "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);

// ── parcela ────────────────────────────────────────────────
export function parseInstallment(text) {
  const m = /(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})/i.exec(String(text ?? ""));
  if (!m) return null;
  const current = +m[1], total = +m[2];
  return total >= 2 && current >= 1 && current <= total ? { current, total } : null;
}

// ── categoria ──────────────────────────────────────────────
// Palavras-chave → id de categoria padrão. A regra aprendida (rules) vem antes.
// A ordem importa: a primeira que bate vence.
const CATEGORY_HINTS = [
  ["pix", /\bpix\b|transferencia|\bted\b/],
  ["doacoes", /paroquia|igreja|dizimo|doacao|vakinha|ong\b|instituto\b/],
  ["assinaturas", /capcut|netflix|spotify|disney|hbo|max\.com|prime video|primevideo|youtube|deezer|globoplay|apple\.com|icloud|google\s*one|anthropic|claude|openai|chatgpt|commandcode|cursor|github|hostinger|google cloud|aws|vercel|notion|canva|adobe|microsoft|melimais|meli\s*mais|pdfeditor|visor finance|assinatura|plano\b/],
  ["compras", /inditex|zara|renner|riachuelo|\bcea\b|c&a|shein|shopee|aliexpress|amazon|mercado\s*livre|mercadolivre|mercadol|magalu|magazine|americanas|vestuari|calcad|shopping|iguatemi|loja|store|outlet|perfum|boticario|natura\b|sephora|skinsmonkey/],
  ["alimentacao", /\bifd\b(?!.*drog)|cacau show|chocolat|churrasc|gourmet|\bbar\b|savegnago|jau\s*serve|doces\b|supermercad|acai|milky moo|petisca|grill|pasta|pastaio|food shop|pao\b|confeitaria|burger|ifood|rappi|uber\s*eats|mercado\b|supermerc|hiper|atacad|assai|carrefour|pao de acucar|extra\b|hortifruti|sacolao|padaria|panific|acougue|restaur|lanch|pizz|burger|mc\s*donald|bk\b|kfc|subway|outback|starbucks|cafe\b|cafeteria|bar\b|boteco|sushi|food|aliment|feira|emporio|doceria|sorvet/],
  ["transporte", /auto\s*post|entrevias|^pp\d|concessionar|uber(?!\s*eats)|\b99\b|99app|99pop|cabify|posto|combust|gasolina|shell|ipiranga|petrobras|raizen|estacion|estapar|sem parar|conectcar|veloe|pedagio|metro\b|cptm|bilhete|onibus|passagem|detran|ipva|oficina|mecanic|lava\s*jato/],
  ["saude", /drog|farma|raia|drogasil|pague menos|panvel|hospital|clinic|laborat|exame|medic|odonto|dentist|psicol|fisioter|unimed|amil|sulamerica|bradesco saude|hapvida|smart\s*fit|academia|gympass|wellhub/],
  ["lazer", /cinepolis|zigpay|\bzig\b|arena|futebol|laser|cinema|cinemark|ingresso|sympla|eventim|steam|playstation|psn|xbox|nintendo|show|teatro|parque|hotel|airbnb|booking|decolar|latam|gol\b|azul\b|viagem|turismo/],
  ["contas", /claro|vivo|\btim\b|oi\b|net\b|internet|telefon|enel|light\b|cemig|copel|celesc|coelba|cpfl|energia|eletrop|sabesp|cedae|copasa|sanepar|agua|comgas|naturgy|gas\b|seguro|porto seguro|icloud|google\s*one|apple\.com|microsoft|adobe|chatgpt|openai|anuidade|tarifa|iof/],
  ["moradia", /aluguel|condom|imobili|quintoandar|quinto andar|iptu|leroy|telhanorte|c&c|tok\s*stok|tokstok|camicado|madeira|mobly|etna/],
];

export function guessCategory(raw, bankCategory = "", categories = []) {
  const inner = /^(?:iof|estorno)\s*(?:de|sobre)?\s*"(.+?)"/i.exec(String(raw));
  if (inner) return guessCategory(inner[1], bankCategory, categories);
  const ids = new Set(categories.map((c) => c.id));
  const text = strip(`${raw} ${bankCategory}`);
  for (const [id, re] of CATEGORY_HINTS) if (re.test(text) && (!ids.size || ids.has(id))) return id;
  // Categoria que veio do banco com o mesmo nome de uma das suas
  const bc = strip(bankCategory);
  const same = categories.find((c) => bc && (strip(c.name) === bc || bc.includes(strip(c.name))));
  return same?.id ?? "outros";
}

// ── casamento com o que já foi lançado ─────────────────────
const words = (s) => new Set(strip(s).replace(/[^a-z0-9 ]/g, " ").split(" ").filter((w) => w.length > 2));
export function nameSimilarity(a, b) {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w) || [...B].some((x) => x.startsWith(w) || w.startsWith(x))) inter++;
  return inter / Math.min(A.size, B.size);
}

// Cada transação importada procura UMA conta já lançada (no mesmo cartão, ou sem
// cartão quando o arquivo é de conta) com o mesmo valor (±R$ 0,05) e, de
// desempate, o nome e o dia mais próximos. Conta já casada não casa de novo.
// → [{ tx, match: account | null, score }]
export function matchTransactions(txs, accounts) {
  const free = new Set(accounts.map((a) => a.id));
  const day = (d) => +d.slice(8, 10);
  return txs.map((tx) => {
    let best = null, bestScore = 0;
    for (const a of accounts) {
      if (!free.has(a.id)) continue;
      if (Math.abs(a.amount - tx.amount) > 0.05) continue;
      const sim = Math.max(nameSimilarity(a.name, tx.name ?? ""), nameSimilarity(a.name, tx.raw));
      const dayDist = Math.abs((a.dueDay ?? day(tx.date)) - day(tx.date));
      const score = 1 + sim * 2 + (dayDist <= 3 ? 0.5 : 0) - Math.min(dayDist, 31) / 62;
      if (score > bestScore) { best = a; bestScore = score; }
    }
    if (best) free.delete(best.id);
    return { tx, match: best, score: bestScore };
  });
}

// ── tudo junto ─────────────────────────────────────────────
// Ignora pagamento de fatura, estorno, crédito e rendimento: não é despesa.
const NOT_EXPENSE = /pagamento\s*(?:de\s*)?fatura|p(?:a)?gt\w*\s*parcelamento\s*fatura|aplica[cç][aã]o\s*(?:poupan|cdb|tesouro|fundo|renda)|resgate|pagamento (recebido|efetuado)|fatura\s*(?:do\s*)?cart[aã]o|pagto fatura|pgto fatura|pag fatura|credito de|estorno|reembolso|cashback|rendimento|resgate|saldo anterior|saldo do dia|^saldo\b/i;

// Prepara as linhas da tela de revisão. rules: [{ key, name, category }] aprendidas.
// selfNames: seus nomes como aparecem no banco. Pix entre contas suas não é gasto.
export function prepareImport(transactions, { categories = [], rules = [], accounts = [], selfNames = [] } = {}) {
  const selfKeys = selfNames.map((n) => strip(n)).filter(Boolean);
  const byKey = new Map(rules.map((r) => [r.key, r]));
  const rows = transactions.map((t, i) => {
    const key = merchantKey(t.raw);
    const rule = byKey.get(key);
    const installment = parseInstallment(t.installmentText) ?? parseInstallment(t.raw.match(/parc\w*\s*\d+\s*\/\s*\d+|\b\d{1,2}\/\d{1,2}\s*$/i)?.[0]);
    const self = selfKeys.some((k) => strip(t.raw).includes(k));
    const skip = t.amount <= 0 || self || NOT_EXPENSE.test(t.raw) || /credito liberado/i.test(strip(t.operation ?? ""));
    return {
      id: `imp-${i}-${t.fitid}`,
      ...t,
      key,
      name: rule?.name ?? cleanName(t.raw),
      category: rule?.category ?? guessCategory(t.raw, t.bankCategory, categories),
      learned: !!rule,
      installment,
      include: !skip,
      skipReason: skip ? (self ? "Entre suas contas" : t.amount <= 0 ? "Entrada" : /credito liberado/i.test(strip(t.operation ?? "")) ? "Crédito liberado" : /aplica[cç][aã]o/i.test(t.raw) ? "Guardado (aplicação)" : "Pagamento de fatura") : null,
    };
  });
  // Estorno anula a compra: "Estorno de "X" -150" some junto com "X 150", e um
  // "Uber -14,94" some junto com um "Uber 14,94". Nenhum dos dois entra.
  for (const neg of rows.filter((r) => r.source === "card" && r.amount < 0 && !/pagamento/i.test(r.raw))) {
    const target = merchantKey(/"(.+?)"/.exec(neg.raw)?.[1] ?? neg.raw);
    const buy = rows.find((r) => r.include && !r.cancelled && Math.abs(r.amount + neg.amount) < 0.01 && (r.key === target || r.key.startsWith(target) || target.startsWith(r.key)));
    if (buy) {
      buy.include = false; buy.cancelled = true; buy.skipReason = "Estornada";
      neg.skipReason = "Estorno";
    }
  }
  // Estorno sem compra de mesmo valor (ex.: Uber devolve R$ 4,34 de uma corrida
  // de R$ 17,30) é crédito parcial: entra negativo e abate do total.
  for (const neg of rows.filter((r) => r.source === "card" && r.amount < 0 && !r.skipReason?.startsWith("Estorno") && !/pagamento/i.test(r.raw))) {
    neg.include = true;
    neg.skipReason = null;
    neg.credit = true;
    if (!/^estorno/i.test(neg.name)) neg.name = `Estorno · ${neg.name}`;
  }
  const matched = matchTransactions(rows.filter((r) => r.include && !r.credit), accounts);
  const byRow = new Map(matched.map((m) => [m.tx.id, m.match]));
  return rows.map((r) => ({ ...r, match: byRow.get(r.id) ?? null }));
}
