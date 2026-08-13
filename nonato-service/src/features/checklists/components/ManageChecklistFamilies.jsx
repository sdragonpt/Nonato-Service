// ManageChecklistFamilies.jsx - Famílias e Grupos de equipamento para organizar os Checklists
// Mesmo padrão categoria/subcategoria já usado em Biblioteca de Peças, mas
// numa collection própria (familiasChecklist) para não misturar com peças.
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import { comparePtPt } from "../../../utils/sortHelpers.js";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Trash2,
  Edit2,
  AlertTriangle,
  Layers,
  ChevronRight,
  X,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

const COLLECTION = "familiasChecklist";

const ManageChecklistFamilies = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedFamilyId, setExpandedFamilyId] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("family"); // "family" | "group"
  const [editingItem, setEditingItem] = useState(null);
  const [parentForNewGroup, setParentForNewGroup] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const snap = await getDocs(collection(db, COLLECTION));
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erro ao carregar famílias de checklist:", err);
      setError("Erro ao carregar famílias e grupos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const families = items
    .filter((i) => !i.parentId)
    .sort((a, b) => comparePtPt(a.name, b.name));
  const getGroups = (familyId) =>
    items
      .filter((i) => i.parentId === familyId)
      .sort((a, b) => comparePtPt(a.name, b.name));

  const openAddFamily = () => {
    setDialogMode("family");
    setEditingItem(null);
    setNameInput("");
    setDialogOpen(true);
  };

  const openAddGroup = (family) => {
    setDialogMode("group");
    setEditingItem(null);
    setParentForNewGroup(family);
    setNameInput("");
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setDialogMode(item.parentId ? "group" : "family");
    setEditingItem(item);
    setNameInput(item.name);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nameInput.trim()) {
      setError("Indique um nome.");
      return;
    }
    try {
      setSaving(true);
      setError(null);

      if (editingItem) {
        await updateDoc(doc(db, COLLECTION, editingItem.id), {
          name: nameInput.trim(),
        });
      } else {
        await addDoc(collection(db, COLLECTION), {
          name: nameInput.trim(),
          parentId: dialogMode === "group" ? parentForNewGroup.id : null,
          createdAt: new Date(),
        });
      }

      setDialogOpen(false);
      await fetchItems();
    } catch (err) {
      console.error("Erro ao guardar:", err);
      setError("Erro ao guardar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      // Apagar também os grupos-filho se for uma família
      const childGroups = getGroups(deleteTarget.id);
      await Promise.all([
        deleteDoc(doc(db, COLLECTION, deleteTarget.id)),
        ...childGroups.map((g) => deleteDoc(doc(db, COLLECTION, g.id))),
      ]);
      setDeleteTarget(null);
      await fetchItems();
    } catch (err) {
      console.error("Erro ao apagar:", err);
      setError("Erro ao apagar.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/app/manage-checklist")}
          className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Famílias e Grupos de Equipamento
          </h1>
          <p className="text-sm text-zinc-400">
            Organize os checklists por família (ex: Fresadoras) e grupo (ex: modelo específico)
          </p>
        </div>
        <Button onClick={openAddFamily} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Família
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {families.length === 0 ? (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-8 sm:p-12 text-center">
            <Layers className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2 text-white">
              Nenhuma família criada
            </p>
            <p className="text-sm text-zinc-400">
              Crie famílias (ex: Fresadoras, Seccionadoras) e depois grupos dentro delas
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {families.map((family) => {
            const groups = getGroups(family.id);
            const isExpanded = expandedFamilyId === family.id;
            return (
              <Card key={family.id} className="bg-zinc-800 border-zinc-700">
                <CardContent className="p-4 space-y-3">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedFamilyId(isExpanded ? null : family.id)}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight
                        className={`h-4 w-4 text-zinc-500 transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                      <Layers className="h-4 w-4 text-blue-400" />
                      <span className="text-white font-medium">{family.name}</span>
                      <Badge className="bg-zinc-700 text-white hover:bg-zinc-700">
                        {groups.length} grupo(s)
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(family);
                        }}
                        className="text-zinc-400 hover:text-white hover:bg-zinc-700 h-8 w-8"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(family);
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="pl-6 space-y-2 border-l border-zinc-700 ml-2">
                      {groups.map((group) => (
                        <div
                          key={group.id}
                          className="flex items-center justify-between p-2 bg-zinc-700/30 rounded-lg border border-zinc-600"
                        >
                          <span className="text-sm text-white">{group.name}</span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(group)}
                              className="text-zinc-400 hover:text-white hover:bg-zinc-700 h-7 w-7"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(group)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-7 w-7"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAddGroup(family)}
                        className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Grupo
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog Adicionar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingItem
                ? `Editar ${dialogMode === "family" ? "Família" : "Grupo"}`
                : dialogMode === "family"
                ? "Nova Família"
                : `Novo Grupo em "${parentForNewGroup?.name}"`}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {dialogMode === "family"
                ? "Ex: Fresadoras, Seccionadoras, Coladoras de Bordo"
                : "Ex: modelo específico dentro da família"}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Nome"
            className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar Eliminação */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar eliminação</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {deleteTarget && !deleteTarget.parentId
                ? "Isto vai apagar a família e todos os grupos dentro dela. "
                : ""}
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              <X className="w-4 h-4 mr-2" />
              Apagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageChecklistFamilies;
