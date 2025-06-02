// PublicShop.jsx - OTIMIZADO com sistema de busca inteligente e paginação real

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  addDoc,
  limit,
  startAfter,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useCategories } from "../../context/CategoriesContext.jsx";
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
  Lock,
  Shield,
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
  // ✅ NOVA ESTRUTURA - Paginação Real Otimizada
  const [parts, setParts] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalLoadedCount, setTotalLoadedCount] = useState(0);

  // USAR cache de categorias
  const {
    categories,
    getSubcategoriesByParent,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ BUSCA OTIMIZADA - Debounce para evitar muitas consultas
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

  // ✅ PAGINAÇÃO REAL - Substituindo paginação client-side
  const itemsPerPage = 12; // Menor para mobile, melhor UX

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

  // ✅ DEBOUNCE OTIMIZADO - Evita consultas desnecessárias
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms de delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

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

  // ✅ FUNÇÃO OTIMIZADA DE BUSCA - Similar ao ManagePartsLibrary
  const fetchParts = useCallback(
    async (reset = false) => {
      try {
        setIsLoading(true);
        setError(null);

        // Construir query base
        let q = query(collection(db, "pecas"));

        // Aplicar filtros de categoria/subcategoria
        if (selectedCategory !== "all") {
          q = query(q, where("categoryId", "==", selectedCategory));
        }
        if (selectedSubcategory !== "all") {
          q = query(q, where("subcategoryId", "==", selectedSubcategory));
        }

        // ✅ LÓGICA DE BUSCA OTIMIZADA
        if (debouncedSearchTerm) {
          console.log("🔍 Busca ativa:", debouncedSearchTerm);

          // Quando há busca, buscar TODOS os documentos que correspondem aos filtros
          // Isso é mais eficiente que fazer múltiplas queries pequenas
          const searchQuery = query(q, orderBy(sortBy, "asc"));
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
          setHasMore(false); // Não há paginação durante busca
          setLastVisible(null);
          setTotalLoadedCount(filteredParts.length);

          console.log(
            `📊 Busca concluída: ${filteredParts.length} peças encontradas de ${allParts.length} total`
          );
          setIsLoading(false);
          return;
        }

        // ✅ PAGINAÇÃO REAL QUANDO NÃO HÁ BUSCA
        console.log(
          `📄 Carregando página ${reset ? "inicial" : "seguinte"}...`
        );

        // Aplicar ordenação
        q = query(q, orderBy(sortBy, "asc"));

        // Aplicar paginação
        if (lastVisible && !reset) {
          q = query(q, startAfter(lastVisible));
        }

        q = query(q, limit(itemsPerPage));

        const snapshot = await getDocs(q);
        const partsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log(`📦 ${partsData.length} peças carregadas`);

        if (reset) {
          setParts(partsData);
          setTotalLoadedCount(partsData.length);
        } else {
          setParts((prev) => [...prev, ...partsData]);
          setTotalLoadedCount((prev) => prev + partsData.length);
        }

        // Atualizar cursor para próxima página
        if (snapshot.docs.length > 0) {
          setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        }

        // Verificar se há mais páginas
        setHasMore(snapshot.docs.length === itemsPerPage);
      } catch (err) {
        console.error("❌ Erro ao buscar peças:", err);
        setError("Erro ao carregar peças. Por favor, tente novamente.");

        // ✅ FALLBACK SEM ORDENAÇÃO
        if (
          err.code === "failed-precondition" ||
          err.message.includes("index")
        ) {
          try {
            console.log("🔄 Tentando fallback sem ordenação...");
            let fallbackQuery = query(collection(db, "pecas"));

            if (selectedCategory !== "all") {
              fallbackQuery = query(
                fallbackQuery,
                where("categoryId", "==", selectedCategory)
              );
            }
            if (selectedSubcategory !== "all") {
              fallbackQuery = query(
                fallbackQuery,
                where("subcategoryId", "==", selectedSubcategory)
              );
            }

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
              setTotalLoadedCount(filteredParts.length);
            } else {
              if (lastVisible && !reset) {
                fallbackQuery = query(
                  fallbackQuery,
                  startAfter(lastVisible),
                  limit(itemsPerPage)
                );
              } else {
                fallbackQuery = query(fallbackQuery, limit(itemsPerPage));
              }

              const fallbackSnapshot = await getDocs(fallbackQuery);
              const fallbackData = fallbackSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));

              if (reset) {
                setParts(fallbackData);
                setTotalLoadedCount(fallbackData.length);
              } else {
                setParts((prev) => [...prev, ...fallbackData]);
                setTotalLoadedCount((prev) => prev + fallbackData.length);
              }

              if (fallbackSnapshot.docs.length > 0) {
                setLastVisible(
                  fallbackSnapshot.docs[fallbackSnapshot.docs.length - 1]
                );
              }

              setHasMore(fallbackSnapshot.docs.length === itemsPerPage);
            }

            setError(
              "⚠️ Ordenação temporariamente indisponível. Dados exibidos sem ordenação."
            );
          } catch (fallbackErr) {
            console.error("❌ Erro no fallback:", fallbackErr);
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      sortBy,
      selectedCategory,
      selectedSubcategory,
      debouncedSearchTerm,
      lastVisible,
    ]
  );

  // ✅ EFFECT OTIMIZADO - Só recarrega quando necessário
  useEffect(() => {
    console.log("🔄 Resetando dados e carregando...");
    setParts([]);
    setLastVisible(null);
    setHasMore(true);
    setTotalLoadedCount(0);
    fetchParts(true);
  }, [sortBy, selectedCategory, selectedSubcategory, debouncedSearchTerm]);

  // ✅ FUNÇÃO PARA CARREGAR MAIS
  const loadMore = () => {
    if (hasMore && !isLoading && !debouncedSearchTerm) {
      console.log("📄 Carregando mais peças...");
      fetchParts(false);
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
        setCart(JSON.parse(savedCart));
      }
    }
  }, [canUseCart]);

  // Save cart to localStorage
  useEffect(() => {
    if (canUseCart) {
      localStorage.setItem("shop-cart", JSON.stringify(cart));
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

  // Add to cart - NOVA LÓGICA
  const addToCart = (part) => {
    // Se não pode usar carrinho, solicita acesso
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

    // Feedback visual
    if (isMobile || isTablet) {
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

  // ✅ FILTROS DE CATEGORIA SIMPLIFICADOS - Os filtros principais agora são server-side
  const getDisplayParts = () => {
    // Agora os parts já vêm filtrados do servidor
    // Apenas aplicamos ordenação local se necessário
    let filtered = [...parts];

    // Ordenação local para melhor UX (já que os dados estão carregados)
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
        default:
          return a.name?.localeCompare(b.name) || 0;
        case "price":
          return (a.price || 0) - (b.price || 0);
        case "code":
          return a.code?.localeCompare(b.code) || 0;
      }
    });

    return filtered;
  };

  const displayParts = getDisplayParts();

  // Reset subcategory when category changes
  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory("all");
  };

  // ✅ FUNÇÃO PARA LIMPAR BUSCA
  const clearSearch = () => {
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
          price: item.price,
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

  // Mobile Category Menu - ATUALIZADO
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

  // Loading state
  if (isLoading && !parts.length) {
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

                  {/* Mostrar subcategorias se categoria estiver selecionada */}
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

          {/* ✅ SEARCH E FILTROS OTIMIZADOS */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Buscar peças por nome, código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                        {sortBy === "name"
                          ? "Nome"
                          : sortBy === "price"
                          ? "Preço"
                          : "Código"}
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
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Products Grid/List */}
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

            {displayParts.length === 0 && !isLoading && (
              <Card className="bg-zinc-800 border-zinc-700 col-span-full">
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
          </div>

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
                    Carregar Mais ({itemsPerPage} peças)
                  </>
                )}
              </Button>
            </div>
          )}

          {!hasMore && displayParts.length > 0 && !debouncedSearchTerm && (
            <div className="text-center mt-8">
              <p className="text-zinc-400">
                ✅ Todas as peças foram carregadas ({totalLoadedCount} total)
              </p>
            </div>
          )}

          {/* Loading indicator for more data */}
          {isLoading && displayParts.length > 0 && (
            <div className="flex justify-center mt-8">
              <div className="flex items-center gap-2 text-zinc-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Carregando mais peças...</span>
              </div>
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

      {/* Quote Modal - só aparece se tiver acesso ao carrinho */}
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