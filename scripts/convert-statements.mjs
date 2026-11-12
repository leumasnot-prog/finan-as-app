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
const catName = Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.id, c.name]));
const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const all = [], summary = [], failed = [];
for (const file of walk(inDir).filter((f) => [".csv", ".ofx", ".txt"].includes(extname(f).toLowerCase())).sort()) {
  const r = readStatement(decode(readFileSync(file)));
  if (r.needsMapping || !r.transactions.length) {
    failed.push(`${basename(file)}\n  primeiras linhas: ${(r.rows ?? []).slice(0, 3).map((x) => x.join(" | ")).join("\n                   ")}`);
    summary.push({ arquivo: basename(file), lido: false });
    continue;
  }
  const rows = prepareImport(r.transactions, { categories: DEFAULT_CATEGORIES, selfNames: personal.selfNames ?? [], rules: personal.rules ?? [] });
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
