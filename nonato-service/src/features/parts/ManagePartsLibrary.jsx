// ManagePartsLibrary.jsx - OTIMIZADO: Lazy Loading + React.memo + Zero Logs + URL Navigation

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useNavigate, useSearchParams } from "react-router-dom"; // ✅ NOVO: Adicionado useSearchParams
import { useCategories } from "../../context/CategoriesContext.jsx";
import { usePartsCache } from "../../context/PartsCache.jsx";
import { invalidateCache } from "../../context/UniversalFirestoreCache.js";
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
  Zap,
} from "lucide-react";

// UI Components (já importados otimizados)
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";

// ✅ CONSTANTS - Reduzidas e otimizadas
const STORAGE_KEYS = {
  SEARCH_TERM: "parts_search",
  FILTER_CATEGORY: "parts_filter",
  SORT_FIELD: "parts_sort",
  VIEW_MODE: "parts_view",
  ACTIVE_TAB: "parts_tab",
};

// ✅ STORAGE HELPERS - Simplificados com error handling
const saveToStorage = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Ignorar erros de storage silenciosamente
  }
};

const loadFromStorage = (key, defaultValue) => {
  try {
    const saved = sessionStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

// ✅ PART CARD COMPONENT - Memoizado para evitar re-renders
const PartCard = React.memo(({ part, viewMode, onEdit, onDelete, onView }) => {
  const handleEdit = useCallback(
    (e) => {
      e.stopPropagation();
      onEdit(part.id);
    },
    [part.id, onEdit]
  );

  const handleDelete = useCallback(
    (e) => {
      e.stopPropagation();
      onDelete(part);
    },
    [part, onDelete]
  );

  const handleView = useCallback(() => {
    onView(part.id);
  }, [part.id, onView]);

  const formattedPrice = useMemo(
    () =>
      new Intl.NumberFormat("pt-PT", {
        style: "currency",
        currency: "EUR",
      }).format(part.price || 0),
    [part.price]
  );

  if (viewMode === "list") {
    return (
      <Card
        onClick={handleView}
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
                {part.categoryName || "Sem categoria"} • Código: {part.code}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-white font-medium whitespace-nowrap">
                {formattedPrice}
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
                    onClick={handleEdit}
                    className="text-white hover:bg-zinc-700 cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-red-400 hover:bg-zinc-700 focus:text-red-400 cursor-pointer"
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
    );
  }

  return (
    <Card
      onClick={handleView}
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
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
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
                onClick={handleEdit}
                className="text-white hover:bg-zinc-700 cursor-pointer"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-400 hover:bg-zinc-700 focus:text-red-400 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-3 space-y-1.5">
          <p className="text-white text-sm font-medium">{formattedPrice}</p>
          <p className="text-zinc-400 text-xs sm:text-sm line-clamp-2">
            {part.description || "Sem descrição"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
});

PartCard.displayName = "PartCard";

// ✅ STATS CARD COMPONENT - Memoizado
const StatsCard = React.memo(({ title, value, icon: Icon, color, loading }) => (
  <Card className="bg-zinc-800 border-zinc-700">
    <CardContent className="flex items-center justify-between p-4 sm:p-6">
      <div>
        <p className="text-sm font-medium text-zinc-400">{title}</p>
        <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin inline" />
          ) : (
            value
          )}
        </h3>
      </div>
      <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${color}`} />
    </CardContent>
  </Card>
));

StatsCard.displayName = "StatsCard";

// ✅ MAIN COMPONENT - OTIMIZADO
const ManagePartsLibrary = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams(); // ✅ NOVO: Adicionado useSearchParams

  // Context hooks
  const {
    categories,
    getSubcategoriesByParent,
    isLoading: categoriesLoading,
  } = useCategories();
  const {
    fetchParts,
    fetchSubcategoryCounts,
    getCachedParts,
    isLoading: isCacheLoading,
    removePartFromCache,
  } = usePartsCache();
  const {
    counters,
    loading: countersLoading,
    getTotalCount,
  } = usePartsCounters();

  // ✅ ESTADO REDUZIDO - Só o essencial
  const [displayParts, setDisplayParts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partToDelete, setPartToDelete] = useState(null);

  // ✅ PERSISTENT STATE - Carregado uma vez
  const [searchTerm, setSearchTerm] = useState(() =>
    loadFromStorage(STORAGE_KEYS.SEARCH_TERM, "")
  );
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(() =>
    loadFromStorage(STORAGE_KEYS.SEARCH_TERM, "")
  );
  const [filterCategory, setFilterCategory] = useState(() =>
    loadFromStorage(STORAGE_KEYS.FILTER_CATEGORY, "all")
  );
  const [sortField, setSortField] = useState(() =>
    loadFromStorage(STORAGE_KEYS.SORT_FIELD, "name")
  );
  const [sortOrder, setSortOrder] = useState("asc");
  const [viewMode, setViewMode] = useState(() =>
    loadFromStorage(STORAGE_KEYS.VIEW_MODE, "grid")
  );
  const [activeTab, setActiveTab] = useState(() =>
    loadFromStorage(STORAGE_KEYS.ACTIVE_TAB, "all")
  );

  // Navigation state for categories
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [subcategoryCounts, setSubcategoryCounts] = useState({});

  // ✅ NOVO: useEffect para ler a URL e restaurar o estado
  useEffect(() => {
    const tab = searchParams.get("tab");
    const categoryId = searchParams.get("categoryId");
    const subcategoryId = searchParams.get("subcategoryId");

    if (tab) {
      setActiveTab(tab);
    }

    if (tab === "categories" && categoryId && categories.length > 0) {
      const category = categories.find((cat) => cat.id === categoryId);
      if (category) {
        setSelectedCategory(category);

        if (subcategoryId) {
          const subcategories = getSubcategoriesByParent(categoryId);
          const subcategory = subcategories.find(
            (sub) => sub.id === subcategoryId
          );
          if (subcategory) {
            setSelectedSubcategory(subcategory);
          }
        }
      }
    }
  }, [searchParams, categories, getSubcategoriesByParent]);

  // ✅ PERSIST STATE EFFECTS - Otimizados
  useEffect(
    () => saveToStorage(STORAGE_KEYS.SEARCH_TERM, searchTerm),
    [searchTerm]
  );
  useEffect(
    () => saveToStorage(STORAGE_KEYS.FILTER_CATEGORY, filterCategory),
    [filterCategory]
  );
  useEffect(
    () => saveToStorage(STORAGE_KEYS.SORT_FIELD, sortField),
    [sortField]
  );
  useEffect(() => saveToStorage(STORAGE_KEYS.VIEW_MODE, viewMode), [viewMode]);
  useEffect(
    () => saveToStorage(STORAGE_KEYS.ACTIVE_TAB, activeTab),
    [activeTab]
  );

  // ✅ DEBOUNCE SEARCH - Otimizado
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ✅ LAZY LOADING - SÓ CARREGA QUANDO NECESSÁRIO
  const shouldLoadParts = useMemo(() => {
    return (
      debouncedSearchTerm.length >= 2 ||
      filterCategory !== "all" ||
      selectedSubcategory
    );
  }, [debouncedSearchTerm, filterCategory, selectedSubcategory]);

  // ✅ LOAD PARTS - Otimizado com lazy loading
  const loadParts = useCallback(
    async (loadMore = false) => {
      console.log("📥 loadParts chamado:", { loadMore, shouldLoadParts });

      if (!shouldLoadParts && !loadMore) {
        console.log("❌ loadParts: shouldLoadParts = false, saindo");
        setDisplayParts([]);
        setHasMore(true);
        return;
      }

      console.log("✅ loadParts: buscando peças do Firebase...");

      try {
        setError(null);

        const result = await fetchParts({
          categoryId: filterCategory !== "all" ? filterCategory : null,
          subcategoryId: selectedSubcategory?.id || null,
          searchTerm: debouncedSearchTerm,
          sortField,
          sortOrder,
          loadMore,
        });

        console.log("📦 loadParts: resultado recebido:", {
          partsCount: result.parts?.length,
          hasMore: result.hasMore,
          error: result.error,
        });

        if (result.error) setError(result.error);
        if (result.warning) setError(result.warning);

        setDisplayParts(result.parts);
        setHasMore(result.hasMore);
      } catch (err) {
        console.error("❌ loadParts: erro:", err);
        setError("Erro ao carregar peças. Tente novamente.");
      }
    },
    [
      shouldLoadParts,
      fetchParts,
      filterCategory,
      selectedSubcategory,
      debouncedSearchTerm,
      sortField,
      sortOrder,
    ]
  );

  // ✅ EFFECTS - Simplificados
  useEffect(() => {
    if (shouldLoadParts) {
      const timer = setTimeout(() => loadParts(false), 100);
      return () => clearTimeout(timer);
    }
  }, [shouldLoadParts, loadParts]);

  // ✅ HANDLERS - Otimizados com useCallback
  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setError(null);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setFilterCategory("all");
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSortField("name");
    setSortOrder("asc");
    setError(null);
  }, []);

  const handleRefresh = useCallback(() => {
    console.log("🔄 HandleRefresh chamado!");

    // Solução temporária: recarregar a página
    window.location.reload();
  }, []);

  // ✅ DELETE HANDLER - Otimizado
  const handleDelete = useCallback(
    async (part) => {
      try {
        decrementPartCount(part.categoryId, part.subcategoryId);
        setDisplayParts((prev) => prev.filter((p) => p.id !== part.id));
        removePartFromCache(part.id);

        await deleteDoc(doc(db, "pecas", part.id));

        setDeleteDialogOpen(false);
        setPartToDelete(null);
      } catch (error) {
        setError("Erro ao deletar peça. Tente novamente.");
      }
    },
    [removePartFromCache]
  );

  const confirmDelete = useCallback((part, e) => {
    e.stopPropagation();
    setPartToDelete(part);
    setDeleteDialogOpen(true);
  }, []);

  // ✅ NAVIGATION HANDLERS
  const handleEditPart = useCallback(
    (partId) => {
      navigate(`/app/edit-part/${partId}`);
    },
    [navigate]
  );

  const handleViewPart = useCallback(
    (partId) => {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("categoryId", selectedCategory.id);
      if (selectedSubcategory)
        params.set("subcategoryId", selectedSubcategory.id);

      const url = `/app/part/${partId}${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      navigate(url);
    },
    [navigate, selectedCategory, selectedSubcategory]
  );

  const handleAddPart = useCallback(() => {
    const searchParamsUrl = new URLSearchParams();
    if (selectedCategory)
      searchParamsUrl.set("categoryId", selectedCategory.id);
    if (selectedSubcategory)
      searchParamsUrl.set("subcategoryId", selectedSubcategory.id);

    const url = `/app/add-part${
      searchParamsUrl.toString() ? `?${searchParamsUrl.toString()}` : ""
    }`;
    navigate(url);
  }, [navigate, selectedCategory, selectedSubcategory]);

  // ✅ CATEGORY NAVIGATION HANDLERS - MODIFICADOS para atualizar URL
  const handleTabChange = useCallback(
    (value) => {
      setActiveTab(value);
      setError(null);

      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("tab", value);

      if (value === "all") {
        setSelectedCategory(null);
        setSelectedSubcategory(null);
        newSearchParams.delete("categoryId");
        newSearchParams.delete("subcategoryId");
      }

      setSearchParams(newSearchParams);
    },
    [searchParams, setSearchParams]
  );

  const handleCategoryClick = useCallback(
    (category) => {
      setSelectedCategory(category);
      setSelectedSubcategory(null);
      setError(null);

      // ✅ NOVO: Atualizar URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("tab", "categories");
      newSearchParams.set("categoryId", category.id);
      newSearchParams.delete("subcategoryId");
      setSearchParams(newSearchParams);
    },
    [searchParams, setSearchParams]
  );

  const handleSubcategoryClick = useCallback(
    (subcategory) => {
      setSelectedSubcategory(subcategory);
      setError(null);

      // ✅ NOVO: Atualizar URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set("tab", "categories");
      newSearchParams.set("categoryId", selectedCategory.id);
      newSearchParams.set("subcategoryId", subcategory.id);
      setSearchParams(newSearchParams);
    },
    [selectedCategory, searchParams, setSearchParams]
  );

  const handleBackToCategories = useCallback(() => {
    setError(null);
    const newSearchParams = new URLSearchParams(searchParams);

    if (selectedSubcategory) {
      setSelectedSubcategory(null);
      newSearchParams.delete("subcategoryId");
    } else {
      setSelectedCategory(null);
      setSubcategoryCounts({});
      newSearchParams.delete("categoryId");
      newSearchParams.delete("subcategoryId");
    }

    setSearchParams(newSearchParams);
  }, [selectedSubcategory, searchParams, setSearchParams]);

  // ✅ LOAD SUBCATEGORY COUNTS
  const loadSubcategoryCounts = useCallback(
    async (categoryId) => {
      if (!categoryId) return;

      try {
        const counts = await fetchSubcategoryCounts(categoryId);
        setSubcategoryCounts(counts);
      } catch (err) {
        // Ignorar erro silenciosamente
      }
    },
    [fetchSubcategoryCounts]
  );

  // ✅ EFFECT para carregar contadores quando categoria é selecionada
  useEffect(() => {
    if (selectedCategory) {
      loadSubcategoryCounts(selectedCategory.id);
    }
  }, [selectedCategory, loadSubcategoryCounts]);

  const getSubcategories = useCallback(
    (categoryId) => {
      return getSubcategoriesByParent(categoryId).sort((a, b) =>
        a.name.localeCompare(b.name, "pt-PT")
      );
    },
    [getSubcategoriesByParent]
  );

  // ✅ MEMOIZED VALUES
  const sortedCategories = useMemo(
    () => categories.sort((a, b) => a.name.localeCompare(b.name, "pt-PT")),
    [categories]
  );

  const totalPartsCount = useMemo(() => getTotalCount(), [getTotalCount]);

  const hasActiveFilters = useMemo(
    () =>
      searchTerm ||
      filterCategory !== "all" ||
      sortField !== "name" ||
      sortOrder !== "asc",
    [searchTerm, filterCategory, sortField, sortOrder]
  );

  // ✅ EARLY RETURNS
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
            Biblioteca de Peças
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Gerencie todas as peças disponíveis no sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/app/manage-categories")}
            variant="outline"
            className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
          >
            <Tag className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Gerenciar </span>Categorias
          </Button>
          <Button
            onClick={handleAddPart}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Peça
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="Total de Peças"
          value={totalPartsCount?.toLocaleString("pt-PT") || 0}
          icon={Package}
          color="text-green-500"
          loading={countersLoading}
        />
        <StatsCard
          title="Categorias"
          value={sortedCategories.length}
          icon={Tag}
          color="text-blue-500"
          loading={false}
        />
        <StatsCard
          title="Subcategorias"
          value={categories.reduce(
            (total, cat) => total + getSubcategoriesByParent(cat.id).length,
            0
          )}
          icon={Book}
          color="text-purple-500"
          loading={false}
        />
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
          {/* Search and Filters */}
          <Card className="bg-zinc-800 border-zinc-700">
            <CardContent className="space-y-4 p-4 sm:p-6">
              {/* Search Input */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  placeholder="Buscar por nome, código ou descrição (mín. 2 caracteres)..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-10 w-full bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
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
                    onClick={handleClearSearch}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-zinc-700"
                  >
                    <X className="h-4 w-4 text-zinc-400" />
                  </Button>
                )}
              </div>

              {/* Filter Controls */}
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
                    {sortedCategories.length > 0 ? (
                      sortedCategories.map((category) => (
                        <SelectItem
                          key={category.id}
                          value={category.id}
                          className="text-white hover:bg-zinc-700"
                        >
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem
                        value="no-categories"
                        disabled
                        className="text-zinc-500 hover:bg-zinc-700"
                      >
                        Nenhuma categoria encontrada
                      </SelectItem>
                    )}
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

              {/* No Categories Warning */}
              {sortedCategories.length === 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="text-amber-400 text-sm flex-1">
                      Nenhuma categoria encontrada. Crie categorias primeiro
                      para organizar melhor suas peças.
                    </span>
                    <Button
                      size="sm"
                      onClick={() => navigate("/app/manage-categories")}
                      className="bg-purple-600 hover:bg-purple-700 text-white h-7 px-3"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      Criar Categoria
                    </Button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 justify-between">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                    }
                    className="gap-2 text-white border-zinc-700 hover:bg-zinc-700 bg-green-600"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    {sortOrder === "asc" ? "Crescente" : "Decrescente"}
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
                    className="gap-2 text-white border-zinc-700 hover:bg-zinc-700 bg-zinc-600"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => navigate("/app/manage-categories")}
                    className="gap-2 text-white bg-purple-600 border-purple-600 hover:bg-purple-700"
                  >
                    <Tag className="w-4 h-4" />
                    <span className="hidden sm:inline">Gerenciar </span>
                    Categorias
                  </Button>

                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={handleClearAllFilters}
                      className="gap-2 text-white bg-amber-600 border-amber-600 hover:bg-amber-600/20"
                    >
                      <X className="w-4 h-4" />
                      Limpar Filtros
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-400">
                    {!shouldLoadParts ? (
                      "Digite pelo menos 2 caracteres ou use filtros"
                    ) : (
                      <>
                        {displayParts.length} peça(s) encontrada(s)
                        {hasMore && <span className="text-zinc-500"> (+)</span>}
                      </>
                    )}
                  </span>
                  <Badge className="bg-green-500/10 text-green-500 text-xs flex items-center gap-1">
                    <Zap className="h-2 w-2" />
                    Lazy
                  </Badge>
                </div>
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

          {/* ✅ LAZY LOADING STATE */}
          {!shouldLoadParts ? (
            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="p-8 text-center">
                <Search className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2 text-white">
                  Busca Inteligente Ativada
                </p>
                <p className="text-zinc-400 mb-4">
                  Digite pelo menos 2 caracteres na busca ou selecione um filtro
                  para ver as peças
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                  <Badge className="bg-green-500/10 text-green-500">
                    <Zap className="h-3 w-3 mr-1" />
                    Zero Requests Firebase
                  </Badge>
                  <Badge className="bg-blue-500/10 text-blue-500">
                    Performance Otimizada
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    onClick={handleAddPart}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Peça
                  </Button>
                  <Button
                    onClick={() => navigate("/app/manage-categories")}
                    variant="outline"
                    className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                  >
                    <Tag className="w-4 h-4 mr-2" />
                    Gerenciar Categorias
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Loading State */}
              {isCacheLoading() && displayParts.length === 0 && (
                <Card className="bg-zinc-800 border-zinc-700">
                  <CardContent className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
                    <p className="text-white">Carregando peças...</p>
                  </CardContent>
                </Card>
              )}

              {/* Parts Display */}
              {displayParts.length > 0 && (
                <>
                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {displayParts.map((part) => (
                        <PartCard
                          key={part.id}
                          part={part}
                          viewMode={viewMode}
                          onEdit={handleEditPart}
                          onDelete={confirmDelete}
                          onView={handleViewPart}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {displayParts.map((part) => (
                        <PartCard
                          key={part.id}
                          part={part}
                          viewMode={viewMode}
                          onEdit={handleEditPart}
                          onDelete={confirmDelete}
                          onView={handleViewPart}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Empty State */}
              {displayParts.length === 0 &&
                !isCacheLoading() &&
                shouldLoadParts && (
                  <Card className="bg-zinc-800 border-zinc-700">
                    <CardContent className="p-8 sm:p-12 text-center">
                      <Search className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2 text-white">
                        Nenhuma peça encontrada
                      </p>
                      <p className="text-sm sm:text-base text-zinc-400 mb-4">
                        Tente ajustar seus critérios de busca ou adicione uma
                        nova peça
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {hasActiveFilters && (
                          <Button
                            onClick={handleClearAllFilters}
                            className="bg-amber-600 hover:bg-amber-700"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Limpar Filtros
                          </Button>
                        )}
                        <Button
                          onClick={handleAddPart}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Nova Peça
                        </Button>
                        <Button
                          onClick={() => navigate("/app/manage-categories")}
                          variant="outline"
                          className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                        >
                          <Tag className="w-4 h-4 mr-2" />
                          Gerenciar Categorias
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
            </>
          )}
        </TabsContent>

        {/* Categories Tab */}
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

            {/* Search for categories */}
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
                className="pl-10 w-full bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
              />
            </div>

            {/* ✅ 1. CATEGORIAS PRINCIPAIS */}
            {!selectedCategory && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedCategories
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

            {/* ✅ 2. SUBCATEGORIAS */}
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

            {/* ✅ 3. PEÇAS DA SUBCATEGORIA */}
            {selectedSubcategory && (
              <>
                {/* ✅ NOVO: Botão refresh para peças da subcategoria */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Peças em {selectedSubcategory.name}
                  </h3>
                  <Button
                    onClick={handleRefresh}
                    variant="outline"
                    size="sm"
                    className="gap-2 text-white border-zinc-700 hover:bg-zinc-700 bg-zinc-600"
                    disabled={isCacheLoading()}
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${
                        isCacheLoading() ? "animate-spin" : ""
                      }`}
                    />
                    Atualizar Peças
                  </Button>
                </div>

                {isCacheLoading() && displayParts.length === 0 ? (
                  <Card className="bg-zinc-800 border-zinc-700">
                    <CardContent className="p-8 text-center">
                      <Loader2 className="w-8 w-8 animate-spin text-white mx-auto mb-4" />
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
                            onClick={() => {
                              const params = new URLSearchParams();
                              if (selectedCategory)
                                params.set("categoryId", selectedCategory.id);
                              if (selectedSubcategory)
                                params.set(
                                  "subcategoryId",
                                  selectedSubcategory.id
                                );

                              const url = `/app/part/${part.id}${
                                params.toString() ? `?${params.toString()}` : ""
                              }`;
                              navigate(url);
                            }}
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
                        onClick={handleAddPart}
                        className="mt-4 bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Peça
                        <span className="ml-1 text-xs bg-green-800 px-1 rounded">
                          +
                        </span>
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
                onClick={handleAddPart}
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
              ? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
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
          className="rounded-full shadow-lg bg-zinc-700 hover:bg-zinc-600"
          title="Atualizar"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
        <Button
          onClick={() => navigate("/app/manage-categories")}
          size="icon"
          className="rounded-full shadow-lg bg-purple-600 hover:bg-purple-700"
          title="Gerenciar Categorias"
        >
          <Tag className="h-5 w-5" />
        </Button>
        <Button
          onClick={handleAddPart}
          size="icon"
          className="rounded-full shadow-lg bg-green-600 hover:bg-green-700"
          title="Nova Peça"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default React.memo(ManagePartsLibrary);
