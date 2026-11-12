import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", {
  variants: {
    tone: {
      neutral: "bg-muted text-muted-foreground",
      info: "bg-tint text-tint-foreground",
      ok: "bg-ok/10 text-ok",
      warn: "bg-warn/15 text-warn",
      danger: "bg-destructive/10 text-destructive",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export const Badge = ({ className, tone, ...props }) => <span className={cn(badge({ tone }), className)} {...props} />;

// Rótulo de seção em caixa alta, acima de um título.
export const Eyebrow = ({ className, ...props }) => (
  <p className={cn("text-[12px] font-bold uppercase leading-4 tracking-[0.08em] text-tint-foreground", className)} {...props} />
);
