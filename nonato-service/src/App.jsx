import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ManageServices from './components/ManageServices';
import AddEquipment from './components/AddEquipment';
import AddClient from './components/AddClient';
import ClosedServices from './components/ClosedServices';
import OpenServices from './components/OpenServices'; // Importe o novo componente

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
          <Link to="/open-services"> {/* Adicione um link para serviços abertos */}
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition duration-300">
              Ver Serviços Abertos
            </button>
          </Link>
        </div>

        <Routes>
          <Route path="/add-client" element={<AddClient />} />
          <Route path="/add-equipment" element={<AddEquipment />} />
          <Route path="/manage-services" element={<ManageServices />} />
          <Route path="/closed-services" element={<ClosedServices />} />
          <Route path="/open-services" element={<OpenServices />} /> {/* Nova rota para serviços abertos */}
        </Routes>
      </div>
    </Router>
  );
};

export default App;
