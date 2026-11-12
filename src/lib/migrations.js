// Migrações do formato salvo (regra R7 de docs/proximos-passos.md).
//
// Todo documento salvo (shared, personal, session) carrega `schemaVersion`.
// Documento sem versão é v0 — o formato anterior a este arquivo.
//
// Para mudar o formato:
//   1. suba SCHEMA_VERSION;
//   2. acrescente em MIGRATIONS[<versão de origem>] uma função por tipo de
//      documento que leve da versão N para N+1;
//   3. nunca apague dado do usuário: campo desconhecido passa adiante intacto.

export const SCHEMA_VERSION = 1;

export const KINDS = ["shared", "personal", "session"];

// MIGRATIONS[n][kind](doc) → doc na versão n + 1 (sem o carimbo de versão,
// que é aplicado por `migrate`). Tipo ausente = formato não mudou.
const MIGRATIONS = {
  // v0 → v1: só passa a existir o carimbo de versão; o conteúdo é o mesmo.
  0: {},
};

export const versionOf = (doc) =>
  Number.isInteger(doc?.schemaVersion) && doc.schemaVersion >= 0 ? doc.schemaVersion : 0;

export const needsMigration = (doc) => doc != null && versionOf(doc) < SCHEMA_VERSION;

// Carimba um documento recém-criado (seed, mês vazio) ou prestes a ser salvo.
export const stamp = (doc) => ({ ...doc, schemaVersion: Math.max(versionOf(doc), SCHEMA_VERSION) });

// Devolve o documento na versão atual, sem alterar o original.
// Documento de versão mais nova que este código (app desatualizado em outro
// aparelho) volta como veio: melhor não mexer do que rebaixar e perder campo.
export function migrate(doc, kind) {
  if (doc == null) return doc;
  if (!KINDS.includes(kind)) throw new Error(`Tipo de documento desconhecido: ${kind}`);
  let version = versionOf(doc);
  if (version >= SCHEMA_VERSION) return doc;
  let out = structuredClone(doc);
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version]?.[kind];
    if (step) out = step(out);
    version += 1;
    out.schemaVersion = version;
  }
  return out;
}
