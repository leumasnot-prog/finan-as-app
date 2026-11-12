// Converte vários CSV/OFX de uma vez com o mesmo motor do app (src/lib/importer.js).
//   node scripts/convert-statements.mjs <pasta-com-arquivos> <pasta-de-saida>
// Gera: lancamentos.csv (tudo junto, nomes limpos e categoria), resumo.json
// (por arquivo: formato, colunas achadas, linhas, total) e nao-lidos.txt.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { prepareImport, readStatement } from "../src/lib/importer.js";
import { DEFAULT_CATEGORIES } from "../src/lib/seed.js";

const [inDir, outDir, rulesFile] = process.argv.slice(2);
// Regras pessoais (fora do Git): { "selfNames": ["Seu Nome"], "rules": [{ "key", "name", "category" }] }
const personal = rulesFile ? JSON.parse(readFileSync(rulesFile, "utf8")) : {};
if (!inDir || !outDir) { console.error("uso: node scripts/convert-statements.mjs <entrada> <saida> [regras.json]"); process.exit(1); }
mkdirSync(outDir, { recursive: true });

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const decode = (buf) => { const t = buf.toString("utf8"); return /Ã[§£©¡³ª­]|�/.test(t) ? new TextDecoder("windows-1252").decode(buf) : t; };
const categories = [...DEFAULT_CATEGORIES, ...(personal.categories ?? [])];
const catName = Object.fromEntries(categories.map((c) => [c.id, c.name]));
const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const all = [], summary = [], failed = [];
for (const file of walk(inDir).filter((f) => [".csv", ".ofx", ".txt"].includes(extname(f).toLowerCase())).sort()) {
  const r = readStatement(decode(readFileSync(file)));
  if (r.needsMapping || !r.transactions.length) {
    failed.push(`${basename(file)}\n  primeiras linhas: ${(r.rows ?? []).slice(0, 3).map((x) => x.join(" | ")).join("\n                   ")}`);
    summary.push({ arquivo: basename(file), lido: false });
    continue;
  }
  const rows = prepareImport(r.transactions, { categories, selfNames: personal.selfNames ?? [], rules: personal.rules ?? [] });
  const kept = rows.filter((x) => x.include);
  summary.push({
    arquivo: basename(file), lido: true, formato: r.format,
    colunas: r.detected ? Object.fromEntries(Object.entries(r.detected.map).map(([k, i]) => [k, r.rows[r.detected.headerRow][i]])) : "OFX",
    tipo: r.transactions[0]?.source === "card" ? "fatura" : "extrato",
    periodo: [kept.map((x) => x.date).sort()[0], kept.map((x) => x.date).sort().at(-1)],
    lancamentos: kept.length, ignorados: rows.length - kept.length,
    total: Math.round(kept.reduce((s, x) => s + x.amount, 0) * 100) / 100,
  });
  for (const x of rows) all.push({ arquivo: basename(file), ...x });
}

const head = ["arquivo", "data", "nome", "categoria", "valor", "parcela", "entra", "motivo", "original", "operacao_banco"];
writeFileSync(join(outDir, "lancamentos.csv"), "﻿" + [head.join(";"), ...all.map((x) => [
  x.arquivo, x.date, x.name, catName[x.category] ?? x.category, String(x.amount).replace(".", ","),
  x.installment ? `${x.installment.current}/${x.installment.total}` : "", x.include ? "sim" : "não", x.skipReason ?? "", x.raw, x.bankCategory,
].map(q).join(";"))].join("\n"));
writeFileSync(join(outDir, "resumo.json"), JSON.stringify(summary, null, 2));
writeFileSync(join(outDir, "nao-lidos.txt"), failed.join("\n\n") || "Todos os arquivos foram lidos.\n");
console.log(`${summary.filter((s) => s.lido).length}/${summary.length} arquivos lidos · ${all.filter((x) => x.include).length} lançamentos · ${failed.length} sem layout reconhecido`);

// ── arquivo de dados do app (--app no regras.json: "app": { ... }) ──────────
// Gera duofinn-dados.json para "Ajustes → Dados → Importar dados" no app.
// regras.json:
//   "app": {
//     "name": "Seu nome",
//     "cards": [{ "id": "nubank", "name": "Nubank", "theme": "purple", "last4": "0000", "dueDay": 5, "file": "Nubank_" }],
//   }
// Arquivo cujo nome contém `file` é a fatura daquele cartão: tudo entra no mês
// da fatura (o AAAA-MM do nome do arquivo). Extrato de conta entra no mês da data.
// Regra com "cardId" põe o lançamento naquele cartão (ex.: pagamento da fatura Inter).
if (personal.app) {
  const { makeBackup } = await import("../src/lib/backup.js");
  const app = personal.app;
  const user = "pessoa1";
  const cards = app.cards ?? [];
  const snap = (c) => c && { name: c.name, theme: c.theme, color: c.color, last4: c.last4, limit: c.limit ?? 0 };
  const months = new Map();
  let n = 0;
  for (const x of all.filter((r) => r.include)) {
    const fileCard = cards.find((c) => c.file && x.arquivo.includes(c.file));
    const ruleCard = (personal.rules ?? []).find((r) => r.cardId && r.contains && x.raw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(r.contains));
    const card = cards.find((c) => c.id === ruleCard?.cardId) ?? fileCard;
    const month = fileCard ? /(\d{4}-\d{2})-\d{2}/.exec(x.arquivo)?.[1] ?? x.date.slice(0, 7) : x.date.slice(0, 7);
    const item = {
      id: `imp-${month}-${++n}`, name: x.name, amount: x.amount, type: "personal", owner: user,
      dueDay: fileCard ? fileCard.dueDay ?? 5 : +x.date.slice(8, 10), category: x.category, paid: true,
      imported: true, raw: x.raw, date: x.date,
      ...(card ? { cardId: card.id, card: snap(card) } : {}),
      ...(x.installment ? { installment: x.installment } : {}),
    };
    if (!months.has(month)) months.set(month, []);
    months.get(month).push(item);
  }
  const users = { pessoa1: { name: app.name ?? "Você", initial: (app.name ?? "V")[0].toUpperCase() }, pessoa2: { name: "Pessoa 2", initial: "2" } };
  const last = [...months.keys()].sort().at(-1);
  const docs = [
    { key: "duofinn:session", value: { currentUser: user, month: last, theme: "light", mode: "solo", schemaVersion: 1 } },
    { key: "duofinn:shared:settings", value: { categories, schemaVersion: 1 } },
    { key: `duofinn:personal:${user}:profile`, value: {
      cards: cards.map(({ file, ...c }) => c), goals: [], assets: [], schemaVersion: 1,
      rules: (personal.rules ?? []).filter((r) => r.contains && !r.include).map((r) => ({ key: r.contains, contains: r.contains, name: r.name, category: r.category })),
    } },
    ...[...months.entries()].flatMap(([m, accounts]) => [
      { key: `duofinn:shared:${m}`, value: { month: m, users, accounts: [], schemaVersion: 1 } },
      { key: `duofinn:personal:${user}:${m}`, value: { owner: user, incomes: [], accounts, schemaVersion: 1 } },
    ]),
  ];
  writeFileSync(join(outDir, "duofinn-dados.json"), JSON.stringify(makeBackup(user, docs), null, 1));
  console.log(`duofinn-dados.json: ${months.size} meses, ${n} lançamentos`);
}
