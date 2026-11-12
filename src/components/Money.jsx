import { cn } from "@/lib/utils";

// Valor grande no estilo "R$ 5.304,28": moeda e centavos discretos.
export function Money({ value, className, size = "lg", approx = false }) {
  const neg = value < 0;
  const abs = Math.abs(value || 0);
  const [int, cents] = abs.toFixed(2).split(".");
  const intFmt = Number(int).toLocaleString("pt-BR");
  const sizes = {
    xl: ["text-4xl sm:text-6xl", "text-xl sm:text-3xl"],
    lg: ["text-3xl sm:text-4xl", "text-base sm:text-lg"],
    md: ["text-2xl", "text-sm"],
  }[size];
  return (
    <span className={cn("font-display font-bold leading-none tracking-tight whitespace-nowrap", sizes[0], className)}>
      <span className="text-muted-foreground">
        {approx && "≈ "}
        {neg && "− "}R$
      </span>{" "}
      {intFmt}
      <span className={cn("font-medium text-muted-foreground", sizes[1])}>,{cents}</span>
    </span>
  );
}
