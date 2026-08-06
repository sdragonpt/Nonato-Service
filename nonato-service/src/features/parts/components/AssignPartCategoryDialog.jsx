// AssignPartCategoryDialog.jsx
// Dialog partilhado para atribuir (ou remover) a categoria/subcategoria de
// uma peça do catálogo HOMAG. Usado na Biblioteca de Peças (lista) e na
// página de detalhe da peça. Grava na coleção leve "atribuicoesPecas" —
// ver src/services/partCategoryAssignments.js.

import { useState, useEffect } from "react";
import { useCategories } from "../../../context/CategoriesContext.jsx";
import {
  setPartCategory,
  clearPartCategory,
} from "../../../services/partCategoryAssignments.js";
import { Loader2, Tag, X } from "lucide-react";

import { Button } from "@/components/ui/button.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";

const AssignPartCategoryDialog = ({ open, onOpenChange, part, onSaved }) => {
  const { categories, getSubcategoriesByParent } = useCategories();

  const [categoryId, setCategoryId] = useState("none");
  const [subcategoryId, setSubcategoryId] = useState("none");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && part) {
      setCategoryId(part.categoryId || "none");
      setSubcategoryId(part.subcategoryId || "none");
      setError(null);
    }
  }, [open, part]);

  const sortedCategories = categories
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "pt-PT"));

  const subcategories =
    categoryId !== "none"
      ? getSubcategoriesByParent(categoryId).sort((a, b) =>
          a.name.localeCompare(b.name, "pt-PT")
        )
      : [];

  const handleSave = async () => {
    if (!part) return;
    try {
      setSaving(true);
      setError(null);

      if (categoryId === "none") {
        await clearPartCategory(part.codigo);
      } else {
        const category = categories.find((c) => c.id === categoryId);
        const subcategory =
          subcategoryId !== "none"
            ? subcategories.find((s) => s.id === subcategoryId)
            : null;

        await setPartCategory(part.codigo, {
          categoryId,
          categoryName: category?.name || "",
          subcategoryId: subcategory?.id || "",
          subcategoryName: subcategory?.name || "",
        });
      }

      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao atribuir categoria à peça:", err);
      setError("Erro ao guardar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!part) return;
    try {
      setSaving(true);
      setError(null);
      await clearPartCategory(part.codigo);
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao remover categoria da peça:", err);
      setError("Erro ao remover. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-800 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Tag className="h-4 w-4 text-green-500" />
            Atribuir Categoria
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {part?.name}{" "}
            <span className="text-zinc-500">({part?.codigo})</span>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="border-red-500 bg-red-500/10">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubcategoryId("none");
              }}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
            >
              <option value="none">Sem categoria</option>
              {sortedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {categoryId !== "none" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Subcategoria (opcional)
              </label>
              <select
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                disabled={subcategories.length === 0}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-white disabled:opacity-50"
              >
                <option value="none">Sem subcategoria</option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
              {subcategories.length === 0 && (
                <p className="text-xs text-zinc-500">
                  Sem subcategorias disponíveis para esta categoria
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {(part?.categoryId || part?.subcategoryId) && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleRemove}
              disabled={saving}
              className="text-red-400 hover:text-red-300 hover:bg-red-400/10 sm:mr-auto"
            >
              <X className="h-4 w-4 mr-2" />
              Remover Categoria
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
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
  );
};

export default AssignPartCategoryDialog;
