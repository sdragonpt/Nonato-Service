import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  addDoc,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import {
  Search,
  Loader2,
  Package,
  ShoppingCart,
  Grid,
  List,
  X,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// UI Components
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";

const PublicShop = () => {
  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState("grid");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Cart
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Quote Modal
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteFormData, setQuoteFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });

  // Load parts and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch parts
        const partsQuery = query(collection(db, "pecas"), orderBy("name"));
        const partsSnapshot = await getDocs(partsQuery);
        const partsData = partsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setParts(partsData);

        // Fetch main categories
        const categoriesQuery = query(
          collection(db, "categorias"),
          where("parentId", "==", null)
        );
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categoriesData = categoriesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCategories(categoriesData);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Erro ao carregar peças. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem("shop-cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem("shop-cart", JSON.stringify(cart));
  }, [cart]);

  // Add to cart
  const addToCart = (part) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === part.id);
      if (existingItem) {
        return currentCart.map((item) =>
          item.id === part.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...currentCart, { ...part, quantity: 1 }];
    });
  };

  // Remove from cart
  const removeFromCart = (partId) => {
    setCart((currentCart) => currentCart.filter((item) => item.id !== partId));
  };

  // Update quantity in cart
  const updateQuantity = (partId, increment) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id === partId) {
          const newQuantity = Math.max(1, item.quantity + increment);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  // Filter parts
  const filteredParts = parts.filter((part) => {
    const matchesSearch =
      part.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || part.categoryId === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Sort parts
  const sortedParts = [...filteredParts].sort((a, b) => {
    switch (sortBy) {
      case "name":
      default:
        return a.name.localeCompare(b.name);
    }
  });

  // Pagination logic
  const indexOfLastPart = currentPage * itemsPerPage;
  const indexOfFirstPart = indexOfLastPart - itemsPerPage;
  const currentParts = sortedParts.slice(indexOfFirstPart, indexOfLastPart);
  const totalPages = Math.ceil(sortedParts.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  // Get category count
  const getCategoryCount = (categoryId) => {
    if (categoryId === "all") return parts.length;
    return parts.filter((part) => part.categoryId === categoryId).length;
  };

  // Handle quote form changes
  const handleQuoteFormChange = (e) => {
    const { name, value } = e.target;
    setQuoteFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Submit quote request
  const handleSubmitQuote = async () => {
    if (!cart.length) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Prepare quote data
      const quoteData = {
        status: "pending",
        clientInfo: quoteFormData,
        items: cart.map((item) => ({
          id: item.id,
          name: item.name,
          code: item.code,
          price: item.price,
          quantity: item.quantity,
        })),
        createdAt: new Date(),
        type: "online-quote",
        source: "public-shop",
      };

      // Salvar no Firestore
      const docRef = await addDoc(
        collection(db, "orcamentos-online"),
        quoteData
      );

      // Clear cart and close modals
      setCart([]);
      setQuoteFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        message: "",
      });
      setShowQuoteModal(false);
      setIsCartOpen(false);

      // Show success message
      alert(
        "Pedido de orçamento enviado com sucesso! Entraremos em contacto em breve."
      );
    } catch (err) {
      console.error("Erro ao enviar orçamento:", err);
      setError("Erro ao enviar orçamento. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-800 border-b border-zinc-700">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-green-500" />
            <h1 className="text-xl font-bold">Loja de Peças</h1>
          </div>

          <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className="relative text-white hover:bg-zinc-700"
              >
                <ShoppingCart className="h-5 w-5" />
                {cart.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-500">
                    {cart.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-zinc-800 border-zinc-700 text-white">
              <SheetHeader>
                <SheetTitle className="text-white">
                  Carrinho de Compras
                </SheetTitle>
              </SheetHeader>

              <div className="mt-8 space-y-4">
                {cart.length === 0 ? (
                  <p className="text-zinc-400 text-center py-8">
                    Seu carrinho está vazio
                  </p>
                ) : (
                  <>
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 bg-zinc-700/50 p-4 rounded-lg"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium">{item.name}</h3>
                          <p className="text-sm text-zinc-400">
                            Código: {item.code}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-zinc-700"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-zinc-700"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-red-400 hover:bg-red-500/20"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="pt-4 border-t border-zinc-700">
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => setShowQuoteModal(true)}
                        disabled={cart.length === 0}
                      >
                        Solicitar Orçamento
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar with Categories */}
        <aside className="hidden lg:block w-80 min-h-screen border-r border-zinc-700 bg-zinc-800 p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Categorias</h2>

            <button
              onClick={() => setSelectedCategory("all")}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                selectedCategory === "all"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
              }`}
            >
              <span>Todas as Categorias</span>
              <span className="text-sm">({getCategoryCount("all")})</span>
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                  selectedCategory === category.id
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                }`}
              >
                <span>{category.name}</span>
                <span className="text-sm">
                  ({getCategoryCount(category.id)})
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  placeholder="Buscar peças..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-white"
                >
                  <option value="name">Ordenar por: Nome</option>
                </select>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className={`text-white ${
                    viewMode === "grid"
                      ? "bg-zinc-700 hover:bg-zinc-600"
                      : "hover:bg-zinc-800"
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className={`text-white ${
                    viewMode === "list"
                      ? "bg-zinc-700 hover:bg-zinc-600"
                      : "hover:bg-zinc-800"
                  }`}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Products Grid/List */}
          {isLoading ? (
            <div className="flex justify-center items-center min-h-[50vh]">
              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </div>
          ) : error ? (
            <Alert
              variant="destructive"
              className="border-red-500 bg-red-500/10"
            >
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              }
            >
              {currentParts.map((part) => (
                <Card
                  key={part.id}
                  className="bg-zinc-800 border-zinc-700 hover:border-zinc-600 transition-colors"
                >
                  <CardContent
                    className={viewMode === "grid" ? "p-4" : "p-4 flex gap-4"}
                  >
                    {viewMode === "grid" ? (
                      <>
                        {part.image && (
                          <div className="w-full h-48 mb-4 bg-zinc-700 rounded-lg overflow-hidden">
                            <img
                              src={part.image}
                              alt={part.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <div>
                            <h3 className="font-medium text-lg text-white">
                              {part.name}
                            </h3>
                            <p className="text-sm text-zinc-400">
                              Código: {part.code}
                            </p>
                          </div>

                          {part.categoryName && (
                            <Badge
                              variant="secondary"
                              className="bg-zinc-700 text-zinc-300"
                            >
                              {part.categoryName}
                            </Badge>
                          )}

                          {part.description && (
                            <p className="text-sm text-zinc-400 line-clamp-2">
                              {part.description}
                            </p>
                          )}

                          <Button
                            className="w-full bg-green-600 hover:bg-green-700 mt-4"
                            onClick={() => addToCart(part)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar ao Carrinho
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        {part.image && (
                          <div className="w-24 h-24 flex-shrink-0 bg-zinc-700 rounded-lg overflow-hidden">
                            <img
                              src={part.image}
                              alt={part.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 flex justify-between items-center">
                          <div>
                            <h3 className="font-medium text-lg text-white">
                              {part.name}
                            </h3>
                            <p className="text-sm text-zinc-400">
                              Código: {part.code}
                            </p>
                            {part.categoryName && (
                              <Badge
                                variant="secondary"
                                className="bg-zinc-700 text-zinc-300 mt-1"
                              >
                                {part.categoryName}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <Button
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => addToCart(part)}
                            >
                              Adicionar ao Carrinho
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}

              {sortedParts.length === 0 && (
                <Card className="bg-zinc-800 border-zinc-700 col-span-full">
                  <CardContent className="p-8 text-center">
                    <Search className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2 text-white">
                      Nenhuma peça encontrada
                    </p>
                    <p className="text-zinc-400">
                      Tente ajustar seus filtros ou buscar por outros termos
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Pagination */}
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
        </main>
      </div>

      {/* Quote Modal */}
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle>Solicitar Orçamento</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Preencha seus dados para receber um orçamento personalizado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-zinc-300">
                Nome *
              </label>
              <Input
                name="name"
                value={quoteFormData.name}
                onChange={handleQuoteFormChange}
                className="bg-zinc-700 border-zinc-600 text-white"
                placeholder="Seu nome"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300">
                Email *
              </label>
              <Input
                name="email"
                type="email"
                value={quoteFormData.email}
                onChange={handleQuoteFormChange}
                className="bg-zinc-700 border-zinc-600 text-white"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300">
                Telefone
              </label>
              <Input
                name="phone"
                value={quoteFormData.phone}
                onChange={handleQuoteFormChange}
                className="bg-zinc-700 border-zinc-600 text-white"
                placeholder="Seu telefone"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300">
                Empresa
              </label>
              <Input
                name="company"
                value={quoteFormData.company}
                onChange={handleQuoteFormChange}
                className="bg-zinc-700 border-zinc-600 text-white"
                placeholder="Nome da empresa (opcional)"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-300">
                Mensagem
              </label>
              <textarea
                name="message"
                value={quoteFormData.message}
                onChange={handleQuoteFormChange}
                className="w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-white"
                rows="3"
                placeholder="Informações adicionais (opcional)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowQuoteModal(false)}
              className="border-zinc-600 text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitQuote}
              disabled={
                isSubmitting || !quoteFormData.name || !quoteFormData.email
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Pedido"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicShop;
