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
  purple: {
    bg: "linear-gradient(135deg,#9b4dff 0%,#7a1fe0 55%,#5b12b0 100%)",
    text: "text-white",
  },
  green: {
    bg: "linear-gradient(135deg,#1fb877 0%,#0f8f5a 60%,#0a6b44 100%)",
    text: "text-white",
  },
  pink: {
    bg: "linear-gradient(135deg,#ff6fa5 0%,#e83e7d 60%,#c22462 100%)",
    text: "text-white",
  },
  red: {
    bg: "linear-gradient(135deg,#f0483e 0%,#cf2a22 60%,#a51a14 100%)",
    text: "text-white",
  },
  teal: {
    bg: "linear-gradient(135deg,#21b8c4 0%,#0e8f9b 60%,#0a6d76 100%)",
    text: "text-white",
  },
  gold: {
    bg: "linear-gradient(135deg,#e9c46a 0%,#c99a2e 60%,#a67c1f 100%)",
    text: "text-neutral-900",
  },
};
export const CARD_THEME_NAMES = {
  graphite: "Grafite", blue: "Azul", purple: "Roxo", pink: "Rosa", red: "Vermelho",
  orange: "Laranja", gold: "Dourado", green: "Verde", teal: "Turquesa", sand: "Areia",
};
export const cardBackground = (theme) => (THEMES[theme] || THEMES.graphite).bg;

// Cor livre escolhida pelo usuário: o gradiente sai da própria cor, clareando
// no canto e escurecendo na ponta. Texto escuro se a cor for clara.
function customTheme(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  const light = 0.299 * r + 0.587 * g + 0.114 * b > 170;
  return {
    bg: `linear-gradient(135deg, color-mix(in srgb, ${hex} 78%, #fff) 0%, ${hex} 55%, color-mix(in srgb, ${hex} 70%, #000) 100%)`,
    text: light ? "text-neutral-900" : "text-white",
  };
}
const themeOf = (card) =>
  /^#[0-9a-f]{6}$/i.test(card.color ?? "") ? customTheme(card.color) : THEMES[card.theme] || THEMES.graphite;
export const CARD_THEMES = Object.keys(THEMES);

const Chip = () => (
  <svg viewBox="0 0 44 34" className="h-7 w-9" aria-hidden>
    <rect width="44" height="34" rx="6" fill="#e9e6df" />
    <path d="M0 12h14M0 22h14M30 12h14M30 22h14M14 0v34M30 0v34M14 17h16" stroke="#9a968c" strokeWidth="1.4" fill="none" />
  </svg>
);

// Aceita uma conta antiga (`account`, com `card` embutido) ou um cartão da
// carteira (`wallet`, de walletCards: nome, cor, fatura do mês).
export function CreditCardVisual({ account, wallet, month, className, style }) {
  if (wallet) {
    account = {
      name: wallet.name, type: wallet.shared ? "shared" : "personal", paid: wallet.paid,
      dueDay: wallet.dueDay, amount: wallet.invoice,
      card: { theme: wallet.theme, color: wallet.color, last4: wallet.last4, limit: wallet.limit, tier: wallet.tier || wallet.brand },
    };
  }
  const card = account.card || {};
  const theme = themeOf(card);
  const free = Math.max(0, (card.limit || 0) - account.amount);
  const [, mm] = month.split("-");
  return (
    <div
      className={cn(
        "relative flex aspect-[1.586] w-full max-w-[360px] shrink-0 flex-col justify-between overflow-hidden rounded-xl p-4 shadow-lg",
        theme.text,
        className
      )}
      style={{ background: theme.bg, ...style }}
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
          {account.amount === 0 ? "Sem fatura" : account.paid ? "Paga" : "Aberta"}
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
