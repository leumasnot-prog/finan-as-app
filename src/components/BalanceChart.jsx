import { useMemo } from "react";
import { PullToRefresh } from "@/components/PullToRefresh";

const brl = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// Saldo projetado dia a dia, no card "puxe para atualizar" (ver PullToRefresh.jsx).
// `series` é o que `cashFlowSeries` devolve: só dados de quem está olhando (R1).
// O número grande é o saldo no último dia; passar o dedo na linha lê os outros dias.
// Verde = o saldo naquele dia é positivo (sobra); vermelho = falta.
export function BalanceChart({ series, onRefresh, className }) {
  const reads = useMemo(() => [series.map((s) => s.saldo)], [series]);
  const windows = useMemo(() => [
    { id: "7d", label: "7 dias", take: 7, span: "nos últimos 7 dias do mês" },
    { id: "15d", label: "15 dias", take: 15, span: "nos últimos 15 dias do mês" },
    { id: "mes", label: "Mês", take: series.length, span: "do dia 1 ao fim do mês" },
  ], [series.length]);
  if (series.length < 2) return null;
  return (
    // data-stroke liga a borda de 1px dos nossos cards; corner 16 = rounded-lg
    <div data-stroke="on" className={className}>
      <PullToRefresh
        fluid
        corner={16}
        reads={reads}
        windows={windows}
        currency="R$ "
        format={(n) => brl.format(n)}
        percent={(n) => pct.format(n)}
        whenAt={(i) => `dia ${series[Math.round(i)]?.day ?? Math.round(i) + 1}`}
        good={(value) => value >= 0}
        label="Saldo ao longo do mês. Aperte Enter para atualizar."
        windowLabel="Período"
        onRefresh={onRefresh}
      />
    </div>
  );
}
