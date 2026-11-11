// Dados de exemplo — dezembro/2026.
// Este é o modelo "flat" original; o StorageManager o separa em
// um documento compartilhado e um documento pessoal por pessoa.
export const USERS = ["pessoa1", "pessoa2"];

export const initialData = {
  currentUser: "pessoa1",
  month: "2026-12",
  users: {
    pessoa1: { name: "Pessoa 1", initial: "1" },
    pessoa2: { name: "Pessoa 2", initial: "2" },
  },
  incomes: [
    { id: "salario1", name: "Salário", amount: 28000, owner: "pessoa1", type: "personal" },
    { id: "salario2", name: "Salário", amount: 22000, owner: "pessoa2", type: "personal" },
  ],
  accounts: [
    {
      id: "aluguel", name: "Aluguel", type: "shared", owner: null,
      amount: 4800, dueDay: 5, category: "moradia", split: "50/50",
      paidBy: "pessoa2", paid: false,
    },
    {
      id: "reserva", name: "Reserva", type: "shared", owner: null,
      amount: 4000, dueDay: 10, category: "reserva", split: "50/50",
      paidBy: "pessoa1", paid: false,
    },
    {
      id: "cartao-casa", name: "Cartão da casa", type: "shared", owner: null,
      amount: 2150, dueDay: 15, category: "cartao", split: "50/50",
      paidBy: "pessoa1", paid: false,
      card: { label: "Casa", tier: "Platinum", last4: "4821", limit: 12000, theme: "blue" },
    },
    {
      id: "cartao-pessoa1", name: "Cartão pessoal", type: "personal", owner: "pessoa1",
      amount: 14529.5, dueDay: 12, category: "cartao", paid: false,
      card: { label: "Pessoal", tier: "Black", last4: "0937", limit: 30000, theme: "graphite" },
    },
    {
      id: "supermercado-pessoa2", name: "Supermercado", type: "personal", owner: "pessoa2",
      amount: 890, dueDay: 8, category: "alimentacao", paid: false,
    },
  ],
};

export const CATEGORIES = {
  moradia: "Moradia",
  reserva: "Reserva",
  cartao: "Cartão",
  alimentacao: "Alimentação",
  transporte: "Transporte",
  contas: "Contas fixas",
  lazer: "Lazer",
  outros: "Outros",
};

export function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  const name = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
  return { name: name[0].toUpperCase() + name.slice(1), year: y, mm: String(m).padStart(2, "0") };
}

export function shiftMonth(month, delta) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
