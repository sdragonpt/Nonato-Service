// ManageCategories.jsx - OTIMIZADO: React.memo + Lazy Stats + Zero Logs

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { updateCategory, deleteCategories } from "../../services/categoriesStore.js";
import { comparePtPt } from "../../utils/sortHelpers.js";
import { useNavigate } from "react-router-dom";
import { useCategories } from "../../context/CategoriesContext.jsx";
import {
  loadPartAssignments,
  clearCategoryFromAssignments,
  clearSubcategoryFromAssignments,
  renameCategoryInAssignments,
  renameSubcategoryInAssignments,
} from "../../services/partCategoryAssignments.js";
import {
  Search,
  Plus,
  Loader2,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Tag,
  ArrowLeft,
  Folder,
  FolderOpen,
  TrendingUp,
} from "lucide-react";

// UI Components
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

// ✅ CATEGORY ITEM COMPONENT - Memoizado para evitar re-renders
const CategoryItem = React.memo(
  ({
    category,
    subcategories,
    isExpanded,
    categoryStats,
    onToggle,
    onEdit,
    onDelete,
    onAddSubcategory,
  }) => {
    const handleToggle = useCallback(() => {
      onToggle(category.id);
    }, [category.id, onToggle]);

    // ✅ CORREÇÃO: Adicionar handleEdit que estava faltando
    const handleEdit = useCallback(
      (e) => {
        e.stopPropagation();
        onEdit(category, true); // true indica que é uma categoria principal
      },
      [category, onEdit]
    );

    const handleDelete = useCallback(
      (e) => {
        e.stopPropagation();
        onDelete(category, true);
      },
      [category, onDelete]
    );

    const handleSubEdit = useCallback(
      (subcategory, e) => {
        e.stopPropagation();
        onEdit(subcategory, false);
      },
      [onEdit]
    );

    const handleSubDelete = useCallback(
      (subcategory, e) => {
        e.stopPropagation();
        onDelete(subcategory, false);
      },
      [onDelete]
    );

    const handleAddSub = useCallback(
      (e) => {
        e.stopPropagation();
        onAddSubcategory(category.id);
      },
      [category.id, onAddSubcategory]
    );

    const sortedSubcategories = useMemo(
      () => subcategories.sort((a, b) => comparePtPt(a.name, b.name)),
      [subcategories]
    );

    return (
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="p-0">
          {/* Main Category */}
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-700/50"
            onClick={handleToggle}
          >
            <div className="flex items-center">
              <Folder className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <h3 className="font-semibold text-white flex items-center">
                  {category.name}
                  <Badge
                    className="ml-2 bg-blue-500/10 text-blue-500"
                    title="Número de peças nesta categoria"
                  >
                    {categoryStats[category.id] || 0} peças
                  </Badge>
                </h3>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-zinc-400 mr-2">
                {subcategories.length} subcategorias
              </span>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                  onClick={handleEdit} // ✅ Agora handleEdit está definido
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-zinc-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-zinc-400" />
                )}
              </div>
            </div>
          </div>

          {/* Subcategories */}
          {isExpanded && (
            <div className="border-t border-zinc-700 pl-4">
              {sortedSubcategories.length > 0 ? (
                sortedSubcategories.map((subcategory) => (
                  <div
                    key={subcategory.id}
                    className="flex items-center justify-between p-3 border-b border-zinc-700/50 last:border-b-0 hover:bg-zinc-700/30"
                  >
                    <div className="flex items-center">
                      <Tag className="h-4 w-4 text-purple-500 mr-2" />
                      <h4 className="text-sm font-medium text-white flex items-center">
                        {subcategory.name}
                        <Badge
                          className="ml-2 bg-purple-500/10 text-purple-500"
                          title="Número de peças nesta subcategoria"
                        >
                          {categoryStats[subcategory.id] || 0} peças
                        </Badge>
                      </h4>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                        onClick={(e) => handleSubEdit(subcategory, e)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                        onClick={(e) => handleSubDelete(subcategory, e)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-3 px-4 text-sm text-zinc-400">
                  Nenhuma subcategoria encontrada
                </div>
              )}

              {/* Add subcategory button */}
              <div className="py-3 px-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-sm border-zinc-700 bg-zinc-700/50 hover:bg-zinc-600 text-white"
                  onClick={handleAddSub}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Adicionar Subcategoria
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

CategoryItem.displayName = "CategoryItem";

// ✅ STATS CARD COMPONENT - Memoizado
const StatsCard = React.memo(({ title, value, icon: Icon, color }) => (
  <Card className="bg-zinc-800 border-zinc-700">
    <CardContent className="flex items-center justify-between p-4 sm:p-6">
      <div>
        <p className="text-sm font-medium text-zinc-400">{title}</p>
        <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
          {value}
        </h3>
      </div>
      <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${color}`} />
    </CardContent>
  </Card>
));

StatsCard.displayName = "StatsCard";

// ✅ MAIN COMPONENT - OTIMIZADO
const ManageCategories = () => {
  const navigate = useNavigate();

  // Context hooks
  const {
    categories,
    getSubcategoriesByParent,
    removeCategoryFromCache,
    updateCategoryInCache,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

  // ✅ STATE REDUZIDO - Só o essencial
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const [editName, setEditName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ LAZY STATS - Só carrega quando necessário (quando há busca ou expand)
  const [categoryStats, setCategoryStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(false);

  // ✅ MEMOIZED VALUES - Organizadas e ordenadas
  const organizedCategories = useMemo(() => {
    return categories
      .sort((a, b) => comparePtPt(a.name, b.name))
      .map((category) => {
        const subcategories = getSubcategoriesByParent(category.id).sort(
          (a, b) => comparePtPt(a.name, b.name)
        );
        return { ...category, subcategories };
      });
  }, [categories, getSubcategoriesByParent]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return organizedCategories;

    return organizedCategories.filter((category) => {
      const matchesSearch = category.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const hasMatchingSubcategories = category.subcategories.some((sub) =>
        sub.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return matchesSearch || hasMatchingSubcategories;
    });
  }, [organizedCategories, searchTerm]);

  // ✅ TOTAL SUBCATEGORIES COUNT - Memoizado
  const totalSubcategories = useMemo(
    () =>
      categories.reduce(
        (total, cat) => total + getSubcategoriesByParent(cat.id).length,
        0
      ),
    [categories, getSubcategoriesByParent]
  );

  // ✅ LAZY STATS FETCHING - Só quando necessário
  // Conta quantas peças do catálogo HOMAG têm cada categoria/subcategoria
  // atribuída (ver src/services/partCategoryAssignments.js).
  const fetchCategoryStats = useCallback(async () => {
    if (statsLoading || categories.length === 0) return;

    try {
      setStatsLoading(true);
      const statsObj = {};
      const assignments = await loadPartAssignments();
      const allAssignments = Array.from(assignments.values());

      for (const category of categories) {
        statsObj[category.id] = allAssignments.filter(
          (a) => a.categoryId === category.id
        ).length;
      }

      for (const category of categories) {
        const subcategories = getSubcategoriesByParent(category.id);
        for (const subcategory of subcategories) {
          statsObj[subcategory.id] = allAssignments.filter(
            (a) => a.subcategoryId === subcategory.id
          ).length;
        }
      }

      setCategoryStats(statsObj);
    } catch (err) {
      // Ignorar erro silenciosamente - stats não são críticas
    } finally {
      setStatsLoading(false);
    }
  }, [categories, getSubcategoriesByParent, statsLoading]);

  // ✅ EFFECTS - Otimizados
  useEffect(() => {
    if (categoriesError) {
      setError(categoriesError);
    }
  }, [categoriesError]);

  // Só buscar stats se houver busca ou categorias expandidas
  useEffect(() => {
    const hasExpandedCategories =
      Object.values(expandedCategories).some(Boolean);
    const hasSearch = searchTerm.length > 0;

    if ((hasExpandedCategories || hasSearch) && categories.length > 0) {
      const timer = setTimeout(() => fetchCategoryStats(), 500);
      return () => clearTimeout(timer);
    }
  }, [expandedCategories, searchTerm, categories.length, fetchCategoryStats]);

  // ✅ HANDLERS - Otimizados com useCallback
  const toggleCategory = useCallback((categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  const handleDeleteClick = useCallback((category, isMainCategory) => {
    setCategoryToDelete({ ...category, isMainCategory });
    setDeleteDialogOpen(true);
  }, []);

  // Encontrar onde chama navigate para editar categoria - adicionar contexto:
  // Se já tens este padrão, alterar para incluir os params de retorno baseados no contexto atual

  const handleEditClick = useCallback(
    (category, isMainCategory) => {
      const params = new URLSearchParams();
      // Se estás a editar uma subcategoria, incluir o contexto da categoria pai
      if (!isMainCategory && category.parentId) {
        params.set("returnCategoryId", category.parentId);
        params.set("returnSubcategoryId", category.id);
      }

      const url = `/app/edit-category/${category.id}${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      navigate(url);
    },
    [navigate]
  );

  const handleAddSubcategory = useCallback(
    (categoryId) => {
      const params = new URLSearchParams();
      params.set("returnCategoryId", categoryId);

      navigate(`/app/add-subcategory/${categoryId}?${params.toString()}`);
    },
    [navigate]
  );

  const handleDelete = useCallback(async () => {
    if (!categoryToDelete) return;

    try {
      setIsSubmitting(true);
      const idsToDelete = [categoryToDelete.id];

      if (categoryToDelete.isMainCategory) {
        const subcategories = getSubcategoriesByParent(categoryToDelete.id);

        // Desclassificar peças do catálogo que tinham esta categoria atribuída
        // (inclui as das subcategorias, que pertencem a esta categoria)
        await clearCategoryFromAssignments(categoryToDelete.id);

        // Apagar também todas as subcategorias
        subcategories.forEach((subcategory) => idsToDelete.push(subcategory.id));
      } else {
        await clearSubcategoryFromAssignments(categoryToDelete.id);
      }

      await deleteCategories(idsToDelete);
      removeCategoryFromCache(categoryToDelete.id);

      setDeleteDialogOpen(false);
      setCategoryToDelete(null);

      // Update stats if they were loaded
      if (Object.keys(categoryStats).length > 0) {
        fetchCategoryStats();
      }
    } catch (err) {
      setError("Erro ao excluir categoria. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    categoryToDelete,
    getSubcategoriesByParent,
    removeCategoryFromCache,
    categoryStats,
    fetchCategoryStats,
  ]);

  const handleEdit = useCallback(async () => {
    if (!categoryToEdit || !editName.trim()) return;

    try {
      setIsSubmitting(true);

      await updateCategory(categoryToEdit.id, { name: editName });

      // Atualizar o nome já guardado nas atribuições de categoria das peças do catálogo
      if (categoryToEdit.isMainCategory) {
        await renameCategoryInAssignments(categoryToEdit.id, editName);
      } else {
        await renameSubcategoryInAssignments(categoryToEdit.id, editName);
      }

      updateCategoryInCache(categoryToEdit.id, { name: editName });

      setEditDialogOpen(false);
      setCategoryToEdit(null);
      setEditName("");
    } catch (err) {
      setError("Erro ao editar categoria. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }, [categoryToEdit, editName, updateCategoryInCache]);

  // As categorias já chegam em tempo real (onSnapshot no CategoriesContext);
  // só as estatísticas de peças por categoria são calculadas à parte (ver
  // fetchCategoryStats) e podem ficar desatualizadas se uma peça mudar de
  // categoria noutro sítio — por isso mantém-se um botão para as recalcular.
  const handleRefreshStats = useCallback(() => {
    setCategoryStats({});
    fetchCategoryStats();
  }, [fetchCategoryStats]);

  // ✅ EARLY RETURN
  if (categoriesLoading) {
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
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Gerenciar Categorias
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Gerencie categorias e subcategorias para a Biblioteca de Peças
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/app/parts-library")}
            className="bg-zinc-700 hover:bg-zinc-600 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Peças
          </Button>
          <Button
            onClick={() => navigate("/app/add-category")}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Categoria
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatsCard
          title="Total de Categorias"
          value={categories.length}
          icon={Folder}
          color="text-blue-500"
        />
        <StatsCard
          title="Total de Subcategorias"
          value={totalSubcategories}
          icon={FolderOpen}
          color="text-purple-500"
        />
      </div>

      {/* Search and Controls */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Buscar categorias e subcategorias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          {error && (
            <Alert
              variant="destructive"
              className="border-red-500 bg-red-500/10"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            {Object.keys(categoryStats).length > 0 && (
              <Button
                variant="outline"
                onClick={handleRefreshStats}
                className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Atualizar Estatísticas
              </Button>
            )}

            {statsLoading && (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando estatísticas...
              </div>
            )}

            {Object.keys(categoryStats).length > 0 && (
              <Badge className="bg-green-500/10 text-green-500">
                <TrendingUp className="h-3 w-3 mr-1" />
                Stats Ativas
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Categories List */}
      <div className="space-y-4">
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              subcategories={category.subcategories}
              isExpanded={expandedCategories[category.id]}
              categoryStats={categoryStats}
              onToggle={toggleCategory}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              onAddSubcategory={handleAddSubcategory}
            />
          ))
        ) : (
          <Card className="bg-zinc-800 border-zinc-700">
            <CardContent className="p-8 text-center">
              <Search className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2 text-white">
                Nenhuma categoria encontrada
              </p>
              <p className="text-zinc-400">
                {searchTerm
                  ? "Tente buscar com outros termos"
                  : "Comece criando sua primeira categoria"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {categoryToDelete?.isMainCategory ? (
                <>
                  <p>
                    Tem certeza que deseja excluir a categoria{" "}
                    <span className="font-semibold text-white">
                      {categoryToDelete?.name}
                    </span>
                    ?
                  </p>
                  <p className="mt-2">
                    Esta ação também excluirá todas as subcategorias associadas
                    e removerá a associação de todas as peças a esta categoria.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Tem certeza que deseja excluir a subcategoria{" "}
                    <span className="font-semibold text-white">
                      {categoryToDelete?.name}
                    </span>
                    ?
                  </p>
                  <p className="mt-2">
                    Esta ação removerá a associação de todas as peças a esta
                    subcategoria.
                  </p>
                </>
              )}
              <p className="mt-2 text-red-400 font-semibold">
                Esta ação não pode ser desfeita!
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Editar{" "}
              {categoryToEdit?.isMainCategory ? "Categoria" : "Subcategoria"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Nome</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome da categoria"
                className="bg-zinc-900 border-zinc-700 text-white"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              className="bg-green-600 hover:bg-green-700"
              disabled={isSubmitting || !editName.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Edit2 className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default React.memo(ManageCategories);
