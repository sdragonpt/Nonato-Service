import { useState, useEffect } from "react";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  FileText,
  Save,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  User,
  Settings,
  UserPlus,
  Zap,
  Package,
  Wrench,
} from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";

const AddPreAgendamento = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [filteredEquipments, setFilteredEquipments] = useState([]);
  const [error, setError] = useState(null);
  const [clientType, setClientType] = useState("registered"); // registered ou new

  const [formData, setFormData] = useState({
    // Cliente registrado
    clientId: "",
    equipmentId: "", // ✅ NOVO: Para equipamento do cliente
    // Cliente novo (não registrado)
    newClientName: "",
    newClientPhone: "",
    // Dados do serviço
    machineType: "",
    serviceType: "",
    quickNotes: "",
    priority: "normal",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Buscar clientes e equipamentos
        const [clientsSnapshot, equipmentsSnapshot] = await Promise.all([
          getDocs(collection(db, "clientes")),
          getDocs(collection(db, "equipamentos")),
        ]);

        const clientsData = clientsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClients(clientsData);

        const equipmentsData = equipmentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEquipments(equipmentsData);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Erro ao carregar dados. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // ✅ NOVO: Filtrar equipamentos quando cliente for selecionado
  useEffect(() => {
    if (formData.clientId) {
      const filtered = equipments.filter(
        (eq) => eq.clientId === formData.clientId
      );
      setFilteredEquipments(filtered);
      // Limpar equipamento selecionado se não estiver na lista filtrada
      if (!filtered.find((eq) => eq.id === formData.equipmentId)) {
        setFormData((prev) => ({ ...prev, equipmentId: "" }));
      }
    } else {
      setFilteredEquipments([]);
    }
  }, [formData.clientId, equipments]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSaving(true);
      setError(null);

      const preAgendamentoData = {
        ...formData,
        isRegisteredClient: clientType === "registered",
        status: "pending", // Status especial para pré-agendamentos
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, "pre_agendamentos"), preAgendamentoData);
      navigate("/app/manage-agenda");
    } catch (err) {
      console.error("Erro ao criar pré-agendamento:", err);
      setError("Erro ao salvar pré-agendamento. Por favor, tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <Zap className="h-6 w-6 mr-2 text-yellow-400" />
            Pré-Agendamento Rápido
          </h1>
          <p className="text-sm text-zinc-400">
            Capture rapidamente os dados essenciais para agendar depois
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

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-400" />
            <div>
              <p className="text-sm font-medium text-yellow-400">
                Modo Rápido Ativado
              </p>
              <p className="text-xs text-zinc-400">
                Apenas os dados essenciais. Data e hora serão definidas depois.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cliente Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Informações do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs
              value={clientType}
              onValueChange={setClientType}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-2 bg-zinc-700">
                <TabsTrigger
                  value="registered"
                  className="flex items-center gap-2 data-[state=active]:bg-green-600"
                >
                  <User className="h-4 w-4" />
                  Cliente Registrado
                </TabsTrigger>
                <TabsTrigger
                  value="new"
                  className="flex items-center gap-2 data-[state=active]:bg-blue-600"
                >
                  <UserPlus className="h-4 w-4" />
                  Cliente Novo
                </TabsTrigger>
              </TabsList>

              <TabsContent value="registered" className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Selecionar Cliente *
                  </label>
                  <Select
                    value={formData.clientId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, clientId: value }))
                    }
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                      <SelectValue placeholder="Buscar cliente registrado..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700 max-h-[200px]">
                      {clients.map((client) => (
                        <SelectItem
                          key={client.id}
                          value={client.id}
                          className="text-white hover:bg-zinc-700"
                        >
                          <div className="flex flex-col">
                            <span>{client.name}</span>
                            <span className="text-xs text-zinc-400">
                              {client.phone}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* ✅ NOVO: Seleção de equipamento para cliente registrado */}
                {formData.clientId && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Equipamento (Opcional)
                    </label>
                    <Select
                      value={formData.equipmentId}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, equipmentId: value }))
                      }
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                        <SelectValue placeholder="Selecionar equipamento..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700 max-h-[200px]">
                        {filteredEquipments.map((equipment) => (
                          <SelectItem
                            key={equipment.id}
                            value={equipment.id}
                            className="text-white hover:bg-zinc-700"
                          >
                            <div className="flex flex-col">
                              <span>
                                {equipment.brand} {equipment.model}
                              </span>
                              <span className="text-xs text-zinc-400">
                                {equipment.type} - {equipment.serialNumber}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="new" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Nome do Cliente *
                    </label>
                    <Input
                      type="text"
                      name="newClientName"
                      value={formData.newClientName}
                      onChange={handleChange}
                      placeholder="Nome completo"
                      className="bg-zinc-900 border-zinc-700 text-white"
                      required={clientType === "new"}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Telefone *
                    </label>
                    <Input
                      type="tel"
                      name="newClientPhone"
                      value={formData.newClientPhone}
                      onChange={handleChange}
                      placeholder="(XX) XXXXX-XXXX"
                      className="bg-zinc-900 border-zinc-700 text-white"
                      required={clientType === "new"}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Serviço Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Detalhes do Serviço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ✅ ALTERADO: Campo manual para tipo de máquina */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Tipo de Máquina *
                </label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
                  <Input
                    type="text"
                    name="machineType"
                    value={formData.machineType}
                    onChange={handleChange}
                    placeholder="Ex: Impressora, Scanner, Multifuncional..."
                    className="pl-10 bg-zinc-900 border-zinc-700 text-white"
                    required
                  />
                </div>
              </div>

              {/* ✅ ALTERADO: Campo manual para tipo de serviço */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Tipo de Serviço *
                </label>
                <div className="relative">
                  <Wrench className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
                  <Input
                    type="text"
                    name="serviceType"
                    value={formData.serviceType}
                    onChange={handleChange}
                    placeholder="Ex: Manutenção, Reparo, Limpeza..."
                    className="pl-10 bg-zinc-900 border-zinc-700 text-white"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Prioridade
              </label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem
                    value="baixa"
                    className="text-white hover:bg-zinc-700"
                  >
                    Baixa
                  </SelectItem>
                  <SelectItem
                    value="normal"
                    className="text-white hover:bg-zinc-700"
                  >
                    Normal
                  </SelectItem>
                  <SelectItem
                    value="alta"
                    className="text-white hover:bg-zinc-700"
                  >
                    Alta
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Observações Rápidas
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 text-zinc-400" />
                <textarea
                  name="quickNotes"
                  value={formData.quickNotes}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Ex: Urgente - não imprime, faz barulho estranho..."
                  className="w-full pl-10 p-3 bg-zinc-900 text-white rounded-lg border border-zinc-700 focus:ring-2 focus:ring-green-500 focus:outline-none resize-none placeholder:text-zinc-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={
            isSaving ||
            !formData.machineType ||
            !formData.serviceType ||
            (clientType === "registered" && !formData.clientId) ||
            (clientType === "new" &&
              (!formData.newClientName || !formData.newClientPhone))
          }
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Pré-Agendamento
            </>
          )}
        </Button>

        <div className="text-center">
          <p className="text-sm text-zinc-400">
            ⚡ Modo rápido: depois defina data e hora na agenda
          </p>
        </div>
      </form>
    </div>
  );
};

export default AddPreAgendamento;
