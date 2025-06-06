// ManagePartsLibrary.jsx - OTIMIZADO: Pesquisa rápida + Estado persistente

import { useState, useEffect, useCallback } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import { useCategories } from "../../context/CategoriesContext.jsx";
import { usePartsCache } from "../../context/PartsCache.jsx";
import PartImage from "../../components/ui/PartImage.jsx";
import {
  Search,
  Plus,
  Loader2,
  Edit2,
  Trash2,
  ArrowUpDown,
  AlertTriangle,
  Package,
  Tag,
  MoreVertical,
  RefreshCw,
  Book,
  ChevronRight,
  ArrowLeft,
  Grid,
  List,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";

// ✅ CONSTANTES para persistência
const STORAGE_KEYS = {
  SEARCH_TERM: "partsLibrary_searchTerm",
  FILTER_CATEGORY: "partsLibrary_filterCategory",
  SORT_FIELD: "partsLibrary_sortField",
  SORT_ORDER: "partsLibrary_sortOrder",
  VIEW_MODE: "partsLibrary_viewMode",
  ACTIVE_TAB: "partsLibrary_activeTab",
  SELECTED_CATEGORY: "partsLibrary_selectedCategory",
  SELECTED_SUBCATEGORY: "partsLibrary_selectedSubcategory",
};

// ✅ FUNÇÕES HELPER para persistência
const saveToStorage = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Erro ao salvar no sessionStorage:", error);
  }
};

