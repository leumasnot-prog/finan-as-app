import { Nfc } from "lucide-react";
import { cn, money } from "@/lib/utils";

const THEMES = {
  graphite: {
    bg: "linear-gradient(135deg,#2b2d31 0%,#141518 55%,#232528 100%)",
    text: "text-white",
  },
  blue: {
    bg: "linear-gradient(135deg,#2f6bf0 0%,#1d4ed8 60%,#1a3fae 100%)",
    text: "text-white",
  },
  orange: {
    bg: "linear-gradient(135deg,#f58a1f 0%,#ea6a0a 100%)",
    text: "text-white",
  },
  sand: {
    bg: "linear-gradient(135deg,#ece7dd 0%,#d9d2c3 100%)",
    text: "text-neutral-900",
  },
};
export const CARD_THEMES = Object.keys(THEMES);

const Chip = () => (
  <svg viewBox="0 0 44 34" className="h-7 w-9" aria-hidden>
    <rect width="44" height="34" rx="6" fill="#e9e6df" />
    <path d="M0 12h14M0 22h14M30 12h14M30 22h14M14 0v34M30 0v34M14 17h16" stroke="#9a968c" strokeWidth="1.4" fill="none" />
  </svg>
);

export function CreditCardVisual({ account, month, className }) {
  const card = account.card || {};
  const theme = THEMES[card.theme] || THEMES.graphite;
  const free = Math.max(0, (card.limit || 0) - account.amount);
  const [, mm] = month.split("-");
  return (
    <div
      className={cn(
        "relative flex aspect-[1.586] w-full max-w-[360px] shrink-0 flex-col justify-between overflow-hidden rounded-xl p-4 shadow-lg",
        theme.text,
        className
      )}
      style={{ background: theme.bg }}
    >
      {/* textura escovada + brilho */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ background: "repeating-linear-gradient(100deg,#fff 0 1px,transparent 1px 4px)" }}
      />
      <div
        className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full opacity-20"
        style={{ background: "radial-gradient(closest-side,#fff,transparent)" }}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="font-display text-base font-bold leading-none">{account.name}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] opacity-70">
            {account.type === "shared" ? "Compartilhado" : "Pessoal"}
          </p>
        </div>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold backdrop-blur">
          {account.paid ? "Paga" : "Aberta"}
        </span>
      </div>
      <div className="relative flex items-center justify-between">
        <Chip />
        <span className="font-mono text-[11px] uppercase tracking-[0.35em] opacity-80">{card.tier || "Card"}</span>
        <Nfc className="h-5 w-5 opacity-70" />
      </div>
      <div className="relative flex items-end justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-widest opacity-60">Vence</p>
          <p className="font-mono text-sm font-medium">
            {String(account.dueDay).padStart(2, "0")}/{mm}
          </p>
        </div>
        <p className="font-mono text-xs opacity-70">•••• {card.last4 || "0000"}</p>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-widest opacity-60">Limite livre</p>
          <p className="font-mono text-sm font-medium">{card.limit ? money(free) : "—"}</p>
        </div>
      </div>
    </div>
  );
}
