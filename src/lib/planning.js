// Cálculos das telas novas: categorias, carteira de cartões, metas, patrimônio,
// filtro por dias e lançamentos em vários meses. Tudo puro e testado
// (planning.test.js). Recebe só o que quem está olhando já enxerga (R1).

import { shiftMonth } from "./seed.js";

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// ── categorias ─────────────────────────────────────────────
export const categoryOf = (categories, id) =>
  categories.find((c) => c.id === id) ?? { id, name: id ? id[0].toUpperCase() + id.slice(1) : "Sem categoria", emoji: "🧾" };

// Quanto cada categoria pesa no bolso de quem olha (myShare), maior primeiro.
export function categoryTotals(accounts, categories) {
  const map = new Map();
  for (const a of accounts) {
    const c = categoryOf(categories, a.category);
    const row = map.get(c.id) ?? { ...c, value: 0, count: 0 };
    row.value += a.myShare ?? a.amount;
    row.count += 1;
    map.set(c.id, row);
  }
  const rows = [...map.values()].map((r) => ({ ...r, value: round2(r.value) })).filter((r) => r.value > 0);
  const total = round2(rows.reduce((s, r) => s + r.value, 0));
  return {
    total,
    rows: rows
      .sort((a, b) => b.value - a.value)
      .map((r) => ({ ...r, pct: total > 0 ? (r.value / total) * 100 : 0 })),
  };
}

// ── carteira ───────────────────────────────────────────────
// Conta antiga com `card` embutido é a própria fatura daquele cartão.
export const cardIdOf = (a) => a.cardId ?? (a.card ? a.id : null);

// Cartões da carteira (documento pessoal) + cartões que só aparecem nas contas
// do mês (os antigos, e os da casa que o parceiro cadastrou). Cada um com a
// fatura do mês: total, a parte de quem olha e os lançamentos.
export function walletCards(profileCards, accounts) {
  const cards = profileCards.map((c) => ({ ...c }));
  const known = new Set(cards.map((c) => c.id));
  for (const a of accounts) {
    const id = cardIdOf(a);
    if (!id || known.has(id)) continue;
    known.add(id);
    const snap = a.card ?? {};
    cards.push({
      id, name: snap.name ?? a.name, theme: snap.theme ?? "graphite", color: snap.color,
      last4: snap.last4 ?? "0000", limit: snap.limit ?? 0, dueDay: a.dueDay, tier: snap.tier, fromAccount: true,
    });
  }
  return cards.map((c) => {
    const items = accounts.filter((a) => cardIdOf(a) === c.id);
    return {
      ...c,
      items,
      shared: items.some((a) => a.type === "shared"),
      invoice: round2(items.reduce((s, a) => s + a.amount, 0)),
      myInvoice: round2(items.reduce((s, a) => s + (a.myShare ?? a.amount), 0)),
      paid: items.length > 0 && items.every((a) => a.paid),
      dueDay: c.dueDay ?? items[0]?.dueDay ?? 10,
    };
  });
}

// ── metas ──────────────────────────────────────────────────
export const monthsBetween = (from, to) => {
  const [y1, m1] = from.split("-").map(Number);
  const [y2, m2] = to.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
};

// Quanto falta, e quanto guardar por mês para chegar no prazo (contando o mês atual).
export function goalPlan(goal, month) {
  const target = Number(goal.target) || 0;
  const saved = Number(goal.saved) || 0;
  const remaining = round2(Math.max(0, target - saved));
  const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
  if (remaining === 0) return { remaining, pct, done: true, monthsLeft: 0, perMonth: 0, late: false };
  if (!goal.deadline) return { remaining, pct, done: false, monthsLeft: null, perMonth: null, late: false };
  const left = monthsBetween(month, goal.deadline) + 1;
  if (left <= 0) return { remaining, pct, done: false, monthsLeft: 0, perMonth: remaining, late: true };
  return { remaining, pct, done: false, monthsLeft: left, perMonth: round2(Math.ceil((remaining / left) * 100) / 100), late: false };
}

// ── patrimônio ─────────────────────────────────────────────
export const ASSET_KINDS = {
  imovel: { name: "Imóveis", emoji: "🏘️" },
  veiculo: { name: "Veículos", emoji: "🚙" },
  investimento: { name: "Investimentos", emoji: "📈" },
  outros: { name: "Outros bens", emoji: "💎" },
};

export function netWorth(assets) {
  const gross = round2(assets.reduce((s, a) => s + (Number(a.value) || 0), 0));
  const debt = round2(assets.reduce((s, a) => s + (Number(a.debt) || 0), 0));
  const byKind = Object.keys(ASSET_KINDS)
    .map((k) => {
      const list = assets.filter((a) => (ASSET_KINDS[a.kind] ? a.kind : "outros") === k);
      const value = round2(list.reduce((s, a) => s + (Number(a.value) || 0) - (Number(a.debt) || 0), 0));
      return { kind: k, ...ASSET_KINDS[k], value, count: list.length };
    })
    .filter((r) => r.count > 0);
  return { gross, debt, net: round2(gross - debt), byKind };
}

// ── filtro por dias do mês ─────────────────────────────────
// sel: null (todas) | { from, to } (inclusive). Um dia só = from === to.
export const inDays = (a, sel) => !sel || (a.dueDay >= sel.from && a.dueDay <= sel.to);

// Clique em um dia: sem seleção → aquele dia; com um dia → faixa entre os dois;
// com faixa ou no mesmo dia → recomeça (ou limpa, se clicou no dia já único).
export function pickDay(sel, day) {
  if (!sel) return { from: day, to: day };
  if (sel.from === sel.to) {
    if (day === sel.from) return null;
    return { from: Math.min(day, sel.from), to: Math.max(day, sel.from) };
  }
  return { from: day, to: day };
}

// ── lançar em vários meses ─────────────────────────────────
// mode: "once" | "repeat" (mesmo valor todo mês) | "installments" (valor dividido).
// Devolve [{ month, item }]. Ids estáveis `<id>@<mês>` a partir do 2º mês, para
// não duplicar ao salvar de novo. Parcelas fecham o total no centavo (R5).
export function spreadMonths(item, start, mode = "once", n = 1) {
  const count = mode === "once" ? 1 : Math.max(1, Math.min(60, Math.floor(n) || 1));
  const base = round2(item.amount / (mode === "installments" ? count : 1));
  return Array.from({ length: count }, (_, i) => {
    const month = shiftMonth(start, i);
    let amount = mode === "installments" && i === count - 1 ? round2(item.amount - base * (count - 1)) : base;
    if (mode !== "installments") amount = item.amount;
    const extra = mode === "installments" ? { installment: { current: i + 1, total: count } }
      : mode === "repeat" ? { recurring: true } : {};
    return { month, item: { ...item, ...extra, id: i === 0 ? item.id : `${item.id}@${month}`, amount, paid: i === 0 ? !!item.paid : false } };
  });
}
