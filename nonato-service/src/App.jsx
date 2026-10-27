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
  LogOut,
  Menu,
  X,
  Settings,
  User,
  UserCog,
  Search,
  Home,
  ChevronRight,
  ChevronsUpDown,
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
import { ClientsProvider } from "./context/ClientsContext.jsx";
import { EquipmentsProvider } from "./context/EquipmentsContext.jsx";
import { UsersProvider } from "./context/UsersContext.jsx";
import { OrcamentosProvider } from "./context/OrcamentosContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import { TabsProvider } from "./context/TabsContext.jsx";
import NotificationsDropdown from "./components/ui/NotificationsDropdown";
import TabsBar from "./components/layout/TabsBar.jsx";
import VersionBadge from "./components/layout/VersionBadge.jsx";
import { useAuth } from "./hooks/useAuth";
import { initOldBrowserSupport } from "./utils/oldBrowserUtils.js";
import { NAVIGATION_ITEMS, ICON_MAP, getTabMetaForPath } from "./config/navigationItems.jsx";
import { ConfirmProvider } from "./components/app";
import CommunicationBubble from "./features/communication/components/CommunicationBubble.jsx";

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

const ManageDebtors = React.lazy(() =>
  import("./features/finances/ManageDebtors")
);
const ManageReportsLibrary = React.lazy(() =>
  import("./features/reports/ManageReportsLibrary")
);
const ManageReport = React.lazy(() =>
  import("./features/reports/ManageReport")
);
const ManageExpenses = React.lazy(() =>
  import("./features/expenses/ManageExpenses")
);
const AddExpense = React.lazy(() =>
  import("./features/expenses/components/AddExpense")
);
const ManageWarehouse = React.lazy(() =>
  import("./features/warehouse/ManageWarehouse")
);
const AddWarehouseRequest = React.lazy(() =>
  import("./features/warehouse/components/AddWarehouseRequest")
);
const ManageAlerts = React.lazy(() => import("./features/alerts/ManageAlerts"));
const ManageTechnicianStatus = React.lazy(() =>
  import("./features/technicians/ManageTechnicianStatus")
);
const ManageTechnicianSkills = React.lazy(() =>
  import("./features/technicians/ManageTechnicianSkills")
);
const ManageWarehouseEquipment = React.lazy(() =>
  import("./features/warehouseEquipment/ManageWarehouseEquipment")
);
const AddWarehouseEquipment = React.lazy(() =>
  import("./features/warehouseEquipment/components/AddWarehouseEquipment")
);
const EditWarehouseEquipment = React.lazy(() =>
  import("./features/warehouseEquipment/components/EditWarehouseEquipment")
);
const WarehouseEquipmentDetail = React.lazy(() =>
  import("./features/warehouseEquipment/WarehouseEquipmentDetail")
);
const ManageEquipmentFamilies = React.lazy(() =>
  import("./features/warehouseEquipment/components/ManageEquipmentFamilies")
);
const ManageDisassembledParts = React.lazy(() =>
  import("./features/disassembled/ManageDisassembledParts")
);
const ManageRecycleBin = React.lazy(() =>
  import("./features/recycle/ManageRecycleBin")
);
const ManageManual = React.lazy(() => import("./features/manual/ManageManual"));
const AddDisassembledPart = React.lazy(() =>
  import("./features/disassembled/components/AddDisassembledPart")
);
const EditDisassembledPart = React.lazy(() =>
  import("./features/disassembled/components/EditDisassembledPart")
);
const ManageOrdensPreparacao = React.lazy(() =>
  import("./features/prepOrders/ManageOrdensPreparacao")
);
const AddOrdemPreparacao = React.lazy(() =>
  import("./features/prepOrders/components/AddOrdemPreparacao")
);
const OrdemPreparacaoDetail = React.lazy(() =>
  import("./features/prepOrders/components/OrdemPreparacaoDetail")
);
const ManageFormulariosTecnicos = React.lazy(() =>
  import("./features/prepOrders/ManageFormulariosTecnicos")
);
const ManageFinances = React.lazy(() =>
  import("./features/finances/ManageFinances")
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 IMPORTS DE FEATURES - PEÇAS (LAZY LOADING)
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// 🚚 IMPORTS DE FEATURES - FORNECEDORES (LAZY LOADING)
// ═══════════════════════════════════════════════════════════════════════════════

const ManageSuppliers = React.lazy(() =>
  import("./features/suppliers/ManageSuppliers")
);
const AddSupplier = React.lazy(() =>
  import("./features/suppliers/components/AddSupplier")
);
const SupplierDetail = React.lazy(() =>
  import("./features/suppliers/components/SupplierDetail")
);
const EditSupplier = React.lazy(() =>
  import("./features/suppliers/components/EditSupplier")
);

const ManagePartsLibrary = React.lazy(() =>
  import("./features/parts/ManagePartsLibrary")
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
const ManageClassificationRules = React.lazy(() =>
  import("./features/parts/ManageClassificationRules")
);

const ManageProtocols = React.lazy(() =>
  import("./features/protocols/ManageProtocols")
);
const AddProtocol = React.lazy(() =>
  import("./features/protocols/components/AddProtocol")
);
const EditProtocol = React.lazy(() =>
  import("./features/protocols/components/EditProtocol")
);
const ProtocolDetail = React.lazy(() =>
  import("./features/protocols/components/ProtocolDetail")
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
const ManageChecklistFamilies = React.lazy(() =>
  import("./features/checklists/components/ManageChecklistFamilies")
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

const CompanyProfile = React.lazy(() =>
  import("./features/company/CompanyProfile")
);

const ManageCommunicationHub = React.lazy(() =>
  import("./features/communication/ManageCommunicationHub")
);

const PartsExportTool = React.lazy(() => import("./context/PartsExportTool"));
const ImportBackupClassification = React.lazy(() =>
  import("./features/parts/ImportBackupClassification")
);
const ImportContacts = React.lazy(() => import("./features/clients/ImportContacts"));
const ManageStock = React.lazy(() => import("./features/stock/ManageStock"));

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ CONSTANTES E CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════════════════════════════

// NAVIGATION_ITEMS foi movido para "./config/navigationItems.jsx" (importado
// acima) para poder ser partilhado com o TabsContext sem import circular.

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
      <div className="min-h-screen bg-background" />
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
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/5"
        >
          <Avatar className="h-9 w-9 ring-1 ring-white/10">
            <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || ""} />
            <AvatarFallback className="bg-primary/20 font-semibold text-primary">
              {user?.displayName?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.displayName || "Utilizador"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60" align="start" side="top">
        <div className="px-2 py-2">
          <p className="text-sm font-medium">{user?.displayName || "Utilizador"}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={handleNavigateProfile}>
          <User className="h-4 w-4" />
          <span>Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={handleNavigateSettings}>
          <Settings className="h-4 w-4" />
          <span>Configurações</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-400 focus:bg-destructive/15 focus:text-red-400"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

UserNav.displayName = "UserNav";

/**
 * Shell principal do backoffice: barra lateral e topo em vidro (flutuantes no
 * desktop), conteúdo centrado com largura máxima, áreas seguras do telemóvel.
 */
const DashboardShell = React.memo(({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Detect which section contains the current route so it opens on refresh
  const getSectionForPath = useCallback((pathname) => {
    for (const section of NAVIGATION_ITEMS) {
      if (section.items.some((item) => pathname.startsWith(item.path))) {
        return section.title;
      }
    }
    return "";
  }, []);

  const [activeSection, setActiveSection] = useState(() => getSectionForPath(window.location.pathname));
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

  // Update active section when route changes (e.g. navigating via links)
  useEffect(() => {
    const section = getSectionForPath(location.pathname);
    setActiveSection(section);
  }, [location.pathname, getSectionForPath]);

  // Título da página no topo (em vez do pedaço cru do endereço)
  const pageMeta = getTabMetaForPath(location.pathname);
  const PageIcon = ICON_MAP[pageMeta.iconKey] || Home;
  const pageSection = getSectionForPath(location.pathname);

  const query = searchQuery.trim().toLowerCase();

  return (
    <ConfirmProvider>
    <div className="min-h-screen overflow-x-hidden">
      {/* Overlay para mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Barra lateral — flutuante, em vidro */}
      <aside
        className={`fixed left-0 top-0 z-40 h-[100dvh] w-[288px] p-3 pt-[calc(0.75rem+var(--safe-top))] pb-[calc(0.75rem+var(--safe-bottom))] transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="glass flex h-full flex-col overflow-hidden rounded-2xl">
          {/* Marca */}
          <div className="flex items-center justify-between px-4 pb-3 pt-4">
            <button
              type="button"
              onClick={handleNavigateHome}
              className="flex items-center gap-3 rounded-xl text-left transition-opacity hover:opacity-90"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/40 ring-1 ring-white/10">
                <img src="/nonato.png" alt="" className="h-7 w-7 object-contain" />
              </span>
              <span>
                <span className="block text-[15px] font-semibold leading-tight tracking-tight">Nonato Service</span>
                <span className="block text-xs text-muted-foreground">Sistema de Gestão</span>
              </span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Pesquisa no menu */}
          <div className="px-3 pb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Procurar no menu…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 border-white/10 bg-white/5 pl-9"
              />
            </div>
          </div>

          {/* Navegação */}
          <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {NAVIGATION_ITEMS.map((section) => {
              const visibleItems = section.items.filter((item) => {
                // Filtrar itens restritos a certos papéis
                if (item.adminOnly && user?.role !== "admin") return false;
                if (item.roles && !item.roles.includes(user?.role)) return false;
                // Filtrar por pesquisa
                return (
                  query === "" ||
                  item.label.toLowerCase().includes(query) ||
                  section.title.toLowerCase().includes(query)
                );
              });
              if (visibleItems.length === 0) return null;

              // Com pesquisa, todas as secções com resultados ficam abertas.
              const isOpen = query !== "" || activeSection === section.title;
              const hasActive = visibleItems.some((item) => isActiveLink(item.path));

              return (
                <div key={section.title}>
                  <button
                    type="button"
                    onClick={() => setActiveSection(activeSection === section.title ? "" : section.title)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                      isOpen || hasActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <section.icon className={`h-4 w-4 ${hasActive ? "text-primary" : ""}`} />
                      {section.title}
                    </span>
                    <ChevronRight
                      className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-5 space-y-0.5 border-l border-white/10 py-1 pl-2">
                          {visibleItems.map((item) => {
                            if (item.external) {
                              return (
                                <a
                                  key={item.path}
                                  href={item.path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                                >
                                  <item.icon className="h-4 w-4 shrink-0" />
                                  <span className="truncate">{item.label}</span>
                                </a>
                              );
                            }

                            const active = isActiveLink(item.path);
                            return (
                              <Link
                                key={item.path}
                                to={item.path}
                                className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
                                  active
                                    ? "bg-primary/15 font-medium text-foreground"
                                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                }`}
                              >
                                {active && (
                                  <span className="absolute -left-[9px] top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                                )}
                                <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`} />
                                <span className="truncate">{item.label}</span>
                                {item.adminOnly && (
                                  <Badge variant="danger" className="ml-auto px-1.5 py-0 text-[10px]">
                                    Admin
                                  </Badge>
                                )}
                                {item.roles && (
                                  <Badge variant="warning" className="ml-auto px-1.5 py-0 text-[10px]">
                                    Gestão
                                  </Badge>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>

          {/* Rodapé: versão + utilizador */}
          <div className="border-t border-white/5 p-2">
            {/* Versão da app + novidades + aviso de nova versão */}
            <VersionBadge user={user} />
            <UserNav />
          </div>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="min-w-0 transition-[margin] duration-300 md:ml-[288px]">
        {/* Topo — flutuante, em vidro, com as abas por baixo do título */}
        <header className="sticky top-0 z-30 px-3 pt-[calc(0.75rem+var(--safe-top))] md:pl-0">
          <div className="glass overflow-hidden rounded-2xl">
            <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 md:hidden"
                onClick={toggleSidebar}
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </Button>

              <div className="flex min-w-0 items-center gap-2.5">
                <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary sm:flex">
                  <PageIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  {pageSection && (
                    <p className="hidden truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:block">
                      {pageSection}
                    </p>
                  )}
                  <p className="truncate text-sm font-semibold leading-tight">{pageMeta.label}</p>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-1">
                {user?.role === "admin" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground"
                    onClick={handleNavigateUsers}
                    title="Gerir utilizadores"
                  >
                    <UserCog className="h-5 w-5" />
                  </Button>
                )}
                <NotificationsDropdown />
              </div>
            </div>

            {/* Barra de Abas — mantém várias páginas abertas ao mesmo tempo */}
            <TabsBar />
          </div>
        </header>

        {/* Conteúdo das páginas */}
        <div className="page-container px-3 pb-[calc(2rem+var(--safe-bottom))] pt-5 sm:px-5 md:pl-0 md:pr-3 lg:pr-5">
          <ErrorBoundary>
            <React.Suspense fallback={<div className="min-h-[20vh]" />}>
              {children}
            </React.Suspense>
          </ErrorBoundary>
        </div>
      </main>

      {/* ✅ Atalho global para o Hub de Comunicação */}
      <CommunicationBubble />
    </div>
    </ConfirmProvider>
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
        <ClientsProvider>
        <EquipmentsProvider>
        <UsersProvider>
        <OrcamentosProvider>
          <Router>
            <React.Suspense
              fallback={<div className="min-h-screen bg-background" />}
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
                      <TabsProvider>
                      <DashboardShell>
                        <Routes>
                          {/* Dashboard */}
                          <Route path="dashboard" element={<DashboardPage />} />

                          {/* Documentos */}
                          <Route path="documents" element={<ManageDocuments />} />

                          {/* Cadastro da Nonato Service */}
                          <Route
                            path="company-profile"
                            element={
                              <RoleRoute allowedRoles={["admin", "gestor"]}>
                                <CompanyProfile />
                              </RoleRoute>
                            }
                          />

                          {/* Hub de Comunicação */}
                          <Route
                            path="hub-comunicacao"
                            element={<ManageCommunicationHub />}
                          />

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

                          {/* Fornecedores */}
                          <Route
                            path="manage-suppliers"
                            element={<ManageSuppliers />}
                          />
                          <Route path="add-supplier" element={<AddSupplier />} />
                          <Route
                            path="supplier/:supplierId"
                            element={<SupplierDetail />}
                          />
                          <Route
                            path="edit-supplier/:supplierId"
                            element={<EditSupplier />}
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
                          <Route
                            path="clientes-devedores"
                            element={<ManageDebtors />}
                          />
                          <Route
                            path="biblioteca-relatorios"
                            element={<ManageReportsLibrary />}
                          />
                          <Route
                            path="manage-report"
                            element={<ManageReport />}
                          />
                          <Route
                            path="manage-expenses"
                            element={<ManageExpenses />}
                          />
                          <Route
                            path="add-expense"
                            element={<AddExpense />}
                          />
                          <Route
                            path="warehouse"
                            element={<ManageWarehouse />}
                          />
                          <Route path="stock" element={<ManageStock />} />
                          <Route
                            path="add-warehouse-request"
                            element={<AddWarehouseRequest />}
                          />
                          <Route
                            path="alerts"
                            element={<ManageAlerts />}
                          />
                          <Route
                            path="technician-status"
                            element={<ManageTechnicianStatus />}
                          />
                          <Route
                            path="technician-skills"
                            element={<ManageTechnicianSkills />}
                          />
                          <Route
                            path="warehouse-equipment"
                            element={<ManageWarehouseEquipment />}
                          />
                          <Route
                            path="warehouse-equipment/:equipmentId"
                            element={<WarehouseEquipmentDetail />}
                          />
                          <Route
                            path="add-warehouse-equipment"
                            element={<AddWarehouseEquipment />}
                          />
                          <Route
                            path="edit-warehouse-equipment/:equipmentId"
                            element={<EditWarehouseEquipment />}
                          />
                          <Route
                            path="equipment-families"
                            element={<ManageEquipmentFamilies />}
                          />
                          <Route
                            path="disassembled-parts"
                            element={<ManageDisassembledParts />}
                          />
                          <Route
                            path="recycle-bin"
                            element={<ManageRecycleBin />}
                          />
                          <Route
                            path="manual"
                            element={<ManageManual />}
                          />
                          <Route
                            path="add-disassembled-part"
                            element={<AddDisassembledPart />}
                          />
                          <Route
                            path="edit-disassembled-part/:partId"
                            element={<EditDisassembledPart />}
                          />
                          <Route
                            path="ordens-preparacao"
                            element={<ManageOrdensPreparacao />}
                          />
                          <Route
                            path="add-ordem-preparacao"
                            element={<AddOrdemPreparacao />}
                          />
                          <Route
                            path="ordem-preparacao/:orderId"
                            element={<OrdemPreparacaoDetail />}
                          />
                          <Route
                            path="formularios-tecnicos"
                            element={<ManageFormulariosTecnicos />}
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
                          <Route
                            path="checklist-families"
                            element={<ManageChecklistFamilies />}
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
                            path="parts-classification-rules"
                            element={<ManageClassificationRules />}
                          />

                          {/* Protocolos de Serviço */}
                          <Route
                            path="protocols"
                            element={<ManageProtocols />}
                          />
                          <Route
                            path="add-protocol"
                            element={<AddProtocol />}
                          />
                          <Route
                            path="edit-protocol/:protocolId"
                            element={<EditProtocol />}
                          />
                          <Route
                            path="protocol/:protocolId"
                            element={<ProtocolDetail />}
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
                            path="parts-export"
                            element={
                              <RoleRoute allowedRoles={["admin"]}>
                                <PartsExportTool />
                              </RoleRoute>
                            }
                          />
                          <Route
                            path="import-contacts"
                            element={
                              <RoleRoute allowedRoles={["admin"]}>
                                <ImportContacts />
                              </RoleRoute>
                            }
                          />
                          <Route
                            path="parts-import-categories"
                            element={
                              <RoleRoute allowedRoles={["admin"]}>
                                <ImportBackupClassification />
                              </RoleRoute>
                            }
                          />
                        </Routes>
                      </DashboardShell>
                      </TabsProvider>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </React.Suspense>
          </Router>
        </OrcamentosProvider>
        </UsersProvider>
        </EquipmentsProvider>
        </ClientsProvider>
      </CategoriesProvider>
    </NotificationProvider>
  );
};

export default App;
