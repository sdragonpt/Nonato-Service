import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  Link,
  useNavigate,
} from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
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
} from "lucide-react";

// Componentes
import InitialPage from "./components/InitialPage";
import ManageOrders from "./components/ManageOrders";
import AddEquipment from "./components/AddEquipment";
import AddClient from "./components/AddClient";
import ClosedOrders from "./components/ClosedOrders";
import OpenOrders from "./components/OpenOrders";
import ManageClients from "./components/ManageClients";
import ClientDetail from "./components/ClientDetail";
import EquipmentDetail from "./components/EquipmentDetail";
import EditClient from "./components/EditClient";
import EditEquipment from "./components/EditEquipment";
import AddOrder from "./components/AddOrder";
import OrderDetail from "./components/OrderDetail";
import AddWorkday from "./components/AddWorkDay";
import EditOrder from "./components/EditOrder";
import EditWorkday from "./components/EditWorkDay";
import LoginPage from "./components/LoginPage";
import ManageAgenda from "./components/ManageAgenda";
import AddAgendamento from "./components/AddAgendamento";
import EditAgendamento from "./components/EditAgendamento";
import WeekDetail from "./components/WeekDetail";
import ManageServices from "./components/ManageServices";
import AddService from "./components/AddService";
import EditService from "./components/EditService";
import AddBudget from "./components/AddBudget";
import ManageBudgets from "./components/ManageBudgets";
import AddSimpleBudget from "./components/AddSimpleBudget";
import ErrorBoundary from "./ErrorBoundary";
import ManageChecklist from "./components/ManageCheckList";
import AddChecklistType from "./components/AddChecklistType";
import EditChecklistType from "./components/EditCheckListType";
import ManageInspection from "./components/ManageInspection";
import AddInspection from "./components/AddInspection";
import EditInspection from "./components/EditInspection";
import InspectionDetail from "./components/InspectionDetail";
import ProtectedRoute from "./ProtectedRoute";
import UserProfile from "./components/UserProfile";
import UserSettings from "./components/UserSettings";
import ManageUsers from "./ManageUsers";
import { useAuth } from "./hooks/useAuth";

// Components UI
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

// Configuração das rotas e navegação
const NAVIGATION_ITEMS = [
  {
    title: "Cadastro",
    items: [
      {
        path: "/app/manage-clients",
        icon: Users,
        label: "Clientes",
      },
      {
        path: "/app/manage-services",
        icon: Wrench,
        label: "Serviços",
      },
      {
        path: "/app/manage-budgets",
        icon: FileText,
        label: "Orçamentos",
      },
      {
        path: "/app/manage-equipment",
        icon: Package,
        label: "Peças",
      },
      {
        path: "/app/parts-library",
        icon: Book,
        label: "Biblioteca de Peças",
      },
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
        path: "/app/manage-agenda",
        icon: Calendar,
        label: "Agenda",
      },
      {
        path: "/app/manage-report",
        icon: BarChart,
        label: "Relatório",
      },
      {
        path: "/app/manage-checklist",
        icon: CheckSquare,
        label: "Check List",
      },
      {
        path: "/app/manage-inspection",
        icon: ClipboardCheck,
        label: "Inspeções",
      },
    ],
  },
  // {
  //   title: "Administração",
  //   items: [
  //     {
  //       path: "/app/manage-users",
  //       icon: UserCog,
  //       label: "Gerenciar Usuários",
  //     },
  //   ],
  // },
];

