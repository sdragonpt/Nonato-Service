// ManagePartsLibrary.jsx - OTIMIZADO: Foco em pesquisa, menos requests

import { useState, useEffect, useCallback } from "react";
import {
  doc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useNavigate } from "react-router-dom";
import { useCategories } from "../../context/CategoriesContext.jsx";
import { usePartsCache } from "../../context/PartsCache.jsx";
import {
  usePartsCounters,
  decrementPartCount,
} from "../../utils/MetadataCounters.js";
import PartImage from "../../components/ui/PartImage.jsx";
import {
  Search,
  Plus,
  Loader2,
  Edit2,
  Trash2,
  AlertTriangle,
  Package,
  Tag,
  MoreVertical,
  Book,
  ChevronRight,
  ArrowLeft,
  X,
} from "lucide-react";

// UI Components
import { Card, CardContent } from "@/components/ui/card.jsx";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";

const ManagePartsLibrary = () => {
  // Cache e contextos
  const {
    fetchParts,
    fetchSubcategoryCounts,
    invalidateCache,
    removePartFromCache,
  } = usePartsCache();

  const {
    counters,
    loading: countersLoading,
    getTotalCount,
  } = usePartsCounters();

  const navigate = useNavigate();
  const {
    categories,
    getSubcategoriesByParent,
    isLoading: categoriesLoading,
  } = useCategories();

  // Estados principais - Simplificados
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Estados para navegação por categorias
  const [activeTab, setActiveTab] = useState("search");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [categoryParts, setCategoryParts] = useState([]);
  const [subcategoryCounts, setSubcategoryCounts] = useState({});

  // Estados de UI
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partToDelete, setPartToDelete] = useState(null);

  // 🔍 PESQUISA OTIMIZADA - Só busca quando o usuário pesquisa
  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setError(null);
    setHasSearched(true);

    try {
      // Busca simples e direta
      const result = await fetchParts({
        searchTerm: searchTerm.trim(),
        limit: 100, // Limite razoável para pesquisa
      });

      setSearchResults(result.parts || []);
    } catch (err) {
      setError("Erro ao pesquisar peças");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, fetchParts]);

  // 🔍 Pesquisa ao pressionar Enter ou clicar no botão
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // 📁 Carregar peças da categoria/subcategoria selecionada
  const loadCategoryParts = useCallback(async () => {
    if (!selectedSubcategory) {
      setCategoryParts([]);
      return;
    }

    try {
      const result = await fetchParts({
        categoryId: selectedCategory?.id,
        subcategoryId: selectedSubcategory.id,
      });

      setCategoryParts(result.parts || []);
    } catch (err) {
      setError("Erro ao carregar peças da categoria");
      setCategoryParts([]);
    }
  }, [selectedCategory, selectedSubcategory, fetchParts]);

  // 📊 Carregar contadores de subcategorias
  const loadSubcategoryCounts = useCallback(
    async (categoryId) => {
      if (!categoryId) return;

      try {
        const counts = await fetchSubcategoryCounts(categoryId);
        setSubcategoryCounts(counts);
      } catch (err) {
        // Ignorar erro de contadores
      }
    },
    [fetchSubcategoryCounts]
  );

  // Effects otimizados
  useEffect(() => {
    if (selectedCategory) {
      loadSubcategoryCounts(selectedCategory.id);
    }
  }, [selectedCategory, loadSubcategoryCounts]);

  useEffect(() => {
    if (selectedSubcategory) {
      loadCategoryParts();
    }
  }, [selectedSubcategory, loadCategoryParts]);

  // 🗑️ DELETE OTIMIZADO
  const handleDelete = async (part) => {
    try {
      // Update contador local
      decrementPartCount(part.categoryId, part.subcategoryId);

      // Remove da UI
      setSearchResults((prev) => prev.filter((p) => p.id !== part.id));
      setCategoryParts((prev) => prev.filter((p) => p.id !== part.id));
      removePartFromCache(part.id);

      // Delete do Firestore
      await deleteDoc(doc(db, "pecas", part.id));

      setDeleteDialogOpen(false);
      setPartToDelete(null);
    } catch (error) {
      setError("Erro ao deletar peça");
    }
  };

  // 🔧 Handlers simplificados
  const handleTabChange = (value) => {
    setActiveTab(value);
    setError(null);
    if (value === "search") {
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      setCategoryParts([]);
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setCategoryParts([]);
  };

  const handleSubcategoryClick = (subcategory) => {
    setSelectedSubcategory(subcategory);
  };

  const handleBackToCategories = () => {
    if (selectedSubcategory) {
      setSelectedSubcategory(null);
      setCategoryParts([]);
    } else {
      setSelectedCategory(null);
      setSubcategoryCounts({});
    }
  };

  const handleAddPart = () => {
    const searchParams = new URLSearchParams();
    if (selectedCategory) searchParams.set("categoryId", selectedCategory.id);
    if (selectedSubcategory)
      searchParams.set("subcategoryId", selectedSubcategory.id);

    const url = `/app/add-part${
      searchParams.toString() ? `?${searchParams.toString()}` : ""
    }`;
    navigate(url);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setHasSearched(false);
  };

  const confirmDelete = (part, e) => {
    e.stopPropagation();
    setPartToDelete(part);
    setDeleteDialogOpen(true);
  };

  // Helpers
  const getMainCategories = () =>
    categories.sort((a, b) => a.name.localeCompare(b.name, "pt-PT"));
  const getSubcategories = (categoryId) =>
    getSubcategoriesByParent(categoryId).sort((a, b) =>
      a.name.localeCompare(b.name, "pt-PT")
    );

  if (categoriesLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  // 🎨 RENDERIZAÇÃO OTIMIZADA
  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Biblioteca de Peças
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Pesquise e gerencie as peças do sistema
          </p>
        </div>
        <Button
          onClick={handleAddPart}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Peça
        </Button>
      </div>

      {/* Stats Cards Simplificados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-zinc-400">
                Total de Peças
              </p>
              <h3 className="text-xl font-bold text-white mt-1">
                {countersLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin inline" />
                ) : (
                  getTotalCount()?.toLocaleString("pt-PT") || 0
                )}
              </h3>
            </div>
            <Package className="h-6 w-6 text-green-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-zinc-400">Categorias</p>
              <h3 className="text-xl font-bold text-white mt-1">
                {getMainCategories().length}
              </h3>
            </div>
            <Tag className="h-6 w-6 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-zinc-400">Subcategorias</p>
              <h3 className="text-xl font-bold text-white mt-1">
                {categories.reduce(
                  (total, cat) =>
                    total + getSubcategoriesByParent(cat.id).length,
                  0
                )}
              </h3>
            </div>
            <Book className="h-6 w-6 text-purple-500" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs Simplificadas */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-zinc-800 border-zinc-700">
          <TabsTrigger
            value="search"
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
          >
            Pesquisar Peças
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
          >
            Por Categorias
          </TabsTrigger>
        </TabsList>

        {/* TAB PESQUISA - Simplificada */}
        <TabsContent value="search">
          <Card className="bg-zinc-800 border-zinc-700">
            <CardContent className="space-y-4 p-4 sm:p-6">
              {/* Barra de Pesquisa */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input
                    placeholder="Digite o nome, código ou descrição da peça..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-10 pr-10 bg-zinc-900 border-zinc-700 text-white"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSearch}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4 text-zinc-400" />
                    </Button>
                  )}
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={isSearching || !searchTerm.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Pesquisar"
                  )}
                </Button>
              </div>

              {/* Mensagem de ajuda */}
              {!hasSearched && !isSearching && (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">
                    Digite o que procura e clique em pesquisar
                  </p>
                </div>
              )}

              {/* Erro */}
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
            </CardContent>
          </Card>

          {/* Resultados da Pesquisa */}
          {hasSearched && !isSearching && (
            <>
              {searchResults.length > 0 ? (
                <>
                  <div className="flex justify-between items-center mt-4 mb-2">
                    <p className="text-sm text-zinc-400">
                      {searchResults.length} resultado(s) encontrado(s)
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map((part) => (
                      <Card
                        key={part.id}
                        onClick={() => navigate(`/app/part/${part.id}`)}
                        className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg overflow-hidden">
                              <PartImage
                                src={part.image}
                                imageHash={part.imageHash}
                                alt={part.name}
                                className="w-full h-full object-cover"
                                defaultImage="/default-part.png"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-white truncate">
                                {part.name}
                              </h3>
                              <Badge className="bg-blue-500/10 text-blue-500">
                                {part.code}
                              </Badge>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                asChild
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-full"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="bg-zinc-800 border-zinc-700"
                              >
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(`/app/edit-part/${part.id}`)
                                  }
                                  className="text-white hover:bg-zinc-700"
                                >
                                  <Edit2 className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => confirmDelete(part, e)}
                                  className="text-red-400 hover:bg-zinc-700"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="mt-3">
                            <p className="text-white font-medium">
                              {new Intl.NumberFormat("pt-PT", {
                                style: "currency",
                                currency: "EUR",
                              }).format(part.price || 0)}
                            </p>
                            <p className="text-zinc-400 text-sm line-clamp-2">
                              {part.description || "Sem descrição"}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <Card className="bg-zinc-800 border-zinc-700 mt-4">
                  <CardContent className="p-8 text-center">
                    <Package className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
                    <p className="text-lg font-medium text-white mb-2">
                      Nenhuma peça encontrada
                    </p>
                    <p className="text-zinc-400">
                      Tente buscar com outros termos
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* TAB CATEGORIAS - Mantida como está */}
        <TabsContent value="categories">
          <div className="space-y-4">
            {/* Breadcrumb */}
            {(selectedCategory || selectedSubcategory) && (
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToCategories}
                  className="h-8 border-zinc-700 text-white hover:bg-zinc-700"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Voltar
                </Button>
                <span className="text-zinc-400">
                  {selectedSubcategory
                    ? `${selectedCategory.name} > ${selectedSubcategory.name}`
                    : selectedCategory?.name}
                </span>
              </div>
            )}

            {/* Categorias */}
            {!selectedCategory && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getMainCategories().map((category) => (
                  <Card
                    key={category.id}
                    onClick={() => handleCategoryClick(category)}
                    className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Tag className="h-5 w-5 text-blue-500" />
                          <h3 className="font-semibold text-white">
                            {category.name}
                          </h3>
                        </div>
                        <ChevronRight className="h-4 w-4 text-zinc-400" />
                      </div>
                      <p className="text-zinc-400 text-sm mt-2">
                        {getSubcategories(category.id).length} subcategorias
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Subcategorias */}
            {selectedCategory && !selectedSubcategory && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getSubcategories(selectedCategory.id).map((subcategory) => (
                  <Card
                    key={subcategory.id}
                    onClick={() => handleSubcategoryClick(subcategory)}
                    className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-purple-500" />
                          <h3 className="font-semibold text-white">
                            {subcategory.name}
                          </h3>
                        </div>
                        <ChevronRight className="h-4 w-4 text-zinc-400" />
                      </div>
                      <p className="text-zinc-400 text-sm mt-2">
                        {subcategoryCounts[subcategory.id] || 0} peças
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Peças da Subcategoria */}
            {selectedSubcategory && (
              <>
                {categoryParts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryParts.map((part) => (
                      <Card
                        key={part.id}
                        onClick={() => navigate(`/app/part/${part.id}`)}
                        className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg overflow-hidden">
                              <PartImage
                                src={part.image}
                                imageHash={part.imageHash}
                                alt={part.name}
                                className="w-full h-full object-cover"
                                defaultImage="/default-part.png"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-white truncate">
                                {part.name}
                              </h3>
                              <Badge className="bg-blue-500/10 text-blue-500">
                                {part.code}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-white text-sm mt-2">
                            {new Intl.NumberFormat("pt-PT", {
                              style: "currency",
                              currency: "EUR",
                            }).format(part.price || 0)}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-zinc-800 border-zinc-700">
                    <CardContent className="p-6 text-center">
                      <Package className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
                      <p className="text-lg font-medium text-white mb-2">
                        Nenhuma peça nesta subcategoria
                      </p>
                      <Button
                        onClick={handleAddPart}
                        className="mt-4 bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Peça
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Botões de Ação */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                onClick={() => navigate("/app/add-category")}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Categoria
              </Button>
              <Button
                onClick={() => navigate("/app/manage-categories")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Tag className="w-4 h-4 mr-2" />
                Gerenciar Categorias
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setDeleteDialogOpen(false)}
          />
          <div className="relative bg-zinc-800 border border-zinc-700 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-2">
              Confirmar exclusão
            </h3>
            <p className="text-zinc-400 mb-6">
              Tem certeza que deseja excluir a peça{" "}
              <span className="font-semibold text-white">
                {partToDelete?.name}
              </span>
              ?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                className="border-zinc-700 text-white hover:bg-zinc-700"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(partToDelete)}
                className="bg-red-600 hover:bg-red-700"
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePartsLibrary;
