import { useState } from "react";
import { Check, Lock, Users } from "lucide-react";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/Money";
import { cn, money } from "@/lib/utils";
import { Emoji } from "@/components/Emoji";
import { categoryOf, inDays, pickDay } from "@/lib/planning";

// Recebe apenas contas já filtradas por privacidade (visibleAccounts).
// Filtro por dia: um toque mostra o dia; um segundo toque em outro dia mostra
// a faixa entre os dois (ex.: 05 → 15). O total acompanha o filtro.
export function AccountsList({ accounts, categories = [], onTogglePaid, onEdit, className, solo }) {
  const [sel, setSel] = useState(null);
  const days = [...new Set(accounts.map((a) => a.dueDay))].sort((a, b) => a - b);
  const active = sel && days.some((d) => d >= sel.from && d <= sel.to) ? sel : null;
  const list = accounts.filter((a) => inDays(a, active));
  const pending = list.filter((a) => !a.paid);
  const totalPending = pending.reduce((s, a) => s + a.myShare, 0);
  const dd = (d) => String(d).padStart(2, "0");
  const range = active && (active.from === active.to ? `dia ${dd(active.from)}` : `dia ${dd(active.from)} a ${dd(active.to)}`);

  return (
    <Card className={className}>
      <div className="flex items-baseline gap-2">
        <CardTitle>Contas a pagar</CardTitle>
        <CardHint>{range ? `• ${range}` : solo ? "• no mês" : "• sua parte"}</CardHint>
        {active && <button type="button" onClick={() => setSel(null)} className="ml-auto text-xs font-semibold text-tint-foreground hover:underline">Ver mês todo</button>}
      </div>
      <Money value={totalPending} size="md" className="mt-4 block" />
      <CardHint className="mt-2">
        <strong className="text-foreground">{list.length - pending.length} de {list.length}</strong> pagas{active ? "" : " · toque em dois dias para ver a faixa"}
      </CardHint>

      {days.length > 0 && (
        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d) => {
            const n = accounts.filter((a) => a.dueDay === d).length;
            const on = inDays({ dueDay: d }, active);
            const edge = active && (d === active.from || d === active.to);
            return (
              <button key={d} onClick={() => setSel((s) => pickDay(active ? s : null, d))} aria-pressed={on}
                aria-label={`Dia ${dd(d)}, ${n} ${n === 1 ? "conta" : "contas"}`}
                className={cn(
                  "flex h-11 min-w-[52px] flex-1 flex-col items-center justify-center rounded-md border text-sm font-bold transition-colors",
                  edge ? "border-primary bg-primary text-primary-foreground" : on ? "border-primary/40 bg-tint text-tint-foreground" : "bg-card hover:bg-muted"
                )}>
                {String(d).padStart(2, "0")}
                <span className="flex gap-0.5">
                  {Array.from({ length: Math.min(n, 5) }, (_, i) => (
                    <span key={i} className={cn("h-0.5 w-0.5 rounded-full", edge ? "bg-white" : "bg-muted-foreground/50")} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <ul className="mt-2 divide-y">
        {list.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">{active ? "Nenhuma conta nesses dias." : "Nenhuma conta neste mês."}</li>}
        {list.map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-3">
            <button onClick={() => onTogglePaid(a)} aria-label={a.paid ? `Desmarcar ${a.name}` : `Marcar ${a.name} como paga`}
              aria-pressed={!!a.paid}
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                a.paid ? "border-ok bg-ok text-white" : "border-muted-foreground/40 hover:border-primary"
              )}>
              {a.paid && <Check className="h-3 w-3" strokeWidth={3} />}
            </button>
            <button onClick={() => onEdit(a)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <Emoji char={categoryOf(categories, a.category).emoji} size={26} />
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-sm font-medium", a.paid && "text-muted-foreground line-through")}>{a.name}</span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  {!solo && (a.type === "shared" ? <Users className="h-3 w-3" /> : <Lock className="h-3 w-3" />)}
                  <span className="truncate">{solo ? categoryOf(categories, a.category).name : a.type === "shared" ? `Casa · total ${money(a.amount)}` : "Só você vê"} · dia {dd(a.dueDay)}{a.installment ? ` · ${a.installment.current}/${a.installment.total}` : ""}</span>
                </span>
              </span>
              <span className={cn("text-sm font-semibold whitespace-nowrap", a.paid && "text-muted-foreground")}>{money(a.myShare)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
