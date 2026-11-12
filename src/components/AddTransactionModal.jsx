import { useEffect, useState } from "react";
import { Lock, Plus, Trash2, Users, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Emoji } from "@/components/Emoji";
import { cardIdOf, spreadMonths } from "@/lib/planning";
import { monthLabel } from "@/lib/seed";
import { cn, money, uid } from "@/lib/utils";
import { splitLabel } from "@/lib/finance";

const KINDS = [
  { id: "shared", label: "Da casa", icon: Users, hint: "Os dois veem e dividem." },
  { id: "personal", label: "Pessoal", icon: Lock, hint: "Só você vê. Não aparece para o outro." },
  { id: "income", label: "Renda", icon: Wallet, hint: "Sua renda é privada." },
];
const SPLITS = ["50/50", "60/40", "40/60", "70/30", "30/70", "100/0", "0/100"];

const blank = (kind, me, month, preset = {}) => ({
  kind, name: "", amount: "", dueDay: 10, category: kind === "shared" ? "moradia" : preset.payWith ? "alimentacao" : "outros",
  split: "50/50", paidBy: me, payWith: "", repeat: "once", times: 3, start: month, ...preset,
});
const REPEAT = [
  ["once", "Só uma vez"],
  ["repeat", "Todo mês"],
  ["installments", "Parcelado"],
];
const shortMonth = (ym) => { const l = monthLabel(ym); return `${l.name.slice(0, 3).toLowerCase()}/${String(l.year).slice(2)}`; };

