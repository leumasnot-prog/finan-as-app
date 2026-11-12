import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Emoji } from "@/components/Emoji";
import { EmojiPicker } from "@/components/EmojiPicker";
import { CreditCardVisual, CARD_THEME_NAMES, cardBackground } from "@/components/CreditCardVisual";
import { ASSET_KINDS } from "@/lib/planning";
import { cn, money, uid } from "@/lib/utils";

// "1.234,56" ou "1234.56" → 1234.56
export const parseMoney = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return NaN;
  return parseFloat(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
};
const showMoney = (n) => (n || n === 0 ? String(n).replace(".", ",") : "");

function Shell({ open, onOpenChange, title, hint, onSubmit, valid, onDelete, deleteLabel = "Excluir", submitLabel = "Salvar", children }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        {hint && <DialogDescription className="mt-1">{hint}</DialogDescription>}
        <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid) { onSubmit(); onOpenChange(false); } }}>
          {children}
          <div className="flex items-center gap-2 pt-1">
            {onDelete && (
              <Button type="button" variant="destructive" onClick={() => { onDelete(); onOpenChange(false); }}>
                <Trash2 className="h-4 w-4" />{deleteLabel}
              </Button>
            )}
            <Button type="submit" disabled={!valid} className="ml-auto min-w-28">{submitLabel}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Escolha de emoji: o atual em destaque + a grade.
function EmojiField({ value, onChange, id }) {
  return (
    <div>
      <Label htmlFor={id} className="flex items-center gap-2">Emoji <Emoji char={value} size={20} /></Label>
      <EmojiPicker id={id} value={value} onChange={onChange} />
    </div>
  );
}

function useForm(open, init) {
  const [f, setF] = useState(init);
  useEffect(() => { if (open) setF(init); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e?.target ? e.target.value : e }));
  return [f, setF, set];
}

// ── categoria ──────────────────────────────────────────────
export function CategoryDialog({ open, onOpenChange, editing, onSave, onDelete, inUse }) {
  const [f, , set] = useForm(open, editing ?? { name: "", emoji: "🛒" });
  return (
    <Shell open={open} onOpenChange={onOpenChange} title={editing ? "Editar categoria" : "Nova categoria"}
      hint="Categorias valem para os dois e para todos os meses."
      valid={!!f.name.trim()} onSubmit={() => onSave({ id: editing?.id ?? uid(), name: f.name.trim(), emoji: f.emoji })}
      onDelete={editing && !inUse ? () => onDelete(editing.id) : null}>
      <div>
        <Label htmlFor="cat-name">Nome</Label>
        <Input id="cat-name" value={f.name} onChange={set("name")} maxLength={24} placeholder="Ex.: Pets" autoFocus />
        {editing && inUse && <p className="mt-1.5 text-xs text-muted-foreground">Tem contas usando esta categoria, por isso ela não pode ser excluída.</p>}
      </div>
      <EmojiField id="cat-emoji" value={f.emoji} onChange={set("emoji")} />
    </Shell>
  );
}

// ── cartão ─────────────────────────────────────────────────
export function CardDialog({ open, onOpenChange, editing, month, onSave, onDelete }) {
  const [f, setF, set] = useForm(open, {
    name: "", theme: "purple", color: "", last4: "", limit: "", dueDay: 10, ...editing,
    limit: showMoney(editing?.limit),
  });
  const limit = parseMoney(f.limit);
  const preview = { ...f, limit: limit || 0, invoice: editing?.invoice ?? 0, paid: false, last4: f.last4 || "0000", name: f.name || "Seu cartão" };
  return (
    <Shell open={open} onOpenChange={onOpenChange} title={editing ? "Editar cartão" : "Novo cartão"}
      hint="Fica na sua carteira, só você vê. Uma conta da casa paga com ele mostra o nome e a cor para os dois."
      valid={!!f.name.trim() && /^\d{0,4}$/.test(f.last4)}
      onSubmit={() => onSave({
        id: editing?.id ?? uid(), name: f.name.trim(), theme: f.theme, color: f.color || undefined,
        last4: f.last4.padStart(4, "0"), limit: limit || 0, dueDay: Math.min(31, Math.max(1, parseInt(f.dueDay, 10) || 1)),
      })}
      onDelete={editing && !editing.fromAccount ? () => onDelete(editing.id) : null} deleteLabel="Tirar da carteira">
      <CreditCardVisual wallet={preview} month={month} className="mx-auto max-w-[300px]" />
      <div>
        <Label htmlFor="card-name">Nome do cartão</Label>
        <Input id="card-name" value={f.name} onChange={set("name")} maxLength={22} placeholder="Ex.: Roxinho, Black do mercado" autoFocus />
      </div>
      <div>
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor do cartão">
          {Object.entries(CARD_THEME_NAMES).map(([t, name]) => (
            <button key={t} type="button" role="radio" aria-checked={!f.color && f.theme === t} title={name} aria-label={name}
              onClick={() => setF((p) => ({ ...p, theme: t, color: "" }))}
              className={cn("h-9 w-9 rounded-full border-2 border-card shadow-card ring-offset-2 ring-offset-card transition-transform hover:scale-110",
                !f.color && f.theme === t && "ring-2 ring-primary")}
              style={{ background: cardBackground(t) }} />
          ))}
          <label title="Outra cor" className={cn("relative grid h-9 w-9 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-dashed text-lg leading-none text-muted-foreground ring-offset-2 ring-offset-card",
            f.color && "border-solid ring-2 ring-primary")} style={f.color ? { background: f.color } : undefined}>
            {!f.color && "+"}
            <input type="color" aria-label="Outra cor" className="absolute inset-0 cursor-pointer opacity-0" value={f.color || "#7a1fe0"} onChange={set("color")} />
          </label>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="card-last4">Final</Label>
          <Input id="card-last4" inputMode="numeric" maxLength={4} value={f.last4} onChange={(e) => set("last4")(e.target.value.replace(/\D/g, ""))} placeholder="1234" />
        </div>
        <div>
          <Label htmlFor="card-limit">Limite (R$)</Label>
          <Input id="card-limit" inputMode="decimal" value={f.limit} onChange={set("limit")} placeholder="0,00" />
        </div>
        <div>
          <Label htmlFor="card-due">Vence dia</Label>
          <Input id="card-due" type="number" min="1" max="31" value={f.dueDay} onChange={set("dueDay")} />
        </div>
      </div>
    </Shell>
  );
}

