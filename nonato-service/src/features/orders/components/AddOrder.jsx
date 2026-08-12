import { useState, useEffect } from "react";
import { db } from "../../../firebase";
import { useClients } from "../../../context/ClientsContext.jsx";
import { useEquipments } from "../../../context/EquipmentsContext.jsx";
import {
  setDoc,
  doc,
  getDoc,
  increment,
} from "firebase/firestore";
import { searchCatalogParts } from "../../../utils/catalogPartSearch.js";
import { formatDocNumber } from "../../../utils/docNumbering.js";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Plus,
  AlertTriangle,
  Calendar,
  Printer,
  AlertCircle,
  Settings,
  UserCheck,
  UserX,
  Package,
  Search,
  X,
  ShoppingCart,
  ClipboardList,
} from "lucide-react";
import { ClientCombobox } from "@/components/shared/ClientCombobox.jsx";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const emptyEquipmentEntry = () => ({ id: genId(), equipmentId: "", brand: "", model: "", serialNumber: "" });

// ✅ Bloco reutilizável "label + ícone + campo" — reduz a repetição dos
// vários blocos de data/cliente/equipamento/tipo/prioridade (mesmo padrão
// usado no AddClient.jsx).
const FieldLabel = ({ label, icon: Icon, children }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-zinc-400">{label}</label>
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
      {children}
    </div>
  </div>
);

