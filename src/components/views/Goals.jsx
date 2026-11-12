import { Pencil, Plus } from "lucide-react";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/Money";
import { Emoji } from "@/components/Emoji";
import { GOAL_KINDS } from "@/components/PlanningDialogs";
import { goalPlan } from "@/lib/planning";
import { monthLabel } from "@/lib/seed";
import { cn, money } from "@/lib/utils";

const until = (ym) => { const l = monthLabel(ym); return `${l.name.slice(0, 3).toLowerCase()}/${l.year}`; };

// Anel de progresso: trilho em --muted, arco em --ok; batida = cheio.
function Ring({ pct, children, size = 76 }) {
  const r = 32, c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="7" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="hsl(var(--ok))" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function Goals({ goals, month, actions }) {
  const plans = goals.map((g) => ({ g, p: goalPlan(g, month) }));
  const target = goals.reduce((s, g) => s + (Number(g.target) || 0), 0);
  const saved = goals.reduce((s, g) => s + Math.min(Number(g.saved) || 0, Number(g.target) || 0), 0);
  const perMonth = plans.reduce((s, { p }) => s + (p.perMonth || 0), 0);
  const all = target > 0 ? (saved / target) * 100 : 0;

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-5">
        <Ring pct={all} size={92}><span className="font-display text-lg font-bold">{Math.round(all)}%</span></Ring>
        <div className="min-w-[12rem] flex-1">
          <CardHint>Guardado em todas as metas</CardHint>
          <Money value={saved} className="mt-1 block" />
          <CardHint className="mt-2">de {money(target)}{perMonth > 0 && <> · para cumprir os prazos, guarde <strong className="text-foreground">{money(perMonth)}</strong> por mês</>}</CardHint>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => actions.editGoal(null)}><Plus className="h-4 w-4" />Nova meta</Button>
      </Card>

      {goals.length === 0 ? (
        <Card className="py-12 text-center">
          <Emoji char="🎯" size={64} className="mx-auto" />
          <p className="mt-3 font-display text-heading">Qual é o próximo sonho?</p>
          <p className="mt-1 text-sm text-muted-foreground">Reserva de emergência, viagem, investimento: crie uma meta e acompanhe quanto falta.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {plans.map(({ g, p }) => (
            <Card key={g.id} className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <Ring pct={p.pct}><Emoji char={g.emoji} size={38} /></Ring>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="leading-tight">{g.name}</CardTitle>
                    <button type="button" onClick={() => actions.editGoal(g)} aria-label={`Editar ${g.name}`} className="-mr-1 -mt-1 rounded-md p-1.5 text-muted-foreground hover:bg-muted">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {GOAL_KINDS[g.kind] && GOAL_KINDS[g.kind].name !== g.name && <Badge>{GOAL_KINDS[g.kind].name}</Badge>}
                    {p.done ? <Badge tone="ok">Meta batida</Badge> : p.late ? <Badge tone="danger">Prazo passou</Badge> : g.deadline ? <Badge tone="info">até {until(g.deadline)}</Badge> : null}
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="whitespace-nowrap font-display text-xl font-bold">{money(g.saved)}</span>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">de {money(g.target)} · {Math.round(p.pct)}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-ok transition-[width] duration-700" style={{ width: `${p.pct}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {p.done ? "Você chegou lá. Pode aumentar o valor ou criar a próxima."
                    : p.late ? <>Faltam <strong className="text-foreground">{money(p.remaining)}</strong>. Ajuste o prazo para recalcular.</>
                    : p.perMonth != null ? <>Faltam <strong className="text-foreground">{money(p.remaining)}</strong>: guarde <strong className="text-foreground">{money(p.perMonth)}</strong>/mês por {p.monthsLeft} {p.monthsLeft === 1 ? "mês" : "meses"}.</>
                    : <>Faltam <strong className="text-foreground">{money(p.remaining)}</strong>. Defina um prazo para saber quanto guardar por mês.</>}
                </p>
              </div>
              <Button variant={p.done ? "outline" : "default"} className={cn("mt-auto w-full")} onClick={() => actions.deposit(g, p.perMonth)}>
                {p.done ? "Movimentar" : "Guardar dinheiro"}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
