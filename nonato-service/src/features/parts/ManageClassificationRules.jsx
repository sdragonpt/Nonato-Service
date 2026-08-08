// ManageClassificationRules.jsx
// Regras de classificação automática de peças por palavra-chave.
// Mantém o mesmo padrão visual (dark zinc + accent green) do resto da app.

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase.jsx";
import { useCategories } from "../../context/CategoriesContext.jsx";
import { loadPartsCatalog } from "../../utils/partsCatalogLoader.js";
import {
  loadPartAssignments,
  bulkApplyAssignments,
} from "../../services/partCategoryAssignments.js";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Trash2,
  Edit2,
  AlertTriangle,
  Wand2,
  Tag,
  Sparkles,
  CheckCircle2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";

const RULES_COLLECTION = "regrasClassificacaoPecas";

/** Aplica as regras (por ordem) ao nome da peça e devolve a primeira que casar. */
function findMatchingRule(part, rules) {
  const haystack = (part.nome || "").toLowerCase();
  return rules.find((rule) =>
    (rule.palavras || []).some((kw) => kw && haystack.includes(kw))
  );
}

const emptyForm = {
  palavrasText: "",
  categoryId: "none",
  subcategoryId: "none",
};

const ManageClassificationRules = () => {
  const navigate = useNavigate();
  const { categories, getSubcategoriesByParent, isLoading: categoriesLoading } =
    useCategories();

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const [unclassifiedCount, setUnclassifiedCount] = useState(null);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const snap = await getDocs(collection(db, RULES_COLLECTION));
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setRules(list);
    } catch (err) {
      console.error("Erro ao carregar regras:", err);
      setError("Erro ao carregar regras de classificação.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnclassifiedCount = useCallback(async () => {
    try {
      const [catalog, assignments] = await Promise.all([
        loadPartsCatalog(),
        loadPartAssignments(),
      ]);
      const unclassified = catalog.pecas.filter(
        (p) => !assignments.get(p.codigo)?.categoryId
      );
      setUnclassifiedCount(unclassified.length);
    } catch (err) {
      console.error("Erro ao contar peças sem categoria:", err);
    }
  }, []);

  useEffect(() => {
    fetchRules();
    fetchUnclassifiedCount();
  }, [fetchRules, fetchUnclassifiedCount]);

  const subcategoriesForForm =
    form.categoryId && form.categoryId !== "none"
      ? getSubcategoriesByParent(form.categoryId)
      : [];

  const openAddDialog = () => {
    setEditingRule(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (rule) => {
    setEditingRule(rule);
    setForm({
      palavrasText: (rule.palavras || []).join(", "),
      categoryId: rule.categoriaId || "none",
      subcategoryId: rule.subcategoriaId || "none",
    });
    setDialogOpen(true);
  };

  const handleSaveRule = async () => {
    const palavras = form.palavrasText
      .split(",")
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean);

    if (palavras.length === 0) {
      setError("Indique pelo menos uma palavra-chave.");
      return;
    }
    if (form.categoryId === "none") {
      setError("Selecione a categoria de destino.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const category = categories.find((c) => c.id === form.categoryId);
      const subcategory =
        form.subcategoryId !== "none"
          ? subcategoriesForForm.find((s) => s.id === form.subcategoryId)
          : null;

      const payload = {
        palavras,
        categoriaId: form.categoryId,
        categoriaNome: category?.name || "",
        subcategoriaId: subcategory?.id || "",
        subcategoriaNome: subcategory?.name || "",
      };

      if (editingRule) {
        await updateDoc(doc(db, RULES_COLLECTION, editingRule.id), payload);
      } else {
        await addDoc(collection(db, RULES_COLLECTION), {
          ...payload,
          createdAt: new Date(),
        });
      }

      setDialogOpen(false);
      await fetchRules();
    } catch (err) {
      console.error("Erro ao guardar regra:", err);
      setError("Erro ao guardar a regra. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, RULES_COLLECTION, deleteTarget.id));
      setDeleteTarget(null);
      await fetchRules();
    } catch (err) {
      console.error("Erro ao apagar regra:", err);
      setError("Erro ao apagar a regra.");
    }
  };

  const handleApplyRules = async () => {
    if (rules.length === 0) return;
    try {
      setApplying(true);
      setApplyResult(null);
      setError(null);

      const [catalog, assignments] = await Promise.all([
        loadPartsCatalog(),
        loadPartAssignments(),
      ]);
      const candidates = catalog.pecas.filter(
        (p) => !assignments.get(p.codigo)?.categoryId
      );

      const matches = [];
      candidates.forEach((part) => {
        const rule = findMatchingRule(part, rules);
        if (rule) {
          matches.push({
            codigo: part.codigo,
            categoryId: rule.categoriaId,
            categoryName: rule.categoriaNome,
            subcategoryId: rule.subcategoriaId || "",
            subcategoryName: rule.subcategoriaNome || "",
          });
        }
      });

      if (matches.length > 0) {
        await bulkApplyAssignments(matches);
      }

      setApplyResult({
        total: candidates.length,
        classified: matches.length,
      });
      await fetchUnclassifiedCount();
    } catch (err) {
      console.error("Erro ao aplicar regras:", err);
      setError("Erro ao aplicar as regras de classificação.");
    } finally {
      setApplying(false);
    }
  };

  if (loading || categoriesLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/app/parts-library")}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Regras de Classificação Automática
            </h1>
            <p className="text-sm text-zinc-400">
              Classifique peças automaticamente por palavra-chave no nome ou descrição
            </p>
          </div>
        </div>
        <Button onClick={openAddDialog} className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Nova Regra
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* Aplicar regras */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-white font-medium">
                {unclassifiedCount === null
                  ? "A contar peças sem categoria..."
                  : `${unclassifiedCount} peça(s) sem categoria atribuída`}
              </p>
              <p className="text-sm text-zinc-400">
                Aplica as regras acima a todas as peças ainda sem categoria
              </p>
            </div>
          </div>
          <Button
            onClick={handleApplyRules}
            disabled={applying || rules.length === 0 || unclassifiedCount === 0}
            className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
          >
            {applying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                A classificar...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Aplicar Regras Agora
              </>
            )}
          </Button>
        </CardContent>
        {applyResult && (
          <CardContent className="pt-0">
            <Alert className="border-green-600 bg-green-600/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-400">
                {applyResult.classified} de {applyResult.total} peça(s) classificadas
                automaticamente.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Lista de regras */}
      {rules.length === 0 ? (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-8 text-center">
            <Wand2 className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-white font-medium">Nenhuma regra criada</p>
            <p className="text-sm text-zinc-400 mb-4">
              Crie regras para classificar peças automaticamente por palavra-chave
            </p>
            <Button onClick={openAddDialog} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Nova Regra
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className="bg-zinc-800 border-zinc-700">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(rule.palavras || []).map((kw) => (
                      <Badge
                        key={kw}
                        className="bg-zinc-700 text-white hover:bg-zinc-700"
                      >
                        {kw}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                    <Tag className="h-3.5 w-3.5" />
                    <span className="text-white">{rule.categoriaNome}</span>
                    {rule.subcategoriaNome && (
                      <>
                        <span>/</span>
                        <span className="text-white">{rule.subcategoriaNome}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(rule)}
                    className="text-zinc-400 hover:text-white hover:bg-zinc-700"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(rule)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Adicionar/Editar Regra */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingRule ? "Editar Regra" : "Nova Regra"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Peças cujo nome ou descrição contenham uma destas palavras serão
              atribuídas automaticamente à categoria escolhida.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Palavras-chave (separadas por vírgula)
              </label>
              <Input
                value={form.palavrasText}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, palavrasText: e.target.value }))
                }
                placeholder="ex: rolamento, correia, motor"
                className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Categoria</label>
              <Select
                value={form.categoryId}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, categoryId: value, subcategoryId: "none" }))
                }
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {categories
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name, "pt-PT"))
                    .map((cat) => (
                      <SelectItem
                        key={cat.id}
                        value={cat.id}
                        className="text-white hover:bg-zinc-700"
                      >
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {form.categoryId !== "none" && subcategoriesForForm.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Subcategoria (opcional)
                </label>
                <Select
                  value={form.subcategoryId}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, subcategoryId: value }))
                  }
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                    <SelectValue placeholder="Sem subcategoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="none" className="text-white hover:bg-zinc-700">
                      Sem subcategoria
                    </SelectItem>
                    {subcategoriesForForm
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name, "pt-PT"))
                      .map((sub) => (
                        <SelectItem
                          key={sub.id}
                          value={sub.id}
                          className="text-white hover:bg-zinc-700"
                        >
                          {sub.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveRule}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingRule ? (
                "Guardar Alterações"
              ) : (
                "Criar Regra"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Eliminação */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar eliminação</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem a certeza que deseja apagar esta regra? Esta ação não pode ser desfeita.
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
              onClick={handleDeleteRule}
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

export default ManageClassificationRules;
