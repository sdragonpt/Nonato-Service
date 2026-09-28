// ManageGroupsDialog.jsx
// Janela para criar, renomear e apagar os grupos de um cadastro (serviços
// ou clientes). Ver services/groupsStore.js.

import { useState } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  useGroups,
  createGroup,
  renameGroup,
  deleteGroup,
} from "../../services/groupsStore.js";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

const fieldClass = "bg-zinc-900 border-zinc-700 text-white";

const ManageGroupsDialog = ({ open, onOpenChange, kind, title, description }) => {
  const { groups, loading } = useGroups(kind);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const nameTaken = (name, exceptId) =>
    groups.some(
      (g) => g.id !== exceptId && g.nome.trim().toLowerCase() === name.trim().toLowerCase()
    );

  const run = async (fn) => {
    try {
      setBusy(true);
      setError(null);
      await fn();
    } catch (err) {
      console.error("Erro ao gravar grupos:", err);
      setError("Não foi possível gravar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    // A janela abre dentro de formulários (novo serviço/cliente): no React o
    // submit sobe pelo portal e submeteria também o formulário de fora.
    e.stopPropagation();
    const name = newName.trim();
    if (!name) return;
    if (nameTaken(name)) {
      setError(`Já existe o grupo "${name}".`);
      return;
    }
    run(async () => {
      await createGroup(kind, name);
      setNewName("");
    });
  };

  const handleRename = (id) => {
    const name = editName.trim();
    if (!name) return;
    if (nameTaken(name, id)) {
      setError(`Já existe o grupo "${name}".`);
      return;
    }
    run(async () => {
      await renameGroup(kind, id, name);
      setEditingId(null);
    });
  };

  const handleDelete = (group) => {
    if (!window.confirm(`Apagar o grupo "${group.nome}"? Quem estava nesse grupo fica sem ele.`)) return;
    run(() => deleteGroup(kind, group.id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-800 border-zinc-700 text-white max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-zinc-400">{description}</DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do grupo novo"
            className={fieldClass}
          />
          <Button
            type="submit"
            disabled={busy || !newName.trim()}
            className="bg-green-600 hover:bg-green-700 text-white shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" /> Criar
          </Button>
        </form>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {loading ? (
          <div className="flex items-center gap-2 text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
          </div>
        ) : groups.length === 0 ? (
          <p className="text-sm text-zinc-400">Ainda não há grupos.</p>
        ) : (
          <ul className="divide-y divide-zinc-700 rounded-md border border-zinc-700">
            {groups.map((g) => (
              <li key={g.id} className="flex items-center gap-2 px-3 py-2">
                {editingId === g.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleRename(g.id);
                        }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className={`${fieldClass} h-8`}
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" disabled={busy} onClick={() => handleRename(g.id)} className="h-8 w-8 text-green-400 hover:bg-zinc-700" aria-label="Guardar">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8 text-zinc-400 hover:bg-zinc-700" aria-label="Cancelar">
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 truncate">{g.nome}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(g.id);
                        setEditName(g.nome);
                        setError(null);
                      }}
                      className="h-8 w-8 text-zinc-300 hover:bg-zinc-700"
                      aria-label={`Renomear ${g.nome}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => handleDelete(g)}
                      className="h-8 w-8 text-red-400 hover:bg-zinc-700"
                      aria-label={`Apagar ${g.nome}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ManageGroupsDialog;
