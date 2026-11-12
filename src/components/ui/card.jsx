import { cn } from "@/lib/utils";

export const Card = ({ className, ...props }) => (
  <section className={cn("rounded-lg border bg-card p-5 shadow-card", className)} {...props} />
);
export const CardTitle = ({ className, ...props }) => (
  <h2 className={cn("text-[15px] font-semibold leading-none", className)} {...props} />
);
export const CardHint = ({ className, ...props }) => (
  <p className={cn("text-xs text-muted-foreground", className)} {...props} />
);
