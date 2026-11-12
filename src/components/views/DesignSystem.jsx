import { useEffect, useState } from "react";
import { Lock, Plus, Trash2, Users } from "lucide-react";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Eyebrow } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { Money } from "@/components/Money";
import { Avatar } from "@/components/Avatar";
import { CreditCardVisual, CARD_THEMES } from "@/components/CreditCardVisual";
import { BalanceChart } from "@/components/BalanceChart";
import { cn } from "@/lib/utils";

const COLORS = [
  ["Superfícies", [
    ["background", "Fundo da página"], ["card", "Cards, sidebar, modal"], ["muted", "Trilhos, chips, hover"], ["border", "Bordas e divisores"],
  ]],
  ["Texto", [["foreground", "Texto principal"], ["muted-foreground", "Texto de apoio"]]],
  ["Marca e ação", [["primary", "Ação principal, foco"], ["tint", "Fundo de destaque suave"], ["tint-foreground", "Texto sobre tint, eyebrow"]]],
  ["Pessoas", [["p1", "Pessoa 1"], ["p2", "Pessoa 2"]]],
  ["Significado", [["navy", "Parte da casa"], ["ok", "Sobra, pago"], ["warn", "Atenção"], ["destructive", "Falta, excluir"]]],
];

const TYPE = [
  ["Display", "font-display text-4xl sm:text-6xl font-bold tracking-tight", "R$ 7.995", "Bricolage 700 · 36→60px · saldo principal"],
  ["Valor", "font-display text-3xl sm:text-4xl font-bold tracking-tight", "R$ 10.950", "Bricolage 700 · 30→36px · totais de card"],
  ["Heading", "font-display text-heading", "Dezembro 2026", "Bricolage 700 · 24/28 · título de página"],
  ["Title", "text-title", "Divisão da casa", "Instrument 600 · 15/20 · título de card"],
  ["Body", "text-body", "Pessoa 2 te devolve R$ 675,00 no Pix", "Instrument 400 · 14/20 · texto e listas"],
  ["Caption", "text-caption text-muted-foreground", "valor estimado após pagar todas as contas", "Instrument 400 · 12/16 · apoio"],
  ["Eyebrow", "text-eyebrow uppercase text-tint-foreground", "Nossa casa", "Instrument 700 · 12/16 · +0,08em"],
  ["Mono", "font-mono text-sm", "•••• 0937  12/12", "JetBrains Mono 500 · dados do cartão"],
];

// Séries de exemplo para o gráfico de saldo: uma que fecha o mês sobrando, outra faltando.
const demoSeries = (start, outs) => {
  let saldo = start;
  return Array.from({ length: 31 }, (_, i) => ({ day: i + 1, saldo: (saldo -= outs[i + 1] ?? 0) }));
};
const DEMO_UP = demoSeries(9000, { 5: 2400, 8: 890, 10: 2000, 15: 1075, 22: 640 });
const DEMO_DOWN = demoSeries(6000, { 5: 2400, 10: 2000, 12: 1450, 15: 1075, 20: 380 });

