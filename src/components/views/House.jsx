import { Plus, RotateCcw } from "lucide-react";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PrivacyCard, SplitCard } from "@/components/OverviewCards";
import { Avatar } from "@/components/Avatar";
import { USERS } from "@/lib/seed";

export function House({ b, shared, me, actions, storageLabel, onOpenDs }) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <SplitCard className="xl:col-span-2" b={b} shared={shared} me={me} onToggleSettled={actions.toggleSettled} onEdit={actions.edit} />
      <div className="space-y-4">
        <Button className="w-full" onClick={() => actions.add("shared")}><Plus className="h-4 w-4" />Conta da casa</Button>
        <PrivacyCard b={b} shared={shared} me={me} />
        <Card>
          <CardTitle>Quem somos</CardTitle>
          <div className="mt-4 space-y-3">
            {USERS.map((u) => (
              <div key={u}>
                <Label htmlFor={`name-${u}`} className="flex items-center gap-1.5">
                  <Avatar user={u} users={shared.users} className="h-4 w-4 text-[9px]" />{u === me ? "Você" : "Parceiro(a)"}
                </Label>
                <Input id={`name-${u}`} value={shared.users[u].name} maxLength={24} onChange={(e) => actions.rename(u, e.target.value)} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>Dados</CardTitle>
          <CardHint className="mt-2">{storageLabel}</CardHint>
          <Button variant="outline" size="sm" className="mt-3" onClick={actions.reset}>
            <RotateCcw className="h-3 w-3" />Restaurar exemplo do mês
          </Button>
          <Button variant="ghost" size="sm" className="mt-3 lg:hidden" onClick={onOpenDs}>Design system</Button>
        </Card>
      </div>
    </div>
  );
}
