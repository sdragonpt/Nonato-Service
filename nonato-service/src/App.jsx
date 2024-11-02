import React, { useState, useRef, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
} from "react-router-dom";
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

  const toggleNavbar = () => setIsOpen(!isOpen);
  const closeNavbar = () => setIsOpen(false);

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
        {/* Redirect from root to /start */}
        <Route path="/" element={<Navigate to="/start" />} />
        <Route path="/start" element={<InitialPage />} />

        <Route
          path="/app/*"
          element={
            <div className="relative min-h-screen bg-zinc-900 text-white">
              {/* Background image */}
              <div
                className="absolute inset-0 opacity-60 bg-cover bg-center"
                style={{
                  backgroundImage: "url('/background2.png')",
                  backgroundPosition: "center",
                  backgroundSize: "80%",
                  backgroundRepeat: "no-repeat",
                }}
              ></div>

              {/* Main Content */}
              <div className="relative z-10">
                {/* Navbar toggle and content */}
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
                      className="text-white hover:bg-gray-700 p-2 rounded text-lg"
                    >
                      Clientes
                    </Link>
                    <Link
                      to="/app/manage-services"
                      onClick={closeNavbar}
                      className="text-white hover:bg-gray-700 p-2 rounded text-lg"
                    >
                      Serviços
                    </Link>
                    <Link
                      to="/app/manage-equipments"
                      onClick={closeNavbar}
                      className="text-white hover:bg-gray-700 p-2 rounded text-lg"
                    >
                      Peças
                    </Link>
                    <div className="my-4" /> {/* Espaço extra */}
                    <Link
                      to="/app/manage-order"
                      onClick={closeNavbar}
                      className="text-white hover:bg-gray-700 p-2 rounded text-lg"
                    >
                      Ordem de Serviço
                    </Link>
                    <Link
                      to="/app/manage-report"
                      onClick={closeNavbar}
                      className="text-white hover:bg-gray-700 p-2 rounded text-lg"
                    >
                      Relatório
                    </Link>
                    <Link
                      to="/app/manage-checklist"
                      onClick={closeNavbar}
                      className="text-white hover:bg-gray-700 p-2 rounded text-lg"
                    >
                      Check List
                    </Link>
                  </nav>
                </div>

                <div className="md:ml-64 p-6">
                  <Routes>
                    {/* Define child routes without the /app prefix */}
                    <Route path="add-client" element={<AddClient />} />
                    <Route path="add-equipment" element={<AddEquipment />} />
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
                    {/* Rota para adicionar equipamento associado ao cliente */}
                    <Route
                      path="client/:clientId/add-equipment"
                      element={<AddEquipment />}
                    />
                  </Routes>
                </div>
              </div>
            </div>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
