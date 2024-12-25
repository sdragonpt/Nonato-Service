import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faTools,
  faBox,
  faClipboardList,
  faChartBar,
  faCheckCircle,
  faSignOutAlt,
  faBook,
} from "@fortawesome/free-solid-svg-icons";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
} from "react-router-dom";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
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
import LoginPage from "./components/LoginPage"; // Import the LoginPage component

// Protected route component to guard routes from unauthenticated access
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

  if (loading) return <div>Loading...</div>;

  return user ? children : <Navigate to="/login" />;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navbarRef = useRef(null);
  const auth = getAuth();

  const toggleNavbar = () => setIsOpen(!isOpen);
  const closeNavbar = () => setIsOpen(false);

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        // Redireciona para a página de login após o logout
      })
      .catch((error) => {
        console.error("Erro ao deslogar: ", error);
      });
  };

  const handleClickOutside = (event) => {
    if (navbarRef.current && !navbarRef.current.contains(event.target)) {
      closeNavbar();
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Navigate to="/start" />} />
        <Route path="/start" element={<InitialPage />} />
        <Route path="/login" element={<LoginPage />} /> {/* Login route */}
        <Route
          path="/app/*"
          element={
            <ProtectedRoute>
              {/* Protect all /app routes */}
              <div
                className="relative min-h-screen bg-cover bg-center bg-zinc-900 text-white"
                style={{
                  backgroundImage:
                    window.innerWidth < 1024
                      ? "url('/background3.png')"
                      : "none",
                  backgroundSize: "80%",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundAttachment:
                    window.innerWidth < 1024 ? "fixed" : "scroll",
                }}
              >
                {/* Main Content */}
                <div className="relative z-10">
                  <div className="p-4">
                    <button
                      onClick={toggleNavbar}
                      className="text-white focus:outline-none fixed md:hidden"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 6h16M4 12h16m-7 6h7"
                        />
                      </svg>
                    </button>
                  </div>
                  <div
                    ref={navbarRef}
                    className={`fixed top-0 left-0 w-64 h-full bg-zinc-800 transform z-50 ${
                      isOpen ? "translate-x-0" : "-translate-x-full"
                    } transition-transform duration-300 ease-in-out md:translate-x-0`}
                  >
                    <nav className="flex flex-col p-6 space-y-4">
                      <h2 className="text-xl font-semibold text-white my-4">
                        Cadastro
                      </h2>
                      <Link
                        to="/app/manage-clients"
                        onClick={closeNavbar}
                        className="text-white hover:bg-gray-700 p-2 rounded text-lg flex items-center"
                      >
                        <FontAwesomeIcon icon={faUsers} className="mr-3" />
                        Clientes
                      </Link>
                      <Link
                        to="/app/services"
                        onClick={closeNavbar}
                        className="text-white hover:bg-gray-700 p-2 rounded text-lg flex items-center"
                      >
                        <FontAwesomeIcon icon={faTools} className="mr-3" />
                        Serviços
                      </Link>
                      <Link
                        to="/app/manage-equipments"
                        onClick={closeNavbar}
                        className="text-white hover:bg-gray-700 p-2 rounded text-lg flex items-center"
                      >
                        <FontAwesomeIcon icon={faBox} className="mr-3" />
                        Peças
                      </Link>
                      <Link
                        to="/app/manage-equipments"
                        onClick={closeNavbar}
                        className="text-white hover:bg-gray-700 p-2 rounded text-lg flex items-center"
                      >
                        <FontAwesomeIcon icon={faBook} className="mr-3" />{" "}
                        {/* Ícone de configurações */}
                        Biblioteca de Peças
                      </Link>
                      <div className="my-4" />
                      <Link
                        to="/app/manage-services"
                        onClick={closeNavbar}
                        className="text-white hover:bg-gray-700 p-2 rounded text-lg flex items-center"
                      >
                        <FontAwesomeIcon
                          icon={faClipboardList}
                          className="mr-3"
                        />
                        Ordem de Serviço
                      </Link>
                      <Link
                        to="/app/manage-report"
                        onClick={closeNavbar}
                        className="text-white hover:bg-gray-700 p-2 rounded text-lg flex items-center"
                      >
                        <FontAwesomeIcon icon={faChartBar} className="mr-3" />
                        Relatório
                      </Link>
                      <Link
                        to="/app/manage-checklist"
                        onClick={closeNavbar}
                        className="text-white hover:bg-gray-700 p-2 rounded text-lg flex items-center"
                      >
                        <FontAwesomeIcon
                          icon={faCheckCircle}
                          className="mr-3"
                        />
                        Check List
                      </Link>
                      <div className="mt-auto">
                        {/* Move o logout para o fundo */}
                        <button
                          onClick={handleLogout}
                          className="text-white hover:bg-gray-700 p-2 rounded text-lg flex items-center w-full mt-24"
                        >
                          <FontAwesomeIcon
                            icon={faSignOutAlt}
                            className="mr-3"
                          />
                          Sair
                        </button>
                      </div>
                    </nav>
                  </div>
                </div>
                <div className="md:ml-64 p-6">
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
                    <Route path="manage-clients" element={<ManageClients />} />
                    <Route
                      path="manage-equipments"
                      element={<ManageEquipments />}
                    />
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
                      path="/edit-workday/:workdayId"
                      element={<EditWorkday />}
                    />
                  </Routes>
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
