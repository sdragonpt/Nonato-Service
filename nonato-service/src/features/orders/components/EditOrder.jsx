// ✅ EDITORDER.JSX - VERSÃO FOCADA EM ORDENS DE SERVIÇO

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
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
  UserCheck,
  UserX,
  Package,
  Search,
  Plus,
  X,
  ShoppingCart,
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
import { Badge } from "@/components/ui/badge.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";

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
    // ✅ CAMPOS PARA CLIENTE NÃO REGISTRADO
    isUnregisteredClient: false,
    unregisteredClient: {
      name: "",
      email: "",
      phone: "",
      company: "",
    },
    manualEquipment: {
      brand: "",
      model: "",
      serialNumber: "",
    },
  });

  const [checklist, setChecklist] = useState({
    concluido: false,
    retorno: false,
    funcionarios: false,
    documentacao: false,
    producao: false,
    pecas: false,
  });

  // ✅ NOVOS ESTADOS PARA ORÇAMENTO DE PEÇAS

  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [filteredEquipments, setFilteredEquipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [, setTouched] = useState({});
  const [originalData, setOriginalData] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  // ✅ BUSCAR INFORMAÇÕES DO EQUIPAMENTO SELECIONADO
  useEffect(() => {
    if (
      formData.equipmentId &&
      equipments.length > 0 &&
      !formData.isUnregisteredClient
    ) {
      const equipment = equipments.find((eq) => eq.id === formData.equipmentId);
      setSelectedEquipment(equipment || null);
    } else {
      setSelectedEquipment(null);
    }
  }, [formData.equipmentId, equipments, formData.isUnregisteredClient]);

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
          // ✅ CARREGAR DADOS DE CLIENTE NÃO REGISTRADO
          isUnregisteredClient: orderData.isUnregisteredClient || false,
          unregisteredClient: orderData.unregisteredClient || {
            name: "",
            email: "",
            phone: "",
            company: "",
          },
          manualEquipment: orderData.manualEquipment || {
            brand: "",
            model: "",
            serialNumber: "",
          },
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
        if (orderData.clientId && !orderData.isUnregisteredClient) {
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

    if (name === "clientId" && !formData.isUnregisteredClient) {
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

  // ✅ HANDLER PARA DADOS DE CLIENTE NÃO REGISTRADO
  const handleUnregisteredClientChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      unregisteredClient: {
        ...prev.unregisteredClient,
        [field]: value,
      },
    }));
  };

  // ✅ HANDLER PARA DADOS DE EQUIPAMENTO MANUAL
  const handleManualEquipmentChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      manualEquipment: {
        ...prev.manualEquipment,
        [field]: value,
      },
    }));
  };

  // ✅ TOGGLE ENTRE CLIENTE REGISTRADO E NÃO REGISTRADO
  const handleClientTypeToggle = (isUnregistered) => {
    setFormData((prev) => ({
      ...prev,
      isUnregisteredClient: isUnregistered,
      // Limpar campos quando muda de tipo
      ...(isUnregistered
        ? {
            clientId: "",
            equipmentId: "",
          }
        : {
            unregisteredClient: {
              name: "",
              email: "",
              phone: "",
              company: "",
            },
            manualEquipment: {
              brand: "",
              model: "",
              serialNumber: "",
            },
          }),
    }));

    if (!isUnregistered) {
      setFilteredEquipments([]);
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
        {/* ✅ SEÇÃO: CLIENTE E EQUIPAMENTO COM ABAS */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Informações de Cliente e Equipamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs
              value={
                formData.isUnregisteredClient ? "unregistered" : "registered"
              }
              onValueChange={(value) =>
                handleClientTypeToggle(value === "unregistered")
              }
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-2 bg-zinc-700">
                <TabsTrigger
                  value="registered"
                  className="flex items-center gap-2 data-[state=active]:bg-green-600"
                >
                  <UserCheck className="h-4 w-4" />
                  Cliente Registrado
                </TabsTrigger>
                <TabsTrigger
                  value="unregistered"
                  className="flex items-center gap-2 data-[state=active]:bg-blue-600"
                >
                  <UserX className="h-4 w-4" />
                  Cliente Não Registrado
                </TabsTrigger>
              </TabsList>

              {/* ✅ ABA CLIENTE REGISTRADO */}
              <TabsContent value="registered" className="space-y-4">
                {/* Date Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">
                    Data
                  </label>
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

                {/* ✅ INFORMAÇÕES DO EQUIPAMENTO SELECIONADO */}
                {selectedEquipment && (
                  <div className="mt-4 p-4 bg-zinc-700/30 rounded-lg border border-zinc-600/50">
                    <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center">
                      <Printer className="h-4 w-4 mr-2 text-blue-400" />
                      Informações do Equipamento
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-zinc-400">Marca</label>
                        <div className="mt-1 p-2 bg-zinc-800 rounded border border-zinc-600">
                          <span className="text-white text-sm">
                            {selectedEquipment.brand || "N/A"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-zinc-400">Modelo</label>
                        <div className="mt-1 p-2 bg-zinc-800 rounded border border-zinc-600">
                          <span className="text-white text-sm">
                            {selectedEquipment.model || "N/A"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-zinc-400">
                          Número de Série
                        </label>
                        <div className="mt-1 p-2 bg-zinc-800 rounded border border-zinc-600">
                          <span className="text-white text-sm">
                            {selectedEquipment.serialNumber || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ✅ ABA CLIENTE NÃO REGISTRADO */}
              <TabsContent value="unregistered" className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">
                      Modo Cliente Não Registrado
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Preencha manualmente os dados do cliente e equipamento que
                    não estão cadastrados no sistema.
                  </p>
                </div>

                {/* Data */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">
                    Data
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      className="w-full pl-10 p-3 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {/* ✅ DADOS DO CLIENTE NÃO REGISTRADO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">
                      Nome do Cliente *
                    </label>
                    <Input
                      type="text"
                      value={formData.unregisteredClient.name}
                      onChange={(e) =>
                        handleUnregisteredClientChange("name", e.target.value)
                      }
                      placeholder="Digite o nome completo"
                      className="bg-zinc-900 border-zinc-700 text-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={formData.unregisteredClient.email}
                      onChange={(e) =>
                        handleUnregisteredClientChange("email", e.target.value)
                      }
                      placeholder="email@exemplo.com"
                      className="bg-zinc-900 border-zinc-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">
                      Telefone
                    </label>
                    <Input
                      type="tel"
                      value={formData.unregisteredClient.phone}
                      onChange={(e) =>
                        handleUnregisteredClientChange("phone", e.target.value)
                      }
                      placeholder="(XX) XXXXX-XXXX"
                      className="bg-zinc-900 border-zinc-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">
                      Empresa (opcional)
                    </label>
                    <Input
                      type="text"
                      value={formData.unregisteredClient.company}
                      onChange={(e) =>
                        handleUnregisteredClientChange(
                          "company",
                          e.target.value
                        )
                      }
                      placeholder="Nome da empresa"
                      className="bg-zinc-900 border-zinc-700 text-white"
                    />
                  </div>
                </div>

                {/* ✅ DADOS DO EQUIPAMENTO MANUAL */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center">
                    <Printer className="h-4 w-4 mr-2 text-orange-400" />
                    Dados do Equipamento
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">
                        Marca *
                      </label>
                      <Input
                        type="text"
                        value={formData.manualEquipment.brand}
                        onChange={(e) =>
                          handleManualEquipmentChange("brand", e.target.value)
                        }
                        placeholder="Ex: HP, Canon, Epson..."
                        className="bg-zinc-900 border-zinc-700 text-white"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">
                        Modelo *
                      </label>
                      <Input
                        type="text"
                        value={formData.manualEquipment.model}
                        onChange={(e) =>
                          handleManualEquipmentChange("model", e.target.value)
                        }
                        placeholder="Ex: LaserJet 1020, MG3610..."
                        className="bg-zinc-900 border-zinc-700 text-white"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">
                        Número de Série
                      </label>
                      <Input
                        type="text"
                        value={formData.manualEquipment.serialNumber}
                        onChange={(e) =>
                          handleManualEquipmentChange(
                            "serialNumber",
                            e.target.value
                          )
                        }
                        placeholder="Número de série do equipamento"
                        className="bg-zinc-900 border-zinc-700 text-white"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* ✅ CAMPOS COMUNS (FORA DAS ABAS) */}
            <div className="mt-6 space-y-4">
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
