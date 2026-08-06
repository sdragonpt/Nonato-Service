// src/features/partsBudgets/components/EditPartBudget.jsx - ✅ COM MARGEM DE LUCRO
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
import { searchCatalogParts } from "../../../utils/catalogPartSearch.js";
import {
  ArrowLeft,
  Loader2,
  Save,
  AlertTriangle,
  Calendar,
  Search,
  Plus,
  Trash2,
  Percent, // ✅ NOVO: Para cálculos
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
import { Badge } from "@/components/ui/badge.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.jsx";

const EditPartBudget = () => {
  const { quoteId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    date: "",
    clientId: "",
    equipmentId: "",
    serviceType: "",
    status: "",
    description: "",
    resultDescription: "",
    pontosEmAberto: "",
    // Campos para cliente não registrado
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
    partsQuoteItems: [],
    shippingType: "",
    shippingPrice: 0,
    includeVat: false,
    vatRate: 23,
    // ✅ NOVO: Campos de margem de lucro
    profitMargin: 0,
    includeProfitMargin: false,
  });

  // Estados para pesquisa de peças
  const [partSearchTerm, setPartSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [filteredEquipments, setFilteredEquipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Função para pesquisar peças no catálogo HOMAG por nome ou código
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

  // Função para adicionar peça ao orçamento
  const addPartToQuote = (part) => {
    const existingIndex = formData.partsQuoteItems.findIndex(
      (item) => item.id === part.id
    );

    if (existingIndex >= 0) {
      const updatedItems = [...formData.partsQuoteItems];
      updatedItems[existingIndex].quantity += 1;
      setFormData((prev) => ({ ...prev, partsQuoteItems: updatedItems }));
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

      setFormData((prev) => ({
        ...prev,
        partsQuoteItems: [...prev.partsQuoteItems, newItem],
      }));
    }

    setPartSearchTerm("");
    setSearchResults([]);
  };

  // Função para remover peça do orçamento
  const removePartFromQuote = (partId) => {
    setFormData((prev) => ({
      ...prev,
      partsQuoteItems: prev.partsQuoteItems.filter(
        (item) => item.id !== partId
      ),
    }));
  };

  // Função para atualizar quantidade
  const updatePartQuantity = (partId, quantity) => {
    const newQuantity = Math.max(1, parseInt(quantity) || 1);
    setFormData((prev) => ({
      ...prev,
      partsQuoteItems: prev.partsQuoteItems.map((item) =>
        item.id === partId ? { ...item, quantity: newQuantity } : item
      ),
    }));
  };

  // Função para atualizar preço
  const updatePartPrice = (partId, price) => {
    const newPrice = Math.max(0, parseFloat(price) || 0);
    setFormData((prev) => ({
      ...prev,
      partsQuoteItems: prev.partsQuoteItems.map((item) =>
        item.id === partId ? { ...item, price: newPrice } : item
      ),
    }));
  };

  // ✅ NOVOS CÁLCULOS COM MARGEM DE LUCRO
  const calculateSubtotal = () => {
    return formData.partsQuoteItems.reduce((total, item) => {
      const basePrice = item.price || 0;
      const quantity = item.quantity || 1;

      // Aplicar margem de lucro se ativa
      const priceWithMargin =
        formData.includeProfitMargin && formData.profitMargin > 0
          ? basePrice * (1 + formData.profitMargin / 100)
          : basePrice;

      return total + quantity * priceWithMargin;
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const shipping = parseFloat(formData.shippingPrice) || 0;
    const totalBeforeVat = subtotal + shipping;

    if (formData.includeVat) {
      const vatAmount = (totalBeforeVat * formData.vatRate) / 100;
      return totalBeforeVat + vatAmount;
    }

    return totalBeforeVat;
  };

  // ✅ CALCULAR LUCRO TOTAL
  const calculateProfitAmount = () => {
    if (!formData.includeProfitMargin || formData.profitMargin <= 0) return 0;

    return formData.partsQuoteItems.reduce((total, item) => {
      const basePrice = item.price || 0;
      const quantity = item.quantity || 1;
      const marginAmount = (basePrice * formData.profitMargin) / 100;
      return total + quantity * marginAmount;
    }, 0);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [quoteSnapshot, clientsSnapshot, equipmentsSnapshot] =
          await Promise.all([
            getDoc(doc(db, "ordens", quoteId)),
            getDocs(collection(db, "clientes")),
            getDocs(collection(db, "equipamentos")),
          ]);

        if (!quoteSnapshot.exists()) {
          setError("Orçamento não encontrado");
          return;
        }

        const quoteData = quoteSnapshot.data();

        // ✅ INCLUIR CAMPOS DE MARGEM NO FORM DATA
        setFormData({
          date: quoteData.date || new Date().toISOString().split("T")[0],
          clientId: quoteData.clientId || "",
          equipmentId: quoteData.equipmentId || "",
          serviceType: quoteData.serviceType || "",
          status: quoteData.status || "",
          description: quoteData.description || "",
          resultDescription: quoteData.resultDescription || "",
          pontosEmAberto: quoteData.pontosEmAberto || "",
          isUnregisteredClient: quoteData.isUnregisteredClient || false,
          unregisteredClient: quoteData.unregisteredClient || {
            name: "",
            email: "",
            phone: "",
            company: "",
          },
          manualEquipment: quoteData.manualEquipment || {
            brand: "",
            model: "",
            serialNumber: "",
          },
          partsQuoteItems: quoteData.partsQuoteItems || quoteData.items || [],
          shippingType: quoteData.shippingType || "",
          shippingPrice: quoteData.shippingPrice || 0,
          includeVat: quoteData.includeVat || false,
          vatRate: quoteData.vatRate || 23,
          // ✅ NOVO: Campos de margem
          profitMargin: quoteData.profitMargin || 0,
          includeProfitMargin: quoteData.includeProfitMargin || false,
        });

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

        // ✅ CORRIGIDO: Filter equipments for selected client
        if (quoteData.clientId && !quoteData.isUnregisteredClient) {
          const filtered = equipmentsData.filter(
            (equipment) => equipment.clientId === quoteData.clientId
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
  }, [quoteId]);

  // Debounce para pesquisa de peças
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ✅ NOVO: Handler específico para seleção de cliente
  const handleClientSelect = (clientId) => {
    // ✅ Verificar se clientId não é vazio
    if (!clientId || clientId === "no-client") return;
    
    setFormData((prev) => ({
      ...prev,
      clientId: clientId,
      equipmentId: "", // Limpar equipamento quando mudar cliente
    }));

    // Filtrar equipamentos do cliente selecionado
    if (clientId && !formData.isUnregisteredClient) {
      const filtered = equipments.filter(
        (equipment) => equipment.clientId === clientId
      );
      setFilteredEquipments(filtered);
    } else {
      setFilteredEquipments([]);
    }
  };

  // Handler para dados de cliente não registrado
  const handleUnregisteredClientChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      unregisteredClient: {
        ...prev.unregisteredClient,
        [field]: value,
      },
    }));
  };

  // Handler para dados de equipamento manual
  const handleManualEquipmentChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      manualEquipment: {
        ...prev.manualEquipment,
        [field]: value,
      },
    }));
  };

  // Toggle entre cliente registrado e não registrado
  const handleClientTypeToggle = (isUnregistered) => {
    setFormData((prev) => ({
      ...prev,
      isUnregisteredClient: isUnregistered,
      ...(isUnregistered
        ? { clientId: "", equipmentId: "" }
        : {
            unregisteredClient: { name: "", email: "", phone: "", company: "" },
          }),
    }));

    // ✅ CORRIGIDO: Limpar equipamentos filtrados quando mudar tipo
    setFilteredEquipments([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validação básica
    if (formData.isUnregisteredClient) {
      if (!formData.unregisteredClient.name.trim()) {
        setError("Nome do cliente é obrigatório");
        return;
      }
    } else {
      if (!formData.clientId || !formData.equipmentId) {
        setError("Cliente e equipamento são obrigatórios");
        return;
      }
    }

    if (formData.partsQuoteItems.length === 0) {
      setError("Adicione pelo menos uma peça ao orçamento");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await updateDoc(doc(db, "ordens", quoteId), {
        ...formData,
        lastUpdated: new Date(),
      });

      navigate("/app/parts-budgets");
    } catch (err) {
      console.error("Erro ao atualizar orçamento:", err);
      setError("Erro ao atualizar orçamento. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price) => {
    return `€ ${parseFloat(price || 0).toFixed(2)}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
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
          <h1 className="text-2xl font-bold text-white">
            Editar Orçamento de Peças
          </h1>
          <p className="text-sm text-zinc-400">
            Atualize as informações do orçamento de peças
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/app/parts-budgets")}
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

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-zinc-800 border-zinc-700">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="client">Cliente</TabsTrigger>
          <TabsTrigger value="parts">Peças</TabsTrigger>
          <TabsTrigger value="pricing">✅ Preços</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card className="bg-zinc-800 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">
                  Informações Gerais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">
                      Data
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <Input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="w-full pl-10 bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600 focus:border-zinc-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">
                      Tipo de Serviço
                    </label>
                    <Select
                      value={formData.serviceType}
                      onValueChange={(value) =>
                        handleChange({ target: { name: "serviceType", value } })
                      }
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600">
                        <SelectValue placeholder="Selecione o tipo de serviço" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-600 shadow-lg">
                        <SelectItem
                          value="Orçamento de Peças"
                          className="text-white hover:bg-zinc-700 hover:text-white focus:bg-zinc-700 focus:text-white"
                        >
                          Orçamento de Peças
                        </SelectItem>
                        <SelectItem
                          value="Orçamento de Serviços"
                          className="text-white hover:bg-zinc-700 hover:text-white focus:bg-zinc-700 focus:text-white"
                        >
                          Orçamento de Serviços
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">
                      Status
                    </label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        handleChange({ target: { name: "status", value } })
                      }
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-600 shadow-lg">
                        <SelectItem
                          value="Aberto"
                          className="text-white hover:bg-zinc-700 hover:text-white focus:bg-zinc-700 focus:text-white"
                        >
                          Em Análise
                        </SelectItem>
                        <SelectItem
                          value="Em Andamento"
                          className="text-white hover:bg-zinc-700 hover:text-white focus:bg-zinc-700 focus:text-white"
                        >
                          Em Andamento
                        </SelectItem>
                        <SelectItem
                          value="Fechado"
                          className="text-white hover:bg-zinc-700 hover:text-white focus:bg-zinc-700 focus:text-white"
                        >
                          Concluído
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">
                    Descrição
                  </label>
                  <Textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="bg-zinc-900 border-zinc-700 text-white"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Client Tab */}
          <TabsContent value="client" className="space-y-6">
            <Card className="bg-zinc-800 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">
                  Informações do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Client Type Toggle */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="clientType"
                      checked={formData.isUnregisteredClient}
                      onChange={() => handleClientTypeToggle(true)}
                      className="text-green-600"
                    />
                    <span className="text-white">Cliente Não Registrado</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="clientType"
                      checked={!formData.isUnregisteredClient}
                      onChange={() => handleClientTypeToggle(false)}
                      className="text-green-600"
                    />
                    <span className="text-white">Cliente Registrado</span>
                  </label>
                </div>

                {formData.isUnregisteredClient ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">
                        Nome do Cliente *
                      </label>
                      <Input
                        value={formData.unregisteredClient.name}
                        onChange={(e) =>
                          handleUnregisteredClientChange("name", e.target.value)
                        }
                        className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600 focus:border-zinc-500"
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
                          handleUnregisteredClientChange(
                            "email",
                            e.target.value
                          )
                        }
                        className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600 focus:border-zinc-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">
                        Telefone
                      </label>
                      <Input
                        value={formData.unregisteredClient.phone}
                        onChange={(e) =>
                          handleUnregisteredClientChange(
                            "phone",
                            e.target.value
                          )
                        }
                        className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600 focus:border-zinc-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">
                        Empresa
                      </label>
                      <Input
                        value={formData.unregisteredClient.company}
                        onChange={(e) =>
                          handleUnregisteredClientChange(
                            "company",
                            e.target.value
                          )
                        }
                        className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600 focus:border-zinc-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">
                        Cliente *
                      </label>
                      <Select
                        value={formData.clientId}
                        onValueChange={handleClientSelect}
                      >
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600">
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-600 shadow-lg">
                          {clients
                            .filter((client) => client.id && client.id.trim() !== "")
                            .map((client) => (
                              <SelectItem
                                key={client.id}
                                value={client.id}
                                className="text-white hover:bg-zinc-700 hover:text-white focus:bg-zinc-700 focus:text-white"
                              >
                                {client.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-400">
                        Equipamento *
                      </label>
                      <Select
                        value={formData.equipmentId}
                        onValueChange={(value) => {
                          // ✅ Verificar se value não é vazio ou placeholder
                          if (value && value !== "no-equipment") {
                            setFormData((prev) => ({
                              ...prev,
                              equipmentId: value,
                            }));
                          }
                        }}
                        disabled={!formData.clientId}
                      >
                        <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed">
                          <SelectValue placeholder="Selecione um equipamento" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-600 shadow-lg">
                          {filteredEquipments.length > 0 ? (
                            filteredEquipments.map((equipment) => (
                              <SelectItem
                                key={equipment.id}
                                value={equipment.id}
                                className="text-white hover:bg-zinc-700 hover:text-white focus:bg-zinc-700 focus:text-white"
                              >
                                {equipment.brand} {equipment.model} -{" "}
                                {equipment.serialNumber}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem
                              value="no-equipment"
                              disabled
                              className="text-zinc-400"
                            >
                              {formData.clientId
                                ? "Nenhum equipamento encontrado para este cliente"
                                : "Selecione um cliente primeiro"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Parts Tab */}
          <TabsContent value="parts" className="space-y-6">
            <Card className="bg-zinc-800 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">
                  Peças do Orçamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Parts */}
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Pesquisar peças por código ou nome..."
                      value={partSearchTerm}
                      onChange={(e) => setPartSearchTerm(e.target.value)}
                      className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 hover:bg-zinc-800 hover:border-zinc-600 focus:border-zinc-500"
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
                            className="border-green-500 text-green-400 hover:bg-green-500/20 hover:text-green-300 hover:border-green-400"
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
                {formData.partsQuoteItems.length > 0 && (
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
                      {formData.partsQuoteItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-4 bg-zinc-700/50 rounded-lg border border-zinc-600"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-white">
                                {item.name}
                              </span>
                              <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                                {item.code}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="text-xs text-zinc-400">
                                  Quantidade
                                </label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updatePartQuantity(item.id, e.target.value)
                                  }
                                  className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600 focus:border-zinc-500"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-zinc-400">
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
                                  className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600 focus:border-zinc-500"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-zinc-400">
                                  Total
                                </label>
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-medium">
                                    {formatPrice(
                                      item.quantity *
                                        (formData.includeProfitMargin &&
                                        formData.profitMargin > 0
                                          ? item.price *
                                            (1 + formData.profitMargin / 100)
                                          : item.price)
                                    )}
                                  </span>
                                  {formData.includeProfitMargin &&
                                    formData.profitMargin > 0 && (
                                      <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                                        +{formData.profitMargin}%
                                      </Badge>
                                    )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => removePartFromQuote(item.id)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ✅ NOVA ABA: Pricing */}
          <TabsContent value="pricing" className="space-y-6">
            <Card className="bg-zinc-800 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">
                  Configurações de Preço
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Margem de Lucro */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="includeProfitMargin"
                      checked={formData.includeProfitMargin}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          includeProfitMargin: e.target.checked,
                        }))
                      }
                      className="rounded border-zinc-600"
                    />
                    <label
                      htmlFor="includeProfitMargin"
                      className="text-sm text-zinc-400 flex items-center gap-2"
                    >
                      <Percent className="h-4 w-4" />
                      Incluir margem de lucro
                    </label>
                  </div>

                  {formData.includeProfitMargin && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">
                          Margem de Lucro (%)
                        </label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="1000"
                          name="profitMargin"
                          value={formData.profitMargin}
                          onChange={handleChange}
                          className="bg-zinc-900 border-zinc-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">
                          Valor do Lucro
                        </label>
                        <div className="flex items-center h-10 px-3 bg-zinc-900 border border-zinc-700 rounded-lg">
                          <span className="text-green-400 font-medium">
                            {formatPrice(calculateProfitAmount())}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Configurações de Envio e IVA */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-zinc-700">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">
                      Preço do Envio (€)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      name="shippingPrice"
                      value={formData.shippingPrice}
                      onChange={handleChange}
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
                      name="vatRate"
                      value={formData.vatRate}
                      onChange={handleChange}
                      className="bg-zinc-900 border-zinc-700 text-white"
                    />
                  </div>

                  <div className="flex items-end">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="includeVat"
                        checked={formData.includeVat}
                        onChange={(e) =>
                          setFormData((prev) => ({
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
                <div className="p-4 bg-zinc-700/50 rounded-lg border border-zinc-600">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white">Subtotal Peças:</span>
                      <span className="text-white">
                        {formatPrice(calculateSubtotal())}
                      </span>
                    </div>

                    {formData.includeProfitMargin &&
                      formData.profitMargin > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-purple-400">
                            Lucro ({formData.profitMargin}%):
                          </span>
                          <span className="text-purple-400 font-medium">
                            {formatPrice(calculateProfitAmount())}
                          </span>
                        </div>
                      )}

                    {formData.shippingPrice > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-white">Envio:</span>
                        <span className="text-white">
                          {formatPrice(formData.shippingPrice)}
                        </span>
                      </div>
                    )}

                    {formData.includeVat && (
                      <div className="flex justify-between items-center">
                        <span className="text-white">
                          IVA ({formData.vatRate}%):
                        </span>
                        <span className="text-white">
                          {formatPrice(
                            ((calculateSubtotal() +
                              parseFloat(formData.shippingPrice || 0)) *
                              formData.vatRate) /
                              100
                          )}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-zinc-600">
                      <span className="text-xl font-bold text-white">
                        Total:
                      </span>
                      <span className="text-xl font-bold text-green-400">
                        {formatPrice(calculateTotal())}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/app/parts-budgets")}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-white hover:border-zinc-500"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || formData.partsQuoteItems.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white border-0 shadow-md"
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
          </div>
        </form>
      </Tabs>
    </div>
  );
};

export default EditPartBudget;