// editing: { kind, item } | null
// onSave(kind, item, spread) — spread = [{ month, item }] quando a conta vai para vários meses.
export function AddTransactionModal({ open, onOpenChange, editing, defaultKind = "shared", preset, me, users, solo, month, categories = [], wallet = [], onNewCategory, onSave, onDelete }) {
  const [f, setF] = useState(blank(defaultKind, me, month));
  useEffect(() => {
    if (!open) return;
    if (editing) {
      const it = editing.item;
      setF({
        ...blank(editing.kind, me, month), ...it, kind: editing.kind,
        amount: String(it.amount).replace(".", ","), paidBy: it.paidBy ?? "each", payWith: cardIdOf(it) ?? "",
      });
    } else setF(blank(defaultKind, me, month, preset));
  }, [open, editing, defaultKind, me, month, preset]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const amount = parseFloat(String(f.amount).replace(/\./g, "").replace(",", "."));
  const valid = f.name.trim() && amount > 0;
  const isBill = f.kind !== "income";

  const times = Math.max(2, Math.min(60, parseInt(f.times, 10) || 2));
  const spread = !editing && f.repeat !== "once" ? spreadMonths({ id: "x", amount: amount || 0 }, f.start || month, f.repeat, times) : null;

  function submit(e) {
    e.preventDefault();
    if (!valid) return;
    const id = editing?.item.id ?? uid();
    const many = (item) => (editing ? null : spreadMonths(item, f.start || month, f.repeat, f.repeat === "once" ? 1 : times));
    if (f.kind === "income") {
      const item = { id, name: f.name.trim(), amount, owner: me, type: "personal" };
      onSave("income", item, many(item));
    } else {
      const item = {
        id, name: f.name.trim(), amount, type: f.kind,
        owner: f.kind === "personal" ? me : null,
        dueDay: Math.min(31, Math.max(1, parseInt(f.dueDay, 10) || 1)),
        category: f.category, paid: editing?.item.paid ?? false,
      };
      if (f.kind === "shared") {
        item.split = f.split;
        item.paidBy = f.paidBy === "each" ? null : f.paidBy;
      }
      // Pago com cartão da carteira: guarda o id e um retrato do cartão, para
      // o parceiro ver nome e cor numa conta da casa sem ler a sua carteira.
      if (f.payWith && f.payWith === id && editing?.item.card) item.card = editing.item.card;
      else if (f.payWith) {
        const c = wallet.find((w) => w.id === f.payWith);
        item.cardId = f.payWith;
        if (c) item.card = { name: c.name, theme: c.theme, color: c.color, last4: c.last4, limit: c.limit };
      }
      if (editing?.item.installment) item.installment = editing.item.installment;
      if (editing?.item.recurring) item.recurring = true;
      onSave(f.kind, item, many(item));
    }
    onOpenChange(false);
  }

  // No modo "só eu" não existe conta da casa nem privacidade a explicar.
  const kinds = solo
    ? [{ ...KINDS[1], label: "Conta", hint: "Uma conta do seu mês." }, { ...KINDS[2], hint: "Quanto entra no mês." }]
    : KINDS;
  const kind = kinds.find((k) => k.id === f.kind) ?? KINDS.find((k) => k.id === f.kind);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{editing ? "Editar" : "Adicionar"}</DialogTitle>
        <DialogDescription className="mt-1">{kind.hint}</DialogDescription>
        <form onSubmit={submit} className="mt-4 space-y-4">
          {!editing && (
            <div className={cn("grid gap-1 rounded-md bg-muted p-1", solo ? "grid-cols-2" : "grid-cols-3")} role="tablist">
              {kinds.map((k) => (
                <button key={k.id} type="button" role="tab" aria-selected={f.kind === k.id}
                  onClick={() => setF((p) => ({ ...p, kind: k.id }))}
                  className={cn("flex items-center justify-center gap-1.5 rounded px-2 py-2 text-xs font-semibold",
                    f.kind === k.id ? "bg-card shadow-sm" : "text-muted-foreground")}>
                  <k.icon className="h-3.5 w-3.5" />{k.label}
                </button>
              ))}
            </div>
          )}
          <div>
            <Label htmlFor="tx-name">Nome</Label>
            <Input id="tx-name" value={f.name} onChange={set("name")} placeholder={isBill ? "Ex.: Condomínio" : "Ex.: Salário"} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={isBill ? "" : "col-span-2"}>
              <Label htmlFor="tx-amount">Valor (R$)</Label>
              <Input id="tx-amount" inputMode="decimal" value={f.amount} onChange={set("amount")} placeholder="0,00" />
            </div>
            {isBill && (
              <div>
                <Label htmlFor="tx-day">Dia do vencimento</Label>
                <Input id="tx-day" type="number" min="1" max="31" value={f.dueDay} onChange={set("dueDay")} />
              </div>
            )}
          </div>
          {isBill && (
            <div>
              <Label>Categoria</Label>
              <div className="flex max-h-[104px] flex-wrap gap-1.5 overflow-y-auto" role="radiogroup" aria-label="Categoria">
                {categories.map((c) => (
                  <button key={c.id} type="button" role="radio" aria-checked={f.category === c.id} onClick={() => setF((p) => ({ ...p, category: c.id }))}
                    className={cn("flex items-center gap-1 rounded-full border py-0.5 pl-1 pr-2.5 text-xs font-semibold transition-colors",
                      f.category === c.id ? "border-primary bg-tint text-tint-foreground" : "bg-card hover:bg-muted")}>
                    <Emoji char={c.emoji} size={20} />{c.name}
                  </button>
                ))}
                {onNewCategory && (
                  <button type="button" onClick={onNewCategory} className="flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted">
                    <Plus className="h-3 w-3" />Nova
                  </button>
                )}
              </div>
            </div>
          )}
          {isBill && (wallet.length > 0 || f.payWith) && (
            <div>
              <Label htmlFor="tx-card">Pagar com</Label>
              <Select id="tx-card" value={f.payWith} onChange={set("payWith")}>
                <option value="">Boleto, Pix ou débito</option>
                {wallet.map((c) => <option key={c.id} value={c.id}>Cartão {c.name} · final {c.last4}</option>)}
              </Select>
            </div>
          )}
          {!editing && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1" role="radiogroup" aria-label="Repetir">
                {REPEAT.map(([k, l]) => (
                  <button key={k} type="button" role="radio" aria-checked={f.repeat === k} onClick={() => setF((p) => ({ ...p, repeat: k }))}
                    className={cn("rounded px-1 py-1.5 text-xs font-semibold", f.repeat === k ? "bg-card shadow-sm" : "text-muted-foreground")}>{l}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="tx-start">{f.repeat === "once" ? "Mês" : "Começa em"}</Label>
                  <Input id="tx-start" type="month" value={f.start} onChange={set("start")} />
                </div>
                {f.repeat !== "once" && (
                  <div>
                    <Label htmlFor="tx-times">{f.repeat === "installments" ? "Parcelas" : "Por quantos meses"}</Label>
                    <Input id="tx-times" type="number" min="2" max="60" value={f.times} onChange={set("times")} />
                  </div>
                )}
              </div>
              {spread && amount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {f.repeat === "installments"
                    ? <>{times}× de <strong className="text-foreground">{money(spread[0].item.amount)}</strong></>
                    : <><strong className="text-foreground">{money(amount)}</strong> por mês</>}
                  {" "}de {shortMonth(spread[0].month)} a {shortMonth(spread[spread.length - 1].month)}.
                </p>
              )}
            </div>
          )}
          {f.kind === "shared" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tx-split">Divisão ({users.pessoa1.name} / {users.pessoa2.name})</Label>
                <Select id="tx-split" value={f.split} onChange={set("split")}>
                  {[...new Set([...SPLITS, f.split])].map((s) => <option key={s} value={s}>{splitLabel(s, users)}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="tx-payer">Quem paga o boleto</Label>
                <Select id="tx-payer" value={f.paidBy} onChange={set("paidBy")}>
                  <option value="pessoa1">{users.pessoa1.name}</option>
                  <option value="pessoa2">{users.pessoa2.name}</option>
                  <option value="each">Cada um a sua parte</option>
                </Select>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            {editing && (
              <Button type="button" variant="destructive" onClick={() => { onDelete(editing.kind, editing.item.id); onOpenChange(false); }}>
                <Trash2 className="h-4 w-4" />Excluir
              </Button>
            )}
            <Button type="submit" disabled={!valid} className="ml-auto min-w-28">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