// Componente para renderizar a navegação com base no role do usuário
const Navigation = () => {
  const { user, loading } = useAuth();

  // Se não tiver usuário ou role, não mostra nada
  if (!user?.role) {
    return null;
  }

  // Garante que NAVIGATION_ITEMS existe
  if (!Array.isArray(NAVIGATION_ITEMS)) {
    return null;
  }

  const filteredNavigation = NAVIGATION_ITEMS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => Array.isArray(item.roles) && item.roles.includes(user.role)
    ),
  })).filter((section) => section.items.length > 0);

  // Se não tiver items após filtro, mostra mensagem
  if (filteredNavigation.length === 0) {
    return null;
  }

  return (
    <nav>
      {filteredNavigation.map((section, idx) => (
        <div key={idx} className="mb-6">
          <h2 className="text-zinc-400 text-sm font-medium mb-2">
            {section.title}
          </h2>
          <div className="space-y-1">
            {section.items.map((item, itemIdx) => (
              <Link
                key={itemIdx}
                to={item.path}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
};

// Componente de rota protegida por role
const RoleRoute = ({ children, allowedRoles }) => {
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
};

const UserNav = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const auth = getAuth();

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
          onClick={() => navigate("/app/profile")}
        >
          <User className="mr-2 h-4 w-4" />
          <span>Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-white hover:bg-zinc-700 cursor-pointer"
          onClick={() => navigate("/app/settings")}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Configurações</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-700" />
        <DropdownMenuItem
          className="text-red-400 hover:bg-zinc-700 focus:text-red-400 cursor-pointer"
          onClick={() => signOut(auth)}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// DashboardShell component that wraps the main content
const DashboardShell = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

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

  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  if (!NAVIGATION_ITEMS || NAVIGATION_ITEMS.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-zinc-900">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-transform duration-300 w-[280px] bg-zinc-900 border-r border-zinc-800 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="h-full px-4 py-4 flex flex-col">
          <div className="flex items-center justify-between mb-8 h-16">
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
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
            {NAVIGATION_ITEMS.map((section, idx) => (
              <div key={idx} className="space-y-1">
                <button
                  onClick={() =>
                    setActiveSection(
                      activeSection === section.title ? "" : section.title
                    )
                  }
                  className="w-full flex items-center justify-between px-2 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <span className="text-sm font-semibold">{section.title}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      activeSection === section.title ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  className={`space-y-1 ${
                    activeSection === section.title ? "block" : "hidden"
                  }`}
                >
                  {section.items.map((item, itemIdx) => (
                    <Link
                      key={itemIdx}
                      to={item.path}
                      className={`flex items-center gap-x-3 px-2 py-2 text-sm rounded-lg ${
                        isActiveLink(item.path)
                          ? "bg-zinc-800 text-white"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                      } transition-colors`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-4 border-t border-zinc-800">
            <UserNav />
          </div>
        </div>
      </aside>

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
                  onClick={() => navigate("/app/manage-users")}
                >
                  <UserCog className="h-5 w-5" />
                </Button>
              )}
              <NotificationsDropdown />
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

// Componente separado para as notificações
const NotificationsDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-zinc-400 hover:text-white hover:bg-zinc-700/50"
        >
          <Bell className="h-5 w-5 hover:text-white" />
          <Badge className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 p-0 flex items-center justify-center">
            <span className="text-[10px]">3</span>
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 bg-zinc-800 border-zinc-700"
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-700">
          <span className="text-sm font-medium text-white">Notificações</span>
          <Badge variant="secondary" className="bg-zinc-700 text-zinc-400">
            3 novas
          </Badge>
        </div>
        <div className="py-2">
          {/* Example notifications */}
          <DropdownMenuItem className="px-4 py-2 focus:bg-zinc-700/50">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-white">Nova ordem de serviço</p>
              <span className="text-xs text-zinc-400">Há 5 minutos</span>
            </div>
          </DropdownMenuItem>
          {/* Add more notifications here */}
        </div>
        <div className="p-2 border-t border-zinc-700">
          <Button
            variant="ghost"
            className="w-full justify-center text-zinc-400 hover:text-white hover:bg-zinc-700/50"
          >
            Ver todas
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Main App Component
const App = () => {
  const { user, loading } = useAuth(); // Substitui o useState e useEffect anterior

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-zinc-900">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/start" />} />
        <Route path="/start" element={<InitialPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/app/*"
          element={
            <ProtectedRoute>
              <DashboardShell>
                <Routes>
                  <Route path="add-client" element={<AddClient />} />
                  <Route path="add-equipment" element={<AddEquipment />} />
                  <Route path="add-order" element={<AddOrder />} />
                  <Route path="manage-orders" element={<ManageOrders />} />
                  <Route path="manage-services" element={<ManageServices />} />
                  <Route path="add-service" element={<AddService />} />
                  <Route path="profile" element={<UserProfile />} />
                  <Route path="settings" element={<UserSettings />} />
                  {/* Rotas protegidas por role */}
                  <Route
                    path="manage-users"
                    element={
                      <RoleRoute allowedRoles={["admin"]}>
                        <ManageUsers />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="edit-service/:serviceId"
                    element={<EditService />}
                  />
                  <Route path="closed-orders" element={<ClosedOrders />} />
                  <Route path="open-orders" element={<OpenOrders />} />
                  <Route path="manage-clients" element={<ManageClients />} />
                  <Route path="client/:clientId" element={<ClientDetail />} />
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
                  <Route path="manage-agenda" element={<ManageAgenda />} />
                  <Route path="add-agendamento" element={<AddAgendamento />} />
                  <Route
                    path="edit-agendamento/:agendamentoId"
                    element={<EditAgendamento />}
                  />
                  <Route
                    path="agenda/:year/:month/week/:week"
                    element={<WeekDetail />}
                  />
                  <Route path="manage-budgets" element={<ManageBudgets />} />
                  <Route path="add-budget" element={<AddBudget />} />
                  <Route
                    path="add-simple-budget"
                    element={<AddSimpleBudget />}
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
                  <Route path="add-inspection" element={<AddInspection />} />
                  <Route
                    path="edit-inspection/:inspectionId"
                    element={<EditInspection />}
                  />
                  <Route
                    path="inspection-detail/:inspectionId"
                    element={<InspectionDetail />}
                  />
                </Routes>
              </DashboardShell>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
