import { describe, expect, it } from "vitest";
import { categoryTotals, goalPlan, netWorth, pickDay, inDays, spreadMonths, walletCards } from "./planning.js";

const cats = [{ id: "moradia", name: "Moradia", emoji: "🏠" }, { id: "lazer", name: "Lazer", emoji: "🎬" }];

describe("categoryTotals", () => {
  it("soma a parte de quem olha, ordena e fecha 100%", () => {
    const r = categoryTotals([
      { category: "moradia", amount: 4800, myShare: 2400 },
      { category: "lazer", amount: 300 },
      { category: "moradia", amount: 100, myShare: 50 },
      { category: "nova", amount: 0 },
    ], cats);
    expect(r.total).toBe(2750);
    expect(r.rows.map((x) => [x.id, x.value])).toEqual([["moradia", 2450], ["lazer", 300]]);
    expect(r.rows.reduce((s, x) => s + x.pct, 0)).toBeCloseTo(100);
  });
  it("categoria desconhecida vira linha com nome legível", () => {
    expect(categoryTotals([{ category: "pets", amount: 10 }], cats).rows[0]).toMatchObject({ name: "Pets", emoji: "🧾" });
  });
});

describe("walletCards", () => {
  it("junta cartões da carteira e os que só existem nas contas, com a fatura de cada um", () => {
    const accounts = [
      { id: "c1", name: "Cartão pessoal", amount: 1000, myShare: 1000, dueDay: 12, card: { theme: "blue", last4: "1111", limit: 5000 } },
      { id: "x", name: "Mercado", amount: 200, myShare: 200, cardId: "nu", paid: true },
      { id: "y", name: "Luz", amount: 300, myShare: 150, cardId: "nu", type: "shared", paid: false },
    ];
    const w = walletCards([{ id: "nu", name: "Roxinho", theme: "purple" }], accounts);
    expect(w.map((c) => c.id)).toEqual(["nu", "c1"]);
    expect(w[0]).toMatchObject({ invoice: 500, myInvoice: 350, paid: false, shared: true });
    expect(w[1]).toMatchObject({ name: "Cartão pessoal", invoice: 1000, theme: "blue", fromAccount: true });
  });
});

describe("goalPlan", () => {
  it("divide o que falta pelos meses até o prazo, contando o atual", () => {
    expect(goalPlan({ target: 12000, saved: 0, deadline: "2027-11" }, "2026-12")).toMatchObject({ monthsLeft: 12, perMonth: 1000 });
  });
  it("meta batida, sem prazo e atrasada", () => {
    expect(goalPlan({ target: 100, saved: 150 }, "2026-12")).toMatchObject({ done: true, pct: 100 });
    expect(goalPlan({ target: 100, saved: 40 }, "2026-12")).toMatchObject({ perMonth: null, remaining: 60 });
    expect(goalPlan({ target: 100, saved: 40, deadline: "2026-10" }, "2026-12")).toMatchObject({ late: true, perMonth: 60 });
  });
});

it("netWorth desconta dívidas e agrupa por tipo", () => {
  const r = netWorth([{ kind: "imovel", value: 500, debt: 300 }, { kind: "veiculo", value: 80 }, { kind: "x", value: 20 }]);
  expect(r).toMatchObject({ gross: 600, debt: 300, net: 300 });
  expect(r.byKind.map((k) => [k.kind, k.value])).toEqual([["imovel", 200], ["veiculo", 80], ["outros", 20]]);
});

describe("filtro por dias", () => {
  it("um clique escolhe o dia, o segundo faz a faixa, o terceiro recomeça", () => {
    let s = pickDay(null, 10);
    expect(s).toEqual({ from: 10, to: 10 });
    s = pickDay(s, 5);
    expect(s).toEqual({ from: 5, to: 10 });
    expect([4, 5, 8, 10, 15].filter((d) => inDays({ dueDay: d }, s))).toEqual([5, 8, 10]);
    expect(pickDay(s, 15)).toEqual({ from: 15, to: 15 });
    expect(pickDay({ from: 15, to: 15 }, 15)).toBeNull();
  });
});

describe("spreadMonths", () => {
  const item = { id: "tv", name: "TV", amount: 1000, paid: true };
  it("parcelas fecham o total no centavo e atravessam o ano", () => {
    const r = spreadMonths(item, "2026-11", "installments", 3);
    expect(r.map((x) => x.month)).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(r.map((x) => x.item.amount)).toEqual([333.33, 333.33, 333.34]);
    expect(r.map((x) => x.item.id)).toEqual(["tv", "tv@2026-12", "tv@2027-01"]);
    expect(r[2].item.installment).toEqual({ current: 3, total: 3 });
    expect(r.map((x) => x.item.paid)).toEqual([true, false, false]);
  });
  it("repetir mantém o valor; uma vez só gera um mês", () => {
    expect(spreadMonths(item, "2026-12", "repeat", 2).map((x) => x.item.amount)).toEqual([1000, 1000]);
    expect(spreadMonths(item, "2026-12", "once", 9)).toHaveLength(1);
  });
});
