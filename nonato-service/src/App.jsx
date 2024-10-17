import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ManageServices from './components/ManageServices';
import AddEquipment from './components/AddEquipment';
import AddClient from './components/AddClient';
import ClosedServices from './components/ClosedServices';
import OpenServices from './components/OpenServices';
import ManageClients from './components/ManageClients';
import ManageEquipments from './components/ManageEquipments';
import ClientDetail from './components/ClientDetail';
import EquipmentDetail from './components/EquipmentDetail';
import EditClient from './components/EditClient';
import EditEquipment from './components/EditEquipment';

const App = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Função para alternar a abertura da navbar
  const toggleNavbar = () => {
    setIsOpen(!isOpen);
  };

  // Função para fechar a navbar após clicar em um link
  const closeNavbar = () => {
    setIsOpen(false);
  };

  return (
    <Router>
      <div className="App min-h-screen bg-gray-900 text-white">
        {/* Botão de hambúrguer no topo */}
        <div className="p-4">
          <button 
            onClick={toggleNavbar} 
            className="text-white focus:outline-none md:hidden">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>

        {/* Navbar lateral */}
        <div className={`fixed top-0 left-0 w-64 h-full bg-gray-800 z-50 transform ${isOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 ease-in-out md:translate-x-0`}>
          <nav className="flex flex-col p-6 space-y-4">
            <Link to="/manage-services" onClick={closeNavbar} className="text-white hover:bg-gray-700 p-2 rounded">Gerenciar Serviços</Link>
            <Link to="/add-client" onClick={closeNavbar} className="text-white hover:bg-gray-700 p-2 rounded">Adicionar Cliente</Link>
            <Link to="/add-equipment" onClick={closeNavbar} className="text-white hover:bg-gray-700 p-2 rounded">Adicionar Equipamento</Link>
            <Link to="/closed-services" onClick={closeNavbar} className="text-white hover:bg-gray-700 p-2 rounded">Ver Serviços Fechados</Link>
            <Link to="/open-services" onClick={closeNavbar} className="text-white hover:bg-gray-700 p-2 rounded">Ver Serviços Abertos</Link>
            <Link to="/manage-clients" onClick={closeNavbar} className="text-white hover:bg-gray-700 p-2 rounded">Gerenciar Clientes</Link>
            <Link to="/manage-equipments" onClick={closeNavbar} className="text-white hover:bg-gray-700 p-2 rounded">Gerenciar Equipamentos</Link>
          </nav>
        </div>

        {/* Conteúdo principal */}
        <div className="md:ml-64 p-6">
          <Routes>
            <Route path="/add-client" element={<AddClient />} />
            <Route path="/add-equipment" element={<AddEquipment />} />
            <Route path="/manage-services" element={<ManageServices />} />
            <Route path="/closed-services" element={<ClosedServices />} />
            <Route path="/open-services" element={<OpenServices />} />
            <Route path="/manage-clients" element={<ManageClients />} />
            <Route path="/manage-equipments" element={<ManageEquipments />} />
            <Route path="/client/:clientId" element={<ClientDetail />} />
            <Route path="/equipment/:equipmentId" element={<EquipmentDetail />} />
            <Route path="/edit-client/:clientId" element={<EditClient />} />
            <Route path="/edit-equipment/:equipmentId" element={<EditEquipment />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
