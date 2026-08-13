// PublicShop.jsx - CORRIGIDO: Funcionando sem crashes

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  addDoc,
  collection,
  serverTimestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { comparePtPt } from "../../utils/sortHelpers.js";
import { useCategories } from "../../context/CategoriesContext.jsx";
import { useCatalogParts } from "../../hooks/useCatalogParts.js";
import PartImage from "../../components/ui/PartImage.jsx";
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
  Filter,
  Menu,
  Home,
  ArrowUp,
  ChevronDown,
  Lock,
  Shield,
  AlertTriangle,
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

const PublicShop = ({
  auth,
  canUseCart = false,
  requestCartAccess,
  userToken,
}) => {
  // ✅ REF para controlar se componente está montado - MAS sem verificações excessivas
  const isMountedRef = useRef(true);
  const debounceTimerRef = useRef(null);

  // ✅ CLEANUP básico
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ✅ CATÁLOGO CENTRALIZADO (JSON estático HOMAG + categorias atribuídas)
  const {
    parts: catalogParts,
    loading: catalogLoading,
    error: catalogError,
    refresh: refreshCatalog,
  } = useCatalogParts();

  // Quantas peças mostrar de cada vez — equivalente ao antigo "carregar mais"
  // da Firestore, mas agora é só uma fatia maior da lista já em memória.
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Cache de categorias
  const {
    categories,
    getSubcategoriesByParent,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

  const [error, setError] = useState(null);

  // ✅ BUSCA - Sem verificações excessivas
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [viewMode, setViewMode] = useState("grid");

  // Mobile/Tablet UI controls
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

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

  // Access request modal state
  const [showAccessInfo, setShowAccessInfo] = useState(false);

  // Refs
  const mainContentRef = useRef(null);

  // Change Page Name
  useEffect(() => {
    const originalTitle = document.title;
    document.title = "Nonato Service - Peças";
    return () => {
      document.title = originalTitle;
    };
  }, []);

  // ✅ DEBOUNCE SIMPLES - Sem verificações excessivas
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm]);

  // Scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
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

  // ✅ FILTRO/BUSCA/ORDENAÇÃO — tudo em memória, sobre o catálogo já carregado
  const filteredParts = useMemo(() => {
    let list = catalogParts;

    if (selectedCategory !== "all") {
      list = list.filter((p) => p.categoryId === selectedCategory);
    }
    if (selectedSubcategory !== "all") {
      list = list.filter((p) => p.subcategoryId === selectedSubcategory);
    }
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.code?.toLowerCase().includes(term)
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === "code") {
        return comparePtPt(a.code, b.code);
      }
      return comparePtPt(a.name, b.name);
    });
  }, [
    catalogParts,
    selectedCategory,
    selectedSubcategory,
    debouncedSearchTerm,
    sortBy,
  ]);

  // Repor a "página" visível sempre que os filtros mudam
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedCategory, selectedSubcategory, debouncedSearchTerm, sortBy]);

  const displayParts = filteredParts.slice(0, visibleCount);
  const hasMore = filteredParts.length > visibleCount;
  const isLoadingParts = catalogLoading;

  // ✅ Contagem de peças por subcategoria (para a barra lateral de categorias)
  const subcategoryCounts = useMemo(() => {
    const counts = {};
    catalogParts.forEach((p) => {
      if (p.subcategoryId) {
        counts[p.subcategoryId] = (counts[p.subcategoryId] || 0) + 1;
      }
    });
    return counts;
  }, [catalogParts]);

  useEffect(() => {
    if (catalogError) setError(catalogError);
  }, [catalogError]);

  // ✅ FUNÇÃO LOAD MORE
  const loadMoreParts = () => {
    if (hasMore) {
      setVisibleCount((prev) => prev + PAGE_SIZE);
    }
  };

  // Mostrar erro das categorias se houver
  useEffect(() => {
    if (categoriesError) {
      setError(categoriesError);
    }
  }, [categoriesError]);

  // Load cart from localStorage
  useEffect(() => {
    if (canUseCart) {
      const savedCart = localStorage.getItem("shop-cart");
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          setCart(parsedCart);
        } catch (err) {
          console.error("Erro ao carregar carrinho:", err);
        }
      }
    }
  }, [canUseCart]);

  // Save cart to localStorage
  useEffect(() => {
    if (canUseCart) {
      try {
        localStorage.setItem("shop-cart", JSON.stringify(cart));
      } catch (err) {
        console.error("Erro ao salvar carrinho:", err);
      }
    }
  }, [cart, canUseCart]);

  // Preencher dados do usuário se tiver token
  useEffect(() => {
    if (canUseCart && userToken) {
      setQuoteFormData({
        name: userToken.name || "",
        email: userToken.email || "",
        phone: userToken.phone || "",
        company: userToken.company || "",
        message: "",
      });
    }
  }, [canUseCart, userToken]);

  // Add to cart
  const addToCart = (part) => {
    if (!canUseCart) {
      requestCartAccess();
      return;
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === part.id);
      if (existingItem) {
        return currentCart.map((item) =>
          item.id === part.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...currentCart, { ...part, quantity: 1 }];
    });

    // Feedback visual para mobile
    if ((isMobile || isTablet) && isMountedRef.current) {
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

      setTimeout(() => {
        notification.classList.add("animate-fade-out");
        setTimeout(() => {
          if (notification.parentNode) {
            document.body.removeChild(notification);
          }
        }, 300);
      }, 2000);
    } else if (!isCartOpen) {
      setIsCartOpen(true);
      setTimeout(() => setIsCartOpen(false), 3000);
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

  // Reset subcategory when category changes
  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory("all");
  };

  // ✅ FUNÇÃO PARA LIMPAR BUSCA - Simples
  const clearSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchTerm("");
    setDebouncedSearchTerm("");
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

      const quoteData = {
        status: "pending",
        clientInfo: quoteFormData,
        items: cart.map((item) => ({
          id: item.id,
          name: item.name,
          code: item.code,
          price: item.price || 0,
          quantity: item.quantity,
        })),
        createdAt: serverTimestamp(),
        type: "online-quote",
        source: "public-shop",
        userToken: userToken?.token || null,
      };

      const docRef = await addDoc(
        collection(db, "orcamentos-online"),
        quoteData
      );

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
        console.warn("Erro ao notificar administradores:", notifyError);
      }

      // Limpar carrinho e fechar modais
      setCart([]);
      setQuoteFormData({
        name: userToken?.name || "",
        email: userToken?.email || "",
        phone: userToken?.phone || "",
        company: userToken?.company || "",
        message: "",
      });
      setShowQuoteModal(false);
      setIsCartOpen(false);

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

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ✅ HANDLER SIMPLES para mudança de search
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
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
              onClick={() => handleCategoryChange("all")}
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
            </button>
          </SheetClose>

          {categories.map((category) => {
            const subcategories = getSubcategoriesByParent(category.id);
            const isExpanded = selectedCategory === category.id;

            return (
              <div key={category.id} className="space-y-1">
                <SheetClose asChild>
                  <button
                    onClick={() => handleCategoryChange(category.id)}
                    className={`w-full text-left px-3 py-3 rounded-lg flex items-center justify-between transition-colors ${
                      selectedCategory === category.id
                        ? "bg-zinc-700 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                    }`}
                  >
                    <span className="font-medium">{category.name}</span>
                  </button>
                </SheetClose>

                {/* Subcategorias no mobile */}
                {isExpanded && subcategories.length > 0 && (
                  <div className="ml-4 space-y-1">
                    {subcategories.map((subcategory) => (
                      <SheetClose key={subcategory.id} asChild>
                        <button
                          onClick={() => setSelectedSubcategory(subcategory.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors text-sm ${
                            selectedSubcategory === subcategory.id
                              ? "bg-zinc-600 text-white"
                              : "text-zinc-500 hover:text-white hover:bg-zinc-700/30"
                          }`}
                        >
                          <span>• {subcategory.name}</span>
                          <Badge className="bg-purple-500/20 text-purple-400">
                            {subcategoryCounts[subcategory.id] || 0}
                          </Badge>
                        </button>
                      </SheetClose>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );

  // Mobile Filters Menu (ordenação e modo de visualização)
  const MobileFiltersMenu = () => (
    <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
      <SheetContent
        side="right"
        className="bg-zinc-800 border-zinc-700 text-white w-72"
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="text-white">Filtros</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-2">
          <div className="space-y-2">
            <p className="text-sm text-zinc-400">Ordenar por</p>
            <div className="space-y-1">
              <SheetClose asChild>
                <button
                  onClick={() => setSortBy("name")}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${
                    sortBy === "name"
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                  }`}
                >
                  Nome (A-Z)
                </button>
              </SheetClose>
              <SheetClose asChild>
                <button
                  onClick={() => setSortBy("code")}
                  className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${
                    sortBy === "code"
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                  }`}
                >
                  Código
                </button>
              </SheetClose>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-zinc-400">Visualização</p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setViewMode("grid")}
                className={`flex-1 text-white ${
                  viewMode === "grid"
                    ? "bg-zinc-700 hover:bg-zinc-600"
                    : "hover:bg-zinc-700/50"
                }`}
              >
                <Grid className="h-4 w-4 mr-2" />
                Grade
              </Button>
              <Button
                variant="ghost"
                onClick={() => setViewMode("list")}
                className={`flex-1 text-white ${
                  viewMode === "list"
                    ? "bg-zinc-700 hover:bg-zinc-600"
                    : "hover:bg-zinc-700/50"
                }`}
              >
                <List className="h-4 w-4 mr-2" />
                Lista
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  // Loading state
  if ((isLoadingParts && !displayParts.length) || categoriesLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-zinc-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-white">Carregando peças...</p>
        </div>
      </div>
    );
  }

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
            {!canUseCart && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAccessInfo(true)}
                className="text-amber-400 hover:bg-amber-400/10 hidden sm:flex"
              >
                <Shield className="h-4 w-4 mr-1" />
                Solicitar Acesso
              </Button>
            )}

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
                  onClick={() => {
                    if (!canUseCart) {
                      requestCartAccess();
                      return;
                    }
                    setIsCartOpen(true);
                  }}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {canUseCart && cart.length > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-500">
                      {cart.length}
                    </Badge>
                  )}
                  {!canUseCart && (
                    <Lock className="absolute -top-1 -right-1 h-3 w-3 text-amber-400" />
                  )}
                </Button>
              </SheetTrigger>

              {/* Cart Sheet Content */}
              {canUseCart && (
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
                          <Button className="bg-zinc-700 hover:bg-zinc-600">
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
                              <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                                <PartImage
                                  src={item.image || item.externalImageUrl}
                                  imageHash={item.imageHash}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                  defaultImage="/default-part.png"
                                />
                              </div>

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
                                      onClick={() =>
                                        updateQuantity(item.id, -1)
                                      }
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
                        onClick={() => setShowQuoteModal(true)}
                      >
                        Solicitar Orçamento
                      </Button>
                    </div>
                  )}
                </SheetContent>
              )}
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
              onClick={() => handleCategoryChange("all")}
            >
              Todas
            </Button>

            {categories.map((category) => {
              const subcategories = getSubcategoriesByParent(category.id);
              const isSelected = selectedCategory === category.id;

              return (
                <React.Fragment key={category.id}>
                  <Button
                    variant={isSelected ? "secondary" : "outline"}
                    size="sm"
                    className={`rounded-full ${
                      isSelected
                        ? "bg-zinc-700 text-white"
                        : "bg-transparent text-zinc-400 border-zinc-700"
                    }`}
                    onClick={() => handleCategoryChange(category.id)}
                  >
                    {category.name}
                  </Button>

                  {/* Subcategorias no topo */}
                  {isSelected &&
                    subcategories.map((subcategory) => (
                      <Button
                        key={subcategory.id}
                        variant={
                          selectedSubcategory === subcategory.id
                            ? "secondary"
                            : "outline"
                        }
                        size="sm"
                        className={`rounded-full ${
                          selectedSubcategory === subcategory.id
                            ? "bg-zinc-600 text-white"
                            : "bg-transparent text-zinc-500 border-zinc-600"
                        }`}
                        onClick={() => setSelectedSubcategory(subcategory.id)}
                      >
                        • {subcategory.name}
                        <Badge className="ml-1 bg-purple-500/20 text-purple-400 text-xs">
                          {subcategoryCounts[subcategory.id] || 0}
                        </Badge>
                      </Button>
                    ))}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar with Categories (Desktop) */}
        <aside className="hidden lg:block w-80 min-h-screen border-r border-zinc-700 bg-zinc-800 p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Categorias</h2>

            <button
              onClick={() => handleCategoryChange("all")}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                selectedCategory === "all"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
              }`}
            >
              <span>Todas as Categorias</span>
            </button>

            {categories.map((category) => {
              const subcategories = getSubcategoriesByParent(category.id);
              const isExpanded = selectedCategory === category.id;

              return (
                <div key={category.id} className="space-y-1">
                  <button
                    onClick={() => handleCategoryChange(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                      selectedCategory === category.id
                        ? "bg-zinc-700 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                    }`}
                  >
                    <span className="font-medium">{category.name}</span>
                  </button>

                  {/* Subcategorias */}
                  {isExpanded && subcategories.length > 0 && (
                    <div className="ml-4 space-y-1">
                      {subcategories.map((subcategory) => (
                        <button
                          key={subcategory.id}
                          onClick={() => setSelectedSubcategory(subcategory.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors text-sm ${
                            selectedSubcategory === subcategory.id
                              ? "bg-zinc-600 text-white"
                              : "text-zinc-500 hover:text-white hover:bg-zinc-700/30"
                          }`}
                        >
                          <span>• {subcategory.name}</span>
                          <Badge className="bg-purple-500/20 text-purple-400">
                            {subcategoryCounts[subcategory.id] || 0}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* Access Status Banner */}
          {!canUseCart && (
            <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-amber-400 font-medium mb-1">
                    Acesso Limitado
                  </h3>
                  <p className="text-zinc-300 text-sm mb-3">
                    Você pode navegar e ver todos os produtos, mas para usar o
                    carrinho e solicitar orçamentos é necessário aprovação.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setShowAccessInfo(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Solicitar Acesso ao Carrinho
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ✅ SEARCH E FILTROS - SIMPLES */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Buscar peças por nome, código ou descrição..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10 pr-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
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

            {/* Desktop Filters */}
            <div className="hidden sm:flex justify-between items-center">
              <div className="text-sm text-zinc-400">
                {debouncedSearchTerm ? (
                  <span>
                    <span className="font-medium text-white">
                      {displayParts.length}
                    </span>{" "}
                    peças encontradas para "{debouncedSearchTerm}"
                  </span>
                ) : (
                  <span>
                    Mostrando{" "}
                    <span className="font-medium text-white">
                      {displayParts.length}
                    </span>{" "}
                    peças
                    {hasMore && (
                      <span className="text-zinc-500">
                        {" "}
                        (há mais disponíveis)
                      </span>
                    )}
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
                      <span className="mr-1">
                        {sortBy === "name" ? "Nome" : "Código"}
                      </span>
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

          {/* ✅ INDICADOR DE BUSCA ATIVA */}
          {debouncedSearchTerm && (
            <div className="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-400" />
                <span className="text-blue-400 text-sm">
                  Resultados da busca por "{debouncedSearchTerm}" •{" "}
                  {displayParts.length} peças encontradas
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="ml-auto h-6 px-2 text-blue-400 hover:text-white hover:bg-blue-600/20"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert
              variant="destructive"
              className="border-red-500 bg-red-500/10 mb-6"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-400 flex items-center justify-between gap-4">
                <span>{error}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setError(null);
                    refreshCatalog();
                  }}
                  className="border-red-500/50 text-red-300 bg-zinc-800 hover:bg-red-500/20 hover:text-white"
                >
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* ✅ LOADING STATE */}
          {isLoadingParts && displayParts.length === 0 && (
            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
                <p className="text-white">Carregando peças...</p>
              </CardContent>
            </Card>
          )}

          {/* Products Grid/List */}
          {displayParts.length > 0 && (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              }
            >
              {displayParts.map((part) => (
                <Card
                  key={part.id}
                  className="bg-zinc-800 border-zinc-700 hover:border-zinc-600 transition-colors"
                >
                  <CardContent
                    className={viewMode === "grid" ? "p-4" : "p-4 flex gap-4"}
                  >
                    {viewMode === "grid" ? (
                      <>
                        <div className="w-full h-48 mb-4 rounded-lg overflow-hidden">
                          <PartImage
                            src={part.image || part.externalImageUrl}
                            imageHash={part.imageHash}
                            alt={part.name}
                            className="w-full h-full object-cover"
                            defaultImage="/default-part.png"
                          />
                        </div>
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
                            className={`w-full mt-4 ${
                              canUseCart
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-amber-600 hover:bg-amber-700"
                            }`}
                            onClick={() => addToCart(part)}
                          >
                            {canUseCart ? (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar ao Carrinho
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 mr-2" />
                                Solicitar Acesso
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden">
                          <PartImage
                            src={part.image || part.externalImageUrl}
                            imageHash={part.imageHash}
                            alt={part.name}
                            className="w-full h-full object-cover"
                            defaultImage="/default-part.png"
                          />
                        </div>
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
                              className={`w-full sm:w-auto ${
                                canUseCart
                                  ? "bg-green-600 hover:bg-green-700"
                                  : "bg-amber-600 hover:bg-amber-700"
                              }`}
                              onClick={() => addToCart(part)}
                            >
                              {canUseCart ? (
                                <>
                                  <Plus className="h-4 w-4 mr-2" />
                                  {isMobile
                                    ? "Adicionar"
                                    : "Adicionar ao Carrinho"}
                                </>
                              ) : (
                                <>
                                  <Shield className="h-4 w-4 mr-2" />
                                  {isMobile ? "Acesso" : "Solicitar Acesso"}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {displayParts.length === 0 && !isLoadingParts && (
            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="p-8 text-center">
                <Search className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2 text-white">
                  Nenhuma peça encontrada
                </p>
                <p className="text-zinc-400">
                  {debouncedSearchTerm
                    ? `Tente buscar por outros termos ou limpe o filtro de busca`
                    : `Tente ajustar seus filtros ou categorias`}
                </p>
                {debouncedSearchTerm && (
                  <Button
                    onClick={clearSearch}
                    className="mt-4 bg-zinc-700 hover:bg-zinc-600"
                  >
                    Limpar Busca
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* ✅ LOAD MORE - só aparece quando NÃO está pesquisando */}
          {hasMore && !debouncedSearchTerm && displayParts.length > 0 && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={loadMoreParts}
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
                    Carregar Mais (20 peças)
                  </>
                )}
              </Button>
            </div>
          )}

          {!hasMore && displayParts.length > 0 && !debouncedSearchTerm && (
            <div className="text-center mt-8">
              <p className="text-zinc-400">
                ✅ Todas as peças foram carregadas ({displayParts.length} total)
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Fixed Cart Button for Mobile */}
      {(isMobile || isTablet) && (
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            size="lg"
            className={`cart-button h-16 w-16 rounded-full shadow-lg border-4 border-zinc-900 flex items-center justify-center ${
              canUseCart
                ? "bg-green-600 hover:bg-green-700"
                : "bg-amber-600 hover:bg-amber-700"
            }`}
            onClick={() => {
              if (!canUseCart) {
                requestCartAccess();
                return;
              }
              setIsCartOpen(true);
            }}
          >
            <div className="relative">
              <ShoppingCart className="h-6 w-6" />
              {canUseCart && cart.length > 0 && (
                <Badge className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center bg-red-500 text-white font-bold">
                  {cart.reduce((total, item) => total + item.quantity, 0)}
                </Badge>
              )}
              {!canUseCart && (
                <Lock className="absolute -top-1 -right-1 h-4 w-4 text-white" />
              )}
            </div>
          </Button>
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

      {/* Mobile Menus */}
      <MobileCategoryMenu />
      <MobileFiltersMenu />

      {/* Access Info Modal */}
      <Dialog open={showAccessInfo} onOpenChange={setShowAccessInfo}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-amber-500" />
              Como Solicitar Acesso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <h3 className="text-amber-400 font-medium mb-2">
                Processo Simples:
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-300">
                <li>Tente adicionar qualquer produto ao carrinho</li>
                <li>Preencha suas informações básicas</li>
                <li>Aguarde aprovação da nossa equipe</li>
                <li>Receba um link de acesso por email</li>
                <li>Use o carrinho livremente após aprovação</li>
              </ol>
            </div>
            <p className="text-sm text-zinc-400">
              A aprovação geralmente leva até 24 horas úteis. Você continuará
              podendo navegar na loja enquanto aguarda.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowAccessInfo(false)}
              className="bg-zinc-700 hover:bg-zinc-600"
            >
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quote Modal */}
      {canUseCart && (
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
                Seus dados já estão preenchidos. Verifique se estão corretos.
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh]">
              {/* Resumo do carrinho */}
              <div className="mb-4 bg-zinc-700/30 rounded-lg p-3">
                <h3 className="font-medium text-zinc-300 mb-2 flex items-center">
                  <Package className="h-4 w-4 mr-2 text-zinc-400" />
                  Resumo do Pedido
                  <Badge className="ml-2 bg-zinc-600">
                    {cart.reduce((total, item) => total + item.quantity, 0)}{" "}
                    itens
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
                    Email <span className="text-red-400 ml-1">*</span>
                  </label>
                  <Input
                    name="email"
                    type="email"
                    value={quoteFormData.email}
                    onChange={handleQuoteFormChange}
                    className="bg-zinc-700 border-zinc-600 text-white h-10"
                    placeholder="seu@email.com"
                    readOnly={!!userToken?.email}
                  />
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
                      readOnly={!!userToken?.phone}
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
                      readOnly={!!userToken?.company}
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
      )}

      {/* CSS para animações */}
      <style>{`
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
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default PublicShop;
