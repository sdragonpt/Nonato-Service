// AddWarehouseRequest.jsx - Novo pedido de separação de peças (Almoxarifado)
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import { searchCatalogParts } from "../../../utils/catalogPartSearch.js";
import {
  ArrowLeft,
  Loader2,
  Plus,
  AlertTriangle,
  Search,
  Trash2,
  Package,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";

let itemIdCounter = 0;
const nextItemId = () => `item_${Date.now()}_${++itemIdCounter}`;

const AddWarehouseRequest = () => {
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [clientId, setClientId] = useState("");
  const [orderId, setOrderId] = useState("none");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState([]);

  const [partSearch, setPartSearch] = useState("");
  const [partResults, setPartResults] = useState([]);
  const [searchingParts, setSearchingParts] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoadingClients(true);
        const snap = await getDocs(collection(db, "clientes"));
        setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Erro ao carregar clientes:", err);
        setError("Erro ao carregar clientes.");
      } finally {
        setLoadingClients(false);
      }
    };
    fetchClients();
  }, []);

  useEffect(() => {
    if (!clientId) {
      setOrders([]);
      return;
    }
    const fetchOrders = async () => {
      try {
        setLoadingOrders(true);
        const q = query(collection(db, "ordens"), where("clientId", "==", clientId));
        const snap = await getDocs(q);
        setOrders(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((o) => !o.isQuote)
        );
      } catch (err) {
        console.error("Erro ao carregar ordens de serviço:", err);
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrders();
  }, [clientId]);

  const searchParts = useCallback(async (term) => {
    if (term.trim().length < 2) {
      setPartResults([]);
      return;
    }
    try {
      setSearchingParts(true);
      const results = await searchCatalogParts(term, { limit: 15 });
      setPartResults(results);
    } catch (err) {
      console.error("Erro ao pesquisar peças:", err);
    } finally {
      setSearchingParts(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => searchParts(partSearch), 350);
    return () => clearTimeout(timeout);
  }, [partSearch, searchParts]);

  const addPart = (part) => {
    if (itens.some((i) => i.partId === part.id)) return;
    setItens((prev) => [
      ...prev,
      {
        id: nextItemId(),
        partId: part.id,
        partName: part.name,
        partCode: part.code || "",
        quantity: 1,
        separado: false,
      },
    ]);
    setPartSearch("");
    setPartResults([]);
  };

  const updateQuantity = (itemId, quantity) => {
    setItens((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: Math.max(1, quantity) } : i))
    );
  };

  const removeItem = (itemId) => {
    setItens((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!clientId) {
      setError("Selecione um cliente.");
      return;
    }
    if (itens.length === 0) {
      setError("Adicione pelo menos uma peça ao pedido.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const client = clients.find((c) => c.id === clientId);
      const order = orderId !== "none" ? orders.find((o) => o.id === orderId) : null;

      await addDoc(collection(db, "pedidosArmazem"), {
        clientId,
        clientName: client?.name || "",
        orderId: order?.id || "",
        orderLabel: order ? `OS ${order.id}` : "",
        itens,
        observacoes: observacoes.trim(),
        status: "pendente",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      navigate("/app/warehouse");
    } catch (err) {
      console.error("Erro ao criar pedido de armazém:", err);
      setError("Erro ao criar pedido. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Novo Pedido de Armazém</h1>
          <p className="text-sm text-zinc-400">
            Registe as peças a separar para um cliente
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/app/warehouse")}
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
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Cliente e Ordem de Serviço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Cliente</label>
              {loadingClients ? (
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> A carregar clientes...
                </div>
              ) : (
                <Select
                  value={clientId}
                  onValueChange={(value) => {
                    setClientId(value);
                    setOrderId("none");
                  }}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {clients
                      .slice()
                      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-PT"))
                      .map((client) => (
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
              )}
            </div>

            {clientId && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">
                  Ordem de Serviço (opcional)
                </label>
                {loadingOrders ? (
                  <div className="flex items-center gap-2 text-zinc-400 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /> A carregar ordens...
                  </div>
                ) : (
                  <Select value={orderId} onValueChange={setOrderId}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                      <SelectValue placeholder="Sem ordem associada" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="none" className="text-white hover:bg-zinc-700">
                        Sem ordem associada
                      </SelectItem>
                      {orders.map((order) => (
                        <SelectItem
                          key={order.id}
                          value={order.id}
                          className="text-white hover:bg-zinc-700"
                        >
                          OS {order.id} — {order.status || "Aberto"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Peças a Separar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                placeholder="Pesquisar peça por nome ou código..."
                className="pl-10 bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
              />
              {searchingParts && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-400" />
              )}
            </div>

            {partResults.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto border border-zinc-700 rounded-lg p-2">
                {partResults.map((part) => (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => addPart(part)}
                    className="w-full flex items-center justify-between p-2 rounded-md hover:bg-zinc-700 text-left"
                  >
                    <span className="text-white text-sm">
                      {part.name}{" "}
                      {part.code && <span className="text-zinc-500">({part.code})</span>}
                    </span>
                    <Plus className="h-4 w-4 text-green-500 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {itens.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">
                Pesquise e adicione as peças que precisam de ser separadas
              </p>
            ) : (
              <div className="space-y-2">
                {itens.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-3 bg-zinc-700/30 rounded-lg border border-zinc-600"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="h-4 w-4 text-blue-400 shrink-0" />
                      <span className="text-white text-sm truncate">
                        {item.partName}
                        {item.partCode ? ` (${item.partCode})` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.id, parseInt(e.target.value) || 1)
                        }
                        className="bg-zinc-900 border-zinc-700 text-white w-16 h-8"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-lg text-white">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas para quem vai separar as peças..."
              rows={3}
              className="bg-zinc-900 border-zinc-700 text-white [&::placeholder]:text-zinc-500"
            />
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              A criar...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Criar Pedido
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default AddWarehouseRequest;
