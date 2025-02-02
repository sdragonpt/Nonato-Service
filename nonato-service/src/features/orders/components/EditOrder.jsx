import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import {
  ArrowLeft,
  Loader2,
  Save,
  AlertTriangle,
  Calendar,
  User,
  Printer,
  AlertCircle,
  Clock,
  Settings,
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
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";

const EditOrder = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    date: "",
    clientId: "",
    equipmentId: "",
    serviceType: "",
    priority: "normal",
    description: "",
    status: "",
    resultDescription: "",
    pontosEmAberto: "",
  });

  const [checklist, setChecklist] = useState({
    concluido: false,
    retorno: false,
    funcionarios: false,
    documentacao: false,
    producao: false,
    pecas: false,
  });

  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [filteredEquipments, setFilteredEquipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [, setTouched] = useState({});
  const [originalData, setOriginalData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch order, clients, and equipments in parallel
        const [orderSnapshot, clientsSnapshot, equipmentsSnapshot] =
          await Promise.all([
            getDoc(doc(db, "ordens", orderId)),
            getDocs(collection(db, "clientes")),
            getDocs(collection(db, "equipamentos")),
          ]);

        if (!orderSnapshot.exists()) {
          setError("Ordem de serviço não encontrada");
          return;
        }

        const orderData = orderSnapshot.data();
        setOriginalData(orderData);

        // Set form data
        setFormData({
          date: orderData.date || "",
          clientId: orderData.clientId || "",
          equipmentId: orderData.equipmentId || "",
          serviceType: orderData.serviceType || "",
          priority: orderData.priority || "normal",
          description: orderData.description || "",
          status: orderData.status || "Aberto",
          resultDescription: orderData.resultDescription || "",
          pontosEmAberto: orderData.pontosEmAberto || "",
        });

        // Set checklist
        setChecklist(
          orderData.checklist || {
            concluido: false,
            retorno: false,
            funcionarios: false,
            documentacao: false,
            producao: false,
            pecas: false,
          }
        );

        // Process clients and equipments
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

        // Filter equipments for selected client
        if (orderData.clientId) {
          const filtered = equipmentsData.filter(
            (equipment) => equipment.clientId === orderData.clientId
          );
          setFilteredEquipments(filtered);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Erro ao carregar dados. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [orderId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "clientId") {
      const filtered = equipments.filter(
        (equipment) => equipment.clientId === value
      );
      setFilteredEquipments(filtered);
      setFormData((prev) => ({
        ...prev,
        equipmentId: "",
      }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  const handleChecklistChange = (name, checked) => {
    setChecklist((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const allTouched = Object.keys(formData).reduce(
      (acc, key) => ({
        ...acc,
        [key]: true,
      }),
      {}
    );
    setTouched(allTouched);

    if (!formData.clientId || !formData.equipmentId || !formData.serviceType) {
      setError("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const serviceData = {
        ...formData,
        checklist,
        lastUpdated: new Date(),
      };

      await updateDoc(doc(db, "ordens", orderId), serviceData);
      navigate("/app/manage-orders");
    } catch (err) {
      console.error("Erro ao atualizar serviço:", err);
      setError(
        "Erro ao atualizar ordem de serviço. Por favor, tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const hasChanges =
    originalData &&
    (JSON.stringify(formData) !== JSON.stringify(originalData) ||
      JSON.stringify(checklist) !==
        JSON.stringify(originalData.checklist || {}));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Editar Ordem de Serviço
          </h1>
          <p className="text-sm text-zinc-400">
            Atualize as informações da ordem de serviço
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Information Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Informações Principais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Data</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full pl-10 p-3 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Client Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Cliente
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Select
                  value={formData.clientId}
                  onValueChange={(value) =>
                    handleChange({ target: { name: "clientId", value } })
                  }
                >
                  <SelectTrigger className="w-full pl-10 bg-zinc-900 border-zinc-700 text-white">
                    <SelectValue placeholder="Selecione um Cliente" />
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
              </div>
            </div>

            {/* Equipment Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Equipamento
              </label>
              <div className="relative">
                <Printer className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Select
                  value={formData.equipmentId}
                  onValueChange={(value) =>
                    handleChange({ target: { name: "equipmentId", value } })
                  }
                  disabled={!formData.clientId}
                >
                  <SelectTrigger className="w-full pl-10 bg-zinc-900 border-zinc-700 text-white">
                    <SelectValue placeholder="Selecione um Equipamento" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {filteredEquipments.map((equipment) => (
                      <SelectItem
                        key={equipment.id}
                        value={equipment.id}
                        className="text-white hover:bg-zinc-700"
                      >
                        {`${equipment.brand} - ${equipment.model}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Service Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Tipo de Serviço
              </label>
              <div className="relative">
                <Settings className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  type="text"
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleChange}
                  onBlur={() => handleBlur("serviceType")}
                  placeholder="Descreva o tipo de serviço"
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white"
                  required
                />
              </div>
            </div>

            {/* Priority Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Prioridade
              </label>
              <div className="relative">
                <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    handleChange({ target: { name: "priority", value } })
                  }
                >
                  <SelectTrigger className="w-full pl-10 bg-zinc-900 border-zinc-700 text-white">
                    <SelectValue placeholder="Selecione a Prioridade" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem
                      value="low"
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
                      value="high"
                      className="text-white hover:bg-zinc-700"
                    >
                      Alta
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Status
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    handleChange({ target: { name: "status", value } })
                  }
                >
                  <SelectTrigger className="w-full pl-10 bg-zinc-900 border-zinc-700 text-white">
                    <SelectValue placeholder="Selecione o Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem
                      value="Aberto"
                      className="text-white hover:bg-zinc-700"
                    >
                      Aberto
                    </SelectItem>
                    <SelectItem
                      value="Em Andamento"
                      className="text-white hover:bg-zinc-700"
                    >
                      Em Andamento
                    </SelectItem>
                    <SelectItem
                      value="Fechado"
                      className="text-white hover:bg-zinc-700"
                    >
                      Fechado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checklist Card */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center space-x-3 text-white cursor-pointer group">
                <Checkbox
                  name="concluido"
                  checked={checklist.concluido}
                  onCheckedChange={(checked) =>
                    handleChecklistChange("concluido", checked)
                  }
                  className="border-zinc-600 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
                <span className="text-sm">Serviço Concluído</span>
              </label>

              <label className="flex items-center space-x-3 text-white cursor-pointer group">
                <Checkbox
                  name="retorno"
                  checked={checklist.retorno}
                  onCheckedChange={(checked) =>
                    handleChecklistChange("retorno", checked)
                  }
                  className="border-zinc-600 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
                <span className="text-sm">Retorno Necessário</span>
              </label>

              <label className="flex items-center space-x-3 text-white cursor-pointer group">
                <Checkbox
                  name="funcionarios"
                  checked={checklist.funcionarios}
                  onCheckedChange={(checked) =>
                    handleChecklistChange("funcionarios", checked)
                  }
                  className="border-zinc-600 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
                <span className="text-sm">Instrução dos Funcionários</span>
              </label>

              <label className="flex items-center space-x-3 text-white cursor-pointer group">
                <Checkbox
                  name="documentacao"
                  checked={checklist.documentacao}
                  onCheckedChange={(checked) =>
                    handleChecklistChange("documentacao", checked)
                  }
                  className="border-zinc-600 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
                <span className="text-sm">Entrega da Documentação</span>
              </label>

              <label className="flex items-center space-x-3 text-white cursor-pointer group">
                <Checkbox
                  name="producao"
                  checked={checklist.producao}
                  onCheckedChange={(checked) =>
                    handleChecklistChange("producao", checked)
                  }
                  className="border-zinc-600 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
                <span className="text-sm">Liberação para Produção</span>
              </label>

              <label className="flex items-center space-x-3 text-white cursor-pointer group">
                <Checkbox
                  name="pecas"
                  checked={checklist.pecas}
                  onCheckedChange={(checked) =>
                    handleChecklistChange("pecas", checked)
                  }
                  className="border-zinc-600 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
                <span className="text-sm">Orçamento de Peças</span>
              </label>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Descrição / Observações
              </label>
              <Textarea
                name="resultDescription"
                value={formData.resultDescription}
                onChange={handleChange}
                placeholder="Adicione notas ou observações importantes"
                className="min-h-[100px] bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
              />
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Pontos em Aberto
              </label>
              <Textarea
                name="pontosEmAberto"
                value={formData.pontosEmAberto}
                onChange={handleChange}
                placeholder="Descreva os pontos que ainda precisam ser resolvidos"
                className="min-h-[100px] bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || !hasChanges}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
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
      </form>
    </div>
  );
};

export default EditOrder;
