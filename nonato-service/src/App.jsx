// App.jsx - COM PARTSCACHE INTEGRADO + Ferramenta de Migração + Pré-Agendamento + SUPORTE PCs ANTIGOS

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Database, // ✅ NOVO: Para migração de imagens
  RotateCcw, // ✅ NOVO: Para rollback
  Zap, // ✅ NOVO: Para pré-agendamento
  Calculator, // ✅ NOVO: Para orçamento de peças
  Euro,
} from "lucide-react";

// ✅ NOVO: Suporte para PCs antigos
import { initOldBrowserSupport } from "./utils/oldBrowserUtils.js";

// ✅ LAZY LOADING - Componentes principais importados sob demanda
const InitialPage = React.lazy(() => import("./pages/initial/InitialPage"));
const LoginPage = React.lazy(() => import("./pages/auth/LoginPage"));
const DashboardPage = React.lazy(() =>
  import("./pages/dashboard/DashboardPage")
);
const ProtectedRoute = React.lazy(() => import("./pages/auth/ProtectedRoute"));

// ✅ LAZY LOADING - Features carregadas sob demanda
const ManageOrders = React.lazy(() => import("./features/orders/ManageOrders"));
const AddEquipment = React.lazy(() =>
  import("./features/equipments/AddEquipment")
);
const AddClient = React.lazy(() =>
  import("./features/clients/components/AddClient")
);
const ManageClients = React.lazy(() =>
  import("./features/clients/ManageClients")
);
const ClientDetail = React.lazy(() =>
  import("./features/clients/components/ClientDetail")
);
const EquipmentDetail = React.lazy(() =>
  import("./features/equipments/EquipmentDetail")
);
const EditClient = React.lazy(() =>
  import("./features/clients/components/EditClient")
);
const EditEquipment = React.lazy(() =>
  import("./features/equipments/EditEquipment")
);
const AddOrder = React.lazy(() =>
  import("./features/orders/components/AddOrder")
);
const OrderDetail = React.lazy(() =>
  import("./features/orders/components/OrderDetail")
);
const AddWorkday = React.lazy(() => import("./features/workdays/AddWorkDay"));
const EditOrder = React.lazy(() =>
  import("./features/orders/components/EditOrder")
);
const EditWorkday = React.lazy(() => import("./features/workdays/EditWorkDay"));
const ManageAgenda = React.lazy(() =>
  import("./features/agendamentos/ManageAgenda")
);
const AddAgendamento = React.lazy(() =>
  import("./features/agendamentos/components/AddAgendamento")
);
// ✅ NOVO: Pré-agendamento
const AddPreAgendamento = React.lazy(() =>
  import("./features/agendamentos/components/AddPreAgendamento")
);
const EditAgendamento = React.lazy(() =>
  import("./features/agendamentos/components/EditAgendamento")
);
const ManageServices = React.lazy(() =>
  import("./features/services/ManageServices")
);
const AddService = React.lazy(() =>
  import("./features/services/components/AddService")
);
const EditService = React.lazy(() =>
  import("./features/services/components/EditService")
);
const AddBudget = React.lazy(() =>
  import("./features/budgets/components/AddBudget")
);
const EditBudget = React.lazy(() =>
  import("./features/budgets/components/EditBudget")
);
const EditSimpleBudget = React.lazy(() =>
  import("./features/budgets/components/EditSimpleBudget")
);
const ManageBudgets = React.lazy(() =>
  import("./features/budgets/ManageBudgets")
);
const AddSimpleBudget = React.lazy(() =>
  import("./features/budgets/components/AddSimpleBudget")
);
const PartBudgetDetail = React.lazy(() =>
  import("./features/partsBudgets/components/PartBudgetDetail")
);
const EditPartBudget = React.lazy(() =>
  import("./features/partsBudgets/components/EditPartBudget")
);
const ManageChecklist = React.lazy(() =>
  import("./features/checklists/ManageCheckList")
);
const AddChecklistType = React.lazy(() =>
  import("./features/checklists/components/AddChecklistType")
);
const EditChecklistType = React.lazy(() =>
  import("./features/checklists/components/EditCheckListType")
);
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
const UserProfile = React.lazy(() =>
  import("./features/users/components/UserProfile")
);
const UserSettings = React.lazy(() =>
  import("./features/users/components/UserSettings")
);
const ManageUsers = React.lazy(() => import("./features/users/ManageUsers"));
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

