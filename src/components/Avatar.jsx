import { cn } from "@/lib/utils";

const initialOf = (name = "?") => {
  const n = name.trim() || "?";
  return /\d$/.test(n) ? n.slice(-1) : n[0].toUpperCase();
};

export function Avatar({ user, users, className }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
        user === "pessoa1" ? "bg-p1" : "bg-p2",
        className
      )}
      aria-hidden
    >
      {initialOf(users?.[user]?.name)}
    </span>
  );
}

export const dotClass = (user) =>
  user === "pessoa1" ? "bg-p1" : user === "pessoa2" ? "bg-p2" : "bg-muted-foreground/40";
