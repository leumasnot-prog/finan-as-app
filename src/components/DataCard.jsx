import { useRef, useState } from "react";
import { Download, RotateCcw, Upload } from "lucide-react";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { readBackup } from "@/lib/backup";
import { monthLabel } from "@/lib/seed";

const ml = (ym) => { const l = monthLabel(ym); return `${l.name.slice(0, 3).toLowerCase()}/${l.year}`; };

// Ajustes → Dados: importar e exportar backup, restaurar exemplo.
// Confirmação dentro da página (nada de window.confirm, que não aparece em todo lugar).
export function DataCard({ storageLabel, onExport, onImport, onReset, onOpenDs }) {
  const input = useRef(null);
  const [pending, setPending] = useState(null); // backup lido, esperando confirmação
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  async function pick(f) {
    setError(""); setPending(null);
    if (!f) return;
    const r = readBackup(await f.text());
    if (!r.ok) setError(r.error);
    else setPending(r);
    if (input.current) input.current.value = "";
  }

  return (
    <Card>
      <CardTitle>Dados</CardTitle>
      <CardHint className="mt-2">{storageLabel}</CardHint>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => input.current?.click()}><Upload className="h-3.5 w-3.5" />Importar dados</Button>
        <Button variant="outline" size="sm" onClick={onExport}><Download className="h-3.5 w-3.5" />Exportar backup</Button>
        <input ref={input} type="file" accept=".json,application/json" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {error && <p role="alert" className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {pending && (
        <div className="mt-3 rounded-md border bg-tint/50 p-3 text-sm">
          <p className="font-semibold">
            {pending.summary.entries} lançamentos em {pending.summary.months.length} {pending.summary.months.length === 1 ? "mês" : "meses"}
            {pending.summary.from && <> ({ml(pending.summary.from)} a {ml(pending.summary.to)})</>}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Os meses do arquivo, as categorias e a carteira substituem o que está neste aparelho. Os outros meses ficam como estão.</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={async () => { await onImport(pending); setPending(null); }}>Substituir e abrir</Button>
            <Button size="sm" variant="ghost" onClick={() => setPending(null)}>Cancelar</Button>
          </div>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
        {confirmReset ? (
          <>
            <span className="text-xs text-muted-foreground">Apaga as contas deste mês e volta ao exemplo.</span>
            <Button size="sm" variant="destructive" onClick={async () => { setConfirmReset(false); await onReset(); }}>Restaurar</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>Cancelar</Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}><RotateCcw className="h-3 w-3" />Restaurar exemplo do mês</Button>
        )}
        <Button variant="ghost" size="sm" className="lg:hidden" onClick={onOpenDs}>Design system</Button>
      </div>
    </Card>
  );
}
