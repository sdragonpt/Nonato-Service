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
} from "lucide-react";

// Componentes
import InitialPage from "./components/InitialPage";
import ManageServices from "./components/ManageServices";
import AddEquipment from "./components/AddEquipment";
import AddClient from "./components/AddClient";
import ClosedServices from "./components/ClosedServices";
import OpenServices from "./components/OpenServices";
import ManageClients from "./components/ManageClients";
import ManageEquipments from "./components/ManageEquipments";
import ClientDetail from "./components/ClientDetail";
import EquipmentDetail from "./components/EquipmentDetail";
import EditClient from "./components/EditClient";
import EditEquipment from "./components/EditEquipment";
import AddService from "./components/AddService";
import OrderDetail from "./components/OrderDetail";
import AddWorkday from "./components/AddWorkDay";
import EditService from "./components/EditService";
import EditWorkday from "./components/EditWorkDay";
import LoginPage from "./components/LoginPage";
import ManageAgenda from "./components/ManageAgenda";
import AddAgendamento from "./components/AddAgendamento";
import EditAgendamento from "./components/EditAgendamento";
import WeekDetail from "./components/WeekDetail";

// Configuração das rotas e navegação
const NAVIGATION_ITEMS = [
  {
    title: "Cadastro",
    items: [
      { path: "/app/manage-clients", icon: Users, label: "Clientes" },
      { path: "/app/services", icon: Wrench, label: "Serviços" },
      { path: "/app/manage-equipments", icon: Package, label: "Peças" },
      { path: "/app/parts-library", icon: Book, label: "Biblioteca de Peças" },
    ],
  },
  {
    title: "Gestão",
    items: [
      {
        path: "/app/manage-services",
        icon: ClipboardList,
        label: "Ordem de Serviço",
      },
      { path: "/app/manage-agenda", icon: Calendar, label: "Agenda" }, // Nova opção
      { path: "/app/manage-report", icon: BarChart, label: "Relatório" },
      { path: "/app/manage-checklist", icon: CheckSquare, label: "Check List" },
    ],
  },
];

// Componente de Loading
const LoadingSpinner = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Componente de Proteção de Rotas
const ProtectedRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, [auth]);

  if (loading) return <LoadingSpinner />;
  return user ? children : <Navigate to="/login" />;
};

// Componente de Navegação
const Navigation = ({ isOpen, onClose }) => {
  const auth = getAuth();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao deslogar:", error);
    }
  };

  const isActiveLink = (path) => {
    return location.pathname === path ? "bg-gray-700" : "";
  };

  return (
    <nav
      className={`
      fixed top-0 left-0 w-64 h-full bg-zinc-800 transform z-50 
      transition-transform duration-300 ease-in-out
      ${isOpen ? "translate-x-0" : "-translate-x-full"}
      md:translate-x-0
      overflow-y-auto
      flex flex-col
    `}
    >
      <div className="flex justify-between items-center p-4 md:hidden">
        <h1 className="text-xl font-bold text-white">Menu</h1>
        <button onClick={onClose} className="p-2">
          <X className="h-6 w-6 text-white" />
        </button>
      </div>

      <div className="flex-1 p-4">
        {NAVIGATION_ITEMS.map((section, idx) => (
          <div key={idx} className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              {section.title}
            </h2>
            <div className="space-y-2">
              {section.items.map((item, itemIdx) => (
                <Link
                  key={itemIdx}
                  to={item.path}
                  onClick={onClose}
                  className={`
                    flex items-center px-4 py-2 rounded-lg
                    text-gray-300 hover:bg-gray-700 hover:text-white
                    transition-colors duration-200
                    ${isActiveLink(item.path)}
                  `}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors duration-200"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span>Sair</span>
        </button>
      </div>
    </nav>
  );
};

// Componente ScrollToTop
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Componente Principal
const App = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleNavbar = () => setIsOpen(!isOpen);
  const closeNavbar = () => setIsOpen(false);

  // Fecha o menu quando clicar fora em dispositivos móveis
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        !event.target.closest("nav") &&
        !event.target.closest("button")
      ) {
        closeNavbar();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Navigate to="/start" />} />
        <Route path="/start" element={<InitialPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/app/*"
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-zinc-900">
                <button
                  onClick={toggleNavbar}
                  className="fixed top-4 left-4 z-50 md:hidden bg-zinc-800 p-2 rounded-lg"
                  aria-label="Toggle menu"
                >
                  <Menu className="h-6 w-6 text-white" />
                </button>

                <Navigation isOpen={isOpen} onClose={closeNavbar} />

                <main className="md:ml-64 min-h-screen">
                  <div className="p-6">
                    <Routes>
                      <Route path="add-client" element={<AddClient />} />
                      <Route path="add-equipment" element={<AddEquipment />} />
                      <Route path="add-service" element={<AddService />} />
                      <Route
                        path="manage-services"
                        element={<ManageServices />}
                      />
                      <Route
                        path="closed-services"
                        element={<ClosedServices />}
                      />
                      <Route path="open-services" element={<OpenServices />} />
                      <Route
                        path="manage-clients"
                        element={<ManageClients />}
                      />
                      <Route
                        path="manage-equipments"
                        element={<ManageEquipments />}
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
                        path="order-detail/:serviceId"
                        element={<OrderDetail />}
                      />
                      <Route
                        path="order/:serviceId/add-workday"
                        element={<AddWorkday />}
                      />
                      <Route
                        path="edit-service-order/:serviceId"
                        element={<EditService />}
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
                    </Routes>
                  </div>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
