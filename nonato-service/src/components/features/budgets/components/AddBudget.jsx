import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where, addDoc } from "firebase/firestore";
import { db } from "../../../../firebase.jsx";
import {
  User,
  ClipboardList,
  Loader2,
  AlertTriangle,
  Plus,
  Trash2,
  ArrowLeft,
  Clock,
  Receipt,
} from "lucide-react";
import generateBudgetPDF from "./pdf/generateBudgetPDF.jsx";
import ServiceInput from "../../../shared/ServiceInput.jsx";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";

const AddBudget = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [order, setOrder] = useState(null);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderTotals, setOrderTotals] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedServices, setSelectedServices] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);

  // Fetch clients
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

  // Fetch orders when client is selected
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

  // Fetch services
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

  // Helper function to calculate hours
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

  // Helper function to calculate hours with pause
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

  // Calculate order totals when order is selected
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
          // Calculate work hours
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

          // Calculate travel hours
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

          // Calculate KMs
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
    setSelectedServices((prev) => [...prev, serviceData]);
    setSelectedServiceId("");
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

      // Formatar os serviços para o formato esperado pelo PDF
      const formattedServices = selectedServices.map((service) => {
        if (service.multipleEntries) {
          // Se for múltiplos valores, cria um serviço com a soma total
          return {
            id: service.id,
            name: service.name,
            type: service.type,
            value: service.total,
            quantity: 1,
            total: service.total,
            observations: service.multipleEntries
              .map(
                (entry, idx) =>
                  `Valor ${idx + 1}: ${entry.value}€ x ${entry.quantity}`
              )
              .join(", "),
          };
        } else {
          // Se for valor único, mantém o formato original
          return {
            id: service.id,
            name: service.name,
            type: service.type,
            value: service.value,
            quantity: service.quantity,
            total: service.total,
          };
        }
      });

      await generateBudgetPDF(
        selectedOrder,
        selectedClient,
        formattedServices,
        orderNumber
      );

      const orcamentosRef = collection(db, "orcamentos");
      await addDoc(orcamentosRef, {
        orderNumber,
        clientId: selectedClient.id,
        orderId: selectedOrder.id,
        services: formattedServices,
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

  // Calculate total amount
  useEffect(() => {
    const newTotal = selectedServices.reduce(
      (acc, curr) => acc + curr.total,
      0
    );
    setTotalAmount(newTotal);
  }, [selectedServices]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Novo Fechamento</h1>
          <p className="text-sm text-zinc-400">
            Gere um fechamento para uma ordem de serviço
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full border-zinc-700 text-white hover:bg-green-700 bg-green-600"
        >
          <ArrowLeft className="h-4 w-4 text-white" />
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Client Selection */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              Selecionar Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedClient?.id || ""}
              onValueChange={(value) => {
                const client = clients.find((c) => c.id === value);
                setSelectedClient(client);
                setSelectedOrder(null);
              }}
            >
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                <SelectValue placeholder="Selecione um cliente..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {clients.map((client) => (
                  <SelectItem
                    key={client.id}
                    value={client.id}
                    className="text-white hover:bg-zinc-700"
                  >
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Service Order Selection */}
        {selectedClient && (
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Selecionar Ordem de Serviço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedOrder?.id || ""}
                onValueChange={(value) => {
                  const selectedOrder = orders.find((o) => o.id === value);
                  setSelectedOrder(selectedOrder);
                  setOrder(selectedOrder);
                }}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue placeholder="Selecione uma ordem..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {orders.map((order) => (
                    <SelectItem
                      key={order.id}
                      value={order.id}
                      className="text-white hover:bg-zinc-700"
                    >
                      Ordem #{order.id} -{" "}
                      {new Date(order.date).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Order Totals */}
        {selectedOrder && orderTotals && (
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Totais da Ordem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Work Hours */}
                <div className="bg-zinc-900 p-4 rounded-lg">
                  <p className="text-sm text-zinc-400 mb-1">
                    Horas Trabalhadas:
                  </p>
                  <p className="text-lg font-medium text-white">
                    {orderTotals.totalWorkHours.toFixed(2)}h
                    <span className="text-sm text-zinc-400 ml-2">
                      ({Math.floor(orderTotals.totalWorkHours)}h
                      {Math.round((orderTotals.totalWorkHours % 1) * 60)
                        .toString()
                        .padStart(2, "0")}
                      min)
                    </span>
                  </p>
                </div>

                {/* Travel Hours */}
                <div className="bg-zinc-900 p-4 rounded-lg">
                  <p className="text-sm text-zinc-400 mb-1">Horas de Viagem:</p>
                  <p className="text-lg font-medium text-white">
                    {orderTotals.totalTravelHours.toFixed(2)}h
                    <span className="text-sm text-zinc-400 ml-2">
                      ({Math.floor(orderTotals.totalTravelHours)}h
                      {Math.round((orderTotals.totalTravelHours % 1) * 60)
                        .toString()
                        .padStart(2, "0")}
                      min)
                    </span>
                  </p>
                </div>

                {/* Total KMs */}
                <div className="bg-zinc-900 p-4 rounded-lg">
                  <p className="text-sm text-zinc-400 mb-1">KMs Rodados:</p>
                  <p className="text-lg font-medium text-white">
                    {orderTotals.totalKm} km
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services Section */}
        {selectedOrder && (
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Adicionar Serviços
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ServiceInput
                services={services}
                selectedServiceId={selectedServiceId}
                setSelectedServiceId={setSelectedServiceId}
                onAddService={handleAddService}
              />
            </CardContent>
          </Card>
        )}

        {/* Selected Services */}
        {selectedServices.length > 0 && (
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-lg text-white">
                Serviços Selecionados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedServices.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg"
                  >
                    <div>
                      <p className="text-white font-medium">{service.name}</p>
                      <p className="text-zinc-400 text-sm">
                        {service.multipleEntries
                          ? `Total: ${service.total.toFixed(2)}€`
                          : `${service.value.toFixed(2)}€ x ${
                              service.quantity
                            } = ${service.total.toFixed(2)}€`}
                      </p>
                      {service.multipleEntries && (
                        <div className="mt-1 text-xs text-zinc-400">
                          {service.multipleEntries.map((entry, idx) => (
                            <div key={idx}>
                              Valor {idx + 1}: {entry.value}€ x {entry.quantity}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveService(service.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-zinc-800"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                ))}
                <div className="pt-4 border-t border-zinc-700">
                  <p className="text-right font-medium text-white">
                    Total: {totalAmount.toFixed(2)}€
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Generate Button */}
      <div className="fixed bottom-6 right-6 left-6 md:left-64 flex justify-center">
        <Button
          onClick={generatePDF}
          disabled={
            isGeneratingPDF ||
            !selectedServices.length > 0 ||
            !selectedClient ||
            !selectedOrder
          }
          className="h-12 px-6 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeneratingPDF ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando PDF...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Gerar Fechamento
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AddBudget;
