// ManagePartsLibrary.jsx
// Biblioteca de Peças — todas as peças vêm do catálogo estático HOMAG (ver
// src/utils/partsCatalogLoader.js). Categoria/subcategoria são a única
// coisa editável por peça, guardadas à parte (src/services/partCategoryAssignments.js).
// Não há mais conceito de "peça gerida" na Firestore, nem criar/editar/apagar
// peças a partir daqui — só atribuir classificação.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCategories } from "../../context/CategoriesContext.jsx";
import { useCatalogParts } from "../../hooks/useCatalogParts.js";
import { comparePtPt } from "../../utils/sortHelpers.js";
import PartImage from "../../components/ui/PartImage.jsx";
import AssignPartCategoryDialog from "./components/AssignPartCategoryDialog.jsx";
import {
  Search,
  Loader2,
  Tag,
  MoreVertical,
  RefreshCw,
  Book,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Grid,
  List,
  X,
  Wand2,
  Package,
  AlertTriangle,
} from "lucide-react";

// UI Components
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
import { PageHeader, StatCard } from "../../components/app";

const STORAGE_KEYS = {
  SEARCH_TERM: "parts_search",
  FILTER_CATEGORY: "parts_filter",
  FILTER_CLASSIFIED: "parts_filter_classified",
  SORT_FIELD: "parts_sort",
  VIEW_MODE: "parts_view",
  ACTIVE_TAB: "parts_tab",
};

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

const PAGE_SIZE = 24;

// ✅ Miniatura da peça com zoom ao passar o rato: a imagem cresce por cima
// do resto do cartão e volta ao tamanho normal quando o rato sai. Só há
// zoom quando a peça tem imagem — ampliar a imagem genérica não serve de nada.
const ZOOM_CLASSES =
  "transition-transform duration-200 ease-out hover:z-30 hover:scale-[3] hover:shadow-2xl hover:ring-1 hover:ring-border";

const ZoomablePartImage = ({ part, sizeClassName }) => (
  <div className={`relative shrink-0 ${sizeClassName}`}>
    <div
      className={`absolute inset-0 rounded-lg overflow-hidden bg-muted/50 origin-left ${
        part.image ? ZOOM_CLASSES : ""
      }`}
    >
      <PartImage
        src={part.image}
        imageHash={part.imageHash}
        alt={part.name}
        className="w-full h-full object-contain"
        defaultImage="/default-part.png"
      />
    </div>
  </div>
);

