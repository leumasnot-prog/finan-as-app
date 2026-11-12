import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/Money";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Donut } from "@/components/Donut";
import { Emoji } from "@/components/Emoji";
import { categoryTotals } from "@/lib/planning";
import { money } from "@/lib/utils";

const compact = (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k` : v);
const axis = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

function Tip({ active, payload, label, title }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{title(label)}</p>
      {payload.filter((p) => p.value).map((p) => (
        <p key={p.dataKey} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
          {p.name}: <strong>{money(p.value)}</strong>
        </p>
      ))}
    </div>
  );
}

export function Flow({ b, series, accounts, categories, actions, solo }) {
  const cats = categoryTotals(accounts, categories);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Entradas" value={b.myIncome} hint="sua renda no mês" />
        <Stat label="Saídas" value={b.myTotal} hint={solo ? "todas as suas contas" : "sua parte da casa + pessoal"} />
        <Stat label="Sobra" value={b.myBalance} hint="depois de tudo pago" tone={b.myBalance < 0 ? "text-destructive" : "text-ok"} />
      </div>
      <Card>
        <CardTitle>Saldo ao longo do mês</CardTitle>
        <CardHint className="mt-2">Renda no dia 1; cada conta sai no vencimento{solo ? "" : " (só a sua parte)"}.</CardHint>
        <div className="mt-4 h-64">
          <ResponsiveContainer>
            <AreaChart data={series} margin={{ left: -12, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="saldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--p1))" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="hsl(var(--p1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={axis} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={compact} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Tooltip content={<Tip title={(d) => `Dia ${d}`} />} />
              <Area type="stepAfter" dataKey="saldo" name="Saldo" stroke="hsl(var(--p1))" strokeWidth={2} fill="url(#saldo)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardTitle>Gastos por categoria</CardTitle>
          <CardHint className="mt-2">{solo ? "Suas contas do mês." : "Sua parte da casa + suas contas pessoais."} Passe o dedo numa fatia para ver o valor.</CardHint>
          <Donut className="mt-5" rows={cats.rows} total={cats.total} centerLabel="Gasto no mês" empty="Nenhuma conta neste mês." />
        </Card>
        <Card className="h-fit">
          <div className="flex items-center justify-between">
            <CardTitle>Categorias</CardTitle>
            <Button variant="outline" size="sm" onClick={() => actions.editCategory(null)}><Plus className="h-3.5 w-3.5" />Nova</Button>
          </div>
          <CardHint className="mt-2">Valem para os dois e para todos os meses. Toque para editar.</CardHint>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button key={c.id} type="button" onClick={() => actions.editCategory(c)}
                className="flex items-center gap-1.5 rounded-full border bg-card py-1 pl-1.5 pr-3 text-xs font-semibold transition-colors hover:bg-muted">
                <Emoji char={c.emoji} size={20} />{c.name}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, hint, tone }) {
  return (
    <Card>
      <CardHint>{label}</CardHint>
      <Money value={value} size="md" className={`mt-2 block ${tone ?? ""}`} />
      <CardHint className="mt-2">{hint}</CardHint>
    </Card>
  );
}
