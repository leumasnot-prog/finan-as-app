import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, Lock, Pencil } from "lucide-react";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/Money";
import { Avatar, dotClass } from "@/components/Avatar";
import { cn, money } from "@/lib/utils";
import { splitLabel } from "@/lib/finance";

const pctFmt = (v) => `${Math.round(v)}%`;

export function BalanceCard({ b, onEditIncome, solo }) {
  const negative = b.myBalance < 0;
  const total = Math.max(b.myIncome, b.myTotal, 1);
  const seg = (v) => `${(Math.max(0, v) / total) * 100}%`;
  return (
    <Card>
      <CardTitle>Saldo previsto</CardTitle>
      <div className="mt-5 flex flex-wrap items-end gap-x-5 gap-y-2">
        <Money value={b.myBalance} size="xl" className={negative ? "text-destructive" : ""} />
        <div className="border-l pl-4">
          <p className={cn("flex items-center gap-1 text-sm font-semibold", negative ? "text-destructive" : "text-ok")}>
            {negative ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
            {negative ? "Faltam recursos este mês" : `${pctFmt(b.pct.free)} do salário livre`}
          </p>
          <CardHint>valor estimado após pagar todas as contas</CardHint>
        </div>
      </div>

      <div className="mt-6 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted" role="img"
        aria-label={`${solo ? "" : `Casa ${pctFmt(b.pct.house)}, `}contas ${pctFmt(b.pct.personal)}, sobra ${pctFmt(Math.max(0, b.pct.free))}`}>
        {!solo && <div className="bg-navy" style={{ width: seg(b.myShareOfHouse) }} />}
        <div className="bg-p1" style={{ width: seg(b.myPersonal) }} />
        {!negative && <div className="bg-ok" style={{ width: seg(b.myBalance) }} />}
      </div>

      <dl className={cn("mt-4 grid grid-cols-2 gap-x-4 gap-y-4 text-sm", solo ? "sm:grid-cols-3" : "sm:grid-cols-4")}>
        <div>
          <dt className="text-xs text-muted-foreground">Salário</dt>
          <dd className="mt-0.5 flex items-center gap-1.5 font-semibold">
            {money(b.myIncome)}
            <button onClick={onEditIncome} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Editar renda">
              <Pencil className="h-3 w-3" />
            </button>
          </dd>
        </div>
        {!solo && <Legend dot="bg-navy" label="Sua parte da casa" value={`− ${money(b.myShareOfHouse)}`} pct={b.pct.house} />}
        <Legend dot="bg-p1" label={solo ? "Contas do mês" : "Contas pessoais"} value={`− ${money(b.myPersonal)}`} pct={b.pct.personal} />
        <Legend dot="bg-ok" label="= Sobra" value={money(b.myBalance)} pct={b.pct.free}
          valueClass={negative ? "text-destructive" : "text-ok"} />
      </dl>
    </Card>
  );
}

function Legend({ dot, label, value, pct, valueClass }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
        {label}
      </dt>
      <dd className={cn("mt-0.5 font-semibold whitespace-nowrap", valueClass)}>
        {value} <span className="text-xs font-normal text-muted-foreground">· {pctFmt(pct)}</span>
      </dd>
    </div>
  );
}

