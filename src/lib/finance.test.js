import { describe, expect, it } from "vitest";
import { calculateBalances, calculateHouse, parseSplit, shareOf, visibleAccounts } from "./finance.js";
import { splitSeed } from "./storage.js";

const { shared, personal } = splitSeed();

describe("divisão da casa", () => {
  it("interpreta a divisão", () => {
    expect(parseSplit("50/50")).toEqual({ pessoa1: 0.5, pessoa2: 0.5 });
    expect(parseSplit("60/40").pessoa1).toBeCloseTo(0.6);
    expect(parseSplit("lixo")).toEqual({ pessoa1: 0.5, pessoa2: 0.5 });
  });

  it("não perde centavos", () => {
    const s = shareOf({ amount: 100.01, split: "50/50" });
    expect(s.pessoa1 + s.pessoa2).toBeCloseTo(100.01, 2);
  });

  it("fecha o total e o acerto com o seed", () => {
    const h = calculateHouse(shared.accounts);
    expect(h.total).toBe(10950);
    expect(h.fair).toEqual({ pessoa1: 5475, pessoa2: 5475 });
    expect(h.paying).toEqual({ pessoa1: 6150, pessoa2: 4800 });
    expect(h.settlement).toEqual({ from: "pessoa2", to: "pessoa1", amount: 675 });
  });

  it("os dois chegam ao mesmo acerto sem ver o pessoal do outro", () => {
    const a = calculateBalances(shared, personal.pessoa1, "pessoa1");
    const b = calculateBalances(shared, personal.pessoa2, "pessoa2");
    expect(a.settlement.amount).toBe(b.settlement.amount);
    expect(a.settlement.iReceive).toBe(true);
    expect(b.settlement.iReceive).toBe(false);
    expect(a.myShareOfHouse + b.myShareOfHouse).toBe(a.totalHouse);
  });
});

describe("saldo individual", () => {
  it("pessoa1", () => {
    const r = calculateBalances(shared, personal.pessoa1, "pessoa1");
    expect(r.myPersonal).toBe(14529.5);
    expect(r.myTotal).toBe(20004.5);
    expect(r.myBalance).toBe(7995.5);
  });

  it("pessoa2", () => {
    const r = calculateBalances(shared, personal.pessoa2, "pessoa2");
    expect(r.myBalance).toBe(22000 - 5475 - 890);
  });

  it("exemplo do enunciado: 2.000 pessoal + 4.000 de casa 50/50", () => {
    const house = { accounts: [{ id: "c", amount: 4000, split: "50/50", type: "shared" }] };
    const p1 = { incomes: [], accounts: [{ id: "x", amount: 2000 }] };
    const p2 = { incomes: [], accounts: [] };
    expect(calculateBalances(house, p1, "pessoa1").myTotal).toBe(4000);
    expect(calculateBalances(house, p2, "pessoa2").myTotal).toBe(2000);
  });
});

describe("privacidade", () => {
  it("nunca expõe valores pessoais do parceiro", () => {
    const r = calculateBalances(shared, personal.pessoa2, "pessoa2");
    expect(r.partner.personal).toBeNull();
    expect(r.partner.balance).toBeNull();
    expect(JSON.stringify(r)).not.toContain("14529");
    const ids = visibleAccounts(shared, personal.pessoa2, "pessoa2").map((a) => a.id);
    expect(ids).not.toContain("cartao-pessoa1");
    expect(ids).toContain("supermercado-pessoa2");
  });
});
