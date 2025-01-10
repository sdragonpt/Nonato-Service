import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Search,
  AlertCircle,
  Calendar,
  Clock,
  AlertTriangle,
  Filter,
} from "lucide-react";

const OpenOrders = () => {
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOption, setFilterOption] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Buscar dados em paralelo
        const [servicesSnapshot, clientsSnapshot, equipmentsSnapshot] =
          await Promise.all([
            getDocs(collection(db, "servicos")),
            getDocs(collection(db, "clientes")),
            getDocs(collection(db, "equipamentos")),
          ]);

        // Filtrar serviços abertos e ordenar por data
        const servicesData = servicesSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt:
              doc.data().createdAt?.toDate() || new Date(doc.data().date),
          }))
          .filter((service) => service.status === "Aberto")
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        const clientsData = clientsSnapshot.docs.reduce((acc, doc) => {
          acc[doc.id] = { id: doc.id, ...doc.data() };
          return acc;
        }, {});

        const equipmentsData = equipmentsSnapshot.docs.reduce((acc, doc) => {
          acc[doc.id] = { id: doc.id, ...doc.data() };
          return acc;
        }, {});

        setServices(servicesData);
        setClients(clientsData);
        setEquipments(equipmentsData);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError(
          "Erro ao carregar ordens de serviço. Por favor, tente novamente."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getFilteredServices = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered = services;

    // Aplicar filtro de data/prioridade
    if (filterOption === "today") {
      filtered = filtered.filter((service) => {
        const serviceDate = new Date(service.createdAt);
        return serviceDate >= today;
      });
    } else if (filterOption === "urgent") {
      filtered = filtered.filter((service) => service.priority === "high");
    }

    // Aplicar busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((service) => {
        const client = clients[service.clientId];
        const equipment = equipments[service.equipmentId];
        return (
          client?.name?.toLowerCase().includes(searchLower) ||
          equipment?.brand?.toLowerCase().includes(searchLower) ||
          equipment?.model?.toLowerCase().includes(searchLower) ||
          service.serviceName?.toLowerCase().includes(searchLower)
        );
      });
    }

    return filtered;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const filteredServices = getFilteredServices();

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center justify-center"
        aria-label="Voltar"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <h2 className="text-2xl font-semibold text-center text-white mb-6">
        Ordens de Serviço Abertas
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg flex items-center text-red-500 text-sm">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, equipamento ou serviço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 pl-10 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterOption("all")}
            className={`px-4 py-2 rounded-lg flex items-center ${
              filterOption === "all"
                ? "bg-blue-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Todas
          </button>
          <button
            onClick={() => setFilterOption("today")}
            className={`px-4 py-2 rounded-lg flex items-center ${
              filterOption === "today"
                ? "bg-blue-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Hoje
          </button>
          <button
            onClick={() => setFilterOption("urgent")}
            className={`px-4 py-2 rounded-lg flex items-center ${
              filterOption === "urgent"
                ? "bg-blue-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Urgentes
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredServices.length > 0 ? (
          filteredServices.map((service) => {
            const client = clients[service.clientId];
            const equipment = equipments[service.equipmentId];
            const isToday =
              new Date(service.createdAt).toDateString() ===
              new Date().toDateString();

            return (
              <div
                key={service.id}
                onClick={() => navigate(`/app/order-detail/${service.id}`)}
                className="bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors group relative"
              >
                <div className="absolute top-4 right-4 flex gap-2">
                  {isToday && (
                    <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      Hoje
                    </span>
                  )}
                  {service.priority === "high" && (
                    <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded-full flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Urgente
                    </span>
                  )}
                </div>

                <div className="text-white">
                  <div className="flex items-center mb-2">
                    <img
                      src={client?.profilePic || "/nonato.png"}
                      alt={client?.name}
                      className="w-10 h-10 rounded-full mr-3"
                      onError={(e) => {
                        e.target.src = "/nonato.png";
                        e.target.onerror = null;
                      }}
                    />
                    <div>
                      <h3 className="font-semibold text-lg">
                        {client?.name || "Cliente não encontrado"}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {service.serviceName}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">
                        <span className="font-medium">Marca:</span>{" "}
                        {equipment?.brand || "N/A"}
                      </p>
                      <p className="text-gray-400">
                        <span className="font-medium">Modelo:</span>{" "}
                        {equipment?.model || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">
                        <span className="font-medium">Data:</span>{" "}
                        {service.createdAt.toLocaleDateString()}
                      </p>
                      <p className="text-gray-400">
                        <span className="font-medium">Status:</span>{" "}
                        {service.status}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-2">
              Nenhuma ordem de serviço encontrada.
            </p>
            {searchTerm && (
              <p className="text-sm text-gray-500">
                Tente ajustar sua busca ou filtros.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OpenOrders;
