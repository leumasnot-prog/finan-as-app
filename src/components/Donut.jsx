import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector } from "recharts";
import { Emoji } from "@/components/Emoji";
import { cn, money } from "@/lib/utils";

export const sliceColor = (i) => `hsl(var(--chart-${(i % 8) + 1}))`;
const pct = (v) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: v < 10 ? 1 : 0 })}%`;

// Fatia ativa cresce para fora e ganha um anel fino da mesma cor.
function Active(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, cornerRadius } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 2} outerRadius={outerRadius + 7} startAngle={startAngle} endAngle={endAngle} fill={fill} cornerRadius={cornerRadius} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 10} outerRadius={outerRadius + 13} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.35} cornerRadius={2} />
    </g>
  );
}

// Pizza em rosca com o total (ou a fatia apontada) no centro e a legenda ao lado.
// rows: [{ id, name, emoji, value, pct }]
// stacked: gráfico em cima e legenda embaixo (para colunas estreitas).
export function Donut({ rows, total, centerLabel = "Total", empty = "Nada por aqui ainda.", onSelect, className, stacked = false }) {
  const [active, setActive] = useState(null);
  const on = active != null ? rows[active] : null;
  if (!rows.length) return <p className={cn("py-10 text-center text-sm text-muted-foreground", className)}>{empty}</p>;
  return (
    <div className={cn("grid items-center gap-6", !stacked && "sm:grid-cols-[240px_minmax(0,1fr)]", className)}>
      <div className="relative mx-auto h-[220px] w-[220px] sm:h-[240px] sm:w-[240px]" onMouseLeave={() => setActive(null)}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="86%" paddingAngle={rows.length > 1 ? 3 : 0}
              cornerRadius={6} stroke="none" startAngle={90} endAngle={-270} isAnimationActive animationDuration={650}
              activeIndex={active ?? undefined} activeShape={Active}
              onMouseEnter={(_, i) => setActive(i)} onClick={(_, i) => onSelect?.(rows[i])}>
              {rows.map((r, i) => <Cell key={r.id} fill={sliceColor(i)} className="cursor-pointer outline-none" />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div className="px-8">
            {on ? <Emoji char={on.emoji} size={34} className="mx-auto" /> : null}
            <p className="mt-1 truncate text-xs text-muted-foreground">{on ? on.name : centerLabel}</p>
            <p className="whitespace-nowrap font-display text-lg font-bold leading-tight sm:text-xl">{money(on ? on.value : total)}</p>
            {on && <p className="text-xs font-semibold text-muted-foreground">{pct(on.pct)}</p>}
          </div>
        </div>
      </div>
      <ul className="min-w-0 space-y-1">
        {rows.map((r, i) => (
          <li key={r.id}>
            <button type="button" onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}
              onClick={() => onSelect?.(r)}
              className={cn("flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors", active === i ? "bg-muted" : "hover:bg-muted/60")}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md" style={{ background: `color-mix(in srgb, ${sliceColor(i)} 14%, transparent)` }}>
                <Emoji char={r.emoji} size={24} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{r.name}</span>
                  <span className="whitespace-nowrap text-sm font-semibold">{money(r.value)}</span>
                </span>
                <span className="mt-1 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full" style={{ width: `${Math.max(2, r.pct)}%`, background: sliceColor(i) }} />
                  </span>
                  <span className="w-10 text-right text-[11px] font-medium text-muted-foreground">{pct(r.pct)}</span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