// ✅ PART CARD — todas as peças vêm do catálogo; a única ação é atribuir categoria.
const PartCard = React.memo(({ part, viewMode, onAssign, onView }) => {
  const handleAssign = useCallback(
    (e) => {
      e.stopPropagation();
      onAssign(part);
    },
    [part, onAssign]
  );

  const handleView = useCallback(() => {
    onView(part.id);
  }, [part.id, onView]);

  const categoryBadge = part.categoryName ? (
    <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
      {part.categoryName}
      {part.subcategoryName ? ` / ${part.subcategoryName}` : ""}
    </Badge>
  ) : (
    <Badge className="bg-muted text-muted-foreground hover:bg-accent">
      Sem categoria
    </Badge>
  );

  const actionsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={handleAssign}
          className="cursor-pointer"
        >
          <Tag className="w-4 h-4 mr-2" />
          Atribuir Categoria
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (viewMode === "list") {
    return (
      <Card
        onClick={handleView}
        className="hover:bg-accent transition-colors cursor-pointer"
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <ZoomablePartImage part={part} sizeClassName="h-16 w-16" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base text-foreground truncate">
                {part.name}
              </h3>
              <p className="text-muted-foreground text-xs truncate">
                Código: {part.code}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {categoryBadge}
              {actionsMenu}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      onClick={handleView}
      className="hover:bg-accent transition-colors cursor-pointer"
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <ZoomablePartImage part={part} sizeClassName="h-20 w-20 sm:h-24 sm:w-24" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base sm:text-lg text-foreground truncate">
                {part.name}
              </h3>
              <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">
                {part.code}
              </Badge>
            </div>
          </div>
          {actionsMenu}
        </div>
        <div className="mt-3">{categoryBadge}</div>
      </CardContent>
    </Card>
  );
});

PartCard.displayName = "PartCard";

// ✅ STATS CARD
// Cartão de número — usa o StatCard partilhado (cor antiga → tom).
const toneFromColor = (color = "") =>
  /blue/.test(color) ? "info" : /purple|violet/.test(color) ? "violet" : /red/.test(color) ? "danger" : /yellow|amber|orange/.test(color) ? "warning" : "default";
const StatsCard = React.memo(({ title, value, icon, color, loading }) => (
  <StatCard label={title} value={value} icon={icon} tone={toneFromColor(color)} loading={loading} />
));

StatsCard.displayName = "StatsCard";

const ManagePartsLibrary = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    categories,
    getSubcategoriesByParent,
    isLoading: categoriesLoading,
  } = useCategories();

  const {
    parts: catalogParts,
    loading: catalogLoading,
    error: catalogError,
    total,
    classifiedCount,
    refresh: refreshCatalog,
  } = useCatalogParts();

  const [error, setError] = useState(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [partToAssign, setPartToAssign] = useState(null);

  const [searchTerm, setSearchTerm] = useState(() =>
    loadFromStorage(STORAGE_KEYS.SEARCH_TERM, "")
  );
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(() =>
    loadFromStorage(STORAGE_KEYS.SEARCH_TERM, "")
  );
  const [filterCategory, setFilterCategory] = useState(() => {
    const saved = loadFromStorage(STORAGE_KEYS.FILTER_CATEGORY, "all");
    // Valores antigos, de quando "com/sem categoria" estavam nesta lista.
    return saved === "with-category" || saved === "without-category" ? "all" : saved;
  });
  // "all" | "with" | "without" — peças com / sem categoria atribuída.
  const [filterClassified, setFilterClassified] = useState(() =>
    loadFromStorage(STORAGE_KEYS.FILTER_CLASSIFIED, "all")
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

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [allTabPage, setAllTabPage] = useState(1);

  // Ler URL e restaurar estado
  useEffect(() => {
    const tab = searchParams.get("tab");
    const categoryId = searchParams.get("categoryId");
    const subcategoryId = searchParams.get("subcategoryId");

    if (tab) setActiveTab(tab);

    if (tab === "categories" && categoryId && categories.length > 0) {
      const category = categories.find((cat) => cat.id === categoryId);
      if (category) {
        setSelectedCategory(category);
        if (subcategoryId) {
          const subcategories = getSubcategoriesByParent(categoryId);
          const subcategory = subcategories.find(
            (sub) => sub.id === subcategoryId
          );
          if (subcategory) setSelectedSubcategory(subcategory);
        }
      }
    }
  }, [searchParams, categories, getSubcategoriesByParent]);

  useEffect(
    () => saveToStorage(STORAGE_KEYS.SEARCH_TERM, searchTerm),
    [searchTerm]
  );
  useEffect(
    () => saveToStorage(STORAGE_KEYS.FILTER_CATEGORY, filterCategory),
    [filterCategory]
  );
  useEffect(
    () => saveToStorage(STORAGE_KEYS.FILTER_CLASSIFIED, filterClassified),
    [filterClassified]
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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ✅ Filtro/busca/ordenação — tudo em memória, sobre o catálogo já carregado
  const filteredParts = useMemo(() => {
    const term = debouncedSearchTerm.trim().toLowerCase();
    let list = catalogParts;

    if (filterClassified === "with") {
      list = list.filter((p) => p.categoryId);
    } else if (filterClassified === "without") {
      list = list.filter((p) => !p.categoryId);
    }

    // Uma categoria concreta não faz sentido junto com "sem categoria".
    if (filterCategory !== "all" && filterClassified !== "without") {
      list = list.filter((p) => p.categoryId === filterCategory);
    }

    if (term) {
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.code?.toLowerCase().includes(term) ||
          p.relatedCodes?.some((c) => c.toLowerCase().includes(term))
      );
    }

    return [...list].sort((a, b) => {
      let result = 0;
      if (sortField === "name") {
        result = comparePtPt(a.name, b.name);
      } else if (sortField === "code") {
        result = comparePtPt(a.code, b.code);
      }
      return sortOrder === "asc" ? result : -result;
    });
  }, [catalogParts, filterCategory, filterClassified, debouncedSearchTerm, sortField, sortOrder]);

  useEffect(() => {
    setAllTabPage(1);
  }, [debouncedSearchTerm, filterCategory, filterClassified, sortField, sortOrder]);

  const allTabTotalPages = Math.max(
    1,
    Math.ceil(filteredParts.length / PAGE_SIZE)
  );

  const paginatedParts = useMemo(() => {
    const start = (allTabPage - 1) * PAGE_SIZE;
    return filteredParts.slice(start, start + PAGE_SIZE);
  }, [filteredParts, allTabPage]);

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
    setFilterClassified("all");
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSortField("name");
    setSortOrder("asc");
    setError(null);
  }, []);

  const handleRefresh = useCallback(() => {
    refreshCatalog();
  }, [refreshCatalog]);

  const openAssignDialog = useCallback((part) => {
    setPartToAssign(part);
    setAssignDialogOpen(true);
  }, []);

  const handleAssignSaved = useCallback(() => {
    refreshCatalog();
  }, [refreshCatalog]);

  const handleViewPart = useCallback(
    (partId) => {
      navigate(`/app/part/${encodeURIComponent(partId)}`);
    },
    [navigate]
  );

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
      newSearchParams.delete("categoryId");
      newSearchParams.delete("subcategoryId");
    }

    setSearchParams(newSearchParams);
  }, [selectedSubcategory, searchParams, setSearchParams]);

  const getSubcategories = useCallback(
    (categoryId) => {
      return getSubcategoriesByParent(categoryId).sort((a, b) =>
        comparePtPt(a.name, b.name)
      );
    },
    [getSubcategoriesByParent]
  );

  const sortedCategories = useMemo(
    () => categories.slice().sort((a, b) => comparePtPt(a.name, b.name)),
    [categories]
  );

  const hasActiveFilters = useMemo(
    () =>
      searchTerm ||
      filterCategory !== "all" ||
      filterClassified !== "all" ||
      sortField !== "name" ||
      sortOrder !== "asc",
    [searchTerm, filterCategory, filterClassified, sortField, sortOrder]
  );

  // Peças por categoria/subcategoria (em memória, calculado a cada render dos dados)
  const partsInCategory = useCallback(
    (categoryId) => catalogParts.filter((p) => p.categoryId === categoryId),
    [catalogParts]
  );

  const partsInSubcategory = useCallback(
    (subcategoryId) =>
      catalogParts.filter((p) => p.subcategoryId === subcategoryId),
    [catalogParts]
  );

  if (categoriesLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  const currentCategoryParts = selectedCategory
    ? partsInCategory(selectedCategory.id).filter((p) => !p.subcategoryId)
    : [];
  const currentSubcategoryParts = selectedSubcategory
    ? partsInSubcategory(selectedSubcategory.id).filter((p) =>
        debouncedSearchTerm
          ? p.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            p.code?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
          : true
      )
    : [];

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <PageHeader
        icon={Book}
        title="Biblioteca de Peças"
        description="Catálogo HOMAG — atribua categorias às peças"
        actions={
          <>
            <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => navigate("/app/parts-classification-rules")}
              variant="outline"
              className="bg-muted"
            >
              <Wand2 className="w-4 h-4" />
              <span className="hidden sm:inline">Regras de </span>Classificação
            </Button>
            <Button
              onClick={() => navigate("/app/manage-categories")}
              variant="outline"
              className="bg-purple-600 hover:bg-purple-700 border-purple-600"
            >
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">Gerenciar </span>Categorias
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="bg-muted"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="Total de Peças (Catálogo HOMAG)"
          value={total.toLocaleString("pt-PT")}
          icon={Package}
          color="text-green-500"
          loading={catalogLoading}
        />
        <StatsCard
          title="Com Categoria Atribuída"
          value={classifiedCount.toLocaleString("pt-PT")}
          icon={Tag}
          color="text-blue-500"
          loading={catalogLoading}
        />
        <StatsCard
          title="Categorias"
          value={sortedCategories.length}
          icon={Book}
          color="text-purple-500"
          loading={false}
        />
      </div>

      {catalogError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar catálogo: {catalogError}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
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
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou código..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-10 w-full [&::placeholder]:text-muted-foreground"
                />
                {searchTerm !== debouncedSearchTerm && (
                  <div className="absolute right-10 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSearch}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>

              {/* Com / sem categoria — botões à parte, para não se perderem no meio das categorias */}
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Classificação das peças">
                {[
                  ["all", "Todas as peças", total],
                  ["with", "Com categoria", classifiedCount],
                  ["without", "Sem categoria", total - classifiedCount],
                ].map(([value, label, count]) => {
                  const active = filterClassified === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilterClassified(value)}
                      aria-pressed={active}
                      className={`rounded-lg border-2 px-2 py-2.5 text-center transition-colors ${
                        active
                          ? value === "without"
                            ? "border-amber-500 bg-amber-500/15 text-amber-300"
                            : "border-green-500 bg-green-500/15 text-green-300"
                          : "border-border bg-muted/50 text-foreground/90 hover:bg-accent"
                      }`}
                    >
                      <span className="block text-sm sm:text-base font-semibold">{label}</span>
                      <span className="block text-xs opacity-80">
                        {catalogLoading ? "…" : count.toLocaleString("pt-PT")}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  value={filterCategory}
                  onValueChange={setFilterCategory}
                  disabled={filterClassified === "without"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      Todas as Categorias
                    </SelectItem>
                    {sortedCategories.length > 0 ? (
                      sortedCategories.map((category) => (
                        <SelectItem
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem
                        value="no-categories"
                        disabled
                        className="text-muted-foreground"
                      >
                        Nenhuma categoria encontrada
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                <Select value={sortField} onValueChange={setSortField}>
                  <SelectTrigger>
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">
                      Nome
                    </SelectItem>
                    <SelectItem value="code">
                      Código
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {sortedCategories.length === 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="text-amber-400 text-sm flex-1">
                      Nenhuma categoria encontrada. Crie categorias primeiro
                      para organizar melhor as peças.
                    </span>
                    <Button
                      size="sm"
                      onClick={() => navigate("/app/manage-categories")}
                      className="bg-purple-600 hover:bg-purple-700 h-7 px-3"
                    >
                      <Tag className="h-3 w-3" />
                      Criar Categoria
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 justify-between">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                    }
                    className="gap-2 bg-primary"
                  >
                    {sortOrder === "asc" ? "Crescente" : "Decrescente"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setViewMode("grid")}
                    className={`gap-2 text-foreground border-border hover:bg-accent ${
                      viewMode === "grid" ? "bg-muted" : "bg-transparent"
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setViewMode("list")}
                    className={`gap-2 text-foreground border-border hover:bg-accent ${
                      viewMode === "list" ? "bg-muted" : "bg-transparent"
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </Button>

                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={handleClearAllFilters}
                      className="gap-2 bg-amber-600 border-amber-600 hover:bg-amber-600/20"
                    >
                      <X className="w-4 h-4" />
                      Limpar Filtros
                    </Button>
                  )}
                </div>

                <span className="text-sm text-muted-foreground self-center">
                  {filteredParts.length.toLocaleString("pt-PT")} peça(s) encontrada(s)
                </span>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex-1">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {catalogLoading && filteredParts.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-foreground mx-auto mb-4" />
                <p className="text-foreground">Carregando peças...</p>
              </CardContent>
            </Card>
          )}

          {paginatedParts.length > 0 && (
            <>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedParts.map((part) => (
                    <PartCard
                      key={part.id}
                      part={part}
                      viewMode={viewMode}
                      onAssign={openAssignDialog}
                      onView={handleViewPart}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {paginatedParts.map((part) => (
                    <PartCard
                      key={part.id}
                      part={part}
                      viewMode={viewMode}
                      onAssign={openAssignDialog}
                      onView={handleViewPart}
                    />
                  ))}
                </div>
              )}

              {allTabTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={allTabPage === 1}
                    onClick={() => setAllTabPage((p) => Math.max(1, p - 1))}
                    className="disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {allTabPage} de {allTabTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={allTabPage === allTabTotalPages}
                    onClick={() =>
                      setAllTabPage((p) => Math.min(allTabTotalPages, p + 1))
                    }
                    className="disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}

          {filteredParts.length === 0 && !catalogLoading && (
            <Card>
              <CardContent className="p-8 sm:p-12 text-center">
                <Search className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/70 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2 text-foreground">
                  Nenhuma peça encontrada
                </p>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">
                  Tente ajustar os critérios de busca
                </p>
                {hasActiveFilters && (
                  <Button
                    onClick={handleClearAllFilters}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <X className="w-4 h-4" />
                    Limpar Filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <div className="space-y-4">
            {(selectedCategory || selectedSubcategory) && (
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToCategories}
                  className="h-8 bg-accent"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Voltar
                </Button>
                <span className="text-muted-foreground">
                  {selectedSubcategory
                    ? `${selectedCategory.name} > ${selectedSubcategory.name}`
                    : selectedCategory
                    ? selectedCategory.name
                    : "Categorias"}
                </span>
              </div>
            )}

            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
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
                className="pl-10 w-full [&::placeholder]:text-muted-foreground"
              />
            </div>

            {/* Categorias principais */}
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
                      className="hover:bg-accent transition-colors cursor-pointer"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Tag className="h-5 w-5 text-blue-500" />
                            <h3 className="font-semibold text-base text-foreground">
                              {category.name}
                            </h3>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground text-sm mt-2">
                          {getSubcategories(category.id).length} subcategorias
                          {" • "}
                          {partsInCategory(category.id).length} peça(s)
                        </p>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}

            {/* Subcategorias */}
            {selectedCategory && !selectedSubcategory && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getSubcategories(selectedCategory.id)
                    .filter((sub) =>
                      sub.name.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((subcategory) => (
                      <Card
                        key={subcategory.id}
                        onClick={() => handleSubcategoryClick(subcategory)}
                        className="hover:bg-accent transition-colors cursor-pointer"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Package className="h-5 w-5 text-purple-500" />
                              <h3 className="font-semibold text-base text-foreground">
                                {subcategory.name}
                              </h3>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground text-sm mt-2">
                            {partsInSubcategory(subcategory.id).length} peça(s)
                          </p>
                        </CardContent>
                      </Card>
                    ))}

                  {getSubcategories(selectedCategory.id).length === 0 && (
                    <Card className="md:col-span-2 lg:col-span-3">
                      <CardContent className="p-8 text-center">
                        <Package className="w-10 h-10 text-muted-foreground/70 mx-auto mb-4" />
                        <p className="text-lg font-medium mb-2 text-foreground">
                          Nenhuma subcategoria encontrada
                        </p>
                        <p className="text-sm text-muted-foreground">
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
                          <Tag className="w-4 h-4" />
                          Adicionar Subcategoria
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Peças classificadas nesta categoria mas sem subcategoria */}
                {currentCategoryParts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-foreground">
                      Peças sem subcategoria em {selectedCategory.name}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {currentCategoryParts.map((part) => (
                        <PartCard
                          key={part.id}
                          part={part}
                          viewMode="grid"
                          onAssign={openAssignDialog}
                          onView={handleViewPart}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Peças da subcategoria */}
            {selectedSubcategory && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Peças em {selectedSubcategory.name}
                  </h3>
                  <Button
                    onClick={handleRefresh}
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-accent"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Atualizar
                  </Button>
                </div>

                {currentSubcategoryParts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentSubcategoryParts.map((part) => (
                      <PartCard
                        key={part.id}
                        part={part}
                        viewMode="grid"
                        onAssign={openAssignDialog}
                        onView={handleViewPart}
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Package className="w-10 h-10 text-muted-foreground/70 mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2 text-foreground">
                        Nenhuma peça encontrada
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Esta subcategoria ainda não tem peças atribuídas. Vá a
                        &ldquo;Todas as Peças&rdquo; para atribuir categorias.
                      </p>
                      <Button
                        onClick={() => handleTabChange("all")}
                        className="mt-4"
                      >
                        Ver Todas as Peças
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                onClick={() => navigate("/app/add-category")}
              >
                <Tag className="w-4 h-4" />
                Nova Categoria
              </Button>

              <Button
                onClick={() => navigate("/app/manage-categories")}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Tag className="w-4 h-4" />
                Gerenciar Categorias
              </Button>

              {selectedCategory && (
                <Button
                  onClick={() =>
                    navigate(`/app/add-subcategory/${selectedCategory.id}`)
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Tag className="w-4 h-4" />
                  Nova Subcategoria
                </Button>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <AssignPartCategoryDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        part={partToAssign}
        onSaved={handleAssignSaved}
      />
    </div>
  );
};

export default React.memo(ManagePartsLibrary);
