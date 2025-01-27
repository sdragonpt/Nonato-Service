import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  Link,
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
  Bell,
  Search as SearchIcon,
  Settings,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

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
import AddService from "./components/AddService"; // Novo import
import EditService from "./components/EditService"; // Novo import
import AddBudget from "./components/AddBudget";
import ManageBudgets from "./components/ManageBudgets";
import AddSimpleBudget from "./components/AddSimpleBudget";
import ErrorBoundary from "./ErrorBoundary";
import ManageChecklist from "./components/ManageCheckList";
import AddChecklistType from "./components/AddChecklistType";
import EditChecklistType from "./components/EditCheckListType"; // Use consistentemente este formato
import ManageInspection from "./components/ManageInspection";
import AddInspection from "./components/AddInspection";
import EditInspection from "./components/EditInspection";
import InspectionDetail from "./components/InspectionDetail";
import ProtectedRoute from "./ProtectedRoute";

const NAVIGATION_ITEMS = [
  {
    title: "Cadastro",
    items: [
      { path: "/app/manage-clients", icon: Users, label: "Clientes" },
      { path: "/app/manage-services", icon: Wrench, label: "Serviços" },
      { path: "/app/manage-budgets", icon: FileText, label: "Orçamentos" },
      { path: "/app/manage-equipments", icon: Package, label: "Peças" },
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
];

const UserNav = () => {
  const auth = getAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao deslogar:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full hover:bg-zinc-700"
        >
          <Avatar>
            <AvatarImage src="/nonato.png" alt="Avatar" />
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 bg-zinc-800 border-zinc-700"
        align="end"
      >
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium text-white">Admin</p>
            <p className="text-xs text-zinc-400">admin@company.com</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-700" />
        <DropdownMenuItem className="text-zinc-400 focus:text-white focus:bg-zinc-700">
          <Settings className="mr-2 h-4 w-4" />
          <span>Configurações</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-zinc-700" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-red-400 focus:text-red-400 focus:bg-zinc-700"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const SearchBox = () => {
  return (
    <div className="relative">
      <SearchIcon className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <Input
        type="search"
        placeholder="Buscar..."
        className="pl-8 md:w-[200px] lg:w-[300px] bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-green-500"
      />
    </div>
  );
};

const DashboardHeader = ({ onMenuClick }) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-700 bg-zinc-800/95 backdrop-blur supports-backdrop-blur:bg-zinc-800/50">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-zinc-400 hover:text-white hover:bg-zinc-700"
            onClick={() => onMenuClick?.()}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <SearchBox />
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="relative text-zinc-400 hover:text-white hover:bg-zinc-700"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-green-500" />
          </Button>
          <Separator orientation="vertical" className="h-6 bg-zinc-700" />
          <UserNav />
        </div>
      </div>
    </header>
  );
};

const Navigation = ({ isOpen, onClose }) => {
  const location = useLocation();

  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  // Add click handler for the overlay
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={handleOverlayClick}
        />
      )}
      <nav
        className={`
          fixed top-0 left-0 z-40 h-full w-72 md:w-64 border-r border-zinc-700 bg-zinc-800 px-3 pb-4 pt-20 md:pt-16
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        <button
          onClick={() => onClose?.()}
          className="absolute right-4 top-4 p-2 text-zinc-400 hover:text-white md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="space-y-4">
            {NAVIGATION_ITEMS.map((section, idx) => (
              <div key={idx}>
                <h4 className="px-2 py-1 text-xs font-semibold text-zinc-400">
                  {section.title}
                </h4>
                <div className="space-y-1">
                  {section.items.map((item, itemIdx) => (
                    <Link
                      key={itemIdx}
                      to={item.path}
                      onClick={() => onClose?.()}
                      className={`
                        flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm 
                        transition-colors hover:bg-zinc-700/50
                        ${
                          isActiveLink(item.path)
                            ? "bg-green-600 text-white"
                            : "text-zinc-400 hover:text-white"
                        }
                      `}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </nav>
    </>
  );
};

const LoadingSpinner = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Loader2 className="h-12 w-12 animate-spin" />
  </div>
);

const App = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      setTimeout(() => setIsLoading(false), 500);
    });
    return () => unsubscribe();
  }, [auth]);

  if (isLoading) {
    return <LoadingSpinner />;
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
              <div className="flex min-h-screen">
                <Navigation isOpen={isOpen} onClose={() => setIsOpen(false)} />
                <div className="flex-1 bg-zinc-900">
                  <DashboardHeader onMenuClick={() => setIsOpen(true)} />
                  <main className="container px-4 pb-8 pt-20 md:pt-6 md:px-6">
                    <Routes>
                      <Route path="add-client" element={<AddClient />} />
                      <Route path="add-equipment" element={<AddEquipment />} />
                      <Route path="add-order" element={<AddOrder />} />
                      <Route path="manage-orders" element={<ManageOrders />} />
                      <Route
                        path="manage-services"
                        element={<ManageServices />}
                      />
                      <Route path="add-service" element={<AddService />} />
                      <Route
                        path="edit-service/:serviceId"
                        element={<EditService />}
                      />
                      <Route path="closed-orders" element={<ClosedOrders />} />
                      <Route path="open-orders" element={<OpenOrders />} />
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
                      <Route path="manage-agenda" element={<ManageAgenda />} />
                      <Route
                        path="add-agendamento"
                        element={<AddAgendamento />}
                      />
                      <Route
                        path="edit-agendamento/:agendamentoId"
                        element={<EditAgendamento />}
                      />
                      <Route
                        path="agenda/:year/:month/week/:week"
                        element={<WeekDetail />}
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
                    </Routes>
                  </main>
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
