// GroupFields.jsx
// Campos de formulário para escolher grupos (ver services/groupsStore.js):
// - SingleGroupField: um grupo (serviços)
// - MultiGroupField: vários grupos, como etiquetas (clientes)
// Ambos têm um botão para abrir a gestão de grupos sem sair do formulário.

import { useState } from "react";
import { FolderCog, Check } from "lucide-react";
import { useGroups } from "../../services/groupsStore.js";
import ManageGroupsDialog from "./ManageGroupsDialog.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";

const NONE = "__none__";

const ManageButton = ({ onClick }) => (
  <Button
    type="button"
    variant="outline"
    onClick={onClick}
    className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-700 shrink-0"
  >
    <FolderCog className="h-4 w-4 mr-2" />
    Gerir grupos
  </Button>
);

export const SingleGroupField = ({ kind, value, onChange, label = "Grupo", dialogTitle }) => {
  const { groups } = useGroups(kind);
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-400">{label}</label>
      <div className="flex gap-2">
        <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
            <SelectValue placeholder="Sem grupo" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            <SelectItem value={NONE} className="text-zinc-400 hover:bg-zinc-700">
              Sem grupo
            </SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id} className="text-white hover:bg-zinc-700">
                {g.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ManageButton onClick={() => setManageOpen(true)} />
      </div>
      <ManageGroupsDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        kind={kind}
        title={dialogTitle || "Grupos"}
      />
    </div>
  );
};

export const MultiGroupField = ({ kind, value = [], onChange, label = "Grupos", dialogTitle }) => {
  const { groups } = useGroups(kind);
  const [manageOpen, setManageOpen] = useState(false);
  const selected = new Set(value);

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-zinc-400">{label}</label>
        <ManageButton onClick={() => setManageOpen(true)} />
      </div>
      {groups.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Ainda não há grupos. Carregue em &quot;Gerir grupos&quot; para criar.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => {
            const on = selected.has(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggle(g.id)}
                aria-pressed={on}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors ${
                  on
                    ? "border-green-500 bg-green-500/15 text-green-300"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {on && <Check className="h-3 w-3" />}
                {g.nome}
              </button>
            );
          })}
        </div>
      )}
      <ManageGroupsDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        kind={kind}
        title={dialogTitle || "Grupos"}
      />
    </div>
  );
};
