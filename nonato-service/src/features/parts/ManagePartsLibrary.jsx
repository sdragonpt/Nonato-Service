// ManagePartsLibrary.jsx - OTIMIZADO com paginação real Firestore

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  where,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useNavigate } from "react-router-dom";
import { useCategories } from "../../context/CategoriesContext.jsx";
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
  ChevronLeft,
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";

const ManagePartsLibrary = () => {
  // NOVA ESTRUTURA - Paginação Real
  const [parts, setParts] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Estados de busca e filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortField, setSortField] = useState("name");
  const [filterCategory, setFilterCategory] = useState("all");

  // Estados UI
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partToDelete, setPartToDelete] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [activeTab, setActiveTab] = useState("all");

  // PAGINAÇÃO REAL
  const itemsPerPage = 20;

  const navigate = useNavigate();

  // Cache de categorias
  const {
    categories,
    getSubcategoriesByParent,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

  // ✅ DEBOUNCE para busca - evita consultas excessivas
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ✅ FUNÇÃO OTIMIZADA - só busca uma página por vez
  const fetchParts = useCallback(
    async (reset = false) => {
      try {
        setIsLoading(true);
        setError(null);

        // Construir query base
        let q = query(collection(db, "pecas"));

        // Aplicar filtros se necessário
        if (filterCategory !== "all") {
          q = query(q, where("categoryId", "==", filterCategory));
        }

        // ✅ NOVA LÓGICA DE BUSCA - buscar em todos os documentos quando há termo de busca
        if (debouncedSearchTerm) {
          // Quando há busca, não aplicamos paginação para encontrar todos os resultados
          console.log("Busca ativa:", debouncedSearchTerm);

          // Buscar TODOS os documentos que correspondem aos filtros (sem limit)
          const searchQuery = query(q, orderBy(sortField, sortOrder));
          const searchSnapshot = await getDocs(searchQuery);

          // Filtrar localmente pelos termos de busca
          const allParts = searchSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          const filteredParts = allParts.filter(
            (part) =>
              part.name
                ?.toLowerCase()
                .includes(debouncedSearchTerm.toLowerCase()) ||
              part.code
                ?.toLowerCase()
                .includes(debouncedSearchTerm.toLowerCase()) ||
              part.description
                ?.toLowerCase()
                .includes(debouncedSearchTerm.toLowerCase())
          );

          setParts(filteredParts);
          setHasMore(false); // Não há mais para carregar quando está pesquisando
          setLastVisible(null);

          setIsLoading(false);
          return;
        }

        // Aplicar ordenação
        q = query(q, orderBy(sortField, sortOrder));

        // Aplicar paginação APENAS quando NÃO há busca
        if (lastVisible && !reset) {
          q = query(q, startAfter(lastVisible));
        }

        q = query(q, limit(itemsPerPage));

        const snapshot = await getDocs(q);
        const partsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (reset) {
          setParts(partsData);
        } else {
          setParts((prev) => [...prev, ...partsData]);
        }

        // Atualizar cursor para próxima página
        if (snapshot.docs.length > 0) {
          setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        }

        // Verificar se há mais páginas
        setHasMore(snapshot.docs.length === itemsPerPage);
      } catch (err) {
        console.error("Erro ao buscar peças:", err);
        setError("Erro ao carregar peças. Por favor, tente novamente.");

        // Fallback sem ordenação
        if (
          err.code === "failed-precondition" ||
          err.message.includes("index")
        ) {
          try {
            let fallbackQuery = query(collection(db, "pecas"));

            if (filterCategory !== "all") {
              fallbackQuery = query(
                fallbackQuery,
                where("categoryId", "==", filterCategory)
              );
            }

            // Se há busca, buscar todos os documentos
            if (debouncedSearchTerm) {
              const fallbackSnapshot = await getDocs(fallbackQuery);
              const allParts = fallbackSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));

              const filteredParts = allParts.filter(
                (part) =>
                  part.name
                    ?.toLowerCase()
                    .includes(debouncedSearchTerm.toLowerCase()) ||
                  part.code
                    ?.toLowerCase()
                    .includes(debouncedSearchTerm.toLowerCase()) ||
                  part.description
                    ?.toLowerCase()
                    .includes(debouncedSearchTerm.toLowerCase())
              );

              setParts(filteredParts);
              setHasMore(false);
              setLastVisible(null);
            } else {
              // Paginação normal para fallback
              if (lastVisible && !reset) {
                fallbackQuery = query(fallbackQuery, startAfter(lastVisible));
              }

              fallbackQuery = query(fallbackQuery, limit(itemsPerPage));

              const fallbackSnapshot = await getDocs(fallbackQuery);
              const fallbackData = fallbackSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));

              if (reset) {
                setParts(fallbackData);
              } else {
                setParts((prev) => [...prev, ...fallbackData]);
              }

              if (fallbackSnapshot.docs.length > 0) {
                setLastVisible(
                  fallbackSnapshot.docs[fallbackSnapshot.docs.length - 1]
                );
              }

              setHasMore(fallbackSnapshot.docs.length === itemsPerPage);
            }

            setError(
              "Ordenação temporariamente indisponível. Os dados estão sendo exibidos sem ordenação."
            );
          } catch (fallbackErr) {
            console.error("Erro na consulta de fallback:", fallbackErr);
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [sortField, sortOrder, filterCategory, debouncedSearchTerm, lastVisible]
  );

  // ✅ EFFECT OTIMIZADO - só recarrega quando necessário
  useEffect(() => {
    setParts([]);
    setLastVisible(null);
    setHasMore(true);
    fetchParts(true);
  }, [sortField, sortOrder, filterCategory, debouncedSearchTerm]);

  // ✅ FUNÇÃO PARA CARREGAR MAIS (sem recarregar tudo)
  const loadMore = () => {
    if (hasMore && !isLoading) {
      fetchParts(false);
    }
  };

  // ✅ FUNÇÃO OTIMIZADA PARA REFRESH
  const handleRefresh = () => {
    setParts([]);
    setLastVisible(null);
    setHasMore(true);
    setError(null);
    fetchParts(true);
  };

  // Função de deletar mantida igual
  const handleDelete = async (part) => {
    try {
      await deleteDoc(doc(db, "pecas", part.id));
      setParts((prev) => prev.filter((p) => p.id !== part.id));
      setDeleteDialogOpen(false);
      setPartToDelete(null);
    } catch (error) {
      console.error("Erro ao deletar peça:", error);
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

  // Handlers de mudança de filtros
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
  };

  const handleSubcategoryClick = (subcategory) => {
    setError(null);
    setSelectedSubcategory(subcategory);
  };

  const handleBackToCategories = () => {
    setError(null);
    if (selectedSubcategory) {
      setSelectedSubcategory(null);
    } else {
      setSelectedCategory(null);
    }
  };

  // Funções de categoria mantidas iguais
  const getSubcategories = (categoryId) => {
    return getSubcategoriesByParent(categoryId);
  };

  const getMainCategories = () => {
    return categories;
  };

  // ✅ FILTROS LOCAIS APLICADOS APENAS AOS DADOS JÁ CARREGADOS
  const getFilteredParts = () => {
    let filtered = parts;

    // Filtro por categoria selecionada (tab categories)
    if (activeTab === "categories") {
      if (selectedSubcategory) {
        filtered = filtered.filter(
          (part) => part.subcategoryId === selectedSubcategory.id
        );
      } else if (selectedCategory) {
        filtered = filtered.filter(
          (part) => part.categoryId === selectedCategory.id
        );
      }
    }

    // ✅ REMOVIDO: Busca local temporária - agora a busca é feita no servidor
    // A busca agora é feita diretamente na query do Firestore

    return filtered;
  };

  // ✅ FUNÇÃO PARA LIMPAR BUSCA
  const clearSearch = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
  };

  const displayParts = getFilteredParts();

  // Loading state
  if ((isLoading && !parts.length) || categoriesLoading) {
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
                Peças Carregadas
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {parts.length}
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

      {/* Tabs for All Parts vs Categories */}
      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={handleTabChange}
      >
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

              {/* Sort Order, View Mode, and Results Count */}
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <div className="flex gap-2">
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
                      {hasMore &&
                        " (há mais disponíveis - clique em 'Carregar Mais')"}
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

          {/* Parts Grid or List */}
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
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                        <AvatarImage src={part.image} alt={part.name} />
                        <AvatarFallback className="bg-zinc-700 text-white text-sm">
                          {part.name?.[0]?.toUpperCase() || "P"}
                        </AvatarFallback>
                      </Avatar>

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

                    {/* Price and Description */}
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

              {displayParts.length === 0 && !isLoading && (
                <Card className="md:col-span-2 lg:col-span-3 bg-zinc-800 border-zinc-700">
                  <CardContent className="p-8 sm:p-12 text-center">
                    <Search className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2 text-white">
                      Nenhuma peça encontrada
                    </p>
                    <p className="text-sm sm:text-base text-zinc-400">
                      Tente ajustar seus filtros ou adicione uma nova peça
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            // List view - usando displayParts
            <div className="mt-4 space-y-2">
              {displayParts.map((part) => (
                <Card
                  key={part.id}
                  onClick={() => navigate(`/app/part/${part.id}`)}
                  className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={part.image} alt={part.name} />
                        <AvatarFallback className="bg-zinc-700 text-white text-sm">
                          {part.name?.[0]?.toUpperCase() || "P"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0 flex items-center">
                        <div>
                          <h3 className="font-semibold text-base text-white truncate">
                            {part.name}
                          </h3>
                          <p className="text-zinc-400 text-xs truncate">
                            {part.categoryName || "Sem categoria"} • Código:{" "}
                            {part.code}
                          </p>
                        </div>
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

              {displayParts.length === 0 && !isLoading && (
                <Card className="bg-zinc-800 border-zinc-700">
                  <CardContent className="p-8 sm:p-12 text-center">
                    <Search className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2 text-white">
                      Nenhuma peça encontrada
                    </p>
                    <p className="text-sm sm:text-base text-zinc-400">
                      Tente ajustar seus filtros ou adicione uma nova peça
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ✅ NOVA PAGINAÇÃO COM "CARREGAR MAIS" - só aparece quando NÃO está pesquisando */}
          {hasMore && !debouncedSearchTerm && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={loadMore}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Carregar Mais ({itemsPerPage} itens)
                  </>
                )}
              </Button>
            </div>
          )}

          {!hasMore && parts.length > 0 && !debouncedSearchTerm && (
            <div className="text-center mt-8">
              <p className="text-zinc-400">
                Todas as peças foram carregadas ({parts.length} total)
              </p>
            </div>
          )}
        </TabsContent>

        {/* Categories Tab - MANTIDO IGUAL */}
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
                    : selectedCategory.name}
                </span>
              </div>
            )}

            {/* Search for Categories Tab */}
            {!selectedCategory && (
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  placeholder="Buscar categorias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
            )}

            {/* Display Main Categories */}
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

                {getMainCategories().filter((cat) =>
                  cat.name.toLowerCase().includes(searchTerm.toLowerCase())
                ).length === 0 && (
                  <Card className="md:col-span-2 lg:col-span-3 bg-zinc-800 border-zinc-700">
                    <CardContent className="p-8 text-center">
                      <Search className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
                      <p className="text-lg font-medium mb-2 text-white">
                        Nenhuma categoria encontrada
                      </p>
                      <p className="text-sm text-zinc-400">
                        Tente ajustar sua busca ou adicione uma nova categoria
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Display Parts in Subcategory */}
            {selectedSubcategory && (
              <div className="space-y-4">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input
                    placeholder="Buscar peças..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayParts
                    .filter(
                      (part) => part.subcategoryId === selectedSubcategory.id
                    )
                    .map((part) => (
                      <Card
                        key={part.id}
                        onClick={() => navigate(`/app/part/${part.id}`)}
                        className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={part.image} alt={part.name} />
                              <AvatarFallback className="bg-zinc-700 text-white text-sm">
                                {part.name?.[0]?.toUpperCase() || "P"}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-base text-white truncate">
                                  {part.name}
                                </h3>
                                <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">
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

                  {parts.filter(
                    (part) => part.subcategoryId === selectedSubcategory.id
                  ).length === 0 && (
                    <Card className="md:col-span-2 lg:col-span-3 bg-zinc-800 border-zinc-700">
                      <CardContent className="p-6 text-center">
                        <p className="text-zinc-400">
                          Nenhuma peça encontrada nesta subcategoria
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons for Categories Tab */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                onClick={() => navigate("/app/add-category")}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Categoria
              </Button>

              <Button
                onClick={() => navigate("/app/manage-categories")}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Tag className="w-4 h-4 mr-2" />
                Gerenciar Categorias
              </Button>

              {selectedCategory && (
                <Button
                  onClick={() =>
                    navigate(`/app/add-subcategory/${selectedCategory.id}`)
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Subcategoria
                </Button>
              )}

              <Button
                onClick={() => navigate("/app/add-part")}
                className={`${
                  selectedCategory || selectedSubcategory
                    ? "bg-purple-600 hover:bg-purple-700"
                    : "bg-zinc-600 hover:bg-zinc-700"
                } text-white`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Peça
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
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
                className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
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

      {/* FAB Menu for Mobile */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 sm:hidden">
        <Button
          onClick={handleRefresh}
          size="icon"
          className="rounded-full shadow-lg bg-zinc-700 hover:bg-zinc-600"
        >
          <RefreshCw className="h-5 w-5" />
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
