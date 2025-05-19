import { useState, useEffect, useRef } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  addDoc,
  limit,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { getAuth, signInAnonymously } from "firebase/auth";
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
  Filter,
  Menu,
  Home,
  ArrowUp,
  ChevronDown,
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
  SheetClose,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";

import { notifyNewQuoteRequest } from "../../services/notificationService";

const PublicShop = ({ auth }) => {
  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState("grid");

  // Mobile/Tablet UI controls
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

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

  // Controle para dados preenchidos
  const [prefilledData, setPrefilledData] = useState(false);

  // Refs
  const mainContentRef = useRef(null);

  //Change Page Name
  useEffect(() => {
    // Salvar o título original
    const originalTitle = document.title;

    // Mudar para o novo título
    document.title = "Nonato Service - Peças";

    // Restaurar o título original quando o componente for desmontado
    return () => {
      document.title = originalTitle;
    };
  }, []);

  // Scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Detectar tipo de dispositivo
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkDeviceType = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
    };

    checkDeviceType();
    window.addEventListener("resize", checkDeviceType);
    return () => window.removeEventListener("resize", checkDeviceType);
  }, []);

  // Load parts and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const user = auth.currentUser;

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
  }, [auth]);

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

  // Função para buscar e preencher dados do token
  const prefillFormFromToken = async () => {
    try {
      // Verificar se tem token salvo
      const savedToken = localStorage.getItem("shop_access_token");

      if (savedToken) {
        // Buscar os dados do token no Firestore
        const tokenQuery = query(
          collection(db, "shop_access_tokens"),
          where("token", "==", savedToken),
          where("status", "==", "active"),
          limit(1)
        );

        const tokenSnapshot = await getDocs(tokenQuery);

        if (!tokenSnapshot.empty) {
          // Encontrou o token, preencher o formulário
          const tokenData = tokenSnapshot.docs[0].data();

          setQuoteFormData({
            name: tokenData.name || "",
            email: tokenData.email || "",
            phone: tokenData.phone || "",
            company: tokenData.company || "",
            message: "",
          });

          setPrefilledData(true);
        }
      } else if (auth && auth.currentUser) {
        // Se não tem token, mas tem um usuário logado, tentar pegar dados do usuário
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setQuoteFormData({
            name: userData.displayName || auth.currentUser.displayName || "",
            email: userData.email || auth.currentUser.email || "",
            phone: userData.phone || "",
            company: userData.company || "",
            message: "",
          });
          setPrefilledData(true);
        }
      }
    } catch (error) {
      console.error("Erro ao preencher dados do formulário:", error);
    }
  };

  // Função para abrir o modal de orçamento com os dados preenchidos
  const handleOpenQuoteModal = () => {
    prefillFormFromToken(); // Preencher dados antes de mostrar o modal
    setShowQuoteModal(true);
  };

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

    // Mostrar feedback visual
    if (isMobile || isTablet) {
      // Em dispositivos móveis, mostrar notificação temporária
      const notification = document.createElement("div");
      notification.className =
        "fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-3 rounded-xl z-50 animate-fade-up shadow-lg flex items-center";
      notification.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
        <span>Item adicionado ao carrinho</span>
      `;
      document.body.appendChild(notification);

      // Remover a notificação após 2 segundos
      setTimeout(() => {
        notification.classList.add("animate-fade-out");
        setTimeout(() => {
          if (notification.parentNode) {
            document.body.removeChild(notification);
          }
        }, 300);
      }, 2000);

      // Animar o botão do carrinho
      const cartButton = document.querySelector(".cart-button");
      if (cartButton) {
        cartButton.classList.add("cart-pulse");
        setTimeout(() => {
          cartButton.classList.remove("cart-pulse");
        }, 1000);
      }
    } else if (!isCartOpen) {
      // Em desktop, abrir o carrinho por um momento e depois fechar
      setIsCartOpen(true);
      setTimeout(() => {
        setIsCartOpen(false);
      }, 3000);
    }
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

    // Variável para rastrear se o orçamento foi enviado com sucesso
    let quoteWasSubmitted = false;

    try {
      setIsSubmitting(true);
      setError(null);

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
        createdAt: serverTimestamp(), // Use serverTimestamp em vez de new Date()
        type: "online-quote",
        source: "public-shop",
      };

      const docRef = await addDoc(
        collection(db, "orcamentos-online"),
        quoteData
      );

      // Marcar que o orçamento foi enviado com sucesso
      quoteWasSubmitted = true;

      // Notificar admins sobre novo orçamento
      try {
        const usersQuery = query(
          collection(db, "users"),
          where("role", "==", "admin")
        );
        const usersSnapshot = await getDocs(usersQuery);

        usersSnapshot.docs.forEach(async (userDoc) => {
          await notifyNewQuoteRequest(userDoc.id, {
            id: docRef.id,
            customerName: quoteFormData.name,
          });
        });
      } catch (notifyError) {
        // Ignorar erros na notificação, já que o orçamento foi salvo
        console.warn("Erro ao notificar administradores:", notifyError);
      }

      // Limpar carrinho e fechar modais
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
      setPrefilledData(false);

      // Mostrar mensagem de sucesso
      alert(
        "Pedido de orçamento enviado com sucesso! Entraremos em contacto em breve."
      );
    } catch (err) {
      console.error("Erro ao enviar orçamento:", err);
      setError("Erro ao enviar orçamento. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);

      // Se o orçamento foi enviado com sucesso, mas ocorreu algum erro depois
      // (provavelmente no useAuth), ainda fechamos os modais
      if (quoteWasSubmitted) {
        setShowQuoteModal(false);
        setIsCartOpen(false);
      }
    }
  };

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Mobile Category Menu
  const MobileCategoryMenu = () => (
    <Sheet open={isCategoriesOpen} onOpenChange={setIsCategoriesOpen}>
      <SheetContent
        side="left"
        className="bg-zinc-800 border-zinc-700 text-white w-72"
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="text-white">Categorias</SheetTitle>
        </SheetHeader>

        <div className="space-y-1 mt-2">
          <SheetClose asChild>
            <button
              onClick={() => setSelectedCategory("all")}
              className={`w-full text-left px-3 py-3 rounded-lg flex items-center justify-between transition-colors ${
                selectedCategory === "all"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
              }`}
            >
              <span className="flex items-center">
                <Home className="h-4 w-4 mr-2" />
                Todas as Categorias
              </span>
              <span className="text-sm">({getCategoryCount("all")})</span>
            </button>
          </SheetClose>

          {categories.map((category) => (
            <SheetClose key={category.id} asChild>
              <button
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full text-left px-3 py-3 rounded-lg flex items-center justify-between transition-colors ${
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
            </SheetClose>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );

  // Mobile Filter Menu
  const MobileFilterMenu = () => (
    <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
      <SheetContent className="bg-zinc-800 border-zinc-700 text-white">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-white">Filtros e Ordenação</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Ordenar por
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-3 text-white"
            >
              <option value="name">Nome (A-Z)</option>
              <option value="price">Preço</option>
              <option value="code">Código</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              Visualização
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setViewMode("grid");
                  setIsFiltersOpen(false);
                }}
                className={`flex items-center justify-center px-3 py-3 rounded-md ${
                  viewMode === "grid"
                    ? "bg-zinc-700 text-white"
                    : "bg-zinc-900 text-zinc-400"
                }`}
              >
                <Grid className="h-4 w-4 mr-2" />
                Grid
              </button>
              <button
                onClick={() => {
                  setViewMode("list");
                  setIsFiltersOpen(false);
                }}
                className={`flex items-center justify-center px-3 py-3 rounded-md ${
                  viewMode === "list"
                    ? "bg-zinc-700 text-white"
                    : "bg-zinc-900 text-zinc-400"
                }`}
              >
                <List className="h-4 w-4 mr-2" />
                Lista
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-700">
            <SheetClose asChild>
              <Button className="w-full bg-green-600 hover:bg-green-700">
                Aplicar Filtros
              </Button>
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="min-h-screen bg-zinc-900 text-white" ref={mainContentRef}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-800 border-b border-zinc-700">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(isMobile || isTablet) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCategoriesOpen(true)}
                className="mr-1 text-white hover:bg-zinc-700"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}

            <img
              src="/nonato.png"
              alt="Nonato Service Logo"
              className="h-8 w-8"
            />
            <h1 className={`font-bold ${isMobile ? "text-lg" : "text-xl"}`}>
              Nonato Service{isMobile ? "" : " - Peças"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {(isMobile || isTablet) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFiltersOpen(true)}
                className="text-white hover:bg-zinc-700"
              >
                <Filter className="h-5 w-5" />
              </Button>
            )}

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
              <SheetContent className="bg-zinc-800 border-zinc-700 text-white flex flex-col h-full p-0">
                <SheetHeader className="flex-shrink-0 px-4 pt-4 pb-2 border-b border-zinc-700">
                  <div className="flex justify-between items-center w-full">
                    <SheetTitle className="text-white flex items-center">
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Carrinho de Compras
                      {cart.length > 0 && (
                        <Badge className="ml-2 bg-green-600">
                          {cart.length}
                        </Badge>
                      )}
                    </SheetTitle>
                  </div>
                </SheetHeader>

                <div className="flex-1 min-h-0 overflow-y-auto">
                  {cart.length === 0 ? (
                    <div className="text-center py-12 px-4 flex flex-col items-center justify-center h-full">
                      <div className="bg-zinc-700/30 rounded-full p-6 mb-4">
                        <ShoppingCart className="h-12 w-12 text-zinc-500" />
                      </div>
                      <h3 className="text-lg font-medium text-white mb-1">
                        Seu carrinho está vazio
                      </h3>
                      <p className="text-zinc-500 text-sm mb-6 max-w-xs mx-auto">
                        Adicione peças ao carrinho para solicitar um orçamento
                      </p>
                      <SheetClose asChild>
                        <Button
                          className="bg-zinc-700 hover:bg-zinc-600"
                          onClick={() => {
                            if (mainContentRef.current) {
                              mainContentRef.current.scrollIntoView({
                                behavior: "smooth",
                              });
                            }
                          }}
                        >
                          Continuar Comprando
                        </Button>
                      </SheetClose>
                    </div>
                  ) : (
                    <div className="py-2">
                      {cart.map((item, index) => (
                        <div
                          key={item.id}
                          className={`relative px-4 py-3 ${
                            index !== cart.length - 1
                              ? "border-b border-zinc-700/50"
                              : ""
                          } transition-all duration-200 hover:bg-zinc-700/30`}
                        >
                          <div className="flex items-start gap-3">
                            {item.image && (
                              <div className="w-12 h-12 rounded-md overflow-hidden bg-zinc-700 flex-shrink-0">
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-white truncate">
                                {item.name}
                              </h3>
                              <p className="text-sm text-zinc-400">
                                Código: {item.code}
                              </p>

                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center bg-zinc-700/50 rounded-full h-8">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full hover:bg-zinc-600"
                                    onClick={() => updateQuantity(item.id, -1)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-8 text-center text-white">
                                    {item.quantity}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full hover:bg-zinc-600"
                                    onClick={() => updateQuantity(item.id, 1)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFromCart(item.id)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/20 px-2 h-8"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Remover
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="flex-shrink-0 border-t border-zinc-700 bg-zinc-800/95 p-4 backdrop-blur-sm">
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-zinc-400 text-sm">
                          Quantidade de itens:
                        </p>
                        <p className="font-medium text-white">
                          {cart.reduce(
                            (total, item) => total + item.quantity,
                            0
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 py-6"
                      onClick={handleOpenQuoteModal}
                    >
                      Solicitar Orçamento
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Mobile Categories (Top Scrollable) */}
      {(isMobile || isTablet) && (
        <div className="bg-zinc-800 overflow-x-auto whitespace-nowrap px-4 py-2 scrollbar-hide">
          <div className="inline-flex space-x-2">
            <Button
              variant={selectedCategory === "all" ? "secondary" : "outline"}
              size="sm"
              className={`rounded-full ${
                selectedCategory === "all"
                  ? "bg-zinc-700 text-white"
                  : "bg-transparent text-zinc-400 border-zinc-700"
              }`}
              onClick={() => setSelectedCategory("all")}
            >
              Todas
            </Button>

            {categories.map((category) => (
              <Button
                key={category.id}
                variant={
                  selectedCategory === category.id ? "secondary" : "outline"
                }
                size="sm"
                className={`rounded-full ${
                  selectedCategory === category.id
                    ? "bg-zinc-700 text-white"
                    : "bg-transparent text-zinc-400 border-zinc-700"
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar with Categories (Desktop) */}
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
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Buscar peças..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>

            {/* Desktop Filters */}
            <div className="hidden sm:flex justify-between items-center">
              <div className="text-sm text-zinc-400">
                {sortedParts.length > 0 && (
                  <span>
                    Mostrando{" "}
                    <span className="font-medium text-white">
                      {sortedParts.length}
                    </span>{" "}
                    peças
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-zinc-700 text-white bg-zinc-800"
                    >
                      <span className="mr-1">Ordenar</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-zinc-800 border-zinc-700 text-white">
                    <DropdownMenuItem
                      className={sortBy === "name" ? "bg-zinc-700" : ""}
                      onClick={() => setSortBy("name")}
                    >
                      Nome (A-Z)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={sortBy === "price" ? "bg-zinc-700" : ""}
                      onClick={() => setSortBy("price")}
                    >
                      Preço
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={sortBy === "code" ? "bg-zinc-700" : ""}
                      onClick={() => setSortBy("code")}
                    >
                      Código
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

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
                              loading="lazy"
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
                          <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-zinc-700 rounded-lg overflow-hidden">
                            <img
                              src={part.image}
                              alt={part.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div className="flex-1 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
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
                          <div className="mt-2 sm:mt-0">
                            <Button
                              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                              onClick={() => addToCart(part)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {isMobile ? "Adicionar" : "Adicionar ao Carrinho"}
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
              {!isMobile && currentPage > 3 && (
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

              {Array.from({
                length: Math.min(isMobile ? 3 : 5, totalPages),
              }).map((_, i) => {
                let pageNumber;
                if (totalPages <= (isMobile ? 3 : 5)) {
                  pageNumber = i + 1;
                } else if (currentPage <= (isMobile ? 2 : 3)) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - (isMobile ? 1 : 2)) {
                  pageNumber = totalPages - (isMobile ? 2 : 4) + i;
                } else {
                  pageNumber = currentPage - (isMobile ? 1 : 2) + i;
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

              {!isMobile && currentPage < totalPages - 2 && (
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

      {/* Fixed Cart Button for Mobile */}
      {(isMobile || isTablet) && (
        <div className="fixed bottom-6 right-6 z-40">
          <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetTrigger asChild>
              <Button
                size="lg"
                className="cart-button h-16 w-16 rounded-full shadow-lg bg-green-600 hover:bg-green-700 border-4 border-zinc-900 flex items-center justify-center"
              >
                <div className="relative">
                  <ShoppingCart className="h-6 w-6" />
                  {cart.length > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center bg-red-500 text-white font-bold">
                      {cart.reduce((total, item) => total + item.quantity, 0)}
                    </Badge>
                  )}
                </div>
              </Button>
            </SheetTrigger>
          </Sheet>
        </div>
      )}

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <Button
          className="fixed bottom-6 left-6 h-12 w-12 rounded-full bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 shadow-lg z-40"
          onClick={scrollToTop}
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}

      {/* Mobile Category and Filter Menus */}
      <MobileCategoryMenu />
      <MobileFilterMenu />

      {/* Quote Modal */}
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-white max-w-lg mx-auto p-0 overflow-hidden">
          <DialogHeader className="p-4 sm:p-6 bg-zinc-800 border-b border-zinc-700 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2 text-green-500" />
                Solicitar Orçamento
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full absolute right-4 top-4"
                onClick={() => setShowQuoteModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogDescription className="text-zinc-400 mt-1">
              {prefilledData
                ? "Seus dados já estão preenchidos com base no seu acesso."
                : "Preencha seus dados para receber um orçamento personalizado."}
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh]">
            {prefilledData && (
              <div className="bg-green-500/10 border border-green-500 rounded-md p-3 mb-4">
                <p className="text-green-400 text-sm">
                  Seus dados foram preenchidos automaticamente com base nas
                  informações do seu acesso à loja. Verifique se estão corretos.
                </p>
              </div>
            )}

            {/* Resumo do carrinho (novo) */}
            <div className="mb-4 bg-zinc-700/30 rounded-lg p-3">
              <h3 className="font-medium text-zinc-300 mb-2 flex items-center">
                <Package className="h-4 w-4 mr-2 text-zinc-400" />
                Resumo do Pedido
                <Badge className="ml-2 bg-zinc-600">
                  {cart.reduce((total, item) => total + item.quantity, 0)} itens
                </Badge>
              </h3>
              <div className="max-h-28 overflow-y-auto mb-2 pr-1">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center py-1 text-sm border-b border-zinc-700/30 last:border-0"
                  >
                    <span className="text-zinc-300 truncate mr-2 flex-1">
                      {item.name}
                    </span>
                    <span className="text-zinc-400 whitespace-nowrap">
                      {item.quantity}x
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Formulário de Contato */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-300 flex items-center">
                  Nome <span className="text-red-400 ml-1">*</span>
                </label>
                <Input
                  name="name"
                  value={quoteFormData.name}
                  onChange={handleQuoteFormChange}
                  className="bg-zinc-700 border-zinc-600 text-white h-10"
                  placeholder="Seu nome completo"
                />
                {!quoteFormData.name && isSubmitting && (
                  <p className="text-xs text-red-400 mt-1">
                    Nome é obrigatório
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-300 flex items-center">
                  Email <span className="text-red-400 ml-1">*</span>
                </label>
                <Input
                  name="email"
                  type="email"
                  value={quoteFormData.email}
                  onChange={handleQuoteFormChange}
                  className="bg-zinc-700 border-zinc-600 text-white h-10"
                  placeholder="seu@email.com"
                />
                {!quoteFormData.email && isSubmitting && (
                  <p className="text-xs text-red-400 mt-1">
                    Email é obrigatório
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-300">
                    Telefone
                  </label>
                  <Input
                    name="phone"
                    value={quoteFormData.phone}
                    onChange={handleQuoteFormChange}
                    className="bg-zinc-700 border-zinc-600 text-white h-10"
                    placeholder="Seu telefone"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-300">
                    Empresa
                  </label>
                  <Input
                    name="company"
                    value={quoteFormData.company}
                    onChange={handleQuoteFormChange}
                    className="bg-zinc-700 border-zinc-600 text-white h-10"
                    placeholder="Nome da empresa (opcional)"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-300">
                  Mensagem
                </label>
                <textarea
                  name="message"
                  value={quoteFormData.message}
                  onChange={handleQuoteFormChange}
                  className="w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-2 text-white"
                  rows="3"
                  placeholder="Informações adicionais para seu orçamento (opcional)"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-zinc-700 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 bg-zinc-800/95 backdrop-blur-sm">
            <Button
              variant="outline"
              onClick={() => setShowQuoteModal(false)}
              className="border-zinc-600 text-white hover:bg-zinc-700 bg-zinc-700/50 w-full sm:w-auto order-2 sm:order-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitQuote}
              disabled={
                isSubmitting || !quoteFormData.name || !quoteFormData.email
              }
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto order-1 sm:order-2 h-11"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span>Enviar Pedido de Orçamento</span>
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSS para animações */}
      <style jsx global>{`
        @keyframes fade-up {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        .animate-fade-up {
          animation: fade-up 0.3s ease-out forwards;
        }

        .scrollbar-hide {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
      `}</style>
    </div>
  );
};

export default PublicShop;
