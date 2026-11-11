// Lógica de divisão + privacidade.
//
// Regra de ouro: nenhuma função aqui recebe as contas pessoais do parceiro.
// Tudo o que os dois precisam para "fechar" a conta da casa vem só do
// documento compartilhado (valor, divisão e quem paga cada conta). O saldo
// individual usa o documento compartilhado + o documento pessoal de QUEM
// ESTÁ OLHANDO. Assim a divisão fecha sem que ninguém veja o que é do outro.

import { USERS } from "./seed.js";

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const sum = (list, pick = (x) => x.amount) => round2(list.reduce((s, x) => s + (Number(pick(x)) || 0), 0));

export const partnerOf = (user) => USERS.find((u) => u !== user);

// "50/50", "60/40"… o primeiro número é sempre da pessoa1.
export function parseSplit(split) {
  const m = /^\s*(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*$/.exec(split || "");
  if (!m) return { pessoa1: 0.5, pessoa2: 0.5 };
  const a = parseFloat(m[1].replace(",", "."));
  const b = parseFloat(m[2].replace(",", "."));
  if (a + b <= 0) return { pessoa1: 0.5, pessoa2: 0.5 };
  return { pessoa1: a / (a + b), pessoa2: b / (a + b) };
}

// Quanto de uma conta compartilhada cabe a cada um (centavos fecham sempre).
export function shareOf(account) {
  const ratio = parseSplit(account.split);
  const p1 = round2(account.amount * ratio.pessoa1);
  return { pessoa1: p1, pessoa2: round2(account.amount - p1) };
}

/**
 * Parte da casa — calculável por qualquer um dos dois, com o mesmo resultado.
 * @param {Array} sharedAccounts contas type === "shared"
 */
export function calculateHouse(sharedAccounts) {
  const fair = { pessoa1: 0, pessoa2: 0 }; // quanto cada um DEVERIA arcar
  const paying = { pessoa1: 0, pessoa2: 0 }; // quanto cada um efetivamente PAGA
  for (const a of sharedAccounts) {
    const s = shareOf(a);
    fair.pessoa1 += s.pessoa1;
    fair.pessoa2 += s.pessoa2;
    if (a.paidBy === "pessoa1" || a.paidBy === "pessoa2") {
      paying[a.paidBy] += a.amount;
    } else {
      // sem pagador definido: cada um paga a sua parte direto
      paying.pessoa1 += s.pessoa1;
      paying.pessoa2 += s.pessoa2;
    }
  }
  for (const u of USERS) {
    fair[u] = round2(fair[u]);
    paying[u] = round2(paying[u]);
  }
  const total = round2(fair.pessoa1 + fair.pessoa2);

  // Acerto: quem paga menos do que a sua parte devolve a diferença.
  const diff = round2(paying.pessoa1 - fair.pessoa1); // >0: pessoa2 deve à pessoa1
  const settlement =
    Math.abs(diff) < 0.01
      ? null
      : diff > 0
        ? { from: "pessoa2", to: "pessoa1", amount: diff }
        : { from: "pessoa1", to: "pessoa2", amount: -diff };

  const pct = (v) => (total > 0 ? (v / total) * 100 : 50);
  return {
    total,
    fair,
    paying,
    settlement,
    fairPct: { pessoa1: pct(fair.pessoa1), pessoa2: pct(fair.pessoa2) },
    payingPct: { pessoa1: pct(paying.pessoa1), pessoa2: pct(paying.pessoa2) },
  };
}

/**
 * Visão de quem está logado.
 * @param {{accounts: Array}} shared documento compartilhado
 * @param {{incomes: Array, accounts: Array}} mine documento pessoal do usuário atual
 * @param {"pessoa1"|"pessoa2"} currentUser
 */
export function calculateBalances(shared, mine, currentUser) {
  const partner = partnerOf(currentUser);
  const house = calculateHouse(shared.accounts);

  const myIncome = sum(mine.incomes);
  const myPersonal = sum(mine.accounts);
  const myShareOfHouse = house.fair[currentUser];
  const myTotal = round2(myShareOfHouse + myPersonal);
  const myBalance = round2(myIncome - myTotal);

  // O que realmente sai da minha conta no mês (antes do acerto por Pix).
  const myCashOut = round2(house.paying[currentUser] + myPersonal);

  const settlement = house.settlement && {
    ...house.settlement,
    iReceive: house.settlement.to === currentUser,
  };

  const pctOfIncome = (v) => (myIncome > 0 ? (v / myIncome) * 100 : 0);

  return {
    totalHouse: house.total,
    house,
    myIncome,
    myPersonal,
    myShareOfHouse,
    myTotal,
    myBalance,
    myCashOut,
    settlement,
    pct: {
      house: pctOfIncome(myShareOfHouse),
      personal: pctOfIncome(myPersonal),
      free: pctOfIncome(myBalance),
    },
    splitPercentage: { me: house.fairPct[currentUser], partner: house.fairPct[partner] },
    // Do parceiro só existe o que deriva da casa. Pessoal e saldo: privados.
    partner: {
      id: partner,
      shareOfHouse: house.fair[partner],
      paying: house.paying[partner],
      personal: null,
      balance: null,
    },
  };
}

// Contas que o usuário atual enxerga, com a parte que pesa no bolso dele.
export function visibleAccounts(shared, mine, currentUser) {
  const list = [
    ...shared.accounts.map((a) => ({ ...a, myShare: shareOf(a)[currentUser] })),
    ...mine.accounts.map((a) => ({ ...a, myShare: a.amount })),
  ];
  return list.sort((a, b) => a.dueDay - b.dueDay || a.name.localeCompare(b.name));
}

// Saldo projetado dia a dia (renda entra no dia 1, cada conta sai no vencimento).
export function cashFlowSeries(shared, mine, currentUser, daysInMonth = 31) {
  const b = calculateBalances(shared, mine, currentUser);
  const out = new Array(daysInMonth + 1).fill(0);
  for (const a of visibleAccounts(shared, mine, currentUser)) {
    const d = Math.min(Math.max(1, a.dueDay), daysInMonth);
    out[d] += a.myShare;
  }
  let running = b.myIncome;
  const series = [];
  for (let d = 1; d <= daysInMonth; d++) {
    running = round2(running - out[d]);
    series.push({ day: d, saldo: running, saida: round2(out[d]) });
  }
  return series;
}

export function byCategory(shared, mine, currentUser) {
  const map = {};
  for (const a of visibleAccounts(shared, mine, currentUser)) {
    map[a.category] ??= { category: a.category, casa: 0, pessoal: 0 };
    map[a.category][a.type === "shared" ? "casa" : "pessoal"] += a.myShare;
  }
  return Object.values(map)
    .map((r) => ({ ...r, casa: round2(r.casa), pessoal: round2(r.pessoal) }))
    .sort((a, b) => b.casa + b.pessoal - (a.casa + a.pessoal));
}
