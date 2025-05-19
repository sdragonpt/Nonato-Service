import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  where,
  getDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import {
  User,
  ClipboardList,
  Loader2,
  AlertTriangle,
  Save,
  Trash2,
  ArrowLeft,
  Clock,
  Receipt,
  Calculator,
} from "lucide-react";
import generateBudgetPDF from "./pdf/generateBudgetPDF.jsx";
import ServiceInput from "../../../components/shared/ServiceInput.jsx";
import IVASelector from "./IVASelector.jsx";

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

const EditBudget = () => {
  const { budgetId } = useParams();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [order, setOrder] = useState(null);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderTotals, setOrderTotals] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedServices, setSelectedServices] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [ivaRate, setIvaRate] = useState(23);
  const [originalData, setOriginalData] = useState(null);

  // Fetch budget data
  useEffect(() => {
    const fetchBudget = async () => {
      try {
        setIsLoading(true);
        const budgetDoc = await getDoc(doc(db, "orcamentos", budgetId));
        if (!budgetDoc.exists()) {
          setError("Orçamento não encontrado");
          return;
        }

        const budgetData = budgetDoc.data();
        setOriginalData(budgetData);
        setSelectedServices(budgetData.services || []);
        setIvaRate(budgetData.ivaRate || 23);

        // Fetch client and order data
        const clientDoc = await getDoc(
          doc(db, "clientes", budgetData.clientId)
        );
        if (clientDoc.exists()) {
          setSelectedClient({ id: clientDoc.id, ...clientDoc.data() });
        }

        if (budgetData.orderId) {
          const orderDoc = await getDoc(doc(db, "ordens", budgetData.orderId));
          if (orderDoc.exists()) {
            setSelectedOrder({ id: orderDoc.id, ...orderDoc.data() });
            setOrder({ id: orderDoc.id, ...orderDoc.data() });
          }
        }
      } catch (err) {
        console.error("Erro ao carregar orçamento:", err);
        setError("Erro ao carregar dados do orçamento");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBudget();
  }, [budgetId]);

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
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

          // Calculate travel hours and KMs
          if (day.departureTime && day.arrivalTime) {
            const [idaHours, idaMinutes] = calculateHours(
              day.departureTime,
              day.arrivalTime
            )
              .split(":")
              .map(Number);
            totalTravelMinutes += idaHours * 60 + idaMinutes;
          }

          if (day.returnDepartureTime && day.returnArrivalTime) {
            const [retHours, retMinutes] = calculateHours(
              day.returnDepartureTime,
              day.returnArrivalTime
            )
              .split(":")
              .map(Number);
            totalTravelMinutes += retHours * 60 + retMinutes;
          }

          totalKm +=
            parseFloat(day.kmDeparture || 0) + parseFloat(day.kmReturn || 0);
        });

        setOrderTotals({
          totalWorkHours: totalWorkMinutes / 60,
          totalTravelHours: totalTravelMinutes / 60,
          totalKm: totalKm.toFixed(2),
        });
      } catch (err) {
        console.error("Erro ao calcular totais:", err);
        setError("Erro ao calcular totais");
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

  const handleSave = async () => {
    try {
      setIsGeneratingPDF(true);

      const formattedServices = selectedServices.map((service) => {
        if (service.multipleEntries) {
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
        }
        return service;
      });

      await updateDoc(doc(db, "orcamentos", budgetId), {
        services: formattedServices,
        total: selectedServices.reduce((acc, curr) => acc + curr.total, 0),
        lastUpdate: new Date(),
        ivaRate,
      });

      if (selectedClient && selectedOrder) {
        await generateBudgetPDF(
          selectedOrder,
          selectedClient,
          formattedServices,
          originalData.orderNumber,
          ivaRate
        );
      }

      navigate("/app/manage-budgets");
    } catch (error) {
      setError("Erro ao salvar orçamento. Por favor, tente novamente.");
      console.error("Erro ao salvar orçamento:", error);
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

  const hasChanges =
    JSON.stringify(selectedServices) !==
      JSON.stringify(originalData?.services) ||
    ivaRate !== originalData?.ivaRate;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Editar Fechamento</h1>
          <p className="text-sm text-zinc-400">
            Edite os dados do fechamento da ordem de serviço
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
        {/* Client Info */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white">{selectedClient?.name}</p>
          </CardContent>
        </Card>

        {/* Order Info */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Ordem de Serviço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white">#{selectedOrder?.id}</p>
          </CardContent>
        </Card>

        {/* IVA */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Configurações de IVA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <IVASelector value={ivaRate} onChange={setIvaRate} />
          </CardContent>
        </Card>

        {/* Services Section */}
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

      {/* Save Button */}
      <div className="fixed bottom-6 right-6 left-6 md:left-64 flex justify-center">
        <Button
          onClick={handleSave}
          disabled={isGeneratingPDF || !hasChanges}
          className="h-12 px-6 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGeneratingPDF ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

// Helper functions for time calculations
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

export default EditBudget;
