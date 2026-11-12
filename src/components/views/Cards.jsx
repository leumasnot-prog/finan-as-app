import { useState } from "react";
import { Check, Lock, Pencil, Plus, Users } from "lucide-react";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/Money";
import { Emoji } from "@/components/Emoji";
import { CreditCardVisual } from "@/components/CreditCardVisual";
import { categoryOf } from "@/lib/planning";
import { cn, money } from "@/lib/utils";

// Carteira: os cartões empilhados como numa carteira de verdade; o escolhido
// vai para a frente, inteiro, e a fatura dele aparece ao lado.
export function Cards({ wallet, categories, month, actions, solo }) {
  const [sel, setSel] = useState(null);
  const current = wallet.find((c) => c.id === sel) ?? wallet[0];
  if (wallet.length === 0)
    return (
      <Card className="py-12 text-center">
        <Emoji char="💳" size={64} className="mx-auto" />
        <p className="mt-3 font-display text-heading">Sua carteira está vazia</p>
        <p className="mt-1 text-sm text-muted-foreground">Cadastre seus cartões com nome e cor, e lance as compras em cada um.</p>
        <Button className="mt-5" onClick={() => actions.editCard(null)}><Plus className="h-4 w-4" />Adicionar cartão</Button>
      </Card>
    );
  const stack = [...wallet.filter((c) => c.id !== current.id), current];
  const limit = current.limit || 0;
  const used = limit ? Math.min(100, (current.invoice / limit) * 100) : 0;
  const total = wallet.reduce((s, c) => s + c.myInvoice, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
      <Card className="h-fit">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Carteira</CardTitle>
            <CardHint className="mt-2">{wallet.length} {wallet.length === 1 ? "cartão" : "cartões"} · faturas do mês{solo ? "" : " · sua parte"}</CardHint>
            <Money value={total} size="md" className="mt-2 block" />
          </div>
          <Button variant="outline" size="sm" onClick={() => actions.editCard(null)}><Plus className="h-3.5 w-3.5" />Cartão</Button>
        </div>
        <div className="mt-6 pb-1" role="listbox" aria-label="Cartões">
          {stack.map((c, i) => {
            const front = c.id === current.id;
            return (
              <button key={c.id} type="button" role="option" aria-selected={front} onClick={() => setSel(c.id)}
                aria-label={`${c.name}, fatura ${money(c.invoice)}`}
                className={cn("relative block w-full rounded-xl text-left transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                  !front && "hover:-translate-y-2")}
                style={{ marginTop: i === 0 ? 0 : "calc(-63.05% + 54px)", zIndex: i }}>
                <CreditCardVisual wallet={c} month={month} className="max-w-none shadow-[0_-6px_18px_-8px_rgb(0_0_0/0.35)]" />
              </button>
            );
          })}
        </div>
        <CardHint className="mt-3 text-center">Toque num cartão para ver a fatura.</CardHint>
      </Card>

      <Card className="h-fit space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate">{current.name}</CardTitle>
              {!solo && (current.shared ? <Badge tone="info"><Users className="h-3 w-3" />Tem conta da casa</Badge> : <Badge><Lock className="h-3 w-3" />Só você vê</Badge>)}
              {current.items.length > 0 && (current.paid ? <Badge tone="ok"><Check className="h-3 w-3" />Paga</Badge> : <Badge tone="warn">Vence dia {String(current.dueDay).padStart(2, "0")}</Badge>)}
            </div>
            <CardHint className="mt-2">Fatura do mês{!solo && current.shared ? " · sua parte" : ""} · final {current.last4}</CardHint>
            <Money value={current.myInvoice} className="mt-2 block" />
            {!solo && current.myInvoice !== current.invoice && <CardHint className="mt-1">total da fatura: <strong className="text-foreground">{money(current.invoice)}</strong></CardHint>}
          </div>
          <Button variant="outline" size="sm" onClick={() => actions.editCard(current)}><Pencil className="h-3.5 w-3.5" />Editar</Button>
        </div>

        {limit > 0 && (
          <div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full transition-[width]", used > 80 ? "bg-destructive" : "bg-primary")} style={{ width: `${used}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>{Math.round(used)}% do limite usado</span>
              <span className="whitespace-nowrap">livre {money(Math.max(0, limit - current.invoice))} de {money(limit)}</span>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Lançamentos</p>
            <Button variant="ghost" size="sm" onClick={() => actions.add("personal", { payWith: current.id, dueDay: current.dueDay })}><Plus className="h-3.5 w-3.5" />Lançar compra</Button>
          </div>
          <ul className="mt-1 divide-y">
            {current.items.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Nenhuma compra neste cartão neste mês.</li>}
            {current.items.map((a) => {
              const cat = categoryOf(categories, a.category);
              return (
                <li key={a.id}>
                  <button type="button" onClick={() => actions.edit(a)} className="flex w-full items-center gap-3 py-2.5 text-left">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted"><Emoji char={cat.emoji} size={24} /></span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-sm font-medium", a.paid && "text-muted-foreground line-through")}>{a.name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {cat.name}{a.installment ? ` · parcela ${a.installment.current}/${a.installment.total}` : ""}{!solo && a.type === "shared" ? ` · casa, total ${money(a.amount)}` : ""}
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-sm font-semibold">{money(a.myShare)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        {current.items.length > 0 && (
          <Button variant={current.paid ? "outline" : "default"} className="w-full" onClick={() => actions.payCard(current)}>
            {current.paid ? "Fatura paga · desfazer" : "Marcar fatura como paga"}
          </Button>
        )}
      </Card>
    </div>
  );
}
