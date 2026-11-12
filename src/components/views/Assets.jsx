import { Pencil, Plus } from "lucide-react";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/Money";
import { Emoji } from "@/components/Emoji";
import { Donut } from "@/components/Donut";
import { ASSET_KINDS, netWorth } from "@/lib/planning";
import { money } from "@/lib/utils";

export function Assets({ assets, actions }) {
  const w = netWorth(assets);
  const rows = w.byKind.filter((k) => k.value > 0).map((k) => ({ id: k.kind, name: k.name, emoji: k.emoji, value: k.value }));
  const sum = rows.reduce((s, r) => s + r.value, 0);
  const withPct = rows.map((r) => ({ ...r, pct: sum > 0 ? (r.value / sum) * 100 : 0 }));

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardHint>Patrimônio líquido</CardHint>
              <Money value={w.net} size="xl" className={w.net < 0 ? "mt-2 block text-destructive" : "mt-2 block"} />
            </div>
            <Button onClick={() => actions.editAsset(null)}><Plus className="h-4 w-4" />Novo bem</Button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-4 text-sm">
            <div><CardHint>Tudo o que você tem</CardHint><p className="mt-1 whitespace-nowrap font-semibold">{money(w.gross)}</p></div>
            <div><CardHint>Ainda deve (financiamentos)</CardHint><p className="mt-1 whitespace-nowrap font-semibold text-destructive">− {money(w.debt)}</p></div>
          </div>
        </Card>
        <Card>
          <CardTitle>Seus bens</CardTitle>
          <ul className="mt-3 divide-y">
            {assets.length === 0 && (
              <li className="py-10 text-center">
                <Emoji char="🏘️" size={56} className="mx-auto" />
                <p className="mt-2 text-sm text-muted-foreground">Cadastre casa, carro, investimentos e o que mais for seu.</p>
              </li>
            )}
            {assets.map((a) => {
              const equity = (Number(a.value) || 0) - (Number(a.debt) || 0);
              const paidPct = a.value > 0 ? Math.max(0, Math.min(100, (equity / a.value) * 100)) : 0;
              return (
                <li key={a.id}>
                  <button type="button" onClick={() => actions.editAsset(a)} className="group flex w-full items-center gap-3 py-3 text-left">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-muted"><Emoji char={a.emoji} size={34} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{a.name}</span>
                        <span className="whitespace-nowrap text-sm font-semibold">{money(a.value)}</span>
                      </span>
                      <span className="text-[11px] text-muted-foreground">{ASSET_KINDS[a.kind]?.name ?? "Outros bens"}{a.debt > 0 ? ` · deve ${money(a.debt)}` : " · quitado"}</span>
                      {a.debt > 0 && (
                        <span className="mt-1.5 flex items-center gap-2">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-ok" style={{ width: `${paidPct}%` }} /></span>
                          <span className="text-[11px] text-muted-foreground">{Math.round(paidPct)}% seu</span>
                        </span>
                      )}
                    </span>
                    <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
      <Card className="h-fit">
        <CardTitle>Como está dividido</CardTitle>
        <CardHint className="mt-2">Valor de cada tipo, já descontado o que ainda deve.</CardHint>
        <Donut stacked className="mt-5" rows={withPct} total={sum} centerLabel="Líquido" empty="Cadastre um bem para ver a divisão." />
      </Card>
    </div>
  );
}