const ManageFinances = React.lazy(() =>
  import("./features/finances/ManageFinances")
);

// ✅ LAZY LOADING - Loja pública
const PublicShop = React.lazy(() => import("./features/publicShop/PublicShop"));
// ✅ NOVO: Orçamento de Peças (ordens convertidas com isQuote: true)
const ManagePartsBudgets = React.lazy(() =>
  import("./features/partsBudgets/ManagePartsBudgets")
);
// ✅ MANTER: Gestão de Orçamentos Online (conversões)
const ManageOnlineQuotes = React.lazy(() =>
  import("./features/onlineQuotes/ManageOnlineQuotes")
);
const ManageShopAccess = React.lazy(() =>
  import("./features/shopAccess/ManageShopAccess")
);
const ShopAccessWrapper = React.lazy(() =>
  import("./features/publicShop/ShopAccessWrapper")
);

// ✅ NOVO: Ferramenta de migração de imagens
const ImageMigrationTool = React.lazy(
  () => import("./context/ImageMigrationTool") // Caminho para src/context/
);

// ✅ NOVO: Ferramenta de rollback
const RollbackTool = React.lazy(
  () => import("./context/RollbackTool") // Caminho para src/context/
);

// ✅ COMPONENTES ESSENCIAIS - Não lazy load para evitar flash
import ErrorBoundary from "./components/layout/ErrorBoundary";
import { CategoriesProvider } from "./context/CategoriesContext.jsx";
import { PartsCacheProvider } from "./context/PartsCache.jsx"; // ✅ NOVO: Cache de peças
// import CacheDebugTool from "./components/debug/CacheDebugTool.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import NotificationsDropdown from "./components/ui/NotificationsDropdown";

import { useAuth } from "./hooks/useAuth";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { Capacitor } from "@capacitor/core";

// UI Components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge"; // ✅ NOVO: Para badge admin

