// AssignPartCategoryDialog.jsx
// Dialog partilhado para atribuir (ou remover) a categoria/subcategoria de
// uma peça do catálogo HOMAG. Usado na Biblioteca de Peças (lista) e na
// página de detalhe da peça. Grava através de
// src/services/partCategoryAssignments.js.

import { useState, useEffect } from "react";
import { useCategories } from "../../../context/CategoriesContext.jsx";
import { comparePtPt } from "../../../utils/sortHelpers.js";
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
    .sort((a, b) => comparePtPt(a.name, b.name));

  const subcategories =
    categoryId !== "none"
      ? getSubcategoriesByParent(categoryId).sort((a, b) =>
          comparePtPt(a.name, b.name)
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Tag className="h-4 w-4 text-green-500" />
            Atribuir Categoria
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {part?.name}{" "}
            <span className="text-muted-foreground">({part?.codigo})</span>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setSubcategoryId("none");
              }}
              className="w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-foreground"
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
              <label className="text-sm font-medium text-muted-foreground">
                Subcategoria (opcional)
              </label>
              <select
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                disabled={subcategories.length === 0}
                className="w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-foreground disabled:opacity-50"
              >
                <option value="none">Sem subcategoria</option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
              {subcategories.length === 0 && (
                <p className="text-xs text-muted-foreground">
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
              <X className="h-4 w-4" />
              Remover Categoria
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-accent"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignPartCategoryDialog;
