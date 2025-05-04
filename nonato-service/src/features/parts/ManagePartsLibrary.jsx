import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useNavigate } from "react-router-dom";
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
  Download,
  Book,
  ChevronRight,
  ArrowLeft,
  Grid,
  List,
  X,
  Upload,
  ChevronLeft, // Novo
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";

const ManagePartsLibrary = () => {
  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortField, setSortField] = useState("name");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partToDelete, setPartToDelete] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
  const [activeTab, setActiveTab] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // Ou qualquer número que preferir

  // Reset error and selection when changing tabs
  const handleTabChange = (value) => {
    setActiveTab(value);
    setError(null);
    setCurrentPage(1); // Resetar página quando mudar de tab
    if (value === "all") {
      setSelectedCategory(null);
      setSelectedSubcategory(null);
    }
  };
  const navigate = useNavigate();

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  const fetchCategories = useCallback(async () => {
    try {
      const q = query(collection(db, "categorias"));
      const snapshot = await getDocs(q);
      const categoriesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCategories(categoriesData);
    } catch (err) {
      console.error("Erro ao buscar categorias:", err);
      setError("Erro ao carregar categorias. Por favor, tente novamente.");
    }
  }, []);

  const fetchParts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      let q;

      if (selectedSubcategory) {
        q = query(
          collection(db, "pecas"),
          where("subcategoryId", "==", selectedSubcategory.id),
          orderBy(sortField, sortOrder)
        );
      } else if (selectedCategory) {
        q = query(
          collection(db, "pecas"),
          where("categoryId", "==", selectedCategory.id),
          orderBy(sortField, sortOrder)
        );
      } else {
        q = query(collection(db, "pecas"), orderBy(sortField, sortOrder));
      }

      const snapshot = await getDocs(q);
      const partsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setParts(partsData);
    } catch (err) {
      console.error("Erro ao buscar peças:", err);
      setError("Erro ao carregar peças. Por favor, tente novamente.");

      // Fallback para uma consulta mais simples em caso de erro de índice
      if (err.code === "failed-precondition" || err.message.includes("index")) {
        try {
          // Consulta sem ordenação como fallback
          let fallbackQuery;
          if (selectedSubcategory) {
            fallbackQuery = query(
              collection(db, "pecas"),
              where("subcategoryId", "==", selectedSubcategory.id)
            );
          } else if (selectedCategory) {
            fallbackQuery = query(
              collection(db, "pecas"),
              where("categoryId", "==", selectedCategory.id)
            );
          } else {
            fallbackQuery = query(collection(db, "pecas"));
          }

          const fallbackSnapshot = await getDocs(fallbackQuery);
          const fallbackData = fallbackSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setParts(fallbackData);

          // Ainda mostramos o erro, mas temos dados para exibir
          setError(
            "Os dados estão sendo exibidos sem ordenação enquanto o índice é criado. Por favor, aguarde alguns minutos e tente novamente."
          );
        } catch (fallbackErr) {
          console.error("Erro na consulta de fallback:", fallbackErr);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [sortField, sortOrder, selectedCategory, selectedSubcategory]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    filterCategory,
    sortField,
    sortOrder,
    selectedCategory,
    selectedSubcategory,
  ]);

  const handleDelete = async (partId) => {
    try {
      await deleteDoc(doc(db, "pecas", partId));
      setParts((prev) => prev.filter((part) => part.id !== partId));
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

  const filteredParts = parts.filter((part) => {
    const matchesSearch =
      part.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.description?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterCategory === "all") return matchesSearch;
    return matchesSearch && part.categoryId === filterCategory;
  });

  const getSubcategories = (categoryId) => {
    return categories.filter((cat) => cat.parentId === categoryId);
  };

  const getMainCategories = () => {
    return categories.filter((cat) => !cat.parentId);
  };

  const indexOfLastPart = currentPage * itemsPerPage;
  const indexOfFirstPart = indexOfLastPart - itemsPerPage;
  const currentParts = filteredParts.slice(indexOfFirstPart, indexOfLastPart);
  const totalPages = Math.ceil(filteredParts.length / itemsPerPage);

  if (isLoading && !parts.length) {
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
            onClick={() => navigate("/app/add-part")}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Peça
          </Button>
          <Button
            onClick={() => navigate("/app/import-parts")}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">
                Total de Peças
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {parts.length}
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
                {categories.filter((cat) => cat.parentId).length}
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
                  className="pl-10 w-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                />
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
                  {filteredParts.length} peça(s) encontrada(s) - Página{" "}
                  {currentPage} de {totalPages}
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

          {/* Quick Actions - Desktop Only */}
          <div className="hidden sm:flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                fetchParts();
              }}
              className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar Lista
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                const csvContent = convertToCSV(parts);
                downloadCSV(csvContent, "pecas.csv");
              }}
              className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>

            <Button
              onClick={() => navigate("/app/add-category")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
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

            <Button
              onClick={() => navigate("/app/import-parts")}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar Peças
            </Button>
          </div>

          {/* Parts Grid or List */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {currentParts.map((part) => (
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
                          onClick={(e) => e.stopPropagation()}
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

              {filteredParts.length === 0 && (
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
            <div className="mt-4 space-y-2">
              {currentParts.map((part) => (
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
                            onClick={(e) => e.stopPropagation()}
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

              {filteredParts.length === 0 && (
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
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <Button
                variant="outline"
                size="icon"
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Mostra página inicial, três páginas próximas à atual e a última */}
              {currentPage > 3 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => paginate(1)}
                    className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800"
                  >
                    1
                  </Button>
                  {currentPage > 4 && (
                    <span className="text-zinc-400">...</span>
                  )}
                </>
              )}

              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }

                if (pageNumber >= 1 && pageNumber <= totalPages) {
                  return (
                    <Button
                      key={pageNumber}
                      variant={
                        currentPage === pageNumber ? "secondary" : "outline"
                      }
                      size="icon"
                      onClick={() => paginate(pageNumber)}
                      className={`border-zinc-700 ${
                        currentPage === pageNumber
                          ? "bg-zinc-700 text-white hover:bg-zinc-600"
                          : "text-white hover:bg-zinc-700 bg-zinc-800"
                      }`}
                    >
                      {pageNumber}
                    </Button>
                  );
                }
                return null;
              })}

              {currentPage < totalPages - 2 && (
                <>
                  {currentPage < totalPages - 3 && (
                    <span className="text-zinc-400">...</span>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => paginate(totalPages)}
                    className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800"
                  >
                    {totalPages}
                  </Button>
                </>
              )}

              <Button
                variant="outline"
                size="icon"
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
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

            {/* Display Subcategories */}
            {selectedCategory && !selectedSubcategory && (
              <>
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input
                    placeholder="Buscar subcategorias ou peças..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                </div>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">
                  Subcategorias
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getSubcategories(selectedCategory.id)
                    .filter((subcat) =>
                      subcat.name
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())
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
                              <Tag className="h-5 w-5 text-purple-500" />
                              <h3 className="font-semibold text-base text-white">
                                {subcategory.name}
                              </h3>
                            </div>
                            <ChevronRight className="h-4 w-4 text-zinc-400" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                  {getSubcategories(selectedCategory.id).length === 0 && (
                    <Card className="md:col-span-2 lg:col-span-3 bg-zinc-800 border-zinc-700">
                      <CardContent className="p-6 text-center">
                        <p className="text-zinc-400">
                          Nenhuma subcategoria encontrada para{" "}
                          {selectedCategory.name}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Show Parts in this Category */}
                <h3 className="text-lg font-semibold text-white mt-6 mb-3">
                  Peças nesta Categoria
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {parts
                    .filter(
                      (part) =>
                        part.categoryId === selectedCategory.id &&
                        !part.subcategoryId &&
                        (part.name
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase()) ||
                          part.code
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase()))
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
                    (part) =>
                      part.categoryId === selectedCategory.id &&
                      !part.subcategoryId
                  ).length === 0 && (
                    <Card className="md:col-span-2 lg:col-span-3 bg-zinc-800 border-zinc-700">
                      <CardContent className="p-6 text-center">
                        <p className="text-zinc-400">
                          Nenhuma peça encontrada nesta categoria
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}

            {/* Display Parts in Subcategory */}
            {selectedSubcategory && (
              <>
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input
                    placeholder="Buscar peças..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {parts
                    .filter(
                      (part) =>
                        part.subcategoryId === selectedSubcategory.id &&
                        (part.name
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase()) ||
                          part.code
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase()))
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
              </>
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

              <Button
                onClick={() => navigate("/app/import-parts")}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar Peças
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
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir a peça{" "}
              <span className="font-semibold text-white">
                {partToDelete?.name}
              </span>
              ? Esta ação não pode ser desfeita.
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
              onClick={() => handleDelete(partToDelete?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FAB Menu for Mobile */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 sm:hidden">
        <Button
          onClick={() => {
            setError(null);
            fetchParts();
          }}
          size="icon"
          className="rounded-full shadow-lg bg-zinc-700 hover:bg-zinc-600"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
        <Button
          onClick={() => {
            const csvContent = convertToCSV(parts);
            downloadCSV(csvContent, "pecas.csv");
          }}
          size="icon"
          className="rounded-full shadow-lg bg-zinc-700 hover:bg-zinc-600"
        >
          <Download className="h-5 w-5" />
        </Button>
        <Button
          onClick={() => navigate("/app/import-parts")}
          size="icon"
          className="rounded-full shadow-lg bg-amber-600 hover:bg-amber-700"
        >
          <Upload className="h-5 w-5" />
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

// Utility Functions
const convertToCSV = (parts) => {
  const headers = [
    "Nome",
    "Código",
    "Preço",
    "Descrição",
    "Categoria",
    "Subcategoria",
  ];
  const rows = parts.map((part) => [
    part.name,
    part.code,
    part.price,
    part.description,
    part.categoryName || "",
    part.subcategoryName || "",
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell || ""}"`).join(","))
    .join("\n");
};

const downloadCSV = (content, filename) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export default ManagePartsLibrary;
