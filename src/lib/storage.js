// StorageManager
//
// Dois escopos, como no window.storage dos Artifacts do Claude:
//   - compartilhado (shared = true): os dois enxergam   → contas da casa
//   - pessoal       (shared = false): só o dono enxerga → renda e contas pessoais
//
// Fora do Claude (dev local / deploy próprio) cai para localStorage, com as
// chaves pessoais separadas por pessoa. Ali é só uma simulação: privacidade
// de verdade exige que cada pessoa esteja no próprio dispositivo/conta.

import { DEFAULT_CATEGORIES, initialData, SEED_PROFILE, USERS } from "./seed.js";
import { migrate, needsMigration, stamp } from "./migrations.js";

const hasClaudeStorage = () =>
  typeof window !== "undefined" && window.storage && typeof window.storage.get === "function";

const backend = {
  async get(key, shared) {
    if (hasClaudeStorage()) {
      try {
        const res = await window.storage.get(key, shared);
        return res?.value ? JSON.parse(res.value) : null;
      } catch {
        return null; // chave ainda não existe
      }
    }
    const raw = localStorage.getItem(`${shared ? "shared" : "private"}::${key}`);
    return raw ? JSON.parse(raw) : null;
  },
  async set(key, value, shared) {
    const json = JSON.stringify(value);
    if (hasClaudeStorage()) return window.storage.set(key, json, shared);
    localStorage.setItem(`${shared ? "shared" : "private"}::${key}`, json);
  },
  async remove(key, shared) {
    if (hasClaudeStorage()) {
      try { await window.storage.delete(key, shared); } catch { /* já não existe */ }
      return;
    }
    localStorage.removeItem(`${shared ? "shared" : "private"}::${key}`);
  },
};

const sharedKey = (month) => `duofinn:shared:${month}`;
const personalKey = (user, month) => `duofinn:personal:${user}:${month}`;
const SESSION_KEY = "duofinn:session";
const SETTINGS_KEY = "duofinn:shared:settings"; // categorias: os dois veem
const profileKey = (user) => `duofinn:personal:${user}:profile`; // carteira, metas, patrimônio: só o dono

// Separa o modelo "flat" em { shared, personal[pessoa] }.
export function splitSeed(data = initialData) {
  const shared = {
    month: data.month,
    users: data.users,
    accounts: data.accounts.filter((a) => a.type === "shared"),
  };
  const personal = Object.fromEntries(
    USERS.map((u) => [
      u,
      {
        owner: u,
        incomes: data.incomes.filter((i) => i.owner === u),
        accounts: data.accounts.filter((a) => a.type === "personal" && a.owner === u),
      },
    ])
  );
  return { shared, personal };
}

const emptyShared = (month) => ({ month, users: initialData.users, accounts: [] });
const emptyPersonal = (user) => ({ owner: user, incomes: [], accounts: [] });

// Lê um documento já na versão atual do schema. Se estava em versão antiga,
// grava de volta migrado (R7) — assim a migração roda uma vez por documento.
async function read(key, shared, kind) {
  const doc = await backend.get(key, shared);
  if (!needsMigration(doc)) return doc;
  const migrated = migrate(doc, kind);
  await backend.set(key, migrated, shared);
  return migrated;
}

export const StorageManager = {
  isClaude: hasClaudeStorage,

  async loadSession() {
    return (await read(SESSION_KEY, false, "session")) ?? stamp({
      currentUser: initialData.currentUser,
      month: initialData.month,
      theme: "light",
    });
  },
  saveSession(session) {
    return backend.set(SESSION_KEY, stamp(session), false);
  },

  // Carrega SOMENTE o compartilhado + o pessoal do usuário atual.
  async load(currentUser, month) {
    let [shared, mine] = await Promise.all([
      read(sharedKey(month), true, "shared"),
      read(personalKey(currentUser, month), false, "personal"),
    ]);
    const seed = month === initialData.month ? splitSeed() : null;
    if (!shared) {
      shared = stamp(seed?.shared ?? emptyShared(month));
      await backend.set(sharedKey(month), shared, true);
    }
    if (!mine) {
      mine = stamp(seed?.personal[currentUser] ?? emptyPersonal(currentUser));
      await backend.set(personalKey(currentUser, month), mine, false);
    }
    return { shared, mine };
  },

  // Documentos sem mês. Ausente = exemplo (o mesmo que acontece com dez/2026).
  async loadExtras(currentUser) {
    let [settings, profile] = await Promise.all([
      read(SETTINGS_KEY, true, "settings"),
      read(profileKey(currentUser), false, "profile"),
    ]);
    if (!settings) {
      settings = stamp({ categories: DEFAULT_CATEGORIES });
      await backend.set(SETTINGS_KEY, settings, true);
    }
    if (!profile) {
      profile = stamp(structuredClone(SEED_PROFILE[currentUser] ?? { cards: [], goals: [], assets: [] }));
      await backend.set(profileKey(currentUser), profile, false);
    }
    return { settings, profile };
  },
  saveSettings(settings) {
    return backend.set(SETTINGS_KEY, stamp(settings), true);
  },
  saveProfile(user, profile) {
    return backend.set(profileKey(user), stamp(profile), false);
  },

  // Lança uma conta em OUTRO mês (despesa que se repete ou parcela).
  // Cada documento continua no seu escopo: conta da casa no compartilhado do mês,
  // pessoal no pessoal de quem lança (R1).
  async addToMonth(kind, currentUser, month, item) {
    const { shared, mine } = await this.load(currentUser, month);
    const put = (list) => [...list.filter((x) => x.id !== item.id), item];
    if (kind === "shared") await this.saveShared(month, { ...shared, accounts: put(shared.accounts), settled: false });
    else if (kind === "income") await this.savePersonal(currentUser, month, { ...mine, incomes: put(mine.incomes) });
    else await this.savePersonal(currentUser, month, { ...mine, accounts: put(mine.accounts) });
  },

  saveShared(month, shared) {
    return backend.set(sharedKey(month), stamp(shared), true);
  },
  savePersonal(user, month, mine) {
    return backend.set(personalKey(user, month), stamp(mine), false);
  },

  // Todos os documentos que este aparelho tem (para o backup).
  async exportDocs() {
    if (hasClaudeStorage()) {
      const out = [];
      for (const shared of [true, false]) {
        try {
          const res = await window.storage.list?.("duofinn:", shared);
          for (const key of res?.keys ?? []) {
            const value = await backend.get(key, shared);
            if (value) out.push({ key, value });
          }
        } catch { /* sem listagem: exporta o que der */ }
      }
      return out;
    }
    return Object.keys(localStorage)
      .filter((k) => /^(shared|private)::duofinn:/.test(k))
      .map((k) => ({ key: k.replace(/^(shared|private)::/, ""), value: JSON.parse(localStorage.getItem(k)) }));
  },
  // Grava os documentos de um backup já validado (readBackup), cada um no seu escopo.
  async importDocs(docs) {
    for (const d of docs) await backend.set(d.key, d.value, d.shared);
  },

  async reset(month) {
    await Promise.all([
      backend.remove(SETTINGS_KEY, true),
      ...USERS.map((u) => backend.remove(profileKey(u), false)),
      backend.remove(sharedKey(month), true),
      ...USERS.map((u) => backend.remove(personalKey(u, month), false)),
    ]);
  },
};
