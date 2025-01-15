import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebase.jsx";
import {
  FileText,
  User,
  ClipboardList,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Check,
  Euro,
} from "lucide-react";
import generateBudgetPDF from "./generateBudgetPDF.jsx";
import ServiceInput from "./ServiceInput"; // Novo import

const AddBudget = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [order, setOrder] = useState(null); // Adicionado estado order
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderTotals, setOrderTotals] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [serviceValue, setServiceValue] = useState("");
  const [serviceQuantity, setServiceQuantity] = useState("");
  const [selectedServices, setSelectedServices] = useState([]);

  // Buscar clientes
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        const clientsRef = collection(db, "clientes");
        const querySnapshot = await getDocs(clientsRef);
        const clientsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClients(clientsData);
      } catch (err) {
        setError("Erro ao carregar clientes");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClients();
  }, []);

  // Buscar ordens quando um cliente é selecionado
  useEffect(() => {
    const fetchOrders = async () => {
      if (!selectedClient) return;

      try {
        setIsLoading(true);
        const ordersRef = collection(db, "ordens");
        const q = query(ordersRef, where("clientId", "==", selectedClient.id));
        const querySnapshot = await getDocs(q);
        const ordersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setOrders(ordersData);
      } catch (err) {
        setError("Erro ao carregar ordens");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, [selectedClient]);

  // Buscar serviços disponíveis
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const servicesRef = collection(db, "servicos");
        const querySnapshot = await getDocs(servicesRef);
        const servicesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setServices(servicesData);
      } catch (err) {
        setError("Erro ao carregar serviços");
        console.error(err);
      }
    };
    fetchServices();
  }, []);

  // Função auxiliar para calcular horas
  const calculateHours = (start, end) => {
    if (!start || !end) return "0:00";
    const startTime = new Date(`1970-01-01T${start}:00`);
    let endTime = new Date(`1970-01-01T${end}:00`);
    if (endTime < startTime) endTime.setDate(endTime.getDate() + 1);
    const diff = (endTime - startTime) / 1000 / 3600;
    const hours = Math.floor(diff);
    const minutes = Math.round((diff - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  // Função auxiliar para calcular horas com pausa
  const calculateHoursWithPause = (start, end, pauseHours) => {
    if (!start || !end) return "0:00";
    const [hours, minutes] = pauseHours.split(":").map(Number);
    const pauseInMinutes = hours * 60 + (minutes || 0);
    const [totalHours, totalMinutes] = calculateHours(start, end)
      .split(":")
      .map(Number);
    const finalMinutes = totalHours * 60 + totalMinutes - pauseInMinutes;
    return `${Math.floor(finalMinutes / 60)}:${(finalMinutes % 60)
      .toString()
      .padStart(2, "0")}`;
  };

  // Buscar totais da ordem quando uma ordem é selecionada
  useEffect(() => {
    const fetchOrderTotals = async () => {
      if (!selectedOrder) return;

      try {
        setIsLoading(true);
        const workdaysRef = collection(db, "workdays");
        const q = query(workdaysRef, where("orderId", "==", selectedOrder.id));
        const workdaysSnapshot = await getDocs(q);
        const workdays = workdaysSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        let totalWorkMinutes = 0;
        let totalTravelMinutes = 0;
        let totalKm = 0;

        workdays.forEach((day) => {
          // Calcula horas trabalhadas
          if (day.startHour && day.endHour) {
            const [hours, minutes] = calculateHoursWithPause(
              day.startHour,
              day.endHour,
              day.pauseHours || "0:00"
            )
              .split(":")
              .map(Number);
            totalWorkMinutes += hours * 60 + minutes;
          }

          // Calcula horas de viagem
          const [idaHours, idaMinutes] = calculateHours(
            day.departureTime,
            day.arrivalTime
          )
            .split(":")
            .map(Number);
          const [retHours, retMinutes] = calculateHours(
            day.returnDepartureTime,
            day.returnArrivalTime
          )
            .split(":")
            .map(Number);
          totalTravelMinutes +=
            idaHours * 60 + idaMinutes + (retHours * 60 + retMinutes);

          // Calcula KMs
          totalKm +=
            (parseFloat(day.kmDeparture) || 0) +
            (parseFloat(day.kmReturn) || 0);
        });

        setOrderTotals({
          totalWorkHours: totalWorkMinutes / 60,
          totalTravelHours: totalTravelMinutes / 60,
          totalKm: totalKm.toFixed(2),
        });
      } catch (err) {
        setError("Erro ao calcular totais");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrderTotals();
  }, [selectedOrder]);

  const handleAddService = (serviceData) => {
    if (!serviceData) return;

    // Adiciona o serviço com os dados recebidos do ServiceInput
    setSelectedServices((prev) => [...prev, serviceData]);

    // Reset do serviço selecionado
    setSelectedServiceId("");
  };

  // Função auxiliar para obter o rótulo da unidade
  const getUnitLabel = (type) => {
    const types = {
      base: "un",
      un: "un",
      hour: "hora(s)",
      day: "dia(s)",
      km: "km",
    };
    return types[type] || type;
  };

  const handleRemoveService = (serviceId) => {
    setSelectedServices((prev) => prev.filter((s) => s.id !== serviceId));
  };

  const generatePDF = async () => {
    try {
      setIsGeneratingPDF(true);

      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = String(now.getFullYear()).slice(-2);
      const orderNumber = `${month}${year}-${order.id}`;

      // Passar os serviços com detalhes dos valores múltiplos
      await generateBudgetPDF(
        selectedOrder,
        selectedClient,
        selectedServices,
        orderNumber
      );

      const orcamentosRef = collection(db, "orcamentos");
      await addDoc(orcamentosRef, {
        orderNumber,
        clientId: selectedClient.id,
        orderId: selectedOrder.id,
        services: selectedServices, // Agora inclui informação sobre valores múltiplos
        total: selectedServices.reduce((acc, curr) => acc + curr.total, 0),
        createdAt: new Date(),
      });

      navigate("/app/manage-budgets");
    } catch (error) {
      setError("Erro ao gerar PDF. Por favor, tente novamente.");
      console.error("Erro ao gerar PDF:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-semibold text-center text-white mb-6">
        Gerador de Orçamentos
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <div className="grid gap-6 mb-6">
        {/* Seleção de Cliente */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg">
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <User className="w-5 h-5 mr-2" />
              Selecionar Cliente
            </h3>
          </div>
          <div className="p-6">
            <select
              className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              onChange={(e) => {
                const client = clients.find((c) => c.id === e.target.value);
                setSelectedClient(client);
                setSelectedOrder(null);
              }}
              value={selectedClient?.id || ""}
            >
              <option value="">Selecione um cliente...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Seleção de Ordem de Serviço */}
        {selectedClient && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <ClipboardList className="w-5 h-5 mr-2" />
                Selecionar Ordem de Serviço
              </h3>
            </div>
            <div className="p-6">
              <select
                className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onChange={(e) => {
                  const selectedOrder = orders.find(
                    (o) => o.id === e.target.value
                  );
                  setSelectedOrder(selectedOrder);
                  setOrder(selectedOrder);
                }}
                value={selectedOrder?.id || ""}
              >
                <option value="">Selecione uma ordem...</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    Ordem #{order.id} -{" "}
                    {new Date(order.date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Totais da Ordem */}
        {selectedOrder && orderTotals && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Totais da Ordem
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h4 className="text-gray-400 text-sm mb-1">
                    Horas Trabalhadas:
                  </h4>
                  <p className="text-white text-lg font-medium">
                    {orderTotals.totalWorkHours.toFixed(2)}h
                    <span className="text-gray-400 text-sm ml-2">
                      ({Math.floor(orderTotals.totalWorkHours)}h
                      {Math.round((orderTotals.totalWorkHours % 1) * 60)
                        .toString()
                        .padStart(2, "0")}
                      min)
                    </span>
                  </p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h4 className="text-gray-400 text-sm mb-1">
                    Horas de Viagem:
                  </h4>
                  <p className="text-white text-lg font-medium">
                    {orderTotals.totalTravelHours.toFixed(2)}h
                    <span className="text-gray-400 text-sm ml-2">
                      ({Math.floor(orderTotals.totalTravelHours)}h
                      {Math.round((orderTotals.totalTravelHours % 1) * 60)
                        .toString()
                        .padStart(2, "0")}
                      min)
                    </span>
                  </p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h4 className="text-gray-400 text-sm mb-1">KMs Rodados:</h4>
                  <p className="text-white text-lg font-medium">
                    {orderTotals.totalKm} km
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Serviços Disponíveis */}
        {selectedOrder && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Serviços
              </h3>
            </div>
            <div className="p-6">
              <ServiceInput
                services={services}
                selectedServiceId={selectedServiceId}
                setSelectedServiceId={setSelectedServiceId}
                onAddService={handleAddService}
              />
            </div>
          </div>
        )}

        {/* Serviços Selecionados */}
        {selectedServices.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                Serviços Selecionados
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {selectedServices.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                  >
                    <div>
                      <p className="text-white font-medium">{service.name}</p>
                      <p className="text-gray-400 text-sm">
                        {service.multipleEntries
                          ? // Se for múltiplos valores, mostra o total direto
                            `Total: ${service.total.toFixed(2)}€`
                          : // Se for valor único, mostra o cálculo
                            `${service.value.toFixed(2)}€ x ${
                              service.quantity
                            } = ${service.total.toFixed(2)}€`}
                      </p>
                      {/* Se tiver valores múltiplos, mostra o detalhe */}
                      {service.multipleEntries && (
                        <div className="mt-1 text-xs text-gray-400">
                          {service.multipleEntries.map((entry, idx) => (
                            <div key={idx}>
                              Valor {idx + 1}: {entry.value}€ x {entry.quantity}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveService(service.id)}
                      className="p-2 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                <div className="pt-4 border-t border-gray-700">
                  <p className="text-white text-right font-medium">
                    Total:{" "}
                    {selectedServices
                      .reduce((acc, curr) => acc + curr.total, 0)
                      .toFixed(2)}
                    €
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-4 left-0 right-0 flex justify-center items-center md:left-64">
        <button
          onClick={generatePDF}
          disabled={
            isGeneratingPDF ||
            !selectedServices.length > 0 ||
            !selectedClient ||
            !selectedOrder
          }
          className="h-16 px-6 bg-[#117d49] text-white font-medium flex items-center justify-center rounded-full shadow-lg hover:bg-[#0d6238] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeneratingPDF ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <FileText className="w-5 h-5 mr-2" />
          )}
          {isGeneratingPDF ? "Gerando PDF..." : "Gerar Orçamento"}
        </button>
      </div>
    </div>
  );
};

export default AddBudget;