// ── meta ───────────────────────────────────────────────────
export const GOAL_KINDS = {
  guardar: { name: "Guardar dinheiro", emoji: "💰" },
  investimento: { name: "Investimento", emoji: "📈" },
  emergencia: { name: "Reserva de emergência", emoji: "🛡️" },
  viagem: { name: "Viagem", emoji: "✈️" },
  outro: { name: "Outro sonho", emoji: "⭐" },
};

function Chips({ value, options, onChange, label }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
      {Object.entries(options).map(([k, o]) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)}
          className={cn("flex items-center gap-1.5 rounded-full border py-1 pl-1.5 pr-3 text-xs font-semibold transition-colors",
            value === k ? "border-primary bg-tint text-tint-foreground" : "bg-card hover:bg-muted")}>
          <Emoji char={o.emoji} size={20} />{o.name}
        </button>
      ))}
    </div>
  );
}

export function GoalDialog({ open, onOpenChange, editing, monthlySpend, onSave, onDelete }) {
  const [f, setF, set] = useForm(open, {
    kind: "guardar", emoji: "💰", name: "", deadline: "", ...editing,
    target: showMoney(editing?.target), saved: showMoney(editing?.saved ?? 0),
  });
  const target = parseMoney(f.target);
  const saved = parseMoney(f.saved) || 0;
  const suggestion = Math.round((monthlySpend || 0) * 6);
  const pickKind = (k) => setF((p) => ({
    ...p, kind: k,
    emoji: Object.values(GOAL_KINDS).some((o) => o.emoji === p.emoji) ? GOAL_KINDS[k].emoji : p.emoji,
    name: !p.name || Object.values(GOAL_KINDS).some((o) => o.name === p.name) ? GOAL_KINDS[k].name : p.name,
  }));
  return (
    <Shell open={open} onOpenChange={onOpenChange} title={editing ? "Editar meta" : "Nova meta"} hint="Suas metas são privadas."
      valid={!!f.name.trim() && target > 0}
      onSubmit={() => onSave({ id: editing?.id ?? uid(), kind: f.kind, emoji: f.emoji, name: f.name.trim(), target, saved, deadline: f.deadline || undefined })}
      onDelete={editing ? () => onDelete(editing.id) : null}>
      <Chips value={f.kind} options={GOAL_KINDS} onChange={pickKind} label="Tipo de meta" />
      <div>
        <Label htmlFor="goal-name">Nome</Label>
        <Input id="goal-name" value={f.name} onChange={set("name")} maxLength={32} placeholder="Ex.: Viagem ao Japão" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="goal-target">Quanto quer juntar (R$)</Label>
          <Input id="goal-target" inputMode="decimal" value={f.target} onChange={set("target")} placeholder="0,00" />
        </div>
        <div>
          <Label htmlFor="goal-saved">Já guardado (R$)</Label>
          <Input id="goal-saved" inputMode="decimal" value={f.saved} onChange={set("saved")} placeholder="0,00" />
        </div>
      </div>
      {f.kind === "emergencia" && suggestion > 0 && (
        <p className="rounded-md bg-tint px-3 py-2 text-xs text-tint-foreground">
          O comum é ter 6 meses dos seus gastos: <strong className="whitespace-nowrap">{money(suggestion)}</strong>.{" "}
          <button type="button" className="font-semibold underline" onClick={() => setF((p) => ({ ...p, target: String(suggestion) }))}>Usar esse valor</button>
        </p>
      )}
      <div>
        <Label htmlFor="goal-deadline">Até quando (opcional)</Label>
        <Input id="goal-deadline" type="month" value={f.deadline ?? ""} onChange={set("deadline")} />
      </div>
      <EmojiField id="goal-emoji" value={f.emoji} onChange={set("emoji")} />
    </Shell>
  );
}