const AddOrder = () => {
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const clientId = queryParams.get("clientId");

  const initialForm = {
    date: new Date().toISOString().split("T")[0],
    clientId: clientId || "",
    equipmentId: "",
    serviceType: "",
    priority: "normal",
    description: "",
    status: "Aberto",
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
  };

  const { ensureClients } = useClients();
  const { ensureEquipments } = useEquipments();
  const [formData, setFormData] = useState(initialForm);
  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [filteredEquipments, setFilteredEquipments] = useState([]);
  // Lista de equipamentos da ordem — pode ter mais do que 1 (ordem
  // "especial"). Cada entrada usa `equipmentId` quando o cliente é
  // registado, ou `brand`/`model`/`serialNumber` quando é manual (só
  // permitido para clientes não registados). Os campos singulares
  // `formData.equipmentId`/`formData.manualEquipment` continuam a ser
  // gravados (a partir da 1ª entrada) para compatibilidade com o resto do
  // código que ainda só lê um equipamento por ordem.
  const [equipmentsList, setEquipmentsList] = useState([emptyEquipmentEntry()]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [, setTouched] = useState({});
  const navigate = useNavigate();

  const [checklist, setChecklist] = useState({
    concluido: false,
    retorno: false,
    funcionarios: false,
    documentacao: false,
    producao: false,
    pecas: false,
  });

  // ✅ NOVOS ESTADOS PARA ORÇAMENTO DE PEÇAS
  const [partsQuoteItems, setPartsQuoteItems] = useState([]);
  const [partSearchTerm, setPartSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // ✅ CONFIGURAÇÕES DE ENVIO E IVA
  const [shippingConfig, setShippingConfig] = useState({
    shippingType: "",
    shippingPrice: 0,
    includeVat: false,
    vatRate: 23,
  });

  // ✅ FUNÇÃO PARA PESQUISAR PEÇAS NO CATÁLOGO HOMAG
  const searchPartsByCode = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      setSearchError("");

      const results = await searchCatalogParts(searchTerm, { limit: 10 });

      setSearchResults(results);

      if (results.length === 0) {
        setSearchError("Nenhuma peça encontrada com esse código/nome");
      }
    } catch (err) {
      console.error("Erro ao pesquisar peças:", err);
      setSearchError("Erro ao pesquisar peças");
    } finally {
      setIsSearching(false);
    }
  };

  // ✅ DEBOUNCE PARA PESQUISA DE PEÇAS
  useEffect(() => {
    const timer = setTimeout(() => {
      if (partSearchTerm.trim()) {
        searchPartsByCode(partSearchTerm);
      } else {
        setSearchResults([]);
        setSearchError("");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [partSearchTerm]);

  // ✅ FUNÇÃO PARA ADICIONAR PEÇA AO ORÇAMENTO
  const addPartToQuote = (part) => {
    const existingIndex = partsQuoteItems.findIndex(
      (item) => item.id === part.id
    );

    if (existingIndex >= 0) {
      const updatedItems = [...partsQuoteItems];
      updatedItems[existingIndex].quantity += 1;
      setPartsQuoteItems(updatedItems);
    } else {
      const newItem = {
        id: part.id,
        name: part.name,
        code: part.code,
        quantity: 1,
        price: 0,
        imageHash: part.imageHash || null,
        image: part.image || null,
      };

      setPartsQuoteItems([...partsQuoteItems, newItem]);
    }

    setPartSearchTerm("");
    setSearchResults([]);
  };

  // ✅ FUNÇÃO PARA REMOVER PEÇA DO ORÇAMENTO
  const removePartFromQuote = (partId) => {
    setPartsQuoteItems(partsQuoteItems.filter((item) => item.id !== partId));
  };

  // ✅ FUNÇÃO PARA ATUALIZAR QUANTIDADE
  const updatePartQuantity = (partId, quantity) => {
    const newQuantity = Math.max(1, parseInt(quantity) || 1);
    setPartsQuoteItems(
      partsQuoteItems.map((item) =>
        item.id === partId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // ✅ FUNÇÃO PARA ATUALIZAR PREÇO
  const updatePartPrice = (partId, price) => {
    const newPrice = Math.max(0, parseFloat(price) || 0);
    setPartsQuoteItems(
      partsQuoteItems.map((item) =>
        item.id === partId ? { ...item, price: newPrice } : item
      )
    );
  };

  // ✅ CALCULAR TOTAIS DO ORÇAMENTO
  const calculateSubtotal = () => {
    return partsQuoteItems.reduce((total, item) => {
      return total + item.quantity * (item.price || 0);
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const shipping = parseFloat(shippingConfig.shippingPrice) || 0;
    const totalBeforeVat = subtotal + shipping;

    if (shippingConfig.includeVat) {
      const vatAmount = (totalBeforeVat * shippingConfig.vatRate) / 100;
      return totalBeforeVat + vatAmount;
    }

    return totalBeforeVat;
  };

  // ✅ FUNÇÃO PARA FORMATAR PREÇO
  const formatPrice = (price) => {
    const numericAmount = parseFloat(price || 0);
    const isNegative = numericAmount < 0;
    const [intPart, decPart] = Math.abs(numericAmount).toFixed(2).split(".");
    const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${isNegative ? "-" : ""}€ ${intWithDots},${decPart}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [clientsData, equipmentsData] = await Promise.all([
          ensureClients(),
          ensureEquipments(),
        ]);

        setClients(clientsData);
        setEquipments(equipmentsData);

        if (clientId) {
          const filteredEquipments = equipmentsData.filter(
            (equipment) => equipment.clientId === clientId
          );
          setFilteredEquipments(filteredEquipments);
        } else {
          setFilteredEquipments(equipmentsData);
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Erro ao carregar dados. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [clientId]);

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
      setEquipmentsList([emptyEquipmentEntry()]);
    }
  };

  // ✅ HANDLERS PARA A LISTA DE EQUIPAMENTOS (1 ou vários por ordem)
  const addEquipmentEntry = () =>
    setEquipmentsList((prev) => [...prev, emptyEquipmentEntry()]);
  const removeEquipmentEntry = (id) =>
    setEquipmentsList((prev) => (prev.length <= 1 ? prev : prev.filter((e) => e.id !== id)));
  const updateEquipmentEntry = (id, patch) =>
    setEquipmentsList((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const setRegisteredEquipmentEntry = (id, equipmentId) => {
    const eq = filteredEquipments.find((e) => e.id === equipmentId);
    updateEquipmentEntry(id, {
      equipmentId,
      brand: eq?.brand || "",
      model: eq?.model || "",
      serialNumber: eq?.serialNumber || "",
    });
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
    setEquipmentsList([emptyEquipmentEntry()]);
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  const handleChecklistChange = (e) => {
    const { name, checked } = e.target;
    setChecklist((prev) => ({
      ...prev,
      [name]: checked,
    }));

    // ✅ LIMPAR ORÇAMENTO DE PEÇAS SE DESMARCADO
    if (name === "pecas" && !checked) {
      setPartsQuoteItems([]);
      setShippingConfig({
        shippingType: "",
        shippingPrice: 0,
        includeVat: false,
        vatRate: 23,
      });
    }
  };

  const getNextOrderId = async () => {
    try {
      const counterRef = doc(db, "counters", "ordersCounter");
      const counterSnapshot = await getDoc(counterRef);

      if (counterSnapshot.exists()) {
        const currentCounter = counterSnapshot.data().count;
        await setDoc(counterRef, { count: increment(1) }, { merge: true });
        return currentCounter + 1;
      }

      await setDoc(counterRef, { count: 1 });
      return 1;
    } catch (err) {
      throw new Error("Erro ao gerar ID do serviço");
    }
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

    // ✅ VALIDAÇÃO BASEADA NO TIPO DE CLIENTE
    if (formData.isUnregisteredClient) {
      const hasValidEquipment = equipmentsList.some((e) => e.brand && e.model);
      if (
        !formData.unregisteredClient.name ||
        !hasValidEquipment ||
        !formData.serviceType
      ) {
        setError("Por favor, preencha todos os campos obrigatórios");
        return;
      }
    } else {
      const hasValidEquipment = equipmentsList.some((e) => e.equipmentId);
      if (
        !formData.clientId ||
        !hasValidEquipment ||
        !formData.serviceType
      ) {
        setError("Por favor, preencha todos os campos obrigatórios");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const newOrderId = await getNextOrderId();

      // Só entram na lista final as entradas com dados preenchidos —
      // linhas adicionadas mas deixadas em branco não contam.
      const validEntries = equipmentsList.filter((e) =>
        formData.isUnregisteredClient ? !!(e.brand && e.model) : !!e.equipmentId
      );
      const resolvedEquipmentsList = validEntries.map((e) => {
        if (formData.isUnregisteredClient) {
          return { equipmentId: null, brand: e.brand || "", model: e.model || "", serialNumber: e.serialNumber || "" };
        }
        const match = equipments.find((eq) => eq.id === e.equipmentId);
        return {
          equipmentId: e.equipmentId,
          brand: match?.brand || e.brand || "",
          model: match?.model || e.model || "",
          serialNumber: match?.serialNumber || e.serialNumber || "",
        };
      });
      const primaryEquipment = resolvedEquipmentsList[0] || { equipmentId: null, brand: "", model: "", serialNumber: "" };

      const serviceData = {
        ...formData,
        // Campos singulares legados — continuam gravados a partir da 1ª
        // entrada da lista, para o resto do código (PDFs, cartões de
        // listagem, etc.) que ainda só lê um único equipamento por ordem.
        equipmentId: primaryEquipment.equipmentId || "",
        manualEquipment: formData.isUnregisteredClient
          ? { brand: primaryEquipment.brand, model: primaryEquipment.model, serialNumber: primaryEquipment.serialNumber }
          : formData.manualEquipment,
        equipmentsList: resolvedEquipmentsList,
        checklist,
        createdAt: new Date(),
        orderNumber: formatDocNumber("os", newOrderId),
        lastUpdated: new Date(),
      };

      // ✅ SE ORÇAMENTO DE PEÇAS ESTIVER MARCADO, INCLUIR DADOS
      if (checklist.pecas) {
        serviceData.partsQuoteItems = partsQuoteItems;
        serviceData.shippingType = shippingConfig.shippingType;
        serviceData.shippingPrice = shippingConfig.shippingPrice;
        serviceData.includeVat = shippingConfig.includeVat;
        serviceData.vatRate = shippingConfig.vatRate;
      }

      await setDoc(doc(db, "ordens", newOrderId.toString()), serviceData);
      navigate("/app/manage-orders");
    } catch (err) {
      console.error("Erro ao adicionar serviço:", err);
      setError("Erro ao criar ordem de serviço. Por favor, tente novamente.");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <ClipboardList className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Nova Ordem de Serviço
            </h1>
            <p className="text-sm text-zinc-400">
              Adicione uma nova ordem de serviço ao sistema
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full border-zinc-700 text-white hover:bg-green-700 bg-green-600 shrink-0"
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
                <FieldLabel label="Data" icon={Calendar}>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full pl-10 p-3 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </FieldLabel>

                {/* Client Selection — pesquisável, com foto e por ordem alfabética */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">Cliente</label>
                  <ClientCombobox
                    clients={clients}
                    value={formData.clientId}
                    onValueChange={(value) =>
                      handleChange({ target: { name: "clientId", value } })
                    }
                  />
                </div>

                {/* Equipment Selection — pode ter mais do que 1 (ordem "especial") */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-400">
                      {equipmentsList.length > 1 ? "Equipamentos" : "Equipamento"}
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addEquipmentEntry}
                      disabled={!formData.clientId}
                      className="h-7 border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  {equipmentsList.map((entry) => (
                    <div key={entry.id} className="relative flex items-center gap-2">
                      <div className="relative flex-1">
                        <Printer className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <Select
                          value={entry.equipmentId}
                          onValueChange={(value) => setRegisteredEquipmentEntry(entry.id, value)}
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
                      {equipmentsList.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEquipmentEntry(entry.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10 shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
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
                <FieldLabel label="Data" icon={Calendar}>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full pl-10 p-3 bg-zinc-900 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </FieldLabel>

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

                {/* ✅ DADOS DO(S) EQUIPAMENTO(S) MANUAL(AIS) */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-zinc-300 flex items-center">
                      <Printer className="h-4 w-4 mr-2 text-orange-400" />
                      {equipmentsList.length > 1 ? "Dados dos Equipamentos" : "Dados do Equipamento"}
                    </h4>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addEquipmentEntry}
                      className="h-7 border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Adicionar
                    </Button>
                  </div>

                  {equipmentsList.map((entry, idx) => (
                    <div key={entry.id} className="flex items-start gap-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-zinc-400">
                            Marca {idx === 0 ? "*" : ""}
                          </label>
                          <Input
                            type="text"
                            value={entry.brand}
                            onChange={(e) => updateEquipmentEntry(entry.id, { brand: e.target.value })}
                            placeholder="Ex: HP, Canon, Epson..."
                            className="bg-zinc-900 border-zinc-700 text-white"
                            required={idx === 0}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-zinc-400">
                            Modelo {idx === 0 ? "*" : ""}
                          </label>
                          <Input
                            type="text"
                            value={entry.model}
                            onChange={(e) => updateEquipmentEntry(entry.id, { model: e.target.value })}
                            placeholder="Ex: LaserJet 1020, MG3610..."
                            className="bg-zinc-900 border-zinc-700 text-white"
                            required={idx === 0}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-zinc-400">
                            Número de Série
                          </label>
                          <Input
                            type="text"
                            value={entry.serialNumber}
                            onChange={(e) => updateEquipmentEntry(entry.id, { serialNumber: e.target.value })}
                            placeholder="Número de série do equipamento"
                            className="bg-zinc-900 border-zinc-700 text-white"
                          />
                        </div>
                      </div>
                      {equipmentsList.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeEquipmentEntry(entry.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10 shrink-0 mt-6"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {/* ✅ CAMPOS COMUNS (FORA DAS ABAS) */}
            <div className="mt-6 space-y-4">
              {/* Service Type */}
              <FieldLabel label="Tipo de Serviço" icon={Settings}>
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
              </FieldLabel>

              {/* Priority Selection */}
              <FieldLabel label="Prioridade" icon={AlertCircle}>
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
              </FieldLabel>
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
                    handleChecklistChange({
                      target: { name: "concluido", checked },
                    })
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
                    handleChecklistChange({
                      target: { name: "retorno", checked },
                    })
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
                    handleChecklistChange({
                      target: { name: "funcionarios", checked },
                    })
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
                    handleChecklistChange({
                      target: { name: "documentacao", checked },
                    })
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
                    handleChecklistChange({
                      target: { name: "producao", checked },
                    })
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
                    handleChecklistChange({
                      target: { name: "pecas", checked },
                    })
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

        {/* ✅ SEÇÃO DE ORÇAMENTO DE PEÇAS (CONDICIONAL) */}
        {checklist.pecas && (
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2 text-purple-400" />
                Orçamento de Peças
                <Badge className="ml-2 bg-purple-500/20 text-purple-400">
                  {partsQuoteItems.length} item(s)
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pesquisa de Peças */}
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input
                    type="text"
                    value={partSearchTerm}
                    onChange={(e) => setPartSearchTerm(e.target.value)}
                    placeholder="Pesquisar peças por código ou nome..."
                    className="pl-10 bg-zinc-900 border-zinc-700 text-white"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4 animate-spin" />
                  )}
                </div>

                {searchError && (
                  <Alert className="border-amber-500 bg-amber-500/10">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-amber-400">
                      {searchError}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Resultados da pesquisa */}
                {searchResults.length > 0 && (
                  <div className="border border-zinc-600 rounded-lg max-h-60 overflow-y-auto">
                    {searchResults.map((part) => (
                      <div
                        key={part.id}
                        className="flex items-center justify-between p-3 border-b border-zinc-700 last:border-b-0 hover:bg-zinc-700/50 cursor-pointer"
                        onClick={() => addPartToQuote(part)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">
                              {part.name}
                            </span>
                            <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                              {part.code}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-zinc-900 border-green-600 text-green-400 hover:bg-green-500/20"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista de Peças Adicionadas */}
              {partsQuoteItems.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-medium text-white">
                      Peças Selecionadas
                    </h4>
                    <div className="text-right">
                      <p className="text-sm text-zinc-400">Subtotal</p>
                      <p className="text-xl font-bold text-green-400">
                        {formatPrice(calculateSubtotal())}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {partsQuoteItems.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-12 gap-4 items-center p-4 bg-zinc-700/30 rounded-lg border border-zinc-600"
                      >
                        <div className="col-span-12 md:col-span-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Package className="h-4 w-4 text-purple-400" />
                            <span className="font-medium text-white">
                              {item.name}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-400">
                            Código: {item.code}
                          </p>
                        </div>

                        <div className="col-span-6 md:col-span-2">
                          <label className="text-sm text-zinc-400 block mb-1">
                            Qtd
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updatePartQuantity(item.id, e.target.value)
                            }
                            className="bg-zinc-900 border-zinc-700 text-white text-center"
                          />
                        </div>

                        <div className="col-span-6 md:col-span-3">
                          <label className="text-sm text-zinc-400 block mb-1">
                            Preço Unitário (€)
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.price}
                            onChange={(e) =>
                              updatePartPrice(item.id, e.target.value)
                            }
                            className="bg-zinc-900 border-zinc-700 text-white"
                            placeholder="0.00"
                          />
                        </div>

                        <div className="col-span-9 md:col-span-2">
                          <label className="text-sm text-zinc-400 block mb-1">
                            Subtotal
                          </label>
                          <div className="bg-zinc-800 rounded px-3 py-2 text-center border border-zinc-600">
                            <span className="text-green-400 font-medium">
                              {formatPrice(item.quantity * item.price)}
                            </span>
                          </div>
                        </div>

                        <div className="col-span-3 md:col-span-1 flex justify-end">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removePartFromQuote(item.id)}
                            className="bg-red-600 hover:bg-red-700 h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Configurações de Envio e IVA */}
                  <div className="mt-6 p-4 bg-zinc-700/50 rounded-lg border border-zinc-600">
                    <h5 className="text-md font-medium text-white mb-4">
                      Configurações do Orçamento
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">
                          Tipo de Envio
                        </label>
                        <Input
                          type="text"
                          value={shippingConfig.shippingType}
                          onChange={(e) =>
                            setShippingConfig((prev) => ({
                              ...prev,
                              shippingType: e.target.value,
                            }))
                          }
                          placeholder="Ex: Correios, Transportadora..."
                          className="bg-zinc-900 border-zinc-700 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">
                          Preço do Envio (€)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={shippingConfig.shippingPrice}
                          onChange={(e) =>
                            setShippingConfig((prev) => ({
                              ...prev,
                              shippingPrice: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                          className="bg-zinc-900 border-zinc-700 text-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">
                          Taxa de IVA (%)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={shippingConfig.vatRate}
                          onChange={(e) =>
                            setShippingConfig((prev) => ({
                              ...prev,
                              vatRate: e.target.value,
                            }))
                          }
                          className="bg-zinc-900 border-zinc-700 text-white"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="includeVat"
                          checked={shippingConfig.includeVat}
                          onChange={(e) =>
                            setShippingConfig((prev) => ({
                              ...prev,
                              includeVat: e.target.checked,
                            }))
                          }
                          className="rounded border-zinc-600"
                        />
                        <label
                          htmlFor="includeVat"
                          className="text-sm text-zinc-400"
                        >
                          Incluir IVA no orçamento
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Resumo Total */}
                  <div className="mt-4 p-4 bg-zinc-700/50 rounded-lg border border-zinc-600">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-white">Subtotal Peças:</span>
                        <span className="text-white">
                          {formatPrice(calculateSubtotal())}
                        </span>
                      </div>

                      {shippingConfig.shippingPrice > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-white">Envio:</span>
                          <span className="text-white">
                            {formatPrice(shippingConfig.shippingPrice)}
                          </span>
                        </div>
                      )}

                      {shippingConfig.includeVat && (
                        <div className="flex justify-between items-center">
                          <span className="text-white">
                            IVA ({shippingConfig.vatRate}%):
                          </span>
                          <span className="text-white">
                            {formatPrice(
                              ((calculateSubtotal() +
                                parseFloat(shippingConfig.shippingPrice || 0)) *
                                shippingConfig.vatRate) /
                                100
                            )}
                          </span>
                        </div>
                      )}

                      <hr className="border-zinc-600" />

                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-white">
                          Total Final:
                        </span>
                        <span className="text-xl font-bold text-green-400">
                          {formatPrice(calculateTotal())}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {partsQuoteItems.length === 0 && (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400">Nenhuma peça adicionada ainda</p>
                  <p className="text-sm text-zinc-500">
                    Use a pesquisa acima para encontrar e adicionar peças
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Criando...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Criar Ordem
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default AddOrder;
