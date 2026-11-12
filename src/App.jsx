import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav, Logo, navFor, Sidebar, ThemeToggle, UserSwitch } from "@/components/Nav";
import { AddTransactionModal } from "@/components/AddTransactionModal";
import { Overview } from "@/components/views/Overview";
import { Flow } from "@/components/views/Flow";
import { Cards } from "@/components/views/Cards";
import { House } from "@/components/views/House";
import { DesignSystem } from "@/components/views/DesignSystem";
import { StorageManager } from "@/lib/storage";
import { byCategory, calculateBalances, cashFlowSeries, visibleAccounts } from "@/lib/finance";
import { monthLabel, shiftMonth } from "@/lib/seed";

export default function App() {
  const [session, setSession] = useState(null); // { currentUser, month, theme }
  const [data, setData] = useState(null); // { user, month, shared, mine }
  const [tab, setTab] = useState("inicio");
  const [modal, setModal] = useState({ open: false, editing: null, kind: "shared" });
  const saved = useRef({ shared: null, mine: null });

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
    const { shared, mine } = await StorageManager.load(user, month);
    saved.current = { shared, mine };
    setData({ user, month, shared, mine });
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
  }, [data]);

  const ready = data && data.user === user && data.month === month;
  // Modo "só eu": as contas da casa ficam guardadas, mas saem de todas as contas e telas.
  const solo = session?.mode === "solo";
  const view = useMemo(() => {
    if (!ready) return null;
    const [y, m] = data.month.split("-").map(Number);
    const house = solo ? { ...data.shared, accounts: [] } : data.shared;
    return {
      house,
      b: calculateBalances(house, data.mine, data.user),
      accounts: visibleAccounts(house, data.mine, data.user),
      series: cashFlowSeries(house, data.mine, data.user, new Date(y, m, 0).getDate()),
      categories: byCategory(house, data.mine, data.user),
    };
  }, [data, ready, solo]);

  if (!ready) return <div className="grid min-h-dvh place-items-center text-sm text-muted-foreground">Carregando…</div>;

  const { shared, mine } = data;
  const patchShared = (fn) => setData((d) => ({ ...d, shared: fn(d.shared) }));
  const patchMine = (fn) => setData((d) => ({ ...d, mine: fn(d.mine) }));
  const upsert = (list, item) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]);
  const strip = ({ myShare, ...a }) => a;

  const actions = {
    add: (kind = "shared") => setModal({ open: true, editing: null, kind: solo && kind === "shared" ? "personal" : kind }),
    edit: (a) => setModal({ open: true, editing: { kind: a.type, item: strip(a) }, kind: a.type }),
    editIncome: () => {
      const inc = mine.incomes[0];
      setModal({ open: true, editing: inc ? { kind: "income", item: inc } : null, kind: "income" });
    },
    save: (kind, item) => {
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
    toggleSettled: () => patchShared((s) => ({ ...s, settled: !s.settled })),
    rename: (u, name) => patchShared((s) => ({ ...s, users: { ...s.users, [u]: { ...s.users[u], name } } })),
    reset: async () => {
      if (!window.confirm("Restaurar os dados de exemplo deste mês? Isso apaga as contas da casa e as pessoais dos dois.")) return;
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
          <Button onClick={() => actions.add(tab === "casa" ? "shared" : "personal")}>
            <Plus className="h-4 w-4" /><span className="hidden sm:inline">Adicionar</span>
          </Button>
        </header>

        {tab === "inicio" && <Overview b={view.b} shared={view.house} me={user} month={month} accounts={view.accounts} actions={actions} setTab={setTab} solo={solo} />}
        {tab === "fluxo" && <Flow b={view.b} series={view.series} categories={view.categories} solo={solo} />}
        {tab === "cartoes" && <Cards accounts={view.accounts} month={month} actions={actions} solo={solo} />}
        {tab === "casa" && <House b={view.b} shared={view.house} me={user} actions={actions} storageLabel={storageLabel} onOpenDs={() => setTab("ds")} solo={solo} onMode={setMode} />}
        {tab === "ds" && <DesignSystem users={shared.users} month={month} />}
      </main>
      <BottomNav tab={tab} setTab={setTab} solo={solo} />
      <AddTransactionModal
        open={modal.open} onOpenChange={(open) => setModal((m) => ({ ...m, open }))}
        editing={modal.editing} defaultKind={modal.kind} me={user} users={shared.users} solo={solo}
        onSave={actions.save} onDelete={actions.remove}
      />
    </div>
  );
}
