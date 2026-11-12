import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, FileUp, Link2, Link2Off, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { Emoji } from "@/components/Emoji";
import { categoryOf, cardIdOf } from "@/lib/planning";
import { prepareImport, readStatement } from "@/lib/importer";
import { monthLabel } from "@/lib/seed";
import { cn, money } from "@/lib/utils";

const BANK_TIPS = [
  ["Nubank", "Cartão: Fatura → toque na fatura fechada → Exportar fatura (CSV). Conta: Extrato → ícone de compartilhar → OFX ou CSV, chega por e-mail."],
  ["Inter", "Conta digital → Extrato → Exportar → OFX (recomendado) ou CSV. Cartão: Fatura → Baixar."],
  ["C6", "Cartão → Fatura → Enviar fatura → escolha CSV ou Excel."],
  ["Itaú, Bradesco, Santander, BB, Caixa", "No internet banking (computador): Extrato ou Fatura → Salvar/Exportar → OFX (Money) ou CSV/Excel."],
  ["Outros", "Procure por Exportar, Baixar ou Compartilhar no extrato ou na fatura. Prefira OFX; se só tiver Excel, salve como CSV."],
];

const dd = (d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const short = (ym) => { const l = monthLabel(ym); return `${l.name} ${l.year}`; };

// Importar fatura ou extrato em 3 passos: arquivo → (colunas, se preciso) → revisar.
// accountsFor(dest) devolve as contas do mês já lançadas para aquele destino,
// para o casamento (o que já foi lançado é conferido, não duplicado).
export function ImportSheet({ open, onOpenChange, wallet, categories, rules, month, defaultCard, accountsFor, onImport }) {
  const [step, setStep] = useState("file");
  const [dest, setDest] = useState(defaultCard ?? wallet[0]?.id ?? "conta");
  const [invoiceMonth, setInvoiceMonth] = useState(month);
  const [file, setFile] = useState(null); // { name, text }
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState({ headerRow: 0, map: {} });
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("novas");
  const [remember, setRemember] = useState(true);
  const [picking, setPicking] = useState(null); // id da linha com seletor de categoria aberto
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);
  const isCard = dest !== "conta";
  const card = wallet.find((c) => c.id === dest);

  const reset = () => { setStep("file"); setFile(null); setParsed(null); setRows([]); setError(""); setFilter("novas"); setPicking(null); };
  const close = (o) => { onOpenChange(o); if (!o) setTimeout(reset, 200); };

  const build = (txs) => {
    if (!txs.length) { setError("Não achamos nenhum lançamento nesse arquivo. Confira se é a fatura ou o extrato certo."); return; }
    const existing = accountsFor(dest, isCard ? invoiceMonth : null);
    const prepared = prepareImport(txs, { categories, rules, accounts: existing });
    setRows(prepared.map((r) => ({ ...r, origName: r.name, origCategory: r.category })));
    setFilter(prepared.some((r) => r.include && !r.match) ? "novas" : "todas");
    setStep("review");
  };

  async function read(f) {
    setError("");
    if (!f) return;
    if (f.size > 5_000_000) { setError("Arquivo grande demais. Exporte só um mês."); return; }
    let text = await f.text();
    // Arquivos de banco antigos vêm em Latin-1: "DescriÃ§Ã£o" denuncia.
    if (/Ã[§£©¡³ª­]/.test(text)) text = new TextDecoder("windows-1252").decode(await f.arrayBuffer());
    setFile({ name: f.name, text });
    const r = readStatement(text, { fallbackYear: +invoiceMonth.slice(0, 4), expenseSign: undefined });
    setParsed(r);
    if (r.needsMapping) {
      const header = r.rows.findIndex((row) => row.length > 2);
      setMapping({ headerRow: Math.max(0, header), map: {} });
      setStep("map");
    } else build(r.transactions);
  }

  const applyMapping = () => {
    const r = readStatement(file.text, { mapping, fallbackYear: +invoiceMonth.slice(0, 4) });
    build(r.transactions);
  };

  const patch = (id, p) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const groups = useMemo(() => ({
    novas: rows.filter((r) => r.include && !r.match),
    casadas: rows.filter((r) => r.include && r.match),
    ignoradas: rows.filter((r) => !r.include),
  }), [rows]);
  const shown = filter === "todas" ? rows : groups[filter];
  const totalNew = groups.novas.reduce((s, r) => s + r.amount, 0);
  const totalAll = rows.filter((r) => r.include).reduce((s, r) => s + r.amount, 0);
  const plannedLeft = useMemo(() => {
    if (step !== "review") return [];
    const used = new Set(groups.casadas.map((r) => r.match.id));
    return accountsFor(dest, isCard ? invoiceMonth : null).filter((a) => !used.has(a.id));
  }, [step, groups.casadas, dest, invoiceMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirm = () => {
    const learned = remember
      ? rows.filter((r) => r.include && (r.name !== r.origName || r.category !== r.origCategory)).map((r) => ({ key: r.key, name: r.name.trim(), category: r.category }))
      : [];
    onImport({ rows: rows.filter((r) => r.include), dest, card, invoiceMonth: isCard ? invoiceMonth : null, learned });
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-2xl">
        {step === "file" && (
          <>
            <DialogTitle>Importar fatura ou extrato</DialogTitle>
            <DialogDescription className="mt-1">Lemos CSV e OFX dos bancos. Nada sai do seu aparelho.</DialogDescription>
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="imp-dest">O que é esse arquivo?</Label>
                  <Select id="imp-dest" value={dest} onChange={(e) => setDest(e.target.value)}>
                    {wallet.map((c) => <option key={c.id} value={c.id}>Fatura do cartão {c.name}</option>)}
                    <option value="conta">Extrato da conta (débito, Pix, boletos)</option>
                  </Select>
                </div>
                {isCard && (
                  <div>
                    <Label htmlFor="imp-month">Fatura de</Label>
                    <Input id="imp-month" type="month" value={invoiceMonth} onChange={(e) => setInvoiceMonth(e.target.value || month)} />
                  </div>
                )}
              </div>
              <label
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); read(e.dataTransfer.files?.[0]); }}
                className={cn("flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors",
                  drag ? "border-primary bg-tint" : "hover:bg-muted/60")}>
                <FileUp className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-semibold">Escolher arquivo</span>
                <span className="text-xs text-muted-foreground">ou arraste aqui · .csv ou .ofx</span>
                <input ref={inputRef} type="file" accept=".csv,.ofx,.txt,text/csv,application/x-ofx" className="sr-only" onChange={(e) => read(e.target.files?.[0])} />
              </label>
              {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              <details className="group rounded-md border">
                <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm font-semibold">
                  Onde baixar no app do banco<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <dl className="space-y-2 border-t px-3 py-3 text-xs">
                  {BANK_TIPS.map(([b, t]) => <div key={b}><dt className="font-semibold">{b}</dt><dd className="text-muted-foreground">{t}</dd></div>)}
                  <p className="pt-1 text-muted-foreground">Os bancos mudam o layout sem aviso. Se não reconhecermos as colunas, você aponta qual é qual uma vez.</p>
                </dl>
              </details>
            </div>
          </>
        )}

        {step === "map" && parsed && (
          <>
            <button type="button" onClick={reset} className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Outro arquivo</button>
            <DialogTitle>Qual coluna é qual?</DialogTitle>
            <DialogDescription className="mt-1">Não reconhecemos o layout de “{file.name}”. Aponte as três colunas abaixo.</DialogDescription>
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="map-header">Linha do cabeçalho</Label>
                <Select id="map-header" value={mapping.headerRow} onChange={(e) => setMapping({ headerRow: +e.target.value, map: {} })}>
                  {parsed.rows.slice(0, 15).map((r, i) => <option key={i} value={i}>{i + 1}: {r.join(" | ").slice(0, 70)}</option>)}
                </Select>
              </div>
              {[["date", "Data"], ["description", "Descrição"], ["amount", "Valor"]].map(([k, l]) => (
                <div key={k}>
                  <Label htmlFor={`map-${k}`}>{l}</Label>
                  <Select id={`map-${k}`} value={mapping.map[k] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, map: { ...m.map, [k]: e.target.value === "" ? undefined : +e.target.value } }))}>
                    <option value="">Escolha…</option>
                    {(parsed.rows[mapping.headerRow] ?? []).map((h, i) => <option key={i} value={i}>{h || `Coluna ${i + 1}`} · ex.: {parsed.rows[mapping.headerRow + 1]?.[i] ?? ""}</option>)}
                  </Select>
                </div>
              ))}
              {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter><Button className="ml-auto" disabled={["date", "description", "amount"].some((k) => mapping.map[k] == null)} onClick={applyMapping}>Ler lançamentos</Button></DialogFooter>
          </>
        )}

        {step === "review" && (
          <>
            <button type="button" onClick={reset} className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Outro arquivo</button>
            <DialogTitle>Revisar {isCard ? `fatura ${card?.name ?? ""} · ${short(invoiceMonth)}` : "extrato"}</DialogTitle>
            <DialogDescription className="mt-1">
              {parsed?.format} · {rows.length} linhas · total {money(totalAll)}. Toque no nome para corrigir e no emoji para trocar a categoria.
            </DialogDescription>

            <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Filtrar lançamentos">
              {[["novas", "Novas", groups.novas.length, "entram agora"], ["casadas", "Já lançadas", groups.casadas.length, "conferidas"], ["ignoradas", "Ignoradas", groups.ignoradas.length, "não entram"]].map(([k, l, n, h]) => (
                <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(filter === k ? "todas" : k)}
                  className={cn("rounded-md border px-2 py-2 text-left transition-colors", filter === k ? "border-primary bg-tint" : "hover:bg-muted")}>
                  <span className="block font-display text-xl font-bold leading-none">{n}</span>
                  <span className="mt-1 block text-xs font-semibold">{l}</span>
                  <span className="block text-[11px] text-muted-foreground">{h}</span>
                </button>
              ))}
            </div>

            <ul className="mt-3 divide-y">
              {shown.length === 0 && <li className="py-8 text-center text-sm text-muted-foreground">Nada nesse filtro.</li>}
              {shown.map((r) => {
                const cat = categoryOf(categories, r.category);
                return (
                  <li key={r.id} className={cn("py-3", !r.include && "opacity-60")}>
                    <div className="flex items-start gap-3">
                      <button type="button" onClick={() => setPicking(picking === r.id ? null : r.id)} aria-label={`Categoria: ${cat.name}. Trocar`} aria-expanded={picking === r.id}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-muted transition-transform hover:scale-105">
                        <Emoji char={cat.emoji} size={28} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <input aria-label="Nome da despesa" value={r.name} onChange={(e) => patch(r.id, { name: e.target.value })}
                            className="min-w-0 flex-1 rounded-sm bg-transparent px-1 py-0.5 -ml-1 text-sm font-semibold outline-none hover:bg-muted focus:bg-muted focus:ring-2 focus:ring-ring" />
                          <span className="whitespace-nowrap text-sm font-semibold">{money(r.amount)}</span>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={r.raw}>
                          {dd(r.date)} · {cat.name}{r.installment ? ` · parcela ${r.installment.current}/${r.installment.total}` : ""} · <span className="font-mono">{r.raw}</span>
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {r.learned && <Badge tone="info"><Sparkles className="h-3 w-3" />Nome que você salvou</Badge>}
                          {r.match && (
                            <>
                              <Badge tone="ok"><Link2 className="h-3 w-3" />Já lançada como “{r.match.name}”</Badge>
                              <button type="button" onClick={() => patch(r.id, { match: null })} className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
                                <Link2Off className="h-3 w-3" />Não é a mesma
                              </button>
                            </>
                          )}
                          {r.skipReason && <Badge>{r.skipReason}</Badge>}
                          <button type="button" onClick={() => patch(r.id, { include: !r.include })}
                            className="ml-auto text-[11px] font-semibold text-tint-foreground hover:underline">
                            {r.include ? "Ignorar" : "Incluir"}
                          </button>
                        </div>
                        {picking === r.id && (
                          <div className="mt-2 flex flex-wrap gap-1.5 rounded-md border bg-card p-2" role="radiogroup" aria-label="Categoria">
                            {categories.map((c) => (
                              <button key={c.id} type="button" role="radio" aria-checked={r.category === c.id}
                                onClick={() => { patch(r.id, { category: c.id }); setPicking(null); }}
                                className={cn("flex items-center gap-1 rounded-full border py-0.5 pl-1 pr-2.5 text-xs font-semibold",
                                  r.category === c.id ? "border-primary bg-tint text-tint-foreground" : "hover:bg-muted")}>
                                <Emoji char={c.emoji} size={20} />{c.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {plannedLeft.length > 0 && (
              <div className="mt-2 rounded-md bg-warn/10 px-3 py-2 text-xs">
                <p className="font-semibold text-warn">Lançadas por você e que não vieram no arquivo:</p>
                <p className="mt-0.5 text-muted-foreground">{plannedLeft.map((a) => `${a.name} (${money(a.amount)})`).join(" · ")}. Elas continuam no mês; confira se foram em outro cartão ou mês.</p>
              </div>
            )}

            <DialogFooter className="flex-col items-stretch sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Lembrar os nomes e categorias que eu corrigi
              </label>
              <Button className="sm:ml-auto" onClick={confirm} disabled={!groups.novas.length && !groups.casadas.length}>
                <Check className="h-4 w-4" />
                {groups.novas.length ? `Lançar ${groups.novas.length} · ${money(totalNew)}` : "Conferir lançadas"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Para o App: contas do mês que já pertencem a esse destino.
export const accountsForDest = (accounts, dest) =>
  dest === "conta" ? accounts.filter((a) => !cardIdOf(a)) : accounts.filter((a) => cardIdOf(a) === dest);
