import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Loader2,
  MoreVertical,
  Edit2,
  Trash2,
  Wrench,
  Euro,
} from "lucide-react";

const ManageServices = () => {
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [activeMenu, setActiveMenu] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setIsLoading(true);
        const servicesRef = collection(db, "servicos");
        const q = query(servicesRef, orderBy("name", sortOrder));
        const querySnapshot = await getDocs(q);
        const servicesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          value: Number(doc.data().value) || 0,
        }));
        setServices(servicesData);
        setError(null);
      } catch (err) {
        setError("Erro ao carregar serviços. Por favor, tente novamente.");
        console.error("Erro ao buscar serviços:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchServices();
  }, [sortOrder]);

  // Fecha o menu quando clicar fora
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleDelete = async (serviceId, e) => {
    e.stopPropagation();
    if (window.confirm("Tem certeza que deseja deletar este serviço?")) {
      try {
        await deleteDoc(doc(db, "servicos", serviceId));
        setServices(services.filter((service) => service.id !== serviceId));
        setActiveMenu(null);
      } catch (error) {
        setError("Erro ao deletar serviço. Por favor, tente novamente.");
        console.error("Erro ao deletar serviço:", error);
      }
    }
  };

  const handleEdit = (serviceId, e) => {
    e.stopPropagation();
    navigate(`/app/edit-service/${serviceId}`);
    setActiveMenu(null);
  };

  const toggleMenu = (e, serviceId) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === serviceId ? null : serviceId);
  };

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const getTypeLabel = (type) => {
    const types = {
      base: "Valor Base",
      hour: "Por Hora",
      day: "Por Dia",
      km: "Por Km",
    };
    return types[type] || type;
  };

  return (
    <div className="w-full max-w-3xl mx-auto rounded-lg p-4">
      <h2 className="text-2xl font-semibold text-center text-white mb-6">
        Gerenciar Serviços
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar serviços..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 pl-10 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={toggleSortOrder}
          className="text-white hover:text-blue-400 transition-colors"
        >
          Ordenar: {sortOrder === "asc" ? "A-Z" : "Z-A"}
        </button>
        <span className="text-gray-400">
          {filteredServices.length} serviço(s)
        </span>
      </div>

      <div className="space-y-4 mb-32">
        {filteredServices.length > 0 ? (
          filteredServices.map((service) => (
            <div
              key={service.id}
              className="group flex items-center p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors relative"
            >
              <div className="flex items-center flex-grow min-w-0">
                <div className="h-12 w-12 rounded-full bg-[#117d49] flex items-center justify-center mr-4">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0 flex-grow">
                  <h3 className="font-semibold text-white truncate">
                    {service.name}
                  </h3>
                  <div className="flex items-center text-gray-400">
                    <Euro className="w-4 h-4 mr-1" />
                    <span>
                      {Number(service.value).toFixed(2)} (
                      {getTypeLabel(service.type)})
                    </span>
                  </div>
                  {service.description && (
                    <p className="text-gray-400 truncate mt-1">
                      {service.description}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={(e) => toggleMenu(e, service.id)}
                className="p-2 ml-2 text-gray-400 hover:text-white rounded-full focus:outline-none"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {activeMenu === service.id && (
                <div
                  className="absolute right-0 top-full mt-2 w-48 bg-gray-800 rounded-lg shadow-lg z-50 py-1 border border-gray-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => handleEdit(service.id, e)}
                    className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                  </button>
                  <button
                    onClick={(e) => handleDelete(service.id, e)}
                    className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-white text-center py-8">
            <p className="mb-2">Nenhum serviço encontrado.</p>
            <p className="text-gray-400">
              Tente ajustar sua busca ou adicione um novo serviço.
            </p>
          </div>
        )}
      </div>

      <div className="fixed bottom-4 left-0 right-0 flex justify-center items-center md:left-64">
        <button
          onClick={() => navigate("/app/add-service")}
          className="h-16 px-6 bg-[#117d49] text-white font-medium flex items-center justify-center rounded-full shadow-lg hover:bg-[#0d6238] transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Novo Serviço
        </button>
      </div>
    </div>
  );
};

export default ManageServices;
