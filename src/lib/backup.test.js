import { expect, it } from "vitest";
import { kindOfKey, makeBackup, readBackup } from "./backup.js";
import { SCHEMA_VERSION } from "./migrations.js";

const docs = [
  { key: "duofinn:session", value: { currentUser: "pessoa1", month: "2026-11" } },
  { key: "duofinn:shared:settings", value: { categories: [] } },
  { key: "duofinn:personal:pessoa1:profile", value: { cards: [] } },
  { key: "duofinn:shared:2026-11", value: { month: "2026-11", accounts: [{ id: "a", amount: 1 }] } },
  { key: "duofinn:personal:pessoa1:2026-11", value: { owner: "pessoa1", incomes: [], accounts: [{ id: "b", amount: 2 }, { id: "c", amount: 3 }] } },
  { key: "duofinn:personal:pessoa2:2026-11", value: { owner: "pessoa2", accounts: [{ id: "x", amount: 9 }] } },
  { key: "outra:coisa", value: {} },
];

it("reconhece cada chave", () => {
  expect(docs.map((d) => kindOfKey(d.key))).toEqual(["session", "settings", "profile", "shared", "personal", "personal", null]);
});

it("ida e volta: só leva o pessoal de quem exporta (R1) e migra na leitura", () => {
  const b = makeBackup("pessoa1", docs);
  expect(b.docs.some((d) => d.key.includes("pessoa2"))).toBe(false);
  const r = readBackup(JSON.stringify(b));
  expect(r.ok).toBe(true);
  expect(r.summary).toEqual({ months: ["2026-11"], entries: 3, from: "2026-11", to: "2026-11" });
  expect(r.docs.every((d) => d.value.schemaVersion === SCHEMA_VERSION)).toBe(true);
  expect(r.docs.find((d) => d.key === "duofinn:shared:2026-11").shared).toBe(true);
});

it("recusa pessoal de outra pessoa mesmo se vier no arquivo", () => {
  const r = readBackup(JSON.stringify({ app: "duofinn", user: "pessoa1", docs }));
  expect(r.docs.some((d) => d.key.includes("pessoa2"))).toBe(false);
});

it("arquivo inválido explica o problema em vez de quebrar", () => {
  expect(readBackup("não é json").ok).toBe(false);
  expect(readBackup('{"a":1}').error).toMatch(/não é um backup/);
  expect(readBackup(JSON.stringify({ app: "duofinn", schemaVersion: 99, docs: [] })).error).toMatch(/versão mais nova/);
});
