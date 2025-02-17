import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FileText,
  User,
  Loader2,
  AlertTriangle,
  Save,
  Trash2,
  ArrowLeft,
  Receipt,
  UserSquare,
  Phone,
  MapPin,
  Calculator,
} from "lucide-react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import generateSimpleBudgetPDF from "./pdf/generateSimpleBudgetPDF.jsx";
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
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";

const EditSimpleBudget = () => {
  const { budgetId } = useParams();
  const navigate = useNavigate();
  const [isExpense, setIsExpense] = useState(false);
  const [clientData, setClientData] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedServiceId, setSelectedServiceId] = useState("");
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
        setIsExpense(budgetData.isExpense || false);
        setClientData(budgetData.clientData || {});
        setSelectedServices(budgetData.services || []);
        setIvaRate(budgetData.ivaRate || 23);
      } catch (err) {
        console.error("Erro ao carregar orçamento:", err);
        setError("Erro ao carregar dados do orçamento");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBudget();
  }, [budgetId]);

  // Fetch available services
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

  const handleClientDataChange = (e) => {
    const { name, value } = e.target;
    setClientData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

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

      if (!clientData.name || !clientData.phone || !clientData.address) {
        setError("Por favor, preencha todos os dados do cliente.");
        return;
      }

      // Formatar os serviços para o formato esperado pelo PDF
      const formattedServices = selectedServices.map((service) => {
        if (service.multipleEntries) {
          return {
            id: service.id,
            name: service.name,
            type: "total",
            value: service.total,
            quantity: 1,
            total: service.total,
          };
        }
        return service;
      });

      const budgetData = {
        type: "simple",
        clientData,
        services: formattedServices,
        total: selectedServices.reduce((acc, curr) => acc + curr.total, 0),
        lastUpdate: new Date(),
        isExpense,
        ivaRate,
      };

      await updateDoc(doc(db, "orcamentos", budgetId), budgetData);

      const pdfBlob = await generateSimpleBudgetPDF({
        ...budgetData,
        budgetNumber: originalData.budgetNumber,
        createdAt: originalData.createdAt,
      });

      const pdfUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `${isExpense ? "Despesa" : "Orçamento"}_${
        clientData.name
      }_${originalData.budgetNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(pdfUrl);

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
    JSON.stringify(clientData) !== JSON.stringify(originalData?.clientData) ||
    ivaRate !== originalData?.ivaRate ||
    isExpense !== originalData?.isExpense;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Editar {isExpense ? "Despesa" : "Orçamento"}
          </h1>
          <p className="text-sm text-zinc-400">
            Edite os dados do {isExpense ? "despesa" : "orçamento"}
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

      {/* Document Type Toggle */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="p-6">
          <div className="flex justify-center">
            <div className="bg-zinc-900 p-1 rounded-xl inline-flex relative">
              <div
                className={`absolute top-1 bottom-1 w-[120px] rounded-lg bg-green-600 transition-all duration-300 ${
                  isExpense ? "translate-x-[120px]" : "translate-x-0"
                }`}
              />
              <button
                onClick={() => setIsExpense(false)}
                className={`relative w-[120px] py-2 rounded-lg font-medium transition-colors ${
                  !isExpense ? "text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                <FileText className="w-4 h-4 mx-auto mb-1" />
                Orçamento
              </button>
              <button
                onClick={() => setIsExpense(true)}
                className={`relative w-[120px] py-2 rounded-lg font-medium transition-colors ${
                  isExpense ? "text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Receipt className="w-4 h-4 mx-auto mb-1" />
                Despesa
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {/* Client Data */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              Dados do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Nome</label>
              <div className="relative">
                <UserSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  name="name"
                  value={clientData.name}
                  onChange={handleClientDataChange}
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                  placeholder="Nome do cliente"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Telefone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="tel"
                  name="phone"
                  value={clientData.phone}
                  onChange={handleClientDataChange}
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                  placeholder="Número de telefone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Endereço
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-zinc-400" />
                <Textarea
                  name="address"
                  value={clientData.address}
                  onChange={handleClientDataChange}
                  className="min-h-[100px] pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                  placeholder="Endereço completo"
                />
              </div>
            </div>
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
          disabled={
            isGeneratingPDF ||
            !hasChanges ||
            !clientData.name ||
            !clientData.phone ||
            !clientData.address ||
            selectedServices.length === 0
          }
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

export default EditSimpleBudget;
