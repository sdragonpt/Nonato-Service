// App.jsx - VERSÃO REORGANIZADA E OTIMIZADA

import React, { useState, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 IMPORTS DE BIBLIOTECAS EXTERNAS
// ═══════════════════════════════════════════════════════════════════════════════

import { getAuth, signOut } from "firebase/auth";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  Link,
  useNavigate,
} from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 IMPORTS DE ÍCONES
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Users,
  Wrench,
  Package,
  Book,
  ClipboardList,
  BarChart,
  CheckSquare,
  LogOut,
  Menu,
  X,
  Calendar,
  FileText,
  ClipboardCheck,
  Loader2,
  ChevronDown,
  Bell,
  Settings,
  User,
  UserCog,
  ShoppingBag,
  Store,
  Shield,
  Database,
  RotateCcw,
  Zap,
  Calculator,
  Euro,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// 🧩 IMPORTS DE COMPONENTES UI
// ═══════════════════════════════════════════════════════════════════════════════

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// ═══════════════════════════════════════════════════════════════════════════════
// 🏗️ IMPORTS DE COMPONENTES ESSENCIAIS (NÃO LAZY)
// ═══════════════════════════════════════════════════════════════════════════════

import ErrorBoundary from "./components/layout/ErrorBoundary";
import { CategoriesProvider } from "./context/CategoriesContext.jsx";
import { PartsCacheProvider } from "./context/PartsCache.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import NotificationsDropdown from "./components/ui/NotificationsDropdown";
import { useAuth } from "./hooks/useAuth";
import { initOldBrowserSupport } from "./utils/oldBrowserUtils.js";

// ═══════════════════════════════════════════════════════════════════════════════
// 📄 IMPORTS DE PÁGINAS PRINCIPAIS (LAZY LOADING)
// ═══════════════════════════════════════════════════════════════════════════════

const InitialPage = React.lazy(() => import("./pages/initial/InitialPage"));
const LoginPage = React.lazy(() => import("./pages/auth/LoginPage"));
const DashboardPage = React.lazy(() =>
  import("./pages/dashboard/DashboardPage")
);
const ProtectedRoute = React.lazy(() => import("./pages/auth/ProtectedRoute"));

// ═══════════════════════════════════════════════════════════════════════════════
// 👥 IMPORTS DE FEATURES - CLIENTES (LAZY LOADING)
// ═══════════════════════════════════════════════════════════════════════════════

const ManageClients = React.lazy(() =>
  import("./features/clients/ManageClients")
);
const AddClient = React.lazy(() =>
  import("./features/clients/components/AddClient")
);
const ClientDetail = React.lazy(() =>
  import("./features/clients/components/ClientDetail")
);
const EditClient = React.lazy(() =>
  import("./features/clients/components/EditClient")
);

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ IMPORTS DE FEATURES - EQUIPAMENTOS (LAZY LOADING)
// ═══════════════════════════════════════════════════════════════════════════════

const AddEquipment = React.lazy(() =>
  import("./features/equipments/AddEquipment")
);
const EquipmentDetail = React.lazy(() =>
  import("./features/equipments/EquipmentDetail")
);
const EditEquipment = React.lazy(() =>
  import("./features/equipments/EditEquipment")
);

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 IMPORTS DE FEATURES - ORDENS DE SERVIÇO (LAZY LOADING)
// ═══════════════════════════════════════════════════════════════════════════════

