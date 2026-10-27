// GroupFields.jsx
// Campo de formulário para escolher o grupo de um cliente. Os grupos são os
// de Serviços e Valores (ex.: HOMAG) — o mesmo grupo diz que valores os
// orçamentos desse cliente usam. Ver services/groupsStore.js.

import { Link } from "react-router-dom";
import { FolderOpen, Loader2 } from "lucide-react";
import { useGroups, GROUP_KINDS } from "../../services/groupsStore.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";

const NONE = "__none__";

/**
 * @param {string[]} value      grupoIds do cliente (guarda-se um só)
 * @param {(ids: string[]) => void} onChange
 */
export const ClientGroupField = ({ value = [], onChange, label = "Grupo", disabled, saving }) => {
  const { groups, byId } = useGroups(GROUP_KINDS.SERVICOS);
  const current = value.find((id) => byId.has(id)) || NONE;
  const extra = value.filter((id) => byId.has(id) && id !== current);

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <Select value={current} onValueChange={(v) => onChange(v === NONE ? [] : [v])} disabled={disabled}>
        <SelectTrigger>
          <div className="flex min-w-0 items-center gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">
              <SelectValue placeholder="Sem grupo" />
            </span>
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE} className="text-muted-foreground">
            Sem grupo
          </SelectItem>
          {groups.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {extra.length > 0 ? (
        <p className="text-xs text-amber-400">
          Este cliente estava também em: {extra.map((id) => byId.get(id).nome).join(", ")}. Ao escolher um grupo,
          fica só nesse.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Os orçamentos deste cliente usam os valores do grupo.{" "}
          <Link to="/app/manage-services" className="text-primary hover:underline">
            Gerir grupos e valores
          </Link>
        </p>
      )}
    </div>
  );
};