const loadFromStorage = (key, defaultValue) => {
  try {
    const saved = sessionStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (error) {
    console.warn("Erro ao carregar do sessionStorage:", error);
    return defaultValue;
  }
};

const ManagePartsLibrary = () => {
  // ✅ CACHE INTELIGENTE para peças
  const {
    fetchParts,
    fetchSubcategoryCounts,
    getCachedParts,
    isLoading: isCacheLoading,
    invalidateCache,
    removePartFromCache,
  } = usePartsCache();

  // Estados locais simplificados (cache gerencia as peças)
  const [displayParts, setDisplayParts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [subcategoryCounts, setSubcategoryCounts] = useState({});

  // ✅ ESTADOS PERSISTENTES - Carregados do sessionStorage
  const [searchTerm, setSearchTerm] = useState(() =>
    loadFromStorage(STORAGE_KEYS.SEARCH_TERM, "")
  );
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(() =>
    loadFromStorage(STORAGE_KEYS.SEARCH_TERM, "")
  );
  const [filterCategory, setFilterCategory] = useState(() =>
    loadFromStorage(STORAGE_KEYS.FILTER_CATEGORY, "all")
  );
  const [sortOrder, setSortOrder] = useState(() =>
    loadFromStorage(STORAGE_KEYS.SORT_ORDER, "asc")
  );
  const [sortField, setSortField] = useState(() =>
    loadFromStorage(STORAGE_KEYS.SORT_FIELD, "name")
  );
  const [viewMode, setViewMode] = useState(() =>
    loadFromStorage(STORAGE_KEYS.VIEW_MODE, "grid")
  );
  const [activeTab, setActiveTab] = useState(() =>
    loadFromStorage(STORAGE_KEYS.ACTIVE_TAB, "all")
  );

  // Estados não persistentes
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partToDelete, setPartToDelete] = useState(null);

  // ✅ ESTADOS PERSISTENTES para navegação por categorias
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const saved = loadFromStorage(STORAGE_KEYS.SELECTED_CATEGORY, null);
    return saved;
  });
  const [selectedSubcategory, setSelectedSubcategory] = useState(() => {
    const saved = loadFromStorage(STORAGE_KEYS.SELECTED_SUBCATEGORY, null);
    return saved;
  });

  const navigate = useNavigate();
  const location = useLocation();

  // Cache de categorias
  const {
    categories,
    getSubcategoriesByParent,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

  // ✅ EFFECT para salvar estados no sessionStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SEARCH_TERM, searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.FILTER_CATEGORY, filterCategory);
  }, [filterCategory]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SORT_FIELD, sortField);
  }, [sortField]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SORT_ORDER, sortOrder);
  }, [sortOrder]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.VIEW_MODE, viewMode);
  }, [viewMode]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ACTIVE_TAB, activeTab);
  }, [activeTab]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SELECTED_CATEGORY, selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SELECTED_SUBCATEGORY, selectedSubcategory);
  }, [selectedSubcategory]);

  // ✅ DEBOUNCE OTIMIZADO - Mais rápido (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // Reduzido de 500ms para 300ms
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ✅ FUNÇÃO OTIMIZADA - Evita chamadas desnecessárias
  const loadParts = useCallback(
    async (loadMore = false) => {
      try {
        setError(null);

        // ✅ VERIFICAR CACHE PRIMEIRO (evita chamadas desnecessárias)
        if (!loadMore && !debouncedSearchTerm) {
          const cached = getCachedParts(
            filterCategory !== "all" ? filterCategory : null,
            selectedSubcategory?.id || null,
            ""
          );

          if (cached.isValid && cached.parts.length > 0) {
            console.log("⚡ Usando dados em cache (sem busca)");
            setDisplayParts(cached.parts);
            setHasMore(cached.hasMore);
            return;
          }
        }

        const result = await fetchParts({
          categoryId: filterCategory !== "all" ? filterCategory : null,
          subcategoryId: selectedSubcategory?.id || null,
          searchTerm: debouncedSearchTerm,
          sortField,
          sortOrder,
          loadMore,
        });

        if (result.error) {
          setError(result.error);
        }

        if (result.warning) {
          setError(result.warning);
        }

        setDisplayParts(result.parts);
        setHasMore(result.hasMore);

        if (result.fromCache) {
          console.log("📦 Dados carregados do cache!");
        }
      } catch (err) {
        console.error("❌ Erro ao carregar peças:", err);
        setError("Erro ao carregar peças. Por favor, tente novamente.");
      }
    },
    [
      fetchParts,
      getCachedParts,
      filterCategory,
      selectedSubcategory,
      debouncedSearchTerm,
      sortField,
      sortOrder,
    ]
  );

  // ✅ CARREGAR CONTADORES quando categoria é selecionada
  const loadSubcategoryCounts = useCallback(
    async (categoryId) => {
      if (!categoryId) return;

      try {
        const counts = await fetchSubcategoryCounts(categoryId);
        setSubcategoryCounts(counts);
      } catch (err) {
        console.error("❌ Erro ao carregar contadores:", err);
      }
    },
    [fetchSubcategoryCounts]
  );

  // ✅ EFFECT OTIMIZADO - Só carrega quando realmente necessário
  useEffect(() => {
    // Delay pequeno para evitar chamadas múltiplas durante hidratação
    const timer = setTimeout(() => {
      loadParts(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [
    filterCategory,
    selectedSubcategory,
    debouncedSearchTerm,
    sortField,
    sortOrder,
  ]);

  // ✅ EFFECT - Carrega contadores quando categoria é selecionada
  useEffect(() => {
    if (selectedCategory) {
      loadSubcategoryCounts(selectedCategory.id);
    }
  }, [selectedCategory, loadSubcategoryCounts]);

  // ✅ FUNCTION LOAD MORE otimizada
  const handleLoadMore = () => {
    if (
      hasMore &&
      !isCacheLoading(
        filterCategory !== "all" ? filterCategory : null,
        selectedSubcategory?.id || null,
        debouncedSearchTerm
      )
    ) {
      loadParts(true);
    }
  };

  // ✅ FUNÇÃO REFRESH otimizada
  const handleRefresh = () => {
    invalidateCache(
      filterCategory !== "all" ? filterCategory : null,
      selectedSubcategory?.id || null
    );
    setSubcategoryCounts({});
    loadParts(false);
    if (selectedCategory) {
      loadSubcategoryCounts(selectedCategory.id);
    }
  };

  // ✅ DELETE otimizado com cache
  const handleDelete = async (part) => {
    try {
      await deleteDoc(doc(db, "pecas", part.id));

      // Remover do cache
      removePartFromCache(part.id);

      // Atualizar display local
      setDisplayParts((prev) => prev.filter((p) => p.id !== part.id));

      setDeleteDialogOpen(false);
      setPartToDelete(null);

      // Recarregar contadores se necessário
      if (selectedCategory) {
        loadSubcategoryCounts(selectedCategory.id);
      }
    } catch (error) {
      console.error("❌ Erro ao deletar peça:", error);
      setError("Erro ao deletar peça. Por favor, tente novamente.");
    }
  };

  const confirmDelete = (part, e) => {
    e.stopPropagation();
    setPartToDelete(part);
    setDeleteDialogOpen(true);
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setPartToDelete(null);
  };

  // ✅ HANDLERS OTIMIZADOS com persistência
  const handleTabChange = (value) => {
    setActiveTab(value);
    setError(null);
    if (value === "all") {
      setSelectedCategory(null);
      setSelectedSubcategory(null);
    }
  };

  const handleCategoryClick = (category) => {
    setError(null);
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    // ✅ NÃO limpar busca - mantém o termo de pesquisa
  };

  const handleSubcategoryClick = (subcategory) => {
    setError(null);
    setSelectedSubcategory(subcategory);
    // ✅ NÃO limpar busca - mantém o termo de pesquisa
  };

  const handleBackToCategories = () => {
    setError(null);
    // ✅ NÃO limpar busca - mantém o termo de pesquisa
    if (selectedSubcategory) {
      setSelectedSubcategory(null);
    } else {
      setSelectedCategory(null);
      setSubcategoryCounts({});
    }
  };

  // ✅ LIMPAR BUSCA MANUAL
  const clearSearch = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
  };

  // ✅ LIMPAR TODOS OS FILTROS
  const clearAllFilters = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setFilterCategory("all");
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSortField("name");
    setSortOrder("asc");

    // Limpar também do storage
    Object.values(STORAGE_KEYS).forEach((key) => {
      sessionStorage.removeItem(key);
    });
  };

  // Funções auxiliares
  const getSubcategories = (categoryId) => {
    return getSubcategoriesByParent(categoryId);
  };

  const getMainCategories = () => {
    return categories;
  };

  // ✅ VERIFICAR LOADING STATES
  const isLoadingParts = isCacheLoading(
    filterCategory !== "all" ? filterCategory : null,
    selectedSubcategory?.id || null,
    debouncedSearchTerm
  );

  // Loading state inicial
  if (categoriesLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  // Mostrar erro das categorias
  if (categoriesError && !error) {
    setError(categoriesError);
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Biblioteca de Peças
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Gerencie todas as peças disponíveis no sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/app/add-part")}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Peça
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">
                Peças {displayParts.length > 0 ? "Carregadas" : "Disponíveis"}
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {displayParts.length}
                {hasMore && <span className="text-sm text-zinc-400">+</span>}
              </h3>
            </div>
            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Categorias</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {getMainCategories().length}
              </h3>
            </div>
            <Tag className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Subcategorias</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {categories.reduce((total, cat) => {
                  return total + getSubcategoriesByParent(cat.id).length;
                }, 0)}
              </h3>
            </div>
            <Book className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-zinc-800 border-zinc-700">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
          >
            Todas as Peças
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
          >
            Por Categorias
          </TabsTrigger>
        </TabsList>

        {/* All Parts Tab */}
        <TabsContent value="all">
          {/* Filters Card */}
          <Card className="bg-zinc-800 border-zinc-700">
            <CardContent className="space-y-4 p-4 sm:p-6">
              {/* Search */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  placeholder="Buscar por nome, código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10 w-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                />
                {searchTerm !== debouncedSearchTerm && (
                  <div className="absolute right-10 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  </div>
                )}
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-zinc-700"
                  >
                    <X className="h-4 w-4 text-zinc-400" />
                  </Button>
                )}
              </div>

              {/* Filters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  value={filterCategory}
                  onValueChange={setFilterCategory}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                    <SelectValue placeholder="Filtrar por categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem
                      value="all"
                      className="text-white hover:bg-zinc-700"
                    >
                      Todas as Categorias
                    </SelectItem>
                    {getMainCategories().map((category) => (
                      <SelectItem
                        key={category.id}
                        value={category.id}
                        className="text-white hover:bg-zinc-700"
                      >
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortField} onValueChange={setSortField}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem
                      value="name"
                      className="text-white hover:bg-zinc-700"
                    >
                      Nome
                    </SelectItem>
                    <SelectItem
                      value="price"
                      className="text-white hover:bg-zinc-700"
                    >
                      Preço
                    </SelectItem>
                    <SelectItem
                      value="code"
                      className="text-white hover:bg-zinc-700"
                    >
                      Código
                    </SelectItem>
                    <SelectItem
                      value="createdAt"
                      className="text-white hover:bg-zinc-700"
                    >
                      Data de Cadastro
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                    }
                    className="gap-2 text-white border-zinc-700 hover:bg-zinc-700 bg-green-600"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    <span>
                      {sortOrder === "asc" ? "Crescente" : "Decrescente"}
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setViewMode("grid")}
                    className={`gap-2 text-white border-zinc-700 hover:bg-zinc-700 ${
                      viewMode === "grid" ? "bg-zinc-700" : "bg-transparent"
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setViewMode("list")}
                    className={`gap-2 text-white border-zinc-700 hover:bg-zinc-700 ${
                      viewMode === "list" ? "bg-zinc-700" : "bg-transparent"
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={isLoadingParts}
                    className="gap-2 text-white border-zinc-700 hover:bg-zinc-700 bg-zinc-600"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${
                        isLoadingParts ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </Button>

                  {/* ✅ BOTÃO LIMPAR FILTROS */}
                  {(searchTerm ||
                    filterCategory !== "all" ||
                    sortField !== "name" ||
                    sortOrder !== "asc") && (
                    <Button
                      variant="outline"
                      onClick={clearAllFilters}
                      className="gap-2 text-amber-400 border-amber-600 hover:bg-amber-600/20"
                    >
                      <X className="w-4 h-4" />
                      Limpar Filtros
                    </Button>
                  )}
                </div>

                <span className="text-center sm:text-right text-sm text-zinc-400">
                  {debouncedSearchTerm ? (
                    <>
                      {displayParts.length} peça(s) encontrada(s) para "
                      {debouncedSearchTerm}"
                    </>
                  ) : (
                    <>
                      {displayParts.length} peça(s) carregada(s)
                      {hasMore && " (há mais disponíveis)"}
                    </>
                  )}
                </span>
              </div>

              {error && (
                <Alert
                  variant="destructive"
                  className="border-red-500 bg-red-500/10"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-red-400 flex-1">
                    {error}
                  </AlertDescription>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-6 px-2 text-red-400 hover:text-white hover:bg-red-600"
                    onClick={() => setError(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoadingParts && displayParts.length === 0 && (
            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
                <p className="text-white">Carregando peças...</p>
              </CardContent>
            </Card>
          )}

          {/* Parts Grid/List */}
          {displayParts.length > 0 && (
            <>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {displayParts.map((part) => (
                    <Card
                      key={part.id}
                      onClick={() => navigate(`/app/part/${part.id}`)}
                      className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg overflow-hidden">
                            <PartImage
                              src={part.image}
                              imageHash={part.imageHash}
                              alt={part.name}
                              className="w-full h-full object-cover"
                              defaultImage="/default-part.png"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-base sm:text-lg text-white truncate">
                                {part.name}
                              </h3>
                              <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">
                                {part.code}
                              </Badge>
                            </div>
                            <p className="text-zinc-400 text-xs sm:text-sm truncate">
                              {part.categoryName || "Sem categoria"}
                            </p>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full hover:bg-zinc-700 text-white"
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
                                className="text-white hover:bg-zinc-700 cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-400 hover:bg-zinc-700 focus:text-red-400 cursor-pointer"
                                onClick={(e) => confirmDelete(part, e)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="mt-3 space-y-1.5">
                          <p className="text-white text-sm font-medium">
                            {new Intl.NumberFormat("pt-PT", {
                              style: "currency",
                              currency: "EUR",
                            }).format(part.price || 0)}
                          </p>
                          <p className="text-zinc-400 text-xs sm:text-sm line-clamp-2">
                            {part.description || "Sem descrição"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {displayParts.map((part) => (
                    <Card
                      key={part.id}
                      onClick={() => navigate(`/app/part/${part.id}`)}
                      className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                      <CardContent className="p-3">
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
                            <h3 className="font-semibold text-base text-white truncate">
                              {part.name}
                            </h3>
                            <p className="text-zinc-400 text-xs truncate">
                              {part.categoryName || "Sem categoria"} • Código:{" "}
                              {part.code}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <p className="text-white font-medium whitespace-nowrap">
                              {new Intl.NumberFormat("pt-PT", {
                                style: "currency",
                                currency: "EUR",
                              }).format(part.price || 0)}
                            </p>

                            <DropdownMenu>
                              <DropdownMenuTrigger
                                asChild
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-full hover:bg-zinc-700 text-white"
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
                                  className="text-white hover:bg-zinc-700 cursor-pointer"
                                >
                                  <Edit2 className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-400 hover:bg-zinc-700 focus:text-red-400 cursor-pointer"
                                  onClick={(e) => confirmDelete(part, e)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Load More Button */}
              {hasMore && !debouncedSearchTerm && (
                <div className="flex justify-center mt-8">
                  <Button
                    onClick={handleLoadMore}
                    disabled={isLoadingParts}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isLoadingParts ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Carregar Mais (20 itens)
                      </>
                    )}
                  </Button>
                </div>
              )}

              {!hasMore && displayParts.length > 0 && (
                <div className="text-center mt-8">
                  <p className="text-zinc-400">
                    ✅ Todas as peças foram carregadas ({displayParts.length}{" "}
                    total)
                  </p>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {displayParts.length === 0 && !isLoadingParts && (
            <Card className="bg-zinc-800 border-zinc-700 mt-4">
              <CardContent className="p-8 sm:p-12 text-center">
                <Search className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2 text-white">
                  Nenhuma peça encontrada
                </p>
                <p className="text-sm sm:text-base text-zinc-400 mb-4">
                  Tente ajustar seus filtros ou adicione uma nova peça
                </p>
                {(searchTerm || filterCategory !== "all") && (
                  <Button
                    onClick={clearAllFilters}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Limpar Filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ✅ CATEGORIES TAB - MANTIDO IGUAL (já funciona bem) */}
        <TabsContent value="categories">
          <div className="space-y-4">
            {/* Breadcrumb */}
            {(selectedCategory || selectedSubcategory) && (
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToCategories}
                  className="h-8 border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Voltar
                </Button>
                <span className="text-zinc-400">
                  {selectedSubcategory
                    ? `${selectedCategory.name} > ${selectedSubcategory.name}`
                    : selectedCategory
                    ? selectedCategory.name
                    : "Categorias"}
                </span>
              </div>
            )}

            {/* Search */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder={
                  selectedCategory && !selectedSubcategory
                    ? "Buscar subcategorias..."
                    : selectedSubcategory
                    ? "Buscar peças..."
                    : "Buscar categorias..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>

            {/* ✅ INDICADOR DE FILTROS ATIVOS na aba Categories */}
            {(searchTerm || filterCategory !== "all") && (
              <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-blue-400" />
                <span className="text-blue-400 text-sm flex-1">
                  Filtros ativos da aba "Todas as Peças" podem afetar os
                  resultados
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-blue-400 hover:text-white hover:bg-blue-600/20 h-6 px-2"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              </div>
            )}

            {/* 1. CATEGORIAS PRINCIPAIS */}
            {!selectedCategory && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getMainCategories()
                  .filter((cat) =>
                    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((category) => (
                    <Card
                      key={category.id}
                      onClick={() => handleCategoryClick(category)}
                      className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Tag className="h-5 w-5 text-blue-500" />
                            <h3 className="font-semibold text-base text-white">
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

            {/* ✅ 2. SUBCATEGORIAS - COM CONTADORES REAIS */}
            {selectedCategory && !selectedSubcategory && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getSubcategories(selectedCategory.id)
                  .filter((sub) =>
                    sub.name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((subcategory) => (
                    <Card
                      key={subcategory.id}
                      onClick={() => handleSubcategoryClick(subcategory)}
                      className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Package className="h-5 w-5 text-purple-500" />
                            <h3 className="font-semibold text-base text-white">
                              {subcategory.name}
                            </h3>
                          </div>
                          <ChevronRight className="h-4 w-4 text-zinc-400" />
                        </div>
                        <p className="text-zinc-400 text-sm mt-2">
                          {/* ✅ CONTADOR REAL do cache */}
                          {subcategoryCounts[subcategory.id] || 0} peças
                        </p>
                      </CardContent>
                    </Card>
                  ))}

                {getSubcategories(selectedCategory.id).length === 0 && (
                  <Card className="md:col-span-2 lg:col-span-3 bg-zinc-800 border-zinc-700">
                    <CardContent className="p-8 text-center">
                      <Package className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2 text-white">
                        Nenhuma subcategoria encontrada
                      </p>
                      <p className="text-sm text-zinc-400">
                        Esta categoria ainda não tem subcategorias
                      </p>
                      <Button
                        onClick={() =>
                          navigate(
                            `/app/add-subcategory/${selectedCategory.id}`
                          )
                        }
                        className="mt-4 bg-purple-600 hover:bg-purple-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Subcategoria
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ✅ 3. PEÇAS DA SUBCATEGORIA - COM CACHE */}
            {selectedSubcategory && (
              <>
                {isLoadingParts && displayParts.length === 0 ? (
                  <Card className="bg-zinc-800 border-zinc-700">
                    <CardContent className="p-8 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
                      <p className="text-white">
                        Carregando peças da subcategoria...
                      </p>
                    </CardContent>
                  </Card>
                ) : displayParts.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {displayParts
                        .filter(
                          (part) =>
                            part.name
                              ?.toLowerCase()
                              .includes(searchTerm.toLowerCase()) ||
                            part.code
                              ?.toLowerCase()
                              .includes(searchTerm.toLowerCase()) ||
                            part.description
                              ?.toLowerCase()
                              .includes(searchTerm.toLowerCase())
                        )
                        .map((part) => (
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
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-base text-white truncate">
                                      {part.name}
                                    </h3>
                                    <Badge className="bg-blue-500/10 text-blue-500">
                                      {part.code}
                                    </Badge>
                                  </div>
                                  <p className="text-white text-sm">
                                    {new Intl.NumberFormat("pt-PT", {
                                      style: "currency",
                                      currency: "EUR",
                                    }).format(part.price || 0)}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>

                    {hasMore && (
                      <div className="flex justify-center mt-8">
                        <Button
                          onClick={handleLoadMore}
                          disabled={isLoadingParts}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isLoadingParts ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Carregando...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Carregar Mais
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <Card className="bg-zinc-800 border-zinc-700">
                    <CardContent className="p-6 text-center">
                      <Package className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2 text-white">
                        Nenhuma peça encontrada
                      </p>
                      <p className="text-zinc-400 text-sm">
                        Esta subcategoria ainda não tem peças cadastradas
                      </p>
                      <Button
                        onClick={() => navigate("/app/add-part")}
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

            {/* Action Buttons */}
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

              {selectedCategory && (
                <Button
                  onClick={() =>
                    navigate(`/app/add-subcategory/${selectedCategory.id}`)
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Subcategoria
                </Button>
              )}

              <Button
                onClick={() => navigate("/app/add-part")}
                className="bg-zinc-600 hover:bg-zinc-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Peça
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={cancelDelete} />
          <div className="relative bg-zinc-800 border border-zinc-700 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-2">
              Confirmar exclusão
            </h3>
            <p className="text-zinc-400 mb-6">
              Tem certeza que deseja excluir a peça{" "}
              <span className="font-semibold text-white">
                {partToDelete?.name}
              </span>
              ? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={cancelDelete}
                className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
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

      {/* Mobile FAB */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 sm:hidden">
        <Button
          onClick={handleRefresh}
          size="icon"
          disabled={isLoadingParts}
          className="rounded-full shadow-lg bg-zinc-700 hover:bg-zinc-600"
        >
          <RefreshCw
            className={`h-5 w-5 ${isLoadingParts ? "animate-spin" : ""}`}
          />
        </Button>
        <Button
          onClick={() => navigate("/app/add-part")}
          size="icon"
          className="rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ManagePartsLibrary;
