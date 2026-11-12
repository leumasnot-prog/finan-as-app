import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav, Logo, navFor, Sidebar, ThemeToggle, UserSwitch } from "@/components/Nav";
import { AddTransactionModal } from "@/components/AddTransactionModal";
import { Overview } from "@/components/views/Overview";
import { Flow } from "@/components/views/Flow";
import { Cards } from "@/components/views/Cards";
import { House } from "@/components/views/House";
import { DesignSystem } from "@/components/views/DesignSystem";
import { Goals } from "@/components/views/Goals";
import { Assets } from "@/components/views/Assets";
import { AssetDialog, CardDialog, CategoryDialog, DepositDialog, GoalDialog } from "@/components/PlanningDialogs";
import { walletCards } from "@/lib/planning";
import { accountsForDest, ImportSheet } from "@/components/ImportSheet";
import { StorageManager } from "@/lib/storage";
import { byCategory, calculateBalances, cashFlowSeries, visibleAccounts } from "@/lib/finance";
import { monthLabel, shiftMonth } from "@/lib/seed";
import { uid } from "@/lib/utils";
import { cleanName } from "@/lib/importer";
import { makeBackup } from "@/lib/backup";

export default function App() {
  const [session, setSession] = useState(null); // { currentUser, month, theme }
  const [data, setData] = useState(null); // { user, month, shared, mine }
  const [tab, setTab] = useState("inicio");
  const [modal, setModal] = useState({ open: false, editing: null, kind: "shared" });
  const saved = useRef({ shared: null, mine: null, settings: null, profile: null });
  // diálogos das telas novas: { type, editing }
  const [dlg, setDlg] = useState({ type: null, editing: null });
  const closeDlg = (open) => !open && setDlg((d) => ({ ...d, type: null }));
  const [notice, setNotice] = useState(null);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(null), 4500); return () => clearTimeout(t); }, [notice]);

  // 1. sessão (quem está olhando, mês, tema)
  useEffect(() => { StorageManager.loadSession().then(setSession); }, []);
  useEffect(() => {
    if (!session) return;
    document.documentElement.classList.toggle("dark", session.theme === "dark");
    StorageManager.saveSession(session);
  }, [session]);

  // 2. carrega compartilhado + pessoal de quem está olhando (nunca o do outro)
  const user = session?.currentUser;
  const month = session?.month;
  const load = useCallback(async () => {
    const [{ shared, mine }, { settings, profile }] = await Promise.all([
      StorageManager.load(user, month),
      StorageManager.loadExtras(user),
    ]);
    saved.current = { shared, mine, settings, profile };
    setData({ user, month, shared, mine, settings, profile });
  }, [user, month]);
  useEffect(() => { if (user && month) load(); }, [user, month, load]);

  // 3. salva automaticamente, cada documento no seu escopo
  useEffect(() => {
    if (!data) return;
    if (data.shared !== saved.current.shared) {
      saved.current.shared = data.shared;
      StorageManager.saveShared(data.month, data.shared);
    }
    if (data.mine !== saved.current.mine) {
      saved.current.mine = data.mine;
      StorageManager.savePersonal(data.user, data.month, data.mine);
    }
    if (data.settings !== saved.current.settings) {
      saved.current.settings = data.settings;
      StorageManager.saveSettings(data.settings);
    }
    if (data.profile !== saved.current.profile) {
      saved.current.profile = data.profile;
      StorageManager.saveProfile(data.user, data.profile);
    }
  }, [data]);

  const ready = data && data.user === user && data.month === month;
  // Modo "só eu": as contas da casa ficam guardadas, mas saem de todas as contas e telas.
  const solo = session?.mode === "solo";
  const view = useMemo(() => {
    if (!ready) return null;
    const [y, m] = data.month.split("-").map(Number);
    const house = solo ? { ...data.shared, accounts: [] } : data.shared;
    const accounts = visibleAccounts(house, data.mine, data.user);
    return {
      house,
      wallet: walletCards(data.profile.cards ?? [], accounts),
      b: calculateBalances(house, data.mine, data.user),
      accounts,
      series: cashFlowSeries(house, data.mine, data.user, new Date(y, m, 0).getDate()),
      categories: byCategory(house, data.mine, data.user),
    };
  }, [data, ready, solo]);

  if (!ready) return <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">Carregando…</div>;

  const { shared, mine, settings, profile } = data;
  const categories = settings.categories;
  const patchSettings = (fn) => setData((d) => ({ ...d, settings: fn(d.settings) }));
  const patchProfile = (fn) => setData((d) => ({ ...d, profile: fn(d.profile) }));
  const patchShared = (fn) => setData((d) => ({ ...d, shared: fn(d.shared) }));
  const patchMine = (fn) => setData((d) => ({ ...d, mine: fn(d.mine) }));
  const upsert = (list, item) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]);
  const strip = ({ myShare, ...a }) => a;

  const actions = {
    add: (kind = "shared", preset) => setModal({ open: true, editing: null, preset, kind: solo && kind === "shared" ? "personal" : kind }),
    edit: (a) => setModal({ open: true, editing: { kind: a.type, item: strip(a) }, kind: a.type }),
    editIncome: () => {
      const inc = mine.incomes[0];
      setModal({ open: true, editing: inc ? { kind: "income", item: inc } : null, kind: "income" });
    },
    // spread: [{ month, item }] — o mês aberto vai pelo estado; os outros direto no storage.
    save: (kind, item, spread) => {
      if (spread) {
        for (const s of spread) {
          if (s.month === month) actions.save(kind, s.item);
          else StorageManager.addToMonth(kind, user, s.month, s.item);
        }
        return;
      }
      if (kind === "shared") patchShared((s) => ({ ...s, accounts: upsert(s.accounts, item), settled: false }));
      else if (kind === "personal") patchMine((p) => ({ ...p, accounts: upsert(p.accounts, item) }));
      else patchMine((p) => ({ ...p, incomes: upsert(p.incomes, item) }));
    },
    remove: (kind, id) => {
      if (kind === "shared") patchShared((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== id), settled: false }));
      else if (kind === "personal") patchMine((p) => ({ ...p, accounts: p.accounts.filter((a) => a.id !== id) }));
      else patchMine((p) => ({ ...p, incomes: p.incomes.filter((a) => a.id !== id) }));
    },
    togglePaid: (a) => {
      const flip = (list) => list.map((x) => (x.id === a.id ? { ...x, paid: !x.paid } : x));
      if (a.type === "shared") patchShared((s) => ({ ...s, accounts: flip(s.accounts) }));
      else patchMine((p) => ({ ...p, accounts: flip(p.accounts) }));
    },
    // carteira
    importFile: (cardId) => setDlg({ type: "import", editing: cardId ?? null }),
    // Resultado da revisão: o que casou é conferido (valor do banco, sem duplicar);
    // o novo entra como conta pessoal no mês da fatura (cartão) ou no mês da data (conta).
    importRows: ({ rows, dest, card, invoiceMonth, learned }) => {
      const snap = card && { name: card.name, theme: card.theme, color: card.color, last4: card.last4, limit: card.limit };
      const matched = new Map(rows.filter((r) => r.match).map((r) => [r.match.id, r]));
      if (matched.size && (!invoiceMonth || invoiceMonth === month)) {
        const upd = (list) => list.map((a) => {
          const r = matched.get(a.id);
          return r ? { ...a, amount: r.amount, reconciled: true, date: r.date, paid: dest === "conta" ? true : a.paid } : a;
        });
        patchShared((s) => ({ ...s, accounts: upd(s.accounts) }));
        patchMine((p) => ({ ...p, accounts: upd(p.accounts) }));
      }
      let created = 0;
      for (const r of rows.filter((x) => !x.match)) {
        const id = uid();
        const start = invoiceMonth ?? r.date.slice(0, 7);
        const base = {
          id, name: r.name.trim() || cleanName(r.raw), amount: r.amount, type: "personal", owner: user,
          dueDay: card ? card.dueDay ?? +r.date.slice(8, 10) : +r.date.slice(8, 10), category: r.category,
          paid: dest === "conta", imported: true, raw: r.raw, date: r.date,
          ...(card ? { cardId: card.id, card: snap } : {}),
          ...(r.installment ? { installment: r.installment } : {}),
        };
        // Parcela 2/5 na fatura: as 3 que faltam já entram nos próximos meses.
        const left = r.installment ? r.installment.total - r.installment.current : 0;
        for (let k = 0; k <= left; k++) {
          const m = shiftMonth(start, k);
          const item = k === 0 ? base : { ...base, id: `${id}@${m}`, paid: false, installment: { ...r.installment, current: r.installment.current + k } };
          if (m === month) actions.save("personal", item);
          else StorageManager.addToMonth("personal", user, m, item);
        }
        created++;
      }
      if (learned.length) patchProfile((p) => {
        const map = new Map((p.rules ?? []).map((x) => [x.key, x]));
        for (const l of learned) map.set(l.key, l);
        return { ...p, rules: [...map.values()] };
      });
      const parts = [created && `${created} ${created === 1 ? "lançamento novo" : "lançamentos novos"}`, matched.size && `${matched.size} já ${matched.size === 1 ? "lançado conferido" : "lançados conferidos"}`].filter(Boolean);
      const away = invoiceMonth && invoiceMonth !== month ? ` em ${monthLabel(invoiceMonth).name}` : "";
      setNotice(`Importado${away}: ${parts.join(" e ") || "nada novo"}.`);
    },
    editCard: (c) => setDlg({ type: "card", editing: c }),
    saveCard: (c) => patchProfile((p) => ({ ...p, cards: upsert(p.cards ?? [], c) })),
    removeCard: (id) => patchProfile((p) => ({ ...p, cards: (p.cards ?? []).filter((c) => c.id !== id) })),
    payCard: (card) => {
      const ids = new Set(card.items.map((a) => a.id));
      const to = !card.paid;
      const set = (list) => list.map((a) => (ids.has(a.id) ? { ...a, paid: to } : a));
      patchShared((s) => ({ ...s, accounts: set(s.accounts) }));
      patchMine((p) => ({ ...p, accounts: set(p.accounts) }));
    },
    // categorias (compartilhadas, sem mês)
    editCategory: (c) => setDlg({ type: "category", editing: c }),
    saveCategory: (c) => patchSettings((s) => ({ ...s, categories: upsert(s.categories, c) })),
    removeCategory: (id) => patchSettings((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== id) })),
    // metas e patrimônio (pessoais, sem mês)
    editGoal: (g) => setDlg({ type: "goal", editing: g }),
    saveGoal: (g) => patchProfile((p) => ({ ...p, goals: upsert(p.goals ?? [], g) })),
    removeGoal: (id) => patchProfile((p) => ({ ...p, goals: (p.goals ?? []).filter((g) => g.id !== id) })),
    deposit: (g, suggested) => setDlg({ type: "deposit", editing: g, suggested }),
    saveDeposit: (g, amount, asExpense) => {
      patchProfile((p) => ({ ...p, goals: p.goals.map((x) => (x.id === g.id ? { ...x, saved: Math.max(0, Math.round(((Number(x.saved) || 0) + amount) * 100) / 100) } : x)) }));
      if (asExpense) {
        const today = new Date();
        const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}` === month ? today.getDate() : 1;
        actions.save("personal", { id: uid(), name: `${g.name}`, amount, type: "personal", owner: user, dueDay: day, category: "reserva", paid: true, goalId: g.id });
      }
    },
    editAsset: (a) => setDlg({ type: "asset", editing: a }),
    saveAsset: (a) => patchProfile((p) => ({ ...p, assets: upsert(p.assets ?? [], a) })),
    removeAsset: (id) => patchProfile((p) => ({ ...p, assets: (p.assets ?? []).filter((a) => a.id !== id) })),
    toggleSettled: () => patchShared((s) => ({ ...s, settled: !s.settled })),
    rename: (u, name) => patchShared((s) => ({ ...s, users: { ...s.users, [u]: { ...s.users[u], name } } })),
    exportData: async () => {
      const docs = (await StorageManager.exportDocs()).filter((d) => !d.key.includes(":personal:") || d.key.includes(`:personal:${user}:`) || d.key === "duofinn:session");
      const blob = new Blob([JSON.stringify(makeBackup(user, docs), null, 1)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `duofinn-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      setNotice("Backup exportado.");
    },
    importData: async ({ docs, summary }) => {
      await StorageManager.importDocs(docs.filter((d) => d.kind !== "session"));
      const s = docs.find((d) => d.kind === "session")?.value;
      if (s) setSession((cur) => ({ ...cur, ...s, theme: cur.theme }));
      if (!s || (s.month === month && s.currentUser === user)) await load();
      setTab("inicio");
      setNotice(`${summary.entries} lançamentos importados.`);
    },
    reset: async () => {
      await StorageManager.reset(month);
      await load();
    },
  };

  const ml = monthLabel(month);
  const setMonth = (delta) => setSession((s) => ({ ...s, month: shiftMonth(s.month, delta) }));
  const switchUser = (u) => setSession((s) => ({ ...s, currentUser: u }));
  const setTheme = (theme) => setSession((s) => ({ ...s, theme }));
  const setMode = (mode) => setSession((s) => ({ ...s, mode }));
  const nav = navFor(solo);
  const storageLabel = StorageManager.isClaude()
    ? "Salvo no window.storage: contas da casa no espaço compartilhado, renda e contas pessoais no seu espaço privado."
    : solo
      ? "Salvo neste navegador (localStorage)."
      : "Salvo neste navegador (localStorage). “Ver como” simula as duas pessoas no mesmo aparelho.";

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1500px] gap-4 p-3 pb-24 sm:p-4 lg:pb-4">
      <Sidebar tab={tab} setTab={setTab} me={user} users={shared.users} onSwitch={switchUser} theme={session.theme} onTheme={setTheme} solo={solo} onMode={setMode} />
      <main className="min-w-0 flex-1 space-y-4">
        <div className="flex items-center justify-between lg:hidden">
          <Logo users={shared.users} solo={solo} me={user} />
          <div className="flex items-center gap-2">
            {!solo && <UserSwitch compact me={user} users={shared.users} onSwitch={switchUser} />}
            <ThemeToggle theme={session.theme} onTheme={setTheme} />
          </div>
        </div>
        <header className="flex items-center gap-1 rounded-lg border bg-card px-3 py-3 sm:px-5">
          <Button variant="ghost" size="icon" onClick={() => setMonth(-1)} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setMonth(1)} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button>
          <div className="ml-1 min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-bold sm:text-2xl">
              {ml.name} <span className="font-medium text-muted-foreground">{ml.year}</span>
            </h1>
            <p className="text-xs text-muted-foreground lg:hidden">{nav.find((n) => n.id === tab)?.label ?? "Design system"}</p>
          </div>
          <Button variant="outline" className="hidden sm:inline-flex" onClick={() => actions.importFile()}>
            <FileUp className="h-4 w-4" />Importar
          </Button>
          <Button className="hidden lg:inline-flex" onClick={() => (tab === "metas" ? actions.editGoal(null) : tab === "patrimonio" ? actions.editAsset(null) : tab === "cartoes" && view.wallet.length === 0 ? actions.editCard(null) : actions.add(tab === "casa" ? "shared" : "personal"))}>
            <Plus className="h-4 w-4" /><span className="hidden sm:inline">Adicionar</span>
          </Button>
        </header>

        {tab === "inicio" && <Overview b={view.b} shared={view.house} me={user} month={month} accounts={view.accounts} wallet={view.wallet} categories={categories} series={view.series} onRefresh={load} actions={actions} setTab={setTab} solo={solo} />}
        {tab === "fluxo" && <Flow b={view.b} series={view.series} accounts={view.accounts} categories={categories} actions={actions} solo={solo} />}
        {tab === "cartoes" && <Cards wallet={view.wallet} categories={categories} month={month} actions={actions} solo={solo} />}
        {tab === "metas" && <Goals goals={profile.goals ?? []} month={month} actions={actions} />}
        {tab === "patrimonio" && <Assets assets={profile.assets ?? []} actions={actions} />}
        {tab === "casa" && <House b={view.b} shared={view.house} me={user} actions={actions} storageLabel={storageLabel} onOpenDs={() => setTab("ds")} solo={solo} onMode={setMode} />}
        {tab === "ds" && <DesignSystem users={shared.users} month={month} />}
      </main>
      <BottomNav tab={tab} setTab={setTab} solo={solo} />
      {/* Celular: o "+" fica no alcance do polegar, acima da barra de abas. */}
      <button type="button" aria-label="Adicionar" onClick={() => (tab === "metas" ? actions.editGoal(null) : tab === "patrimonio" ? actions.editAsset(null) : actions.add(tab === "casa" ? "shared" : "personal"))}
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-cta transition-transform active:scale-95 lg:hidden">
        <Plus className="h-6 w-6" />
      </button>
      {notice && (
        <div role="status" className="fixed inset-x-0 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-50 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-pop lg:bottom-6">
          {notice}
        </div>
      )}
      <ImportSheet open={dlg.type === "import"} onOpenChange={closeDlg} wallet={view.wallet} categories={categories} rules={profile.rules ?? []}
        month={month} defaultCard={dlg.type === "import" ? dlg.editing ?? undefined : undefined}
        accountsFor={(dest, m) => (!m || m === month ? accountsForDest(view.accounts, dest) : [])} onImport={actions.importRows} />
      <AddTransactionModal
        open={modal.open} onOpenChange={(open) => setModal((m) => ({ ...m, open }))}
        editing={modal.editing} defaultKind={modal.kind} preset={modal.preset} me={user} users={shared.users} solo={solo}
        month={month} categories={categories} wallet={view.wallet} onNewCategory={() => actions.editCategory(null)}
        onSave={actions.save} onDelete={actions.remove}
      />
      <CategoryDialog open={dlg.type === "category"} onOpenChange={closeDlg} editing={dlg.type === "category" ? dlg.editing : null}
        inUse={dlg.type === "category" && !!dlg.editing && view.accounts.some((a) => a.category === dlg.editing.id)}
        onSave={actions.saveCategory} onDelete={actions.removeCategory} />
      <CardDialog open={dlg.type === "card"} onOpenChange={closeDlg} editing={dlg.type === "card" ? dlg.editing : null} month={month} onSave={actions.saveCard} onDelete={actions.removeCard} />
      <GoalDialog open={dlg.type === "goal"} onOpenChange={closeDlg} editing={dlg.type === "goal" ? dlg.editing : null} monthlySpend={view.b.myTotal} onSave={actions.saveGoal} onDelete={actions.removeGoal} />
      <DepositDialog open={dlg.type === "deposit"} onOpenChange={closeDlg} goal={dlg.type === "deposit" ? dlg.editing : null} suggested={dlg.suggested} onSave={actions.saveDeposit} />
      <AssetDialog open={dlg.type === "asset"} onOpenChange={closeDlg} editing={dlg.type === "asset" ? dlg.editing : null} onSave={actions.saveAsset} onDelete={actions.removeAsset} />
    </div>
  );
}
