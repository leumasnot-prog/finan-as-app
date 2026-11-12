// StorageManager
//
// Dois escopos, como no window.storage dos Artifacts do Claude:
//   - compartilhado (shared = true): os dois enxergam   → contas da casa
//   - pessoal       (shared = false): só o dono enxerga → renda e contas pessoais
//
// Fora do Claude (dev local / deploy próprio) cai para localStorage, com as
// chaves pessoais separadas por pessoa. Ali é só uma simulação: privacidade
// de verdade exige que cada pessoa esteja no próprio dispositivo/conta.

import { initialData, USERS } from "./seed.js";

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

export const StorageManager = {
  isClaude: hasClaudeStorage,

  async loadSession() {
    return (await backend.get(SESSION_KEY, false)) ?? {
      currentUser: initialData.currentUser,
      month: initialData.month,
      theme: "light",
    };
  },
  saveSession(session) {
    return backend.set(SESSION_KEY, session, false);
  },

  // Carrega SOMENTE o compartilhado + o pessoal do usuário atual.
  async load(currentUser, month) {
    let [shared, mine] = await Promise.all([
      backend.get(sharedKey(month), true),
      backend.get(personalKey(currentUser, month), false),
    ]);
    const seed = month === initialData.month ? splitSeed() : null;
    if (!shared) {
      shared = seed?.shared ?? emptyShared(month);
      await backend.set(sharedKey(month), shared, true);
    }
    if (!mine) {
      mine = seed?.personal[currentUser] ?? emptyPersonal(currentUser);
      await backend.set(personalKey(currentUser, month), mine, false);
    }
    return { shared, mine };
  },

  saveShared(month, shared) {
    return backend.set(sharedKey(month), shared, true);
  },
  savePersonal(user, month, mine) {
    return backend.set(personalKey(user, month), mine, false);
  },

  async reset(month) {
    await Promise.all([
      backend.remove(sharedKey(month), true),
      ...USERS.map((u) => backend.remove(personalKey(u, month), false)),
    ]);
  },
};