// Guardar (ou retirar) dinheiro de uma meta.
export function DepositDialog({ open, onOpenChange, goal, suggested, onSave }) {
  const [f, setF, set] = useForm(open, { amount: suggested ? showMoney(suggested) : "", expense: true, withdraw: false });
  const amount = parseMoney(f.amount);
  if (!goal) return null;
  return (
    <Shell open={open} onOpenChange={onOpenChange} title={<span className="flex items-center gap-2"><Emoji char={goal.emoji} size={24} />{goal.name}</span>}
      hint={`Guardado até agora: ${money(goal.saved)} de ${money(goal.target)}.`}
      valid={amount > 0} submitLabel={f.withdraw ? "Retirar" : "Guardar"}
      onSubmit={() => onSave(goal, f.withdraw ? -amount : amount, !f.withdraw && f.expense)}>
      <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1" role="group" aria-label="Guardar ou retirar">
        {[[false, "Guardar"], [true, "Retirar"]].map(([w, l]) => (
          <button key={l} type="button" aria-pressed={f.withdraw === w} onClick={() => setF((p) => ({ ...p, withdraw: w }))}
            className={cn("rounded py-1.5 text-xs font-semibold", f.withdraw === w ? "bg-card shadow-sm" : "text-muted-foreground")}>{l}</button>
        ))}
      </div>
      <div>
        <Label htmlFor="dep-amount">Valor (R$)</Label>
        <Input id="dep-amount" inputMode="decimal" value={f.amount} onChange={set("amount")} placeholder="0,00" autoFocus />
      </div>
      {!f.withdraw && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" checked={f.expense} onChange={(e) => setF((p) => ({ ...p, expense: e.target.checked }))} />
          <span>Lançar também como saída deste mês<span className="block text-xs text-muted-foreground">Entra nas suas contas como “Reserva”, já paga.</span></span>
        </label>
      )}
    </Shell>
  );
}

// ── bem ────────────────────────────────────────────────────
export function AssetDialog({ open, onOpenChange, editing, onSave, onDelete }) {
  const [f, setF, set] = useForm(open, {
    kind: "imovel", emoji: "🏢", name: "", ...editing,
    value: showMoney(editing?.value), debt: showMoney(editing?.debt || ""),
  });
  const value = parseMoney(f.value);
  const debt = parseMoney(f.debt) || 0;
  const pickKind = (k) => setF((p) => ({ ...p, kind: k, emoji: Object.values(ASSET_KINDS).some((o) => o.emoji === p.emoji) || p.emoji === "🏢" ? ASSET_KINDS[k].emoji : p.emoji }));
  return (
    <Shell open={open} onOpenChange={onOpenChange} title={editing ? "Editar bem" : "Novo bem"} hint="Seu patrimônio é privado."
      valid={!!f.name.trim() && value >= 0 && !Number.isNaN(value)}
      onSubmit={() => onSave({ id: editing?.id ?? uid(), kind: f.kind, emoji: f.emoji, name: f.name.trim(), value, debt })}
      onDelete={editing ? () => onDelete(editing.id) : null}>
      <Chips value={f.kind} options={ASSET_KINDS} onChange={pickKind} label="Tipo de bem" />
      <div>
        <Label htmlFor="asset-name">Nome</Label>
        <Input id="asset-name" value={f.name} onChange={set("name")} maxLength={32} placeholder="Ex.: Apartamento, Carro, Ações" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="asset-value">Quanto vale hoje (R$)</Label>
          <Input id="asset-value" inputMode="decimal" value={f.value} onChange={set("value")} placeholder="0,00" />
        </div>
        <div>
          <Label htmlFor="asset-debt">Ainda deve (R$)</Label>
          <Input id="asset-debt" inputMode="decimal" value={f.debt} onChange={set("debt")} placeholder="Financiamento, se tiver" />
        </div>
      </div>
      <EmojiField id="asset-emoji" value={f.emoji} onChange={set("emoji")} />
    </Shell>
  );
}
