// Backup do app: um arquivo .json com os documentos salvos (as mesmas chaves do
// storage). Serve para trocar de aparelho, guardar uma cópia e carregar dados
// convertidos de fora (scripts/convert-statements.mjs --app).
//
// R1: o arquivo leva o compartilhado + o pessoal de UMA pessoa. Na importação,
// documento pessoal de outra pessoa é recusado.

import { KINDS, SCHEMA_VERSION, migrate, versionOf } from "./migrations.js";

export const BACKUP_APP = "duofinn";

// chave → tipo de documento
export function kindOfKey(key) {
  if (key === "duofinn:session") return "session";
  if (key === "duofinn:shared:settings") return "settings";
  if (/^duofinn:shared:\d{4}-\d{2}$/.test(key)) return "shared";
  if (/^duofinn:personal:[\w-]+:profile$/.test(key)) return "profile";
  if (/^duofinn:personal:[\w-]+:\d{4}-\d{2}$/.test(key)) return "personal";
  return null;
}
const ownerOfKey = (key) => /^duofinn:personal:([\w-]+):/.exec(key)?.[1] ?? null;
export const monthOfKey = (key) => /(\d{4}-\d{2})$/.exec(key)?.[1] ?? null;

export function makeBackup(user, docs) {
  return {
    app: BACKUP_APP, kind: "backup", schemaVersion: SCHEMA_VERSION, user,
    exportedAt: new Date().toISOString(),
    docs: docs.filter((d) => kindOfKey(d.key) && (!ownerOfKey(d.key) || ownerOfKey(d.key) === user)),
  };
}

// Lê e valida. → { ok: true, user, docs, summary } | { ok: false, error }
export function readBackup(text) {
  let data;
  try { data = JSON.parse(text); } catch { return { ok: false, error: "Esse arquivo não é um backup do Duo Finn (não é JSON)." }; }
  if (data?.app !== BACKUP_APP || !Array.isArray(data.docs)) return { ok: false, error: "Esse arquivo não é um backup do Duo Finn." };
  if (versionOf(data) > SCHEMA_VERSION) return { ok: false, error: "Esse backup é de uma versão mais nova do app. Atualize o app e tente de novo." };
  const user = data.user;
  const docs = [];
  for (const d of data.docs) {
    const kind = kindOfKey(d?.key);
    if (!kind || !KINDS.includes(kind) || typeof d.value !== "object" || d.value === null) continue;
    if (ownerOfKey(d.key) && ownerOfKey(d.key) !== user) continue; // R1
    docs.push({ key: d.key, shared: d.key.startsWith("duofinn:shared:"), kind, value: migrate(d.value, kind) });
  }
  if (!docs.length) return { ok: false, error: "O backup não tem nenhum dado que o app reconheça." };
  const months = [...new Set(docs.map((d) => (d.kind === "personal" || d.kind === "shared" ? monthOfKey(d.key) : null)).filter(Boolean))].sort();
  const entries = docs.filter((d) => d.kind === "personal" || d.kind === "shared").reduce((s, d) => s + (d.value.accounts?.length ?? 0), 0);
  return { ok: true, user, docs, summary: { months, entries, from: months[0], to: months.at(-1) } };
}
