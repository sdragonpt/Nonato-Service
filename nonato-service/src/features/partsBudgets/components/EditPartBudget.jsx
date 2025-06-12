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
  UserCheck,
  UserX,
  Package,
  Search,
  Plus,
  X,
  ShoppingCart,
  Euro,
  Mail,
  Phone,
  Building2,
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
    // Lista de peças do orçamento
    partsQuoteItems: [],
    // Configurações de envio e IVA
    shippingType: "",
    shippingPrice: 0,
    includeVat: false,
    vatRate: 23,
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
  const [originalData, setOriginalData] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  // Função para pesquisar peças por código
  const searchPartsByCode = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      setSearchError("");

      const partsSnapshot = await getDocs(collection(db, "pecas"));

      const results = partsSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter(
          (part) =>
            part.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            part.name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, 10);

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

  // Calcular total do orçamento
  const calculateSubtotal = () => {
    return formData.partsQuoteItems.reduce((total, item) => {
      return total + item.quantity * (item.price || 0);
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

  // Buscar informações do equipamento selecionado
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

        const [quoteSnapshot, clientsSnapshot, equipmentsSnapshot] =
          await Promise.all([
            getDoc(doc(db, "ordens", quoteId)),
            getDocs(collection(db, "clientes")),
            getDocs(collection(db, "equipamentos")),
          ]);

        if (!quoteSnapshot.exists()) {
          setError("Orçamento de peças não encontrado");
          return;
        }

        const quoteData = quoteSnapshot.data();

        // Verificar se é realmente um orçamento
        if (!quoteData.isQuote) {
          setError("Este documento não é um orçamento de peças");
          return;
        }

        setOriginalData(quoteData);

        // Set form data
        setFormData({
          date: quoteData.date || "",
          clientId: quoteData.clientId || "",
          equipmentId: quoteData.equipmentId || "",
          serviceType: quoteData.serviceType || "",
          status: quoteData.status || "Aberto",
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

        // Filter equipments for selected client
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);

      const quoteData = {
        ...formData,
        lastUpdated: new Date(),
        isQuote: true, // Manter flag de orçamento
      };

      await updateDoc(doc(db, "ordens", quoteId), quoteData);
      navigate("/app/manage-parts-budgets");
    } catch (err) {
      console.error("Erro ao atualizar orçamento:", err);
      setError(
        "Erro ao atualizar orçamento de peças. Por favor, tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price) => {
    return `€ ${parseFloat(price || 0).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const hasChanges =
    originalData && JSON.stringify(formData) !== JSON.stringify(originalData);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Editar Orçamento de Peças
          </h1>
          <p className="text-sm text-zinc-400">
            Atualize as informações e preços do orçamento de peças
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(`/app/part-budget-detail/${quoteId}`)}
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
        {/* Cliente e Equipamento */}
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

              {/* Cliente Registrado */}
              <TabsContent value="registered" className="space-y-4">
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

              {/* Cliente Não Registrado */}
              <TabsContent value="unregistered" className="space-y-4">
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

            {/* Campos Comuns */}
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Tipo de Serviço
                </label>
                <Input
                  type="text"
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleChange}
                  placeholder="Descreva o tipo de serviço"
                  className="bg-zinc-900 border-zinc-700 text-white"
                />
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
                  <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                    <SelectValue placeholder="Selecione o Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem
                      value="Aberto"
                      className="text-white hover:bg-zinc-700"
                    >
                      Em Análise
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
                      Concluído
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orçamento de Peças */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2 text-purple-400" />
              Peças do Orçamento
              <Badge className="ml-2 bg-purple-500/20 text-purple-400">
                {formData.partsQuoteItems.length} item(s)
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
                        <p className="text-sm text-zinc-400 mt-1">
                          {part.description || "Sem descrição"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-600 text-green-400 hover:bg-green-500/20"
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
                        name="shippingType"
                        value={formData.shippingType}
                        onChange={handleChange}
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
                <div className="mt-4 p-4 bg-zinc-700/50 rounded-lg border border-zinc-600">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white">Subtotal Peças:</span>
                      <span className="text-white">
                        {formatPrice(calculateSubtotal())}
                      </span>
                    </div>

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

            {formData.partsQuoteItems.length === 0 && (
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

        {/* Observações */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
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

            <div>
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

export default EditPartBudget;