// ✅ MEMOIZED NAVIGATION - Evita re-renders desnecessários
const NAVIGATION_ITEMS = [
  {
    title: "Cadastro",
    items: [
      { path: "/app/manage-clients", icon: Users, label: "Clientes" },
      { path: "/app/manage-services", icon: Wrench, label: "Serviços" },
      { path: "/app/manage-budgets", icon: FileText, label: "Orçamentos" },
      { path: "/app/parts-library", icon: Book, label: "Biblioteca de Peças" },
    ],
  },
  {
    title: "Gestão",
    items: [
      {
        path: "/app/manage-orders",
        icon: ClipboardList,
        label: "Ordem de Serviço",
      },
      {
        path: "/app/manage-finances",
        icon: Euro,
        label: "Finanças",
      },
      {
        path: "/app/parts-budgets",
        icon: Calculator,
        label: "Orçamento de Peças",
      },
      { path: "/app/manage-agenda", icon: Calendar, label: "Agenda" },
      { path: "/app/manage-report", icon: BarChart, label: "Relatório" },
      { path: "/app/manage-checklist", icon: CheckSquare, label: "Check List" },
      {
        path: "/app/manage-inspection",
        icon: ClipboardCheck,
        label: "Inspeções",
      },
    ],
  },
  {
    title: "Loja Online",
    items: [
      {
        path: "/loja",
        icon: ShoppingBag,
        label: "Visitar Loja",
        external: true,
      },
      {
        path: "/app/orcamento-online",
        icon: Store,
        label: "Gestão de Orçamentos Online",
      },
      {
        path: "/app/manage-shop-access",
        icon: Shield,
        label: "Gerenciar Acessos",
      },
    ],
  },
  // ✅ NOVA SEÇÃO: Administração
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

// ✅ COMPONENTE OTIMIZADO - Evita re-renders
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

// ✅ COMPONENTE OTIMIZADO - Memoizado para evitar re-renders
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

// ✅ SIDEBAR OTIMIZADA - Memoizada e com navegação otimizada
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

  // ✅ MEMOIZED - Evita recalcular toda vez
  const isActiveLink = useCallback(
    (path) => {
      return location.pathname === path;
    },
    [location.pathname]
  );

  // ✅ EFFECT OTIMIZADO - Só roda quando necessário
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [location]);

  // ✅ LOADING OTIMIZADO
  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-zinc-900">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Overlay */}
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

          <div className="flex-1 space-y-4 overflow-y-auto">
            {NAVIGATION_ITEMS.map((section, idx) => {
              // ✅ NOVO: Filtrar seções admin para não-admins
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
                        ? "bg-green-700 hover:bg-green-70 text-white"
                        : section.title === "Cadastro" ||
                          section.title === "Gestão" ||
                          section.title === "Loja Online" ||
                          section.title === "Administração"
                        ? "text-white font-bold bg-green-700/25 hover:bg-green-700/70 hover:border-green-700/70"
                        : "text-zinc-400 hover:text-white"
                    } transition-colors`}
                  >
                    <span
                      className={`${
                        section.title === "Cadastro" ||
                        section.title === "Gestão" ||
                        section.title === "Loja Online" ||
                        section.title === "Administração"
                          ? "text-base"
                          : "text-sm"
                      } font-semibold`}
                    >
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
                        // ✅ NOVO: Filtrar itens admin-only
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
                            {/* ✅ NOVO: Badge admin */}
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

          <div className="mt-auto pt-4 border-t border-zinc-800">
            <UserNav />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="transition-[margin] duration-300 md:ml-[280px]">
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

// ✅ COMPONENTE PRINCIPAL OTIMIZADO COM SUPORTE PCs ANTIGOS
const App = () => {
  const { user, loading } = useAuth();

  // ✅ EFEITO OTIMIZADO - Inicialização única
  useEffect(() => {
    let cleanupOldBrowser;

    // ✅ NOVO: Suporte para PCs antigos
    cleanupOldBrowser = initOldBrowserSupport();

    // Configuração Google Auth (já existente)
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize({
        clientId:
          "896475175219-6cj6qd98usuduc3ps334orcc8o413dfl.apps.googleusercontent.com",
        scopes: ["profile", "email"],
        grantOfflineAccess: true,
      });
    }

    // ✅ NOVO: Cleanup na desmontagem
    return () => {
      if (cleanupOldBrowser) {
        cleanupOldBrowser();
      }
    };
  }, []);

  // ✅ LOADING OTIMIZADO
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
          {" "}
          {/* ✅ NOVO: Cache inteligente para peças */}
          <Router>
            <React.Suspense
              fallback={
                <div className="flex justify-center items-center min-h-screen bg-zinc-900">
                  <Loader2 className="h-12 w-12 animate-spin text-white" />
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Navigate to="/app" />} />
                <Route path="/app" element={<Navigate to="/app/dashboard" />} />
                <Route path="/start" element={<InitialPage />} />
                <Route path="/login" element={<LoginPage />} />

                {/* ✅ LOJA PÚBLICA - Otimizada com lazy loading */}
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

                {/* ✅ ROTAS PROTEGIDAS - Todas com lazy loading */}
                <Route
                  path="/app/*"
                  element={
                    <ProtectedRoute>
                      <DashboardShell>
                        <Routes>
                          {/* ✅ NOVA ROTA: Orçamento de Peças (ordens convertidas) */}
                          <Route
                            path="/parts-budgets"
                            element={<ManagePartsBudgets />}
                          />
                          {/* ✅ MANTER: Gestão de Orçamentos Online (conversões) */}
                          <Route
                            path="/orcamento-online"
                            element={<ManageOnlineQuotes />}
                          />
                          <Route
                            path="/manage-finances"
                            element={<ManageFinances />}
                          />
                          <Route
                            path="/dashboard"
                            element={<DashboardPage />}
                          />
                          <Route path="add-client" element={<AddClient />} />
                          <Route
                            path="add-equipment"
                            element={<AddEquipment />}
                          />
                          <Route path="add-order" element={<AddOrder />} />
                          <Route
                            path="manage-orders"
                            element={<ManageOrders />}
                          />
                          <Route
                            path="manage-services"
                            element={<ManageServices />}
                          />
                          <Route path="add-service" element={<AddService />} />
                          <Route path="profile" element={<UserProfile />} />
                          <Route path="settings" element={<UserSettings />} />

                          {/* ✅ ROTAS PROTEGIDAS POR ROLE - Otimizadas */}
                          <Route
                            path="manage-users"
                            element={
                              <RoleRoute allowedRoles={["admin"]}>
                                <ManageUsers />
                              </RoleRoute>
                            }
                          />

                          {/* ✅ NOVA ROTA: Ferramenta de migração (só admin) */}
                          <Route
                            path="image-migration"
                            element={
                              <RoleRoute allowedRoles={["admin"]}>
                                <ImageMigrationTool />
                              </RoleRoute>
                            }
                          />

                          {/* ✅ NOVA ROTA: Ferramenta de rollback (só admin) */}
                          <Route
                            path="rollback-tool"
                            element={
                              <RoleRoute allowedRoles={["admin"]}>
                                <RollbackTool />
                              </RoleRoute>
                            }
                          />

                          {/* ✅ TODAS AS OUTRAS ROTAS COM LAZY LOADING */}
                          <Route
                            path="edit-service/:serviceId"
                            element={<EditService />}
                          />
                          <Route
                            path="manage-clients"
                            element={<ManageClients />}
                          />
                          <Route
                            path="client/:clientId"
                            element={<ClientDetail />}
                          />
                          <Route
                            path="equipment/:equipmentId"
                            element={<EquipmentDetail />}
                          />
                          <Route
                            path="edit-client/:clientId"
                            element={<EditClient />}
                          />
                          <Route
                            path="edit-equipment/:equipmentId"
                            element={<EditEquipment />}
                          />
                          <Route
                            path="client/:clientId/add-equipment"
                            element={<AddEquipment />}
                          />
                          <Route
                            path="order-detail/:orderId"
                            element={<OrderDetail />}
                          />
                          <Route
                            path="order/:orderId/add-workday"
                            element={<AddWorkday />}
                          />
                          <Route
                            path="edit-service-order/:orderId"
                            element={<EditOrder />}
                          />
                          <Route
                            path="edit-workday/:workdayId"
                            element={<EditWorkday />}
                          />
                          <Route
                            path="manage-agenda"
                            element={<ManageAgenda />}
                          />
                          <Route
                            path="add-agendamento"
                            element={<AddAgendamento />}
                          />
                          {/* ✅ NOVA ROTA: Pré-agendamento */}
                          <Route
                            path="add-pre-agendamento"
                            element={<AddPreAgendamento />}
                          />
                          <Route
                            path="edit-agendamento/:agendamentoId"
                            element={<EditAgendamento />}
                          />
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
                          <Route
                            path="manage-shop-access"
                            element={<ManageShopAccess />}
                          />
                          <Route
                            path="part-budget-detail/:quoteId"
                            element={<PartBudgetDetail />}
                          />
                          <Route
                            path="edit-part-budget/:quoteId"
                            element={<EditPartBudget />}
                          />
                        </Routes>
                      </DashboardShell>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </React.Suspense>
            {/* <CacheDebugTool /> */}
          </Router>
        </PartsCacheProvider>{" "}
        {/* ✅ Fim do novo provider */}
      </CategoriesProvider>
    </NotificationProvider>
  );
};

export default App;
