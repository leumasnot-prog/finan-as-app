import { ChevronRight } from "lucide-react";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BalanceCard, PrivacyCard, SplitCard } from "@/components/OverviewCards";
import { AccountsList } from "@/components/AccountsList";
import { CreditCardVisual } from "@/components/CreditCardVisual";
import { Money } from "@/components/Money";
import { BalanceChart } from "@/components/BalanceChart";

export function CardsSummary({ cards, month, onSeeAll, solo }) {
  const total = cards.reduce((s, c) => s + c.myInvoice, 0);
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between">
        <CardTitle>Cartões</CardTitle>
        <Button variant="outline" size="sm" onClick={onSeeAll}>Abrir carteira<ChevronRight className="h-3 w-3" /></Button>
      </div>
      <CardHint className="mt-5">{solo ? "Faturas do mês" : "Faturas do mês · sua parte"}</CardHint>
      <Money value={total} className="mt-1" />
      {cards.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Nenhum cartão. Abra a carteira para cadastrar.</p>
      ) : (
        <div className="-mx-5 mt-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2">
          {cards.map((c) => <CreditCardVisual key={c.id} wallet={c} month={month} className="w-[82%] snap-start sm:w-[300px]" />)}
        </div>
      )}
    </Card>
  );
}

export function Overview({ b, shared, me, month, accounts, wallet, categories, series, onRefresh, actions, setTab, solo }) {
  const cards = wallet;
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-2">
        <BalanceCard b={b} onEditIncome={actions.editIncome} solo={solo} />
        {solo ? (
          <CardsSummary cards={cards} month={month} onSeeAll={() => setTab("cartoes")} solo />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <SplitCard b={b} shared={shared} me={me} onToggleSettled={actions.toggleSettled} onEdit={actions.edit} />
            <CardsSummary cards={cards} month={month} onSeeAll={() => setTab("cartoes")} />
          </div>
        )}
      </div>
      <div className="space-y-4">
        <div>
          <CardHint className="mb-2 px-1">Saldo ao longo do mês{solo ? "" : " · só a sua parte"} · puxe o card para atualizar</CardHint>
          <BalanceChart series={series} onRefresh={onRefresh} />
        </div>
        <AccountsList accounts={accounts} categories={categories} onTogglePaid={actions.togglePaid} onEdit={actions.edit} solo={solo} />
        {!solo && <PrivacyCard b={b} shared={shared} me={me} />}
      </div>
    </div>
  );
}
