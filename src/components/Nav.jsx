import { ArrowLeftRight, CreditCard, Home, LayoutGrid, Moon, Palette, Sun } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils";

export const NAV = [
  { id: "inicio", label: "Visão geral", short: "Início", icon: LayoutGrid },
  { id: "fluxo", label: "Fluxo de caixa", short: "Fluxo", icon: ArrowLeftRight },
  { id: "cartoes", label: "Cartões", short: "Cartões", icon: CreditCard },
  { id: "casa", label: "Nossa casa", short: "Casa", icon: Home },
];

export function Logo({ users }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex -space-x-2">
        <Avatar user="pessoa1" users={users} className="h-7 w-7 ring-2 ring-card" />
        <Avatar user="pessoa2" users={users} className="h-7 w-7 ring-2 ring-card" />
      </span>
      <span>
        <span className="block font-display text-[15px] font-bold leading-tight">Duo Finn</span>
        <span className="block text-[11px] text-muted-foreground">Finanças em casal</span>
      </span>
    </div>
  );
}

export function UserSwitch({ me, users, onSwitch, compact }) {
  return (
    <div className={cn("flex rounded-md bg-muted p-1", compact ? "" : "w-full")} role="group" aria-label="Ver como">
      {["pessoa1", "pessoa2"].map((u) => (
        <button key={u} onClick={() => onSwitch(u)} aria-pressed={me === u}
          className={cn("flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-semibold",
            me === u ? "bg-card shadow-sm" : "text-muted-foreground")}>
          <Avatar user={u} users={users} className="h-4 w-4 text-[9px]" />
          {!compact && <span className="truncate">{users[u].name}</span>}
        </button>
      ))}
    </div>
  );
}

export function Sidebar({ tab, setTab, me, users, onSwitch, theme, onTheme }) {
  return (
    <aside className="sticky top-4 hidden h-[calc(100dvh-2rem)] w-60 shrink-0 flex-col rounded-lg border bg-card p-4 lg:flex">
      <Logo users={users} />
      <p className="mb-2 mt-8 px-2 text-[11px] font-medium text-muted-foreground">Menu</p>
      <nav className="space-y-0.5">
        {NAV.map((n) => (
          <button key={n.id} onClick={() => setTab(n.id)} aria-current={tab === n.id ? "page" : undefined}
            className={cn("flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm",
              tab === n.id ? "bg-muted font-semibold" : "text-muted-foreground hover:bg-muted/60")}>
            <n.icon className={cn("h-4 w-4", tab === n.id && "text-primary")} />{n.label}
          </button>
        ))}
      </nav>
      <p className="mb-2 mt-6 px-2 text-[11px] font-medium text-muted-foreground">Sistema</p>
      <button onClick={() => setTab("ds")} aria-current={tab === "ds" ? "page" : undefined}
        className={cn("flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm",
          tab === "ds" ? "bg-muted font-semibold" : "text-muted-foreground hover:bg-muted/60")}>
        <Palette className={cn("h-4 w-4", tab === "ds" && "text-primary")} />Design system
      </button>
      <div className="mt-auto space-y-3">
        <div className="flex items-center justify-between px-2 text-sm text-muted-foreground">
          <span>Tema</span>
          <ThemeToggle theme={theme} onTheme={onTheme} />
        </div>
        <div className="border-t pt-3">
          <p className="mb-1.5 px-1 text-[11px] text-muted-foreground">Ver como</p>
          <UserSwitch me={me} users={users} onSwitch={onSwitch} />
        </div>
      </div>
    </aside>
  );
}

export function ThemeToggle({ theme, onTheme }) {
  return (
    <button onClick={() => onTheme(theme === "dark" ? "light" : "dark")}
      className="flex h-8 w-8 items-center justify-center rounded-md border bg-card hover:bg-muted"
      aria-label={theme === "dark" ? "Tema claro" : "Tema escuro"}>
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function BottomNav({ tab, setTab }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {NAV.map((n) => (
          <button key={n.id} onClick={() => setTab(n.id)} aria-current={tab === n.id ? "page" : undefined}
            className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              tab === n.id ? "text-primary dark:text-tint-foreground" : "text-muted-foreground")}>
            <n.icon className="h-5 w-5" strokeWidth={tab === n.id ? 2.4 : 1.8} />{n.short}
          </button>
        ))}
      </div>
    </nav>
  );
}