export function SplitCard({ b, shared, me, onToggleSettled, onEdit, className }) {
  const partner = b.partner.id;
  const users = shared.users;
  const h = b.house;
  const s = b.settlement;
  const first = (u) => users[u].name.split(" ")[0] === "Pessoa" ? users[u].name : users[u].name.split(" ")[0];
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardTitle>Divisão da casa</CardTitle>
      <CardHint className="mt-5">Total das contas</CardHint>
      <Money value={h.total} className="mt-1" />

      <div className="mt-5 flex justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className={cn("h-1.5 w-1.5 rounded-full", dotClass(me))} />Você paga</span>
        <span className="flex items-center gap-1.5">{first(partner)} paga<span className={cn("h-1.5 w-1.5 rounded-full", dotClass(partner))} /></span>
      </div>
      <div className="mt-0.5 flex justify-between text-[15px] font-semibold">
        <span>{money(h.paying[me])}</span>
        <span>{money(h.paying[partner])}</span>
      </div>

      {/* barra: quem paga de fato; o traço marca a divisão combinada */}
      <div className="relative mt-2">
        <div className="flex h-7 overflow-hidden rounded-md text-[11px] font-bold text-white">
          <div className={cn("flex items-center px-2", dotClass(me))} style={{ width: `${h.payingPct[me]}%` }}>
            {h.payingPct[me] >= 14 && `${h.payingPct[me].toFixed(1).replace(".", ",")}%`}
          </div>
          <div className={cn("flex flex-1 items-center justify-end px-2", dotClass(partner))}>
            {h.payingPct[partner] >= 14 && `${h.payingPct[partner].toFixed(1).replace(".", ",")}%`}
          </div>
        </div>
        <div className="absolute -bottom-1 -top-1 w-0.5 -translate-x-1/2 rounded bg-foreground" style={{ left: `${h.fairPct[me]}%` }}
          title={`Divisão combinada: ${h.fairPct[me].toFixed(0)}/${h.fairPct[partner].toFixed(0)}`} />
      </div>
      <CardHint className="mt-2">
        Combinado: {h.fairPct[me].toFixed(0)}% você · {h.fairPct[partner].toFixed(0)}% {first(partner)} (traço preto)
      </CardHint>

      <p className="mt-5 text-xs font-semibold">Quem paga cada conta</p>
      <ul className="mt-1 divide-y">
        {shared.accounts.length === 0 && <li className="py-3 text-sm text-muted-foreground">Nenhuma conta da casa ainda.</li>}
        {shared.accounts.map((a) => (
          <li key={a.id}>
            <button onClick={() => onEdit?.(a)} className="flex w-full items-center gap-2.5 py-2.5 text-left text-sm hover:bg-muted/50">
              <span className={cn("h-2 w-2 rounded-full", dotClass(a.paidBy))} />
              <span className="flex-1 truncate">{a.name}</span>
              <span className="text-xs text-muted-foreground">{splitLabel(a.split, users)}</span>
              <span className="font-semibold whitespace-nowrap">{money(a.amount)}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="-mx-5 -mb-5 mt-auto flex items-center gap-3 border-t px-5 py-3.5">
        {s ? (
          <>
            <span className="flex items-center gap-1">
              <Avatar user={s.from} users={users} />
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <Avatar user={s.to} users={users} />
            </span>
            <p className={cn("flex-1 text-sm", shared.settled && "text-muted-foreground line-through")}>
              {s.iReceive ? `${first(s.from)} te devolve ` : `Você devolve a ${first(s.to)} `}
              <strong>{money(s.amount)}</strong> no Pix
            </p>
            <Button variant="outline" size="sm" onClick={onToggleSettled}>
              {shared.settled ? "Desfazer" : "Marcar feito"}
            </Button>
          </>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-ok" /> Tudo certo: ninguém deve nada.
          </p>
        )}
      </div>
    </Card>
  );
}

export function PrivacyCard({ b, shared, me }) {
  const partner = b.partner.id;
  const name = shared.users[partner].name;
  return (
    <Card>
      <CardTitle>O que cada um enxerga</CardTitle>
      <CardHint className="mt-2">A casa é dos dois. O pessoal fica só com o dono — e a conta fecha do mesmo jeito.</CardHint>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md bg-muted/60 p-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Avatar user={me} users={shared.users} className="h-4 w-4 text-[9px]" />Você</p>
          <Row label="Casa" value={money(b.myShareOfHouse)} />
          <Row label="Pessoal" value={money(b.myPersonal)} />
          <Row label="Total" value={money(b.myTotal)} strong />
        </div>
        <div className="rounded-md bg-muted/60 p-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Avatar user={partner} users={shared.users} className="h-4 w-4 text-[9px]" />{name}</p>
          <Row label="Casa" value={money(b.partner.shareOfHouse)} />
          <Row label="Pessoal" value={<Private />} />
          <Row label="Total" value={<Private />} strong />
        </div>
      </div>
    </Card>
  );
}

const Private = () => (
  <span className="inline-flex items-center gap-1 text-muted-foreground"><Lock className="h-3 w-3" />privado</span>
);

function Row({ label, value, strong }) {
  return (
    <p className={cn("mt-2 flex items-center justify-between gap-2", strong && "border-t pt-2 font-semibold")}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="whitespace-nowrap">{value}</span>
    </p>
  );
}
