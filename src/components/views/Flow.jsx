import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/Money";
import { CATEGORIES } from "@/lib/seed";
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

export function Flow({ b, series, categories }) {
  const data = categories.map((c) => ({ ...c, label: CATEGORIES[c.category] ?? c.category }));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Entradas" value={b.myIncome} hint="sua renda no mês" />
        <Stat label="Saídas" value={b.myTotal} hint="sua parte da casa + pessoal" />
        <Stat label="Sobra" value={b.myBalance} hint="depois de tudo pago" tone={b.myBalance < 0 ? "text-destructive" : "text-ok"} />
      </div>
      <Card>
        <CardTitle>Saldo ao longo do mês</CardTitle>
        <CardHint className="mt-2">Renda no dia 1; cada conta sai no vencimento (só a sua parte).</CardHint>
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
      <Card>
        <CardTitle>Para onde vai</CardTitle>
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-navy" />Sua parte da casa</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-p1" />Pessoal</span>
        </div>
        <div className="mt-4" style={{ height: Math.max(120, data.length * 48) }}>
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }} barSize={18}>
              <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tick={axis} tickLine={false} axisLine={false} tickFormatter={compact} />
              <YAxis type="category" dataKey="label" tick={axis} tickLine={false} axisLine={false} width={84} />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<Tip title={(l) => l} />} />
              <Bar dataKey="casa" name="Casa" stackId="a" fill="hsl(var(--navy))" radius={[4, 0, 0, 4]} />
              <Bar dataKey="pessoal" name="Pessoal" stackId="a" fill="hsl(var(--p1))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
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
