import * as React from "react";
import { cn } from "@/lib/utils";

// Valor como nos apps de banco: você digita só números e eles entram pelos
// centavos (1 → 0,01; 1234 → 12,34). Teclado numérico no celular, sem vírgula
// para errar. `value` e `onChange` trabalham com texto "1234,56" (o resto do app
// já entende esse formato).
const fmt = (cents) => (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toCents = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return 0;
  const n = parseFloat(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
  return Number.isNaN(n) ? 0 : Math.round(n * 100);
};

export const MoneyInput = React.forwardRef(({ value, onChange, className, size = "lg", id, ...props }, ref) => {
  const cents = toCents(value);
  const set = (c) => onChange(c ? fmt(c) : "");
  return (
    <div className={cn("flex items-center gap-2 rounded-md border bg-card px-3 focus-within:ring-2 focus-within:ring-ring", size === "lg" ? "h-16" : "h-10", className)}>
      <span className={cn("font-display font-bold text-muted-foreground", size === "lg" ? "text-xl" : "text-sm")}>R$</span>
      <input
        ref={ref} id={id} inputMode="numeric" autoComplete="off" enterKeyHint="next"
        className={cn("w-full min-w-0 bg-transparent font-display font-bold tabular-nums outline-none placeholder:text-muted-foreground/60", size === "lg" ? "text-3xl" : "text-sm")}
        value={cents ? fmt(cents) : ""} placeholder="0,00"
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 11);
          set(digits ? parseInt(digits, 10) : 0);
        }}
        {...props}
      />
    </div>
  );
});
MoneyInput.displayName = "MoneyInput";