function Swatch({ token, use }) {
  const [value, setValue] = useState("");
  useEffect(() => {
    const read = () => setValue(getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim());
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, [token]);
  return (
    <div className="flex items-center gap-3">
      <span className="h-10 w-10 shrink-0 rounded-md border" style={{ background: `hsl(var(--${token}))` }} />
      <span className="min-w-0">
        <span className="block font-mono text-xs font-medium">--{token}</span>
        <span className="block truncate text-caption text-muted-foreground">{use} · hsl({value})</span>
      </span>
    </div>
  );
}

const Section = ({ eyebrow, title, children }) => (
  <Card>
    <Eyebrow>{eyebrow}</Eyebrow>
    <h2 className="mt-1 font-display text-heading">{title}</h2>
    <div className="mt-5">{children}</div>
  </Card>
);

export function DesignSystem({ users, month }) {
  const demoCard = (theme, i) => ({
    id: theme, name: ["Cartão pessoal", "Cartão da casa", "Viagens", "Reserva"][i], type: i === 1 ? "shared" : "personal",
    amount: 2150, dueDay: 12 + i, paid: i === 3, card: { tier: ["Black", "Platinum", "Gold", "Card"][i], last4: `48${i}1`, limit: 12000, theme },
  });
  return (
    <div className="space-y-4">
      <Section eyebrow="Fundamentos" title="Cores">
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {COLORS.map(([group, list]) => (
            <div key={group}>
              <p className="mb-3 text-caption font-semibold">{group}</p>
              <div className="space-y-3">{list.map(([t, u]) => <Swatch key={t} token={t} use={u} />)}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Fundamentos" title="Tipografia">
        <div className="divide-y">
          {TYPE.map(([name, cls, sample, spec]) => (
            <div key={name} className="grid gap-1 py-3 sm:grid-cols-[110px_1fr_auto] sm:items-baseline sm:gap-4">
              <span className="text-caption font-semibold">{name}</span>
              <span className={`min-w-0 truncate ${cls}`}>{sample}</span>
              <span className="text-caption text-muted-foreground">{spec}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-end gap-8">
          <Money value={7995.5} size="xl" />
          <Money value={10950} size="lg" />
          <Money value={-320.4} size="md" className="text-destructive" />
        </div>
      </Section>

      <Section eyebrow="Fundamentos" title="Forma, sombra e espaço">
        <div className="grid gap-6 lg:grid-cols-3">
          <div>
            <p className="mb-3 text-caption font-semibold">Raios</p>
            <div className="flex flex-wrap gap-3">
              {[["sm", "8", "rounded-sm"], ["md", "12", "rounded-md"], ["lg", "16", "rounded-lg"], ["full", "pílula", "rounded-full"]].map(([r, px, cls]) => (
                <div key={r} className="text-center">
                  <div className={cn("h-14 w-14 border bg-muted", cls)} />
                  <p className="mt-1 font-mono text-[11px]">{r}</p>
                  <p className="text-[11px] text-muted-foreground">{px}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-caption font-semibold">Sombras</p>
            <div className="flex flex-wrap gap-4">
              {[["card", "shadow-card"], ["pop", "shadow-pop"], ["cta", "shadow-cta"]].map(([s, cls]) => (
                <div key={s} className={cn("flex h-14 w-20 items-center justify-center rounded-md bg-card font-mono text-[11px]", s === "card" && "border", cls)}>{s}</div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-caption font-semibold">Espaço (base 4px)</p>
            <div className="space-y-1.5">
              {[[1, "4 · ícone↔texto"], [2, "8 · itens em linha"], [3, "12 · linhas de lista"], [4, "16 · entre cards"], [5, "20 · padding do card"], [8, "32 · blocos"]].map(([n, l]) => (
                <div key={n} className="flex items-center gap-3 text-caption">
                  <span className="h-2 rounded-sm bg-primary" style={{ width: n * 4 }} />
                  <span className="text-muted-foreground">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section eyebrow="Componentes" title="Ações e formulário">
        <div className="flex flex-wrap items-center gap-3">
          <Button><Plus className="h-4 w-4" />Adicionar</Button>
          <Button variant="outline">Ver faturas</Button>
          <Button variant="outline" size="sm">Marcar feito</Button>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="destructive"><Trash2 className="h-4 w-4" />Excluir</Button>
          <Button disabled>Salvar</Button>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge>Aberta</Badge><Badge tone="info">50/50</Badge><Badge tone="ok">Paga</Badge>
          <Badge tone="warn">Vence em 2 dias</Badge><Badge tone="danger">Atrasada</Badge>
          <Badge><Users className="h-3 w-3" />Casa</Badge><Badge><Lock className="h-3 w-3" />Só você vê</Badge>
        </div>
        <div className="mt-5 grid max-w-xl gap-3 sm:grid-cols-2">
          <div><Label htmlFor="ds-a">Nome</Label><Input id="ds-a" placeholder="Ex.: Condomínio" /></div>
          <div><Label htmlFor="ds-b">Divisão</Label><Select id="ds-b" defaultValue="50/50"><option>50/50</option><option>60/40</option></Select></div>
        </div>
      </Section>

      <Section eyebrow="Componentes" title="Pessoas e divisão">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2"><Avatar user="pessoa1" users={users} className="h-8 w-8 text-sm" /><span className="text-body">{users.pessoa1.name} · azul</span></div>
          <div className="flex items-center gap-2"><Avatar user="pessoa2" users={users} className="h-8 w-8 text-sm" /><span className="text-body">{users.pessoa2.name} · rosa</span></div>
        </div>
        <div className="mt-5 max-w-md">
          <div className="relative">
            <div className="flex h-7 overflow-hidden rounded-md text-[11px] font-bold text-white">
              <div className="flex items-center bg-p1 px-2" style={{ width: "56.2%" }}>56,2%</div>
              <div className="flex flex-1 items-center justify-end bg-p2 px-2">43,8%</div>
            </div>
            <div className="absolute -bottom-1 -top-1 left-1/2 w-0.5 -translate-x-1/2 rounded bg-foreground" />
          </div>
          <CardHint className="mt-2">Barra = quem paga de fato. Traço = divisão combinada.</CardHint>
          <div className="mt-5 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
            <div className="bg-navy" style={{ width: "20%" }} /><div className="bg-p1" style={{ width: "52%" }} /><div className="bg-ok" style={{ width: "28%" }} />
          </div>
          <CardHint className="mt-2">Saldo: casa (navy) · pessoal (azul) · sobra (verde), com 2px de respiro.</CardHint>
        </div>
      </Section>

      <Section eyebrow="Componentes" title="Cartão de crédito">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CARD_THEMES.map((t, i) => <CreditCardVisual key={t} account={demoCard(t, i)} month={month} />)}
        </div>
      </Section>

      <Section eyebrow="Componentes" title="Gráfico de saldo (puxe para atualizar)">
        <div className="grid gap-6 sm:grid-cols-2">
          <BalanceChart series={DEMO_UP} />
          <BalanceChart series={DEMO_DOWN} />
        </div>
        <p className="mt-4 text-caption text-muted-foreground">
          Puxe o card para baixo para atualizar (ou foque nele e aperte Enter). Passe o dedo ou o mouse na linha para ler cada dia.
          Verde = saldo positivo naquele dia; vermelho = falta. Componente de Bencho (MIT), com os tokens do Duo Finn.
        </p>
      </Section>

      <Card>
        <CardTitle>Documentação completa</CardTitle>
        <CardHint className="mt-2">Princípios, tabelas de tokens, regras de uso e acessibilidade estão em <code className="font-mono">docs/design-system.md</code>.</CardHint>
      </Card>
    </div>
  );
}
