// App.jsx - VERSÃO MODERNA E OTIMIZADA

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
import { motion, AnimatePresence } from "framer-motion";

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 IMPORTS DE ÍCONES
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Users,
  Wrench,
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
  ChevronDown,
  Settings,
  User,
  UserCog,
  ShoppingBag,
  Store,
  Shield,
  Database,
  RotateCcw,
  Calculator,
  Euro,
  Building2,
  Sparkles,
  Bell,
  Search,
  Home,
  FileSpreadsheet,
  FolderOpen,
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
import { Input } from "@/components/ui/input";

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
// 📄 IMPORTS DE PÁGINAS PRINCIPAIS (LAZY LOADING SIMPLIFICADO)
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

const ManageDocuments = React.lazy(() =>
  import("./features/documents/ManageDocuments")
);

const ImageMigrationTool = React.lazy(() =>
  import("./context/ImageMigrationTool")
);
const RollbackTool = React.lazy(() => import("./context/RollbackTool"));
const PartsExportTool = React.lazy(() => import("./context/PartsExportTool"));

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ CONSTANTES E CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Itens de navegação organizados alfabeticamente dentro de cada seção
 */
const NAVIGATION_ITEMS = [
  {
    title: "Cadastro",
    icon: Users,
    items: [
      { path: "/app/parts-library", icon: Book, label: "Biblioteca de Peças" },
      { path: "/app/manage-clients", icon: Users, label: "Clientes" },
      { path: "/app/manage-budgets", icon: FileText, label: "Orçamentos" },
      { path: "/app/manage-services", icon: Wrench, label: "Serviços" },
    ],
  },
  {
    title: "Documentos",
    icon: FolderOpen,
    items: [
      { path: "/app/documents", icon: FolderOpen, label: "Documentos de Máquinas" },
    ],
  },
  {
    title: "Gestão",
    icon: ClipboardList,
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
    icon: Store,
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
    icon: Settings,
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
      {
        path: "/app/parts-export",
        icon: FileSpreadsheet,
        label: "Exportar Peças CSV",
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 🧩 COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Componente para controle de rotas baseadas em role - CORRIGIDO
 */
const RoleRoute = React.memo(({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  // ✅ AGUARDAR LOADING TERMINAR
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
    );
  }

  // ✅ VERIFICAR ROLE CORRETAMENTE
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
});

RoleRoute.displayName = "RoleRoute";

/**
 * Componente de navegação do usuário (dropdown) - MELHORADO
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
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full hover:bg-zinc-700/50 transition-all"
        >
          <Avatar className="h-10 w-10 ring-2 ring-green-500/20 hover:ring-green-500/50 transition-all">
            <AvatarImage
              src={user?.photoURL || ""}
              alt={user?.displayName || ""}
            />
            <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white font-semibold">
              {user?.displayName?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 bg-zinc-800/95 border-zinc-700/50 backdrop-blur-xl"
        align="end"
      >
        <div className="px-2 py-2">
          <p className="text-sm font-medium text-white">
            {user?.displayName || "Usuário"}
          </p>
          <p className="text-xs text-zinc-400">{user?.email}</p>
        </div>
        <DropdownMenuSeparator className="bg-zinc-700/50" />
        <DropdownMenuItem
          className="text-white hover:bg-zinc-700/50 cursor-pointer"
          onClick={handleNavigateProfile}
        >
          <User className="mr-2 h-4 w-4" />
          <span>Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-white hover:bg-zinc-700/50 cursor-pointer"
          onClick={handleNavigateSettings}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Configurações</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-700/50" />
        <DropdownMenuItem
          className="text-red-400 hover:bg-red-600/20 focus:text-red-400 cursor-pointer"
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
 * Shell principal do dashboard com sidebar e navegação - SEM LOADERS
 */
const DashboardShell = React.memo(({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("Cadastro"); // ✅ EXPANDIR PRIMEIRA SEÇÃO POR PADRÃO
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const handleNavigateUsers = useCallback(() => {
    navigate("/app/manage-users");
  }, [navigate]);

  const handleNavigateHome = useCallback(() => {
    navigate("/app/dashboard");
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

  // ✅ EXPANDIR SEÇÕES POR PADRÃO NA PRIMEIRA VISITA
  useEffect(() => {
    // Se não há seção ativa, expandir a primeira seção disponível
    if (!activeSection && NAVIGATION_ITEMS.length > 0) {
      const firstSection = NAVIGATION_ITEMS.find(
        (section) => section.title !== "Administração" || user?.role === "admin"
      );
      if (firstSection) {
        setActiveSection(firstSection.title);
      }
    }
  }, [activeSection, user?.role]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 overflow-x-hidden">
      {/* Overlay para mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - SEMPRE VISÍVEL NO DESKTOP */}
      <motion.aside
        className={`fixed top-0 left-0 z-40 h-screen w-[280px] bg-gradient-to-b from-zinc-900/95 to-zinc-800/95 border-r border-zinc-700/50 backdrop-blur-xl transform transition-transform duration-300 overflow-hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="h-full px-4 py-4 flex flex-col overflow-x-hidden">
          {/* Header da sidebar - MELHORADO */}
          <div className="flex items-center justify-between mb-8 h-16">
            <motion.div
              onClick={handleNavigateHome}
              className="flex items-center gap-3 cursor-pointer group"
              whileHover={{ opacity: 0.8 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative">
                <Building2 className="h-8 w-8 text-green-500 group-hover:text-emerald-400 transition-colors" />
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl group-hover:bg-green-500/30 transition-all" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white group-hover:text-green-100 transition-colors">
                  Nonato Service
                </h1>
                <p className="text-xs text-zinc-400">Sistema de Gestão</p>
              </div>
            </motion.div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden hover:bg-zinc-700/50"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-zinc-400" />
            </Button>
          </div>

          {/* Barra de pesquisa */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Buscar seções..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500 focus:border-green-500/50 focus:ring-green-500/20"
              />
            </div>
          </div>

          {/* Navegação - SEMPRE VISÍVEL */}
          <div className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden">
            {NAVIGATION_ITEMS.map((section, idx) => {
              // Filtrar seções admin para não-admins
              if (section.title === "Administração" && user?.role !== "admin") {
                return null;
              }

              // Filtrar por pesquisa
              const matchesSearch =
                searchQuery === "" ||
                section.title
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase()) ||
                section.items.some((item) =>
                  item.label.toLowerCase().includes(searchQuery.toLowerCase())
                );

              if (!matchesSearch) return null;

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="space-y-1"
                >
                  <motion.button
                    onClick={() =>
                      setActiveSection(
                        activeSection === section.title ? "" : section.title
                      )
                    }
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                      activeSection === section.title
                        ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/20"
                        : "text-zinc-300 hover:bg-zinc-800/50 hover:text-white"
                    }`}
                    whileHover={{ opacity: 0.9 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <section.icon className="w-5 h-5" />
                      <span className="font-medium">{section.title}</span>
                    </div>
                    <motion.div
                      animate={{
                        rotate: activeSection === section.title ? 180 : 0,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
                  </motion.button>

                  <AnimatePresence>
                    {activeSection === section.title && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-1 pl-2 overflow-hidden"
                      >
                        {section.items
                          .filter((item) => {
                            // Filtrar itens admin-only
                            if (item.adminOnly && user?.role !== "admin")
                              return false;
                            // Filtrar por pesquisa
                            return (
                              searchQuery === "" ||
                              item.label
                                .toLowerCase()
                                .includes(searchQuery.toLowerCase())
                            );
                          })
                          .map((item, itemIdx) => {
                            if (item.external) {
                              return (
                                <motion.a
                                  key={itemIdx}
                                  href={item.path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all group"
                                  whileHover={{ opacity: 0.8 }}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: itemIdx * 0.05 }}
                                >
                                  <item.icon className="w-4 h-4 group-hover:text-green-400 transition-colors" />
                                  {item.label}
                                </motion.a>
                              );
                            }

                            return (
                              <motion.div
                                key={itemIdx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: itemIdx * 0.05 }}
                              >
                                <Link
                                  to={item.path}
                                  className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-all group ${
                                    isActiveLink(item.path)
                                      ? "bg-green-600/20 text-green-400 border border-green-500/30"
                                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                                  }`}
                                >
                                  <item.icon
                                    className={`w-4 h-4 transition-colors ${
                                      isActiveLink(item.path)
                                        ? "text-green-400"
                                        : "group-hover:text-green-400"
                                    }`}
                                  />
                                  {item.label}
                                  {item.adminOnly && (
                                    <Badge className="ml-auto bg-red-500/20 text-red-400 text-xs border-red-500/30">
                                      Admin
                                    </Badge>
                                  )}
                                </Link>
                              </motion.div>
                            );
                          })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Footer da sidebar - MELHORADO */}
          <motion.div
            className="mt-auto pt-4 border-t border-zinc-700/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-green-500" />
                <span className="text-xs text-zinc-400 font-medium">
                  Sistema Online
                </span>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
            <UserNav />
          </motion.div>
        </div>
      </motion.aside>

      {/* Conteúdo principal */}
      <main className="transition-[margin] duration-300 md:ml-[280px] overflow-x-hidden">
        {/* Header - DESIGN MODERNO */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-30 bg-zinc-800/80 backdrop-blur-xl border-b border-zinc-700/50"
        >
          <div className="flex h-16 items-center gap-4 px-6">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden hover:bg-zinc-700/50 transition-all"
              onClick={toggleSidebar}
            >
              <Menu className="h-6 w-6 text-zinc-400" />
            </Button>

            {/* Breadcrumb melhorado */}
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Home className="h-4 w-4" />
              <span>/</span>
              <span className="text-white font-medium">
                {location.pathname.split("/").pop() || "dashboard"}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-3">
              {user?.role === "admin" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-all"
                  onClick={handleNavigateUsers}
                >
                  <UserCog className="h-5 w-5" />
                </Button>
              )}
              <NotificationsDropdown />
            </div>
          </div>
        </motion.header>

        {/* Conteúdo das páginas - CARREGAMENTO INSTANTÂNEO */}
        <div className="p-6 lg:p-8">
          <ErrorBoundary>
            <React.Suspense fallback={<div className="min-h-[20vh]" />}>
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
// 🎯 COMPONENTE PRINCIPAL - SEM LOADERS DESNECESSÁRIOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Componente principal da aplicação - OTIMIZADO
 */
const App = () => {
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

  return (
    <NotificationProvider>
      <CategoriesProvider>
        <PartsCacheProvider>
          <Router>
            <React.Suspense
              fallback={<div className="min-h-screen bg-zinc-900" />}
            >
              <Routes>
                {/* Redirecionamentos */}
                <Route path="/" element={<Navigate to="/app/dashboard" />} />
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

                          {/* Documentos */}
                          <Route path="documents" element={<ManageDocuments />} />

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
                          <Route
                            path="parts-export"
                            element={
                              <RoleRoute allowedRoles={["admin"]}>
                                <PartsExportTool />
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
