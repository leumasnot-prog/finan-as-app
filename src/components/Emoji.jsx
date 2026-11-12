import { emojiSrc } from "@/lib/emoji";
import { cn } from "@/lib/utils";

// Emoji 3D do conjunto do app; emoji fora do conjunto cai para o do sistema.
export function Emoji({ char, size = 24, className, label }) {
  const src = emojiSrc(char);
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  if (!src)
    return <span className={cn("inline-block text-center leading-none", className)} style={{ fontSize: size * 0.85, width: size }} {...a11y}>{char}</span>;
  return <img src={src} alt={label ?? ""} width={size} height={size} draggable={false} className={cn("inline-block shrink-0 select-none", className)} {...(label ? {} : { "aria-hidden": true })} />;
}
