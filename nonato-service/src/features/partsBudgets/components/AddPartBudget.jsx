// src/features/partsBudgets/components/AddPartBudget.jsx - ✅ SIMPLIFICADO
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Search,
  Plus,
  Trash2,
  X,
  Calculator,
  Percent,
  Package,
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
import { Badge } from "@/components/ui/badge.jsx";

const AddPartBudget = () => {
  const navigate = useNavigate();

  // ✅ SIMPLIFICADO: Form state sem cliente
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    serviceType: "Orçamento de Peças",
    status: "Aberto",
    description: "",
    resultDescription: "",
    pontosEmAberto: "",

    // ✅ NOVO: Sempre cliente não registrado (vazio inicialmente)
    isUnregisteredClient: true,
    unregisteredClient: {
      name: "",
      email: "",
      phone: "",
      company: "",
    },

    // ✅ NOVO: Equipamento sempre manual/genérico
    manualEquipment: {
      brand: "Diversos",
      model: "Orçamento de Peças",
      serialNumber: "N/A",
    },

    // Lista de peças do orçamento
    partsQuoteItems: [],

    // Configurações de envio e IVA
    shippingType: "",
    shippingPrice: 0,
    includeVat: false,
    vatRate: 23,

    // ✅ Sistema de margem de lucro
    profitMargin: 0,
    includeProfitMargin: false,
  });

  // Estados para pesquisa de peças
  const [partSearchTerm, setPartSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

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

  // ✅ CÁLCULOS COM MARGEM DE LUCRO
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
    if (partSearchTerm.trim()) {
      const timeoutId = setTimeout(() => {
        searchPartsByCode(partSearchTerm);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setSearchError("");
    }
  }, [partSearchTerm]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ VALIDAÇÃO SIMPLIFICADA: Só verifica se há peças
    if (formData.partsQuoteItems.length === 0) {
      setError("Adicione pelo menos uma peça ao orçamento");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const partsQuoteData = {
        ...formData,
        isQuote: true, // FLAG PRINCIPAL para orçamentos de peças
        source: "admin-created",
        createdAt: new Date(),
        lastUpdated: new Date(),
      };

      // Criar novo documento na coleção ordens
      await setDoc(doc(collection(db, "ordens")), partsQuoteData);

      navigate("/app/parts-budgets");
    } catch (err) {
      console.error("Erro ao criar orçamento:", err);
      setError("Erro ao criar orçamento. Por favor, tente novamente.");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Novo Orçamento de Peças
          </h1>
          <p className="text-sm text-zinc-400">
            ✅ Crie um orçamento para enviar à empresa e solicitar valores das
            peças
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ✅ INFORMAÇÕES BÁSICAS SIMPLIFICADAS */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Informações do Orçamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Data
                </label>
                <Input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600 focus:border-zinc-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Tipo de Serviço
                </label>
                <Input
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleChange}
                  className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600 focus:border-zinc-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Descrição
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 resize-none hover:bg-zinc-800 hover:border-zinc-600 focus:border-zinc-500"
                placeholder="Descreva o orçamento..."
              />
            </div>

            {/* ✅ AVISO */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-400">
                ℹ️ <strong>Informação:</strong> Este orçamento será enviado para
                a empresa solicitar os valores das peças. O cliente será
                adicionado posteriormente durante a edição.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Parts Selection */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Package className="h-5 w-5" />
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
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
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
                              placeholder="A definir"
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

        {/* ✅ CONFIGURAÇÕES DE MARGEM E IVA */}
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
                      className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600 focus:border-zinc-500"
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
                  className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600 focus:border-zinc-500"
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
                  className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:border-zinc-600 focus:border-zinc-500"
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
                  <label htmlFor="includeVat" className="text-sm text-zinc-400">
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

                {formData.includeProfitMargin && formData.profitMargin > 0 && (
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
                  <span className="text-xl font-bold text-white">Total:</span>
                  <span className="text-xl font-bold text-green-400">
                    {formatPrice(calculateTotal())}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                Criando...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4 mr-2" />
                Criar Orçamento
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddPartBudget;