const ManageOrders = React.lazy(() => import("./features/orders/ManageOrders"));
const AddOrder = React.lazy(() =>
  import("./features/orders/components/AddOrder")
);
const OrderDetail = React.lazy(() =>
  import("./features/orders/components/OrderDetail")
);
const EditOrder = React.lazy(() =>
  import("./features/orders/components/EditOrder")
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🗓️ IMPORTS DE FEATURES - AGENDA (LAZY LOADING)
// ═══════════════════════════════════════════════════════════════════════════════

const ManageAgenda = React.lazy(() =>
  import("./features/agendamentos/ManageAgenda")
);
const AddAgendamento = React.lazy(() =>
  import("./features/agendamentos/components/AddAgendamento")
);
const AddPreAgendamento = React.lazy(() =>
  import("./features/agendamentos/components/AddPreAgendamento")
);
const EditAgendamento = React.lazy(() =>
  import("./features/agendamentos/components/EditAgendamento")
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🛠️ IMPORTS DE FEATURES - SERVIÇOS (LAZY LOADING)
// ═══════════════════════════════════════════════════════════════════════════════

const ManageServices = React.lazy(() =>
  import("./features/services/ManageServices")
);
const AddService = React.lazy(() =>
  import("./features/services/components/AddService")
);
const EditService = React.lazy(() =>
  import("./features/services/components/EditService")
);

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 IMPORTS DE FEATURES - ORÇAMENTOS (LAZY LOADING)
// ═══════════════════════════════════════════════════════════════════════════════

const ManageBudgets = React.lazy(() =>
  import("./features/budgets/ManageBudgets")
);
const AddBudget = React.lazy(() =>
  import("./features/budgets/components/AddBudget")
);
const AddSimpleBudget = React.lazy(() =>
  import("./features/budgets/components/AddSimpleBudget")
);
const EditBudget = React.lazy(() =>
  import("./features/budgets/components/EditBudget")
);
const EditSimpleBudget = React.lazy(() =>
  import("./features/budgets/components/EditSimpleBudget")
);

// ═══════════════════════════════════════════════════════════════════════════════
// 💰 IMPORTS DE FEATURES - FINANÇAS (LAZY LOADING)
// ═══════════════════════════════════════════════════════════════════════════════

const ManageFinances = React.lazy(() =>
  import("./features/finances/ManageFinances")
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 IMPORTS DE FEATURES - PEÇAS (LAZY LOADING)
// ═══════════════════════════════════════════════════════════════════════════════

const ManagePartsLibrary = React.lazy(() =>
  import("./features/parts/ManagePartsLibrary")
);
const AddPart = React.lazy(() => import("./features/parts/components/AddPart"));
const EditPart = React.lazy(() =>
  import("./features/parts/components/EditPart")
);
const PartDetail = React.lazy(() =>
  import("./features/parts/components/PartDetail")
);
const AddCategory = React.lazy(() =>
  import("./features/parts/components/AddCategory")
);
const AddSubcategory = React.lazy(() =>
  import("./features/parts/components/AddSubcategory")
);
const EditCategory = React.lazy(() =>
  import("./features/parts/components/EditCategory")
);
const ManageCategories = React.lazy(() =>
  import("./features/parts/ManageCategories")
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🧾 IMPORTS DE FEATURES - ORÇAMENTO DE PEÇAS (LAZY LOADING)
// ═══════════════════════════════════════════════════════════════════════════════

const ManagePartsBudgets = React.lazy(() =>
  import("./features/partsBudgets/ManagePartsBudgets")
);
const PartBudgetDetail = React.lazy(() =>
  import("./features/partsBudgets/components/PartBudgetDetail")
);
const EditPartBudget = React.lazy(() =>
  import("./features/partsBudgets/components/EditPartBudget")
);
const AddPartBudget = React.lazy(() =>
  import("./features/partsBudgets/components/AddPartBudget")
);

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ IMPORTS DE FEATURES - CHECKLISTS (LAZY LOADING)
// ═══════════════════════════════════════════════════════════════════════════════

const ManageChecklist = React.lazy(() =>
  import("./features/checklists/ManageCheckList")
);
const AddChecklistType = React.lazy(() =>
  import("./features/checklists/components/AddChecklistType")
);
const EditChecklistType = React.lazy(() =>
  import("./features/checklists/components/EditCheckListType")
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔍 IMPORTS DE FEATURES - INSPEÇÕES (LAZY LOADING)
// ═══════════════════════════════════════════════════════════════════════════════

const ManageInspection = React.lazy(() =>
  import("./features/inspections/ManageInspection")
);
const AddInspection = React.lazy(() =>
  import("./features/inspections/components/AddInspection")
);
const EditInspection = React.lazy(() =>
  import("./features/inspections/components/EditInspection")
);
const InspectionDetail = React.lazy(() =>
  import("./features/inspections/components/InspectionDetail")
);

// ═══════════════════════════════════════════════════════════════════════════════
// 👤 IMPORTS DE FEATURES - USUÁRIOS (LAZY LOADING)
// ═══════════════════════════════════════════════════════════════════════════════

const UserProfile = React.lazy(() =>
  import("./features/users/components/UserProfile")
);
const UserSettings = React.lazy(() =>
  import("./features/users/components/UserSettings")
);
const ManageUsers = React.lazy(() => import("./features/users/ManageUsers"));

// ═══════════════════════════════════════════════════════════════════════════════
// 📅 IMPORTS DE FEATURES - WORKDAYS (LAZY LOADING)
// ═══════════════════════════════════════════════════════════════════════════════

const AddWorkday = React.lazy(() => import("./features/workdays/AddWorkDay"));
const EditWorkday = React.lazy(() => import("./features/workdays/EditWorkDay"));

// ═══════════════════════════════════════════════════════════════════════════════
// 🛒 IMPORTS DE FEATURES - LOJA PÚBLICA (LAZY LOADING)
// ═══════════════════════════════════════════════════════════════════════════════

const PublicShop = React.lazy(() => import("./features/publicShop/PublicShop"));
const ManageOnlineQuotes = React.lazy(() =>
  import("./features/onlineQuotes/ManageOnlineQuotes")
);
const ManageShopAccess = React.lazy(() =>
  import("./features/shopAccess/ManageShopAccess")
);
const ShopAccessWrapper = React.lazy(() =>
  import("./features/publicShop/ShopAccessWrapper")
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 IMPORTS DE FEATURES - ADMINISTRAÇÃO (LAZY LOADING)
// ═══════════════════════════════════════════════════════════════════════════════

const ImageMigrationTool = React.lazy(() =>
  import("./context/ImageMigrationTool")
);
const RollbackTool = React.lazy(() => import("./context/RollbackTool"));

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ CONSTANTES E CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Itens de navegação organizados alfabeticamente dentro de cada seção
 */
const NAVIGATION_ITEMS = [
  {
    title: "Cadastro",
    items: [
      { path: "/app/parts-library", icon: Book, label: "Biblioteca de Peças" },
      { path: "/app/manage-clients", icon: Users, label: "Clientes" },
      { path: "/app/manage-budgets", icon: FileText, label: "Orçamentos" },
      { path: "/app/manage-services", icon: Wrench, label: "Serviços" },
    ],
  },
  {
    title: "Gestão",
    items: [
      { path: "/app/manage-agenda", icon: Calendar, label: "Agenda" },
      { path: "/app/manage-checklist", icon: CheckSquare, label: "Check List" },
      { path: "/app/manage-finances", icon: Euro, label: "Finanças" },
      {
        path: "/app/manage-inspection",
        icon: ClipboardCheck,
        label: "Inspeções",
      },
      {
        path: "/app/manage-orders",
        icon: ClipboardList,
        label: "Ordem de Serviço",
      },
      {
        path: "/app/parts-budgets",
        icon: Calculator,
        label: "Orçamento de Peças",
      },
      { path: "/app/manage-report", icon: BarChart, label: "Relatório" },
    ],
  },
  {
    title: "Loja Online",
    items: [
      {
        path: "/app/manage-shop-access",
        icon: Shield,
        label: "Gerenciar Acessos",
      },
      {
        path: "/app/orcamento-online",
        icon: Store,
        label: "Gestão de Orçamentos Online",
      },
      {
        path: "/loja",
        icon: ShoppingBag,
        label: "Visitar Loja",
        external: true,
      },
    ],
  },
  {
    title: "Administração",
    items: [
      {
        path: "/app/image-migration",
        icon: Database,
        label: "Migração de Imagens",
        adminOnly: true,
      },
      {
        path: "/app/rollback-tool",
        icon: RotateCcw,
        label: "Rollback de Migração",
        adminOnly: true,
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 🧩 COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Componente para controle de rotas baseadas em role
 */
const RoleRoute = React.memo(({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-white bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/app" replace />;
  }

  return children;
});

RoleRoute.displayName = "RoleRoute";

/**
 * Componente de navegação do usuário (dropdown)
 */
const UserNav = React.memo(() => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const auth = getAuth();

  const handleSignOut = useCallback(() => {
    signOut(auth);
  }, [auth]);

  const handleNavigateProfile = useCallback(() => {
    navigate("/app/profile");
  }, [navigate]);

  const handleNavigateSettings = useCallback(() => {
    navigate("/app/settings");
  }, [navigate]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={user?.photoURL || ""}
              alt={user?.displayName || ""}
            />
            <AvatarFallback>{user?.displayName?.[0] || "U"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 bg-zinc-800 border-zinc-700"
        align="end"
      >
        <DropdownMenuItem
          className="text-white hover:bg-zinc-700 cursor-pointer"
          onClick={handleNavigateProfile}
        >
          <User className="mr-2 h-4 w-4" />
          <span>Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-white hover:bg-zinc-700 cursor-pointer"
          onClick={handleNavigateSettings}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Configurações</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-700" />
        <DropdownMenuItem
          className="text-red-400 hover:bg-zinc-700 focus:text-red-400 cursor-pointer"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

UserNav.displayName = "UserNav";

/**
 * Shell principal do dashboard com sidebar e navegação
 */
const DashboardShell = React.memo(({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const handleNavigateUsers = useCallback(() => {
    navigate("/app/manage-users");
  }, [navigate]);

  const isActiveLink = useCallback(
    (path) => {
      return location.pathname === path;
    },
    [location.pathname]
  );

  // Fechar sidebar em mobile quando mudamos de rota
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [location]);

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-zinc-900">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Overlay para mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform duration-300 w-[280px] bg-zinc-900 border-r border-zinc-800 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="h-full px-4 py-4 flex flex-col">
          {/* Header da sidebar */}
          <div className="flex items-center justify-between mb-8 h-16">
            <Link
              to="/app"
              className="text-2xl font-bold text-white hover:text-zinc-200 transition-colors"
            >
              Dashboard
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-zinc-400" />
            </Button>
          </div>

          {/* Navegação */}
          <div className="flex-1 space-y-4 overflow-y-auto">
            {NAVIGATION_ITEMS.map((section, idx) => {
              // Filtrar seções admin para não-admins
              if (section.title === "Administração" && user?.role !== "admin") {
                return null;
              }

              return (
                <div key={idx} className="space-y-2">
                  <button
                    onClick={() =>
                      setActiveSection(
                        activeSection === section.title ? "" : section.title
                      )
                    }
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg ${
                      activeSection === section.title
                        ? "bg-green-700 hover:bg-green-700 text-white"
                        : "text-white font-bold bg-green-700/25 hover:bg-green-700/70 hover:border-green-700/70"
                    } transition-colors`}
                  >
                    <span className="text-base font-semibold">
                      {section.title}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        activeSection === section.title ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`space-y-1 pl-2 ${
                      activeSection === section.title ? "block" : "hidden"
                    }`}
                  >
                    {section.items
                      .filter((item) => {
                        // Filtrar itens admin-only
                        if (item.adminOnly && user?.role !== "admin") {
                          return false;
                        }
                        return true;
                      })
                      .map((item, itemIdx) => {
                        if (item.external) {
                          return (
                            <a
                              key={itemIdx}
                              href={item.path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-x-3 px-3 py-2 text-sm rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors`}
                            >
                              <item.icon className="w-4 h-4" />
                              {item.label}
                            </a>
                          );
                        }

                        return (
                          <Link
                            key={itemIdx}
                            to={item.path}
                            className={`flex items-center gap-x-3 px-3 py-2 text-sm rounded-lg ${
                              isActiveLink(item.path)
                                ? "bg-zinc-800 text-white"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                            } transition-colors`}
                          >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                            {item.adminOnly && (
                              <Badge className="ml-auto bg-red-500/20 text-red-400 text-xs">
                                Admin
                              </Badge>
                            )}
                          </Link>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer da sidebar */}
          <div className="mt-auto pt-4 border-t border-zinc-800">
            <UserNav />
          </div>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="transition-[margin] duration-300 md:ml-[280px]">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-zinc-800/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-800/75 border-b border-zinc-700">
          <div className="flex h-16 items-center gap-4 px-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={toggleSidebar}
            >
              <Menu className="h-6 w-6 text-zinc-400" />
            </Button>

            <div className="ml-auto flex items-center gap-4">
              {user?.role === "admin" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                  onClick={handleNavigateUsers}
                >
                  <UserCog className="h-5 w-5" />
                </Button>
              )}
              <NotificationsDropdown />
            </div>
          </div>
        </header>

        {/* Conteúdo das páginas */}
        <div className="p-4 sm:p-6 lg:p-8">
          <ErrorBoundary>
            <React.Suspense
              fallback={
                <div className="flex justify-center items-center min-h-[50vh]">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              }
            >
              {children}
            </React.Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
});

DashboardShell.displayName = "DashboardShell";

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Componente principal da aplicação
 */
const App = () => {
  const { user, loading } = useAuth();

  // Inicialização única da aplicação
  useEffect(() => {
    let cleanupOldBrowser;

    // Suporte para PCs antigos
    cleanupOldBrowser = initOldBrowserSupport();

    // Configuração Google Auth para mobile
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize({
        clientId:
          "896475175219-6cj6qd98usuduc3ps334orcc8o413dfl.apps.googleusercontent.com",
        scopes: ["profile", "email"],
        grantOfflineAccess: true,
      });
    }

    // Cleanup na desmontagem
    return () => {
      if (cleanupOldBrowser) {
        cleanupOldBrowser();
      }
    };
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-zinc-900">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <NotificationProvider>
      <CategoriesProvider>
        <PartsCacheProvider>
          <Router>
            <React.Suspense
              fallback={
                <div className="flex justify-center items-center min-h-screen bg-zinc-900">
                  <Loader2 className="h-12 w-12 animate-spin text-white" />
                </div>
              }
            >
              <Routes>
                {/* Redirecionamentos */}
                <Route path="/" element={<Navigate to="/app" />} />
                <Route path="/app" element={<Navigate to="/app/dashboard" />} />

                {/* Páginas públicas */}
                <Route path="/start" element={<InitialPage />} />
                <Route path="/login" element={<LoginPage />} />

                {/* Loja pública */}
                <Route
                  path="/loja"
                  element={
                    <ShopAccessWrapper>
                      <PublicShop />
                    </ShopAccessWrapper>
                  }
                />
                <Route
                  path="/loja/categoria/:categoryId"
                  element={
                    <ShopAccessWrapper>
                      <PublicShop />
                    </ShopAccessWrapper>
                  }
                />
                <Route
                  path="/loja/busca"
                  element={
                    <ShopAccessWrapper>
                      <PublicShop />
                    </ShopAccessWrapper>
                  }
                />

                {/* Rotas protegidas */}
                <Route
                  path="/app/*"
                  element={
                    <ProtectedRoute>
                      <DashboardShell>
                        <Routes>
                          {/* Dashboard */}
                          <Route path="dashboard" element={<DashboardPage />} />

                          {/* Profile e Settings */}
                          <Route path="profile" element={<UserProfile />} />
                          <Route path="settings" element={<UserSettings />} />

                          {/* Clientes */}
                          <Route
                            path="manage-clients"
                            element={<ManageClients />}
                          />
                          <Route path="add-client" element={<AddClient />} />
                          <Route
                            path="client/:clientId"
                            element={<ClientDetail />}
                          />
                          <Route
                            path="edit-client/:clientId"
                            element={<EditClient />}
                          />
                          <Route
                            path="client/:clientId/add-equipment"
                            element={<AddEquipment />}
                          />

                          {/* Equipamentos */}
                          <Route
                            path="add-equipment"
                            element={<AddEquipment />}
                          />
                          <Route
                            path="equipment/:equipmentId"
                            element={<EquipmentDetail />}
                          />
                          <Route
                            path="edit-equipment/:equipmentId"
                            element={<EditEquipment />}
                          />

                          {/* Ordens de Serviço */}
                          <Route
                            path="manage-orders"
                            element={<ManageOrders />}
                          />
                          <Route path="add-order" element={<AddOrder />} />
                          <Route
                            path="order-detail/:orderId"
                            element={<OrderDetail />}
                          />
                          <Route
                            path="edit-service-order/:orderId"
                            element={<EditOrder />}
                          />
                          <Route
                            path="order/:orderId/add-workday"
                            element={<AddWorkday />}
                          />
                          <Route
                            path="edit-workday/:workdayId"
                            element={<EditWorkday />}
                          />

                          {/* Serviços */}
                          <Route
                            path="manage-services"
                            element={<ManageServices />}
                          />
                          <Route path="add-service" element={<AddService />} />
                          <Route
                            path="edit-service/:serviceId"
                            element={<EditService />}
                          />

                          {/* Orçamentos */}
                          <Route
                            path="manage-budgets"
                            element={<ManageBudgets />}
                          />
                          <Route path="add-budget" element={<AddBudget />} />
                          <Route
                            path="add-simple-budget"
                            element={<AddSimpleBudget />}
                          />
                          <Route
                            path="edit-budget/:budgetId"
                            element={<EditBudget />}
                          />
                          <Route
                            path="edit-simple-budget/:budgetId"
                            element={<EditSimpleBudget />}
                          />

                          {/* Finanças */}
                          <Route
                            path="manage-finances"
                            element={<ManageFinances />}
                          />

                          {/* Orçamento de Peças */}
                          <Route
                            path="parts-budgets"
                            element={<ManagePartsBudgets />}
                          />
                          <Route
                            path="add-part-budget"
                            element={<AddPartBudget />}
                          />
                          <Route
                            path="part-budget-detail/:quoteId"
                            element={<PartBudgetDetail />}
                          />
                          <Route
                            path="edit-part-budget/:quoteId"
                            element={<EditPartBudget />}
                          />

                          {/* Agenda */}
                          <Route
                            path="manage-agenda"
                            element={<ManageAgenda />}
                          />
                          <Route
                            path="add-agendamento"
                            element={<AddAgendamento />}
                          />
                          <Route
                            path="add-pre-agendamento"
                            element={<AddPreAgendamento />}
                          />
                          <Route
                            path="edit-agendamento/:agendamentoId"
                            element={<EditAgendamento />}
                          />

                          {/* Checklists */}
                          <Route
                            path="manage-checklist"
                            element={<ManageChecklist />}
                          />
                          <Route
                            path="add-checklist-type"
                            element={<AddChecklistType />}
                          />
                          <Route
                            path="edit-checklist-type/:typeId"
                            element={<EditChecklistType />}
                          />

                          {/* Inspeções */}
                          <Route
                            path="manage-inspection"
                            element={<ManageInspection />}
                          />
                          <Route
                            path="add-inspection"
                            element={<AddInspection />}
                          />
                          <Route
                            path="edit-inspection/:inspectionId"
                            element={<EditInspection />}
                          />
                          <Route
                            path="inspection-detail/:inspectionId"
                            element={<InspectionDetail />}
                          />

                          {/* Biblioteca de Peças */}
                          <Route
                            path="parts-library"
                            element={<ManagePartsLibrary />}
                          />
                          <Route path="add-part" element={<AddPart />} />
                          <Route
                            path="edit-part/:partId"
                            element={<EditPart />}
                          />
                          <Route path="part/:partId" element={<PartDetail />} />
                          <Route
                            path="add-category"
                            element={<AddCategory />}
                          />
                          <Route
                            path="add-subcategory/:categoryId"
                            element={<AddSubcategory />}
                          />
                          <Route
                            path="edit-category/:categoryId"
                            element={<EditCategory />}
                          />
                          <Route
                            path="manage-categories"
                            element={<ManageCategories />}
                          />

                          {/* Loja Online */}
                          <Route
                            path="orcamento-online"
                            element={<ManageOnlineQuotes />}
                          />
                          <Route
                            path="manage-shop-access"
                            element={<ManageShopAccess />}
                          />

                          {/* Rotas apenas para Admin */}
                          <Route
                            path="manage-users"
                            element={
                              <RoleRoute allowedRoles={["admin"]}>
                                <ManageUsers />
                              </RoleRoute>
                            }
                          />
                          <Route
                            path="image-migration"
                            element={
                              <RoleRoute allowedRoles={["admin"]}>
                                <ImageMigrationTool />
                              </RoleRoute>
                            }
                          />
                          <Route
                            path="rollback-tool"
                            element={
                              <RoleRoute allowedRoles={["admin"]}>
                                <RollbackTool />
                              </RoleRoute>
                            }
                          />
                        </Routes>
                      </DashboardShell>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </React.Suspense>
          </Router>
        </PartsCacheProvider>
      </CategoriesProvider>
    </NotificationProvider>
  );
};

export default App;
