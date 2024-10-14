import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ManageServices from './components/ManageServices';
import AddEquipment from './components/AddEquipment';
import AddClient from './components/AddClient';
import ClosedServices from './components/ClosedServices';
import OpenServices from './components/OpenServices';
import ManageClients from './components/ManageClients'; 
import ManageEquipments from './components/ManageEquipments'; 
import ClientDetail from './components/ClientDetail'; // Importar o componente ClientDetail
import EquipmentDetail from './components/EquipmentDetail'; // Importar o componente EquipmentDetail

const App = () => {
  return (
    <Router>
      <div className="App flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
        <h1 className="text-3xl mb-6">Gerenciamento de Serviços</h1>

        <div className="flex space-x-4 mb-6">
          <Link to="/manage-services">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition duration-300">
              Gerenciar Serviços
            </button>
          </Link>
          <Link to="/add-client">
            <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition duration-300">
              Adicionar Cliente
            </button>
          </Link>
          <Link to="/add-equipment">
            <button className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition duration-300">
              Adicionar Equipamento
            </button>
          </Link>
          <Link to="/closed-services">
            <button className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition duration-300">
              Ver Serviços Fechados
            </button>
          </Link>
          <Link to="/open-services">
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition duration-300">
              Ver Serviços Abertos
            </button>
          </Link>
          <Link to="/manage-clients">
            <button className="px-4 py-2 bg-teal-600 hover:bg-teal-700 rounded-lg transition duration-300">
              Gerenciar Clientes
            </button>
          </Link>
          <Link to="/manage-equipments">
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition duration-300">
              Gerenciar Equipamentos
            </button>
          </Link>
        </div>

        <Routes>
          <Route path="/add-client" element={<AddClient />} />
          <Route path="/add-equipment" element={<AddEquipment />} />
          <Route path="/manage-services" element={<ManageServices />} />
          <Route path="/closed-services" element={<ClosedServices />} />
          <Route path="/open-services" element={<OpenServices />} />
          <Route path="/manage-clients" element={<ManageClients />} />
          <Route path="/manage-equipments" element={<ManageEquipments />} />
          <Route path="/client/:clientId" element={<ClientDetail />} /> {/* Rota para detalhes do cliente */}
          <Route path="/equipment/:equipmentId" element={<EquipmentDetail />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
