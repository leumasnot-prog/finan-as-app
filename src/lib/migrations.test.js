import { beforeEach, describe, expect, it } from "vitest";
import { SCHEMA_VERSION, migrate, needsMigration, stamp } from "./migrations.js";
import { StorageManager, splitSeed } from "./storage.js";

// Documentos no formato v0: exatamente o que o app gravava antes de existir versão.
const v0 = () => {
  const { shared, personal } = splitSeed();
  return {
    shared,
    personal: personal.pessoa1,
    session: { currentUser: "pessoa2", month: "2026-12", theme: "dark", mode: "solo" },
  };
};

describe("migrate", () => {
  it.each(["shared", "personal", "session"])("leva %s de v0 para a versão atual sem perder campo", (kind) => {
    const doc = v0()[kind];
    const before = structuredClone(doc);
    const out = migrate(doc, kind);
    expect(out.schemaVersion).toBe(SCHEMA_VERSION);
    const { schemaVersion, ...rest } = out;
    expect(rest).toEqual(before);
    expect(doc).toEqual(before); // não altera o original
  });

  it("preserva campos que o código não conhece", () => {
    const out = migrate({ ...v0().shared, futuro: { x: 1 } }, "shared");
    expect(out.futuro).toEqual({ x: 1 });
  });

  it("é idempotente e não rebaixa documento de versão mais nova", () => {
    const atual = migrate(v0().shared, "shared");
    expect(migrate(atual, "shared")).toBe(atual);
    const novo = { ...atual, schemaVersion: SCHEMA_VERSION + 1 };
    expect(migrate(novo, "shared")).toBe(novo);
    expect(needsMigration(novo)).toBe(false);
    expect(stamp(novo).schemaVersion).toBe(SCHEMA_VERSION + 1);
  });

  it("passa null adiante e recusa tipo desconhecido", () => {
    expect(migrate(null, "shared")).toBeNull();
    expect(() => migrate({}, "outro")).toThrow();
  });
});

describe("StorageManager com dados antigos no localStorage", () => {
  let store;
  const saved = (key) => JSON.parse(store.get(key));

  beforeEach(() => {
    store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => void store.set(k, String(v)),
      removeItem: (k) => void store.delete(k),
    };
  });

  it("abre documentos v0, devolve migrados e grava de volta com versão", async () => {
    const old = v0();
    old.shared.accounts[0].paid = true; // edição do usuário que não pode sumir
    store.set("shared::duofinn:shared:2026-12", JSON.stringify(old.shared));
    store.set("private::duofinn:personal:pessoa1:2026-12", JSON.stringify(old.personal));
    store.set("private::duofinn:session", JSON.stringify(old.session));

    const session = await StorageManager.loadSession();
    expect(session).toEqual({ ...old.session, schemaVersion: SCHEMA_VERSION });

    const { shared, mine } = await StorageManager.load("pessoa1", "2026-12");
    expect(shared).toEqual({ ...old.shared, schemaVersion: SCHEMA_VERSION });
    expect(mine).toEqual({ ...old.personal, schemaVersion: SCHEMA_VERSION });

    expect(saved("shared::duofinn:shared:2026-12")).toEqual(shared);
    expect(saved("private::duofinn:personal:pessoa1:2026-12")).toEqual(mine);
    expect(saved("private::duofinn:session")).toEqual(session);
    // R1: abrir como pessoa1 não cria nem toca o documento pessoal da pessoa2.
    expect(store.has("private::duofinn:personal:pessoa2:2026-12")).toBe(false);
  });

  it("documentos novos (exemplo, mês vazio, sessão padrão) já nascem com versão", async () => {
    expect((await StorageManager.loadSession()).schemaVersion).toBe(SCHEMA_VERSION);
    for (const month of ["2026-12", "2027-01"]) {
      const { shared, mine } = await StorageManager.load("pessoa2", month);
      expect(shared.schemaVersion).toBe(SCHEMA_VERSION);
      expect(mine.schemaVersion).toBe(SCHEMA_VERSION);
      expect(saved(`shared::duofinn:shared:${month}`).schemaVersion).toBe(SCHEMA_VERSION);
    }
  });

  it("salvar um documento sem versão carimba a versão atual", async () => {
    const { schemaVersion, ...semVersao } = migrate(v0().shared, "shared");
    await StorageManager.saveShared("2026-12", semVersao);
    await StorageManager.savePersonal("pessoa1", "2026-12", v0().personal);
    await StorageManager.saveSession(v0().session);
    expect(saved("shared::duofinn:shared:2026-12").schemaVersion).toBe(SCHEMA_VERSION);
    expect(saved("private::duofinn:personal:pessoa1:2026-12").schemaVersion).toBe(SCHEMA_VERSION);
    expect(saved("private::duofinn:session").schemaVersion).toBe(SCHEMA_VERSION);
  });
});
