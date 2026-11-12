import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Emoji } from "@/components/Emoji";
import { EMOJIS } from "@/lib/emoji";
import { cn } from "@/lib/utils";

// Grade dos emojis 3D com busca por nome ("carro", "viagem", "pet"…).
export function EmojiPicker({ value, onChange, id = "emoji-search" }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? EMOJIS.filter((e) => e.name.includes(t)) : EMOJIS;
  }, [q]);
  return (
    <div className="rounded-md border bg-card">
      <div className="relative border-b p-2">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: carro, viagem, pet…" className="h-9 border-0 bg-muted pl-8" aria-label="Buscar emoji" />
      </div>
      <div className="grid max-h-44 grid-cols-8 gap-1 overflow-y-auto p-2 sm:grid-cols-10" role="listbox" aria-label="Emojis">
        {list.map((e) => (
          <button key={e.char} type="button" role="option" aria-selected={value === e.char} title={e.name}
            onClick={() => onChange(e.char)}
            className={cn("grid aspect-square place-items-center rounded-md transition-transform hover:scale-110 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
              value === e.char && "bg-tint ring-2 ring-primary")}>
            <Emoji char={e.char} size={26} label={e.name} />
          </button>
        ))}
        {list.length === 0 && <p className="col-span-full py-4 text-center text-xs text-muted-foreground">Nenhum emoji com esse nome.</p>}
      </div>
    </div>
  );
}
