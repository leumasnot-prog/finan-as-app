import { Lock, Users } from "lucide-react";
import { Card, CardHint } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCardVisual } from "@/components/CreditCardVisual";
import { cn, money } from "@/lib/utils";

export function Cards({ accounts, month, actions, solo }) {
  const cards = accounts.filter((a) => a.category === "cartao");
  if (cards.length === 0)
    return (
      <Card className="py-12 text-center">
        <p className="text-sm text-muted-foreground">Nenhum cartão por aqui.</p>
        <Button className="mt-4" onClick={() => actions.add("personal")}>Adicionar cartão</Button>
      </Card>
    );
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {cards.map((a) => {
        const limit = a.card?.limit || 0;
        const used = limit ? Math.min(100, (a.amount / limit) * 100) : 0;
        return (
          <Card key={a.id} className="space-y-4">
            <CreditCardVisual account={a} month={month} className="mx-auto" />
            <div className="flex items-start justify-between gap-3">
              <div>
                {solo ? <CardHint>Fatura do mês</CardHint> : (
                  <CardHint className="flex items-center gap-1">
                    {a.type === "shared" ? <Users className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    {a.type === "shared" ? `Compartilhado · ${a.split}` : "Só você vê"}
                  </CardHint>
                )}
                <p className="mt-1 font-display text-2xl font-bold">{money(a.amount)}</p>
                {a.type === "shared" && <CardHint>sua parte: <strong className="text-foreground">{money(a.myShare)}</strong></CardHint>}
              </div>
              <Button variant="outline" size="sm" onClick={() => actions.edit(a)}>Editar</Button>
            </div>
            {limit > 0 && (
              <div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", used > 80 ? "bg-destructive" : "bg-primary")} style={{ width: `${used}%` }} />
                </div>
                <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>{Math.round(used)}% do limite</span>
                  <span>limite {money(limit)}</span>
                </div>
              </div>
            )}
            <Button variant={a.paid ? "outline" : "default"} className="w-full" onClick={() => actions.togglePaid(a)}>
              {a.paid ? "Fatura paga · desfazer" : "Marcar fatura como paga"}
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
