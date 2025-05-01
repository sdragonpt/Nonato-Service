import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useNavigate } from "react-router-dom";
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
  RefreshCw,
  Folder,
  FolderOpen,
  Package,
} from "lucide-react";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
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

const ManageCategories = () => {
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const [editName, setEditName] = useState("");
  const [categoryStats, setCategoryStats] = useState({});
  const navigate = useNavigate();

  // Fetch all categories
  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Get main categories
      const mainCategoriesQuery = query(
        collection(db, "categorias"),
        where("parentId", "==", null)
      );
      const mainCategoriesSnapshot = await getDocs(mainCategoriesQuery);
      const mainCategories = mainCategoriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        isMainCategory: true,
        subCategories: [],
      }));

      // Get all subcategories
      const subcategoriesQuery = query(
        collection(db, "categorias"),
        where("parentId", "!=", null)
      );
      const subcategoriesSnapshot = await getDocs(subcategoriesQuery);
      const subcategories = subcategoriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        isMainCategory: false,
      }));

      // Organize subcategories under their parent categories
      const organizedCategories = mainCategories.map((category) => {
        const subs = subcategories.filter(
          (sub) => sub.parentId === category.id
        );
        return {
          ...category,
          subCategories: subs,
        };
      });

      setCategories(organizedCategories);

      // Get stats for each category (count of parts)
      const statsObj = {};
      const partsSnapshot = await getDocs(collection(db, "pecas"));
      const parts = partsSnapshot.docs.map(doc => doc.data());
      
      // Count for main categories
      for (const category of mainCategories) {
        const mainCategoryParts = parts.filter(part => part.categoryId === category.id);
        statsObj[category.id] = mainCategoryParts.length;
      }
      
      // Count for subcategories
      for (const subcategory of subcategories) {
        const subcategoryParts = parts.filter(part => part.subcategoryId === subcategory.id);
        statsObj[subcategory.id] = subcategoryParts.length;
      }
      
      setCategoryStats(statsObj);
    } catch (err) {
      console.error("Erro ao buscar categorias:", err);
      setError("Erro ao carregar categorias. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const handleDeleteClick = (category, e) => {
    e.stopPropagation();
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (category, e) => {
    e.stopPropagation();
    setCategoryToEdit(category);
    setEditName(category.name);
    setEditDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    try {
      setIsLoading(true);
      const batch = writeBatch(db);
      
      // If it's a main category, also delete all subcategories
      if (categoryToDelete.isMainCategory) {
        // Get the subcategories that need to be deleted
        const subcategories = categories
          .find(cat => cat.id === categoryToDelete.id)?.subCategories || [];
        
        // Update all parts that use this category to remove the reference
        const partsQuery = query(
          collection(db, "pecas"),
          where("categoryId", "==", categoryToDelete.id)
        );
        const partsSnapshot = await getDocs(partsQuery);
        
        partsSnapshot.docs.forEach(partDoc => {
          const partRef = doc(db, "pecas", partDoc.id);
          batch.update(partRef, { 
            categoryId: "", 
            categoryName: "",
            subcategoryId: "",
            subcategoryName: ""
          });
        });
        
        // Delete all subcategories
        for (const subcategory of subcategories) {
          // Update parts that use this subcategory
          const subPartsQuery = query(
            collection(db, "pecas"),
            where("subcategoryId", "==", subcategory.id)
          );
          const subPartsSnapshot = await getDocs(subPartsQuery);
          
          subPartsSnapshot.docs.forEach(partDoc => {
            const partRef = doc(db, "pecas", partDoc.id);
            batch.update(partRef, { 
              subcategoryId: "",
              subcategoryName: ""
            });
          });
          
          // Delete the subcategory
          batch.delete(doc(db, "categorias", subcategory.id));
        }
        
        // Delete the main category
        batch.delete(doc(db, "categorias", categoryToDelete.id));
      } else {
        // It's a subcategory, only delete the subcategory and update references
        const partsQuery = query(
          collection(db, "pecas"),
          where("subcategoryId", "==", categoryToDelete.id)
        );
        const partsSnapshot = await getDocs(partsQuery);
        
        partsSnapshot.docs.forEach(partDoc => {
          const partRef = doc(db, "pecas", partDoc.id);
          batch.update(partRef, { 
            subcategoryId: "",
            subcategoryName: ""
          });
        });
        
        batch.delete(doc(db, "categorias", categoryToDelete.id));
      }
      
      // Commit the batch
      await batch.commit();
      
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      
      // Refresh categories
      fetchCategories();
    } catch (err) {
      console.error("Erro ao excluir categoria:", err);
      setError("Erro ao excluir categoria. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!categoryToEdit || !editName.trim()) return;

    try {
      setIsLoading(true);
      const batch = writeBatch(db);
      
      // Update the category name
      const categoryRef = doc(db, "categorias", categoryToEdit.id);
      batch.update(categoryRef, { name: editName });
      
      // Update all references in parts
      if (categoryToEdit.isMainCategory) {
        // Update main category references
        const partsQuery = query(
          collection(db, "pecas"),
          where("categoryId", "==", categoryToEdit.id)
        );
        const partsSnapshot = await getDocs(partsQuery);
        
        partsSnapshot.docs.forEach(partDoc => {
          const partRef = doc(db, "pecas", partDoc.id);
          batch.update(partRef, { categoryName: editName });
        });
      } else {
        // Update subcategory references
        const partsQuery = query(
          collection(db, "pecas"),
          where("subcategoryId", "==", categoryToEdit.id)
        );
        const partsSnapshot = await getDocs(partsQuery);
        
        partsSnapshot.docs.forEach(partDoc => {
          const partRef = doc(db, "pecas", partDoc.id);
          batch.update(partRef, { subcategoryName: editName });
        });
      }
      
      // Commit the batch
      await batch.commit();
      
      setEditDialogOpen(false);
      setCategoryToEdit(null);
      setEditName("");
      
      // Refresh categories
      fetchCategories();
    } catch (err) {
      console.error("Erro ao editar categoria:", err);
      setError("Erro ao editar categoria. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Also check subcategories
    const hasMatchingSubcategories = category.subCategories.some(sub => 
      sub.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return matchesSearch || hasMatchingSubcategories;
  });

  if (isLoading && !categories.length) {
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
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">
                Total de Categorias
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {categories.length}
              </h3>
            </div>
            <Folder className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">
                Total de Subcategorias
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {categories.reduce((total, cat) => total + cat.subCategories.length, 0)}
              </h3>
            </div>
            <FolderOpen className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
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
          
          <Button
            variant="outline"
            onClick={fetchCategories}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar Lista
          </Button>
        </CardContent>
      </Card>

      {/* Categories List */}
      <div className="space-y-4">
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => (
            <Card
              key={category.id}
              className="bg-zinc-800 border-zinc-700"
            >
              <CardContent className="p-0">
                {/* Main Category */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-700/50"
                  onClick={() => toggleCategory(category.id)}
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
                      {category.subCategories.length} subcategorias
                    </span>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                        onClick={(e) => handleEditClick(category, e)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                        onClick={(e) => handleDeleteClick(category, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {expandedCategories[category.id] ? (
                        <ChevronDown className="h-5 w-5 text-zinc-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-zinc-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Subcategories */}
                {expandedCategories[category.id] && (
                  <div className="border-t border-zinc-700 pl-4">
                    {category.subCategories.length > 0 ? (
                      category.subCategories.map((subcategory) => (
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
                              onClick={(e) => handleEditClick(subcategory, e)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                              onClick={(e) => handleDeleteClick(subcategory, e)}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/app/add-subcategory/${category.id}`);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Adicionar Subcategoria
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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
                    Esta ação também excluirá todas as subcategorias associadas e removerá a associação
                    de todas as peças a esta categoria.
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
                    Esta ação removerá a associação de todas as peças a esta subcategoria.
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
              disabled={isLoading}
            >
              {isLoading ? (
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
              Editar {categoryToEdit?.isMainCategory ? "Categoria" : "Subcategoria"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Nome
              </label>
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
              disabled={isLoading || !editName.trim()}
            >
              {isLoading ? (
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

export default ManageCategories;