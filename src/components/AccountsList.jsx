import { useState } from "react";
import { Check, Lock, Users } from "lucide-react";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/Money";
import { cn, money } from "@/lib/utils";

// Recebe apenas contas já filtradas por privacidade (visibleAccounts).
export function AccountsList({ accounts, onTogglePaid, onEdit, className }) {
  const [day, setDay] = useState(null);
  const pending = accounts.filter((a) => !a.paid);
  const days = [...new Set(accounts.map((a) => a.dueDay))].sort((a, b) => a - b);
  const active = days.includes(day) ? day : null;
  const list = active ? accounts.filter((a) => a.dueDay === active) : accounts;
  const totalPending = pending.reduce((s, a) => s + a.myShare, 0);

  return (
    <Card className={className}>
      <div className="flex items-baseline gap-2">
        <CardTitle>Contas a pagar</CardTitle>
        <CardHint>{active ? `• dia ${String(active).padStart(2, "0")}` : "• sua parte"}</CardHint>
      </div>
      <Money value={totalPending} size="md" className="mt-4 block" />
      <CardHint className="mt-2">
        <strong className="text-foreground">{accounts.length - pending.length} de {accounts.length}</strong> pagas
      </CardHint>

      {days.length > 0 && (
        <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d) => {
            const n = accounts.filter((a) => a.dueDay === d).length;
            const on = d === active;
            return (
              <button key={d} onClick={() => setDay(on ? null : d)} aria-pressed={on}
                className={cn(
                  "flex h-11 min-w-[52px] flex-1 flex-col items-center justify-center rounded-md border text-sm font-bold transition-colors",
                  on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
                )}>
                {String(d).padStart(2, "0")}
                <span className="flex gap-0.5">
                  {Array.from({ length: Math.min(n, 5) }, (_, i) => (
                    <span key={i} className={cn("h-0.5 w-0.5 rounded-full", on ? "bg-white" : "bg-muted-foreground/50")} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <ul className="mt-2 divide-y">
        {list.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Nenhuma conta neste mês.</li>}
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
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-sm font-medium", a.paid && "text-muted-foreground line-through")}>{a.name}</span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  {a.type === "shared" ? <Users className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {a.type === "shared" ? `Casa · total ${money(a.amount)}` : "Só você vê"} · dia {String(a.dueDay).padStart(2, "0")}
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
