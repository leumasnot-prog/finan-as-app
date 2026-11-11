import { useEffect, useState } from "react";
import { Lock, Trash2, Users, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { CARD_THEMES } from "@/components/CreditCardVisual";
import { CATEGORIES } from "@/lib/seed";
import { cn, uid } from "@/lib/utils";

const KINDS = [
  { id: "shared", label: "Da casa", icon: Users, hint: "Os dois veem e dividem." },
  { id: "personal", label: "Pessoal", icon: Lock, hint: "Só você vê. Não aparece para o outro." },
  { id: "income", label: "Renda", icon: Wallet, hint: "Sua renda é privada." },
];
const SPLITS = ["50/50", "60/40", "40/60", "70/30", "30/70", "100/0", "0/100"];

const blank = (kind, me) => ({
  kind, name: "", amount: "", dueDay: 10, category: kind === "shared" ? "moradia" : "outros",
  split: "50/50", paidBy: me, limit: "", theme: "graphite",
});

// editing: { kind, item } | null
export function AddTransactionModal({ open, onOpenChange, editing, defaultKind = "shared", me, users, onSave, onDelete }) {
  const [f, setF] = useState(blank(defaultKind, me));
  useEffect(() => {
    if (!open) return;
    if (editing) {
      const it = editing.item;
      setF({
        ...blank(editing.kind, me), ...it, kind: editing.kind,
        amount: String(it.amount).replace(".", ","), paidBy: it.paidBy ?? "each",
        limit: it.card?.limit ?? "", theme: it.card?.theme ?? "graphite",
      });
    } else setF(blank(defaultKind, me));
  }, [open, editing, defaultKind, me]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const amount = parseFloat(String(f.amount).replace(/\./g, "").replace(",", "."));
  const valid = f.name.trim() && amount > 0;
  const isBill = f.kind !== "income";

  function submit(e) {
    e.preventDefault();
    if (!valid) return;
    const id = editing?.item.id ?? uid();
    if (f.kind === "income") {
      onSave("income", { id, name: f.name.trim(), amount, owner: me, type: "personal" });
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
      if (f.category === "cartao") {
        item.card = {
          ...(editing?.item.card ?? { last4: String(Math.floor(1000 + Math.random() * 9000)), tier: "Card" }),
          limit: parseFloat(f.limit) || 0, theme: f.theme,
        };
      }
      onSave(f.kind, item);
    }
    onOpenChange(false);
  }

  const kind = KINDS.find((k) => k.id === f.kind);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{editing ? "Editar" : "Adicionar"}</DialogTitle>
        <DialogDescription className="mt-1">{kind.hint}</DialogDescription>
        <form onSubmit={submit} className="mt-4 space-y-4">
          {!editing && (
            <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1" role="tablist">
              {KINDS.map((k) => (
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
              <Label htmlFor="tx-cat">Categoria</Label>
              <Select id="tx-cat" value={f.category} onChange={set("category")}>
                {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </div>
          )}
          {isBill && f.category === "cartao" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tx-limit">Limite (R$)</Label>
                <Input id="tx-limit" type="number" min="0" value={f.limit} onChange={set("limit")} placeholder="Opcional" />
              </div>
              <div>
                <Label htmlFor="tx-theme">Cor do cartão</Label>
                <Select id="tx-theme" value={f.theme} onChange={set("theme")}>
                  {CARD_THEMES.map((t) => <option key={t} value={t}>{{ graphite: "Grafite", blue: "Azul", orange: "Laranja", sand: "Areia" }[t]}</option>)}
                </Select>
              </div>
            </div>
          )}
          {f.kind === "shared" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tx-split">Divisão ({users.pessoa1.name} / {users.pessoa2.name})</Label>
                <Select id="tx-split" value={f.split} onChange={set("split")}>
                  {[...new Set([...SPLITS, f.split])].map((s) => <option key={s}>{s}</option>)}
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
