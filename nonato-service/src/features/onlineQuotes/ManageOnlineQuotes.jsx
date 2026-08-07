import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
  deleteDoc,
  setDoc,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { generateDocNumber } from "../../utils/docNumbering.js";
import { searchIncludes } from "../../utils/normalizeSearch.js";
import { fetchPage } from "../../utils/firestorePage.js";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  Search,
  Loader2,
  AlertTriangle,
  Eye,
  MessageSquare,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  ChevronDown,
  ArrowDown,
  Mail,
  Phone,
  Building2,
  ShoppingCart,
  Tag,
  Trash2,
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.jsx";

const PAGE_SIZE = 10;
const MAX_AUTO_LOADS = 15; // salvaguarda: nº máx. de lotes extra a carregar automaticamente ao pesquisar

// Quote status labels
const statusLabels = {
  pending: { label: "Pendente", color: "yellow" },
  approved: { label: "Aprovado", color: "green" },
  rejected: { label: "Rejeitado", color: "red" },
  converted: { label: "Convertido", color: "blue" },
};

const ManageOnlineQuotes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ✅ Carregado por lotes (cursor do Firestore), em vez de ler a coleção
  // "orcamentos-online" inteira de uma só vez.
  const [quotes, setQuotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState("");
  const [selectedQuoteForNote, setSelectedQuoteForNote] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState(null);

  // Contagens exatas por status (aggregation query — não lê os documentos)
  const [statusCounts, setStatusCounts] = useState({
    total: null,
    pending: null,
    approved: null,
    converted: null,
  });

  const cursorRef = useRef(null);
  const autoLoadCountRef = useRef(0);

  const loadPage = useCallback(
    async (cursor) => {
      const constraints = [];
      if (statusFilter !== "all") {
        constraints.push(where("status", "==", statusFilter));
      }
      constraints.push(orderBy("createdAt", "desc"));
      const baseQuery = query(collection(db, "orcamentos-online"), ...constraints);
      const { docs, cursor: nextCursor, hasMore: more } = await fetchPage(baseQuery, {
        pageSize: PAGE_SIZE,
        cursor,
      });
      cursorRef.current = nextCursor;
      setHasMore(more);
      return docs;
    },
    [statusFilter]
  );

  // Fetch quotes (primeiro lote — reinicia sempre que o filtro de status muda)
  const fetchQuotes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      cursorRef.current = null;
      const docs = await loadPage(null);
      setQuotes(docs);
    } catch (err) {
      console.error("Erro ao buscar orçamentos:", err);
      setError("Erro ao carregar orçamentos. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [loadPage]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !cursorRef.current) return;
    setIsLoadingMore(true);
    try {
      const docs = await loadPage(cursorRef.current);
      setQuotes((prev) => [...prev, ...docs]);
    } catch (err) {
      console.error("Erro ao carregar mais orçamentos:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, loadPage]);

  // Contagens totais por status (cheap: aggregation query, não lê os docs)
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const quotesRef = collection(db, "orcamentos-online");
        const [totalSnap, pendingSnap, approvedSnap, convertedSnap] =
          await Promise.all([
            getCountFromServer(quotesRef),
            getCountFromServer(query(quotesRef, where("status", "==", "pending"))),
            getCountFromServer(query(quotesRef, where("status", "==", "approved"))),
            getCountFromServer(query(quotesRef, where("status", "==", "converted"))),
          ]);
        setStatusCounts({
          total: totalSnap.data().count,
          pending: pendingSnap.data().count,
          approved: approvedSnap.data().count,
          converted: convertedSnap.data().count,
        });
      } catch (err) {
        console.error("Erro ao contar orçamentos online:", err);
      }
    };
    fetchCounts();
  }, [statusFilter]);

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Update quote status
  const updateQuoteStatus = async (quoteId, newStatus) => {
    try {
      setIsUpdating(true);
      const quoteRef = doc(db, "orcamentos-online", quoteId);
      await updateDoc(quoteRef, {
        status: newStatus,
        lastUpdate: new Date(),
      });

      // If status is approved or rejected, add admin note
      if (newStatus === "approved" || newStatus === "rejected") {
        await updateDoc(quoteRef, {
          adminNote: `Status alterado para ${
            statusLabels[newStatus].label
          } em ${formatDate(new Date())}`,
        });
      }

      fetchQuotes();
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      setError("Erro ao atualizar status. Por favor, tente novamente.");
    } finally {
      setIsUpdating(false);
    }
  };

  // ✅ FUNÇÃO ATUALIZADA: Convert to parts budget
  const convertToOrder = async (quote) => {
    try {
      setIsUpdating(true);

      // ✅ CRIAR DADOS ESPECÍFICOS PARA ORÇAMENTO DE PEÇAS
      const quoteNumber = await generateDocNumber("orp");
      const partsQuoteData = {
        quoteNumber,
        date: new Date().toISOString().split("T")[0],

        // ✅ CLIENTE NÃO REGISTRADO (mais apropriado para orçamentos online)
        isUnregisteredClient: true,
        unregisteredClient: {
          name: quote.clientInfo.name || "",
          email: quote.clientInfo.email || "",
          phone: quote.clientInfo.phone || "",
          company: quote.clientInfo.company || "",
        },

        // ✅ EQUIPAMENTO MANUAL (genérico para orçamentos de peças)
        manualEquipment: {
          brand: "Diversos",
          model: "Orçamento de Peças",
          serialNumber: "N/A",
        },

        serviceType: "Orçamento de Peças Online",
        status: "Aberto", // Em Análise
        description: `Orçamento online convertido - ID: ${quote.id}`,
        resultDescription: quote.clientInfo?.message || "",
        pontosEmAberto: "",

        // ✅ USAR partsQuoteItems EM VEZ DE items (consistência)
        partsQuoteItems: quote.items.map((item) => ({
          id: item.id || null,
          name: item.name,
          code: item.code,
          quantity: item.quantity,
          price: 0, // Preço inicial 0 para ser definido pelo admin
          imageHash: item.imageHash || null,
          image: item.image || null,
        })),

        // ✅ CONFIGURAÇÕES DE ENVIO E IVA (padrão)
        shippingType: "",
        shippingPrice: 0,
        includeVat: false,
        vatRate: 23,

        // ✅ FLAGS E METADADOS
        isQuote: true, // FLAG PRINCIPAL para orçamentos de peças
        originalQuoteId: quote.id,
        source: "online-quote",

        // ✅ TIMESTAMPS
        createdAt: new Date(),
        lastUpdated: new Date(),
      };

      // Adicionar à coleção de ordens (será capturado pelo ManagePartsBudgets)
      await setDoc(doc(collection(db, "ordens")), partsQuoteData);

      // Atualizar status do orçamento online
      await updateQuoteStatus(quote.id, "converted");

      setShowDetailModal(false);
      alert("Orçamento convertido em orçamento de peças com sucesso!");
    } catch (err) {
      console.error("Erro ao converter em orçamento de peças:", err);
      setError("Erro ao converter orçamento. Por favor, tente novamente.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter quotes (pesquisa insensível a acentos, sobre o que já está carregado)
  const filteredQuotes = quotes.filter((quote) => {
    return (
      searchIncludes(quote.clientInfo?.name, searchTerm) ||
      searchIncludes(quote.clientInfo?.email, searchTerm) ||
      searchIncludes(quote.clientInfo?.company, searchTerm)
    );
  });

  // Ao pesquisar, os resultados só existem dentro do que já foi carregado —
  // por isso, se houver poucos resultados e ainda houver mais orçamentos
  // por trás, vamos buscando lotes extra automaticamente.
  useEffect(() => {
    autoLoadCountRef.current = 0;
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (
      searchTerm &&
      hasMore &&
      !isLoadingMore &&
      !isLoading &&
      filteredQuotes.length < PAGE_SIZE &&
      autoLoadCountRef.current < MAX_AUTO_LOADS
    ) {
      autoLoadCountRef.current += 1;
      loadMore();
    }
  }, [searchTerm, filteredQuotes.length, hasMore, isLoadingMore, isLoading, loadMore]);

  // View details
  const viewDetails = (quote) => {
    setSelectedQuote(quote);
    setShowDetailModal(true);
  };

  // Handle note submission
  const handleSubmitNote = async () => {
    if (!selectedQuoteForNote || !currentNote.trim()) return;

    try {
      setIsUpdating(true);
      const quoteRef = doc(db, "orcamentos-online", selectedQuoteForNote.id);

      // Get current quote data
      const currentQuote = quotes.find((q) => q.id === selectedQuoteForNote.id);
      const existingNotes = currentQuote?.adminNotes || [];

      // Add new note with timestamp
      const newNote = {
        text: currentNote,
        timestamp: new Date(),
        adminName: user?.displayName || "Administrador",
      };

      await updateDoc(quoteRef, {
        adminNotes: [...existingNotes, newNote],
        lastUpdate: new Date(),
      });

      setNoteDialogOpen(false);
      setCurrentNote("");
      setSelectedQuoteForNote(null);
      fetchQuotes();
    } catch (err) {
      console.error("Erro ao adicionar nota:", err);
      setError("Erro ao adicionar nota. Por favor, tente novamente.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete quote
  const confirmDeleteQuote = (quote) => {
    setQuoteToDelete(quote);
    setDeleteDialogOpen(true);
  };

  const deleteQuote = async () => {
    if (!quoteToDelete) return;

    try {
      setIsUpdating(true);
      await deleteDoc(doc(db, "orcamentos-online", quoteToDelete.id));
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
      fetchQuotes();
    } catch (err) {
      console.error("Erro ao excluir orçamento:", err);
      setError("Erro ao excluir orçamento. Por favor, tente novamente.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="bg-zinc-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Orçamentos Online
            </h1>
            <p className="text-sm sm:text-base text-zinc-400">
              Gerencie os pedidos de orçamento recebidos pela loja online
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Pendentes</p>
              <h3 className="text-xl sm:text-2xl font-bold text-yellow-500 mt-1 sm:mt-2">
                {statusCounts.pending === null ? "…" : statusCounts.pending}
              </h3>
            </div>
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Aprovados</p>
              <h3 className="text-xl sm:text-2xl font-bold text-green-500 mt-1 sm:mt-2">
                {statusCounts.approved === null ? "…" : statusCounts.approved}
              </h3>
            </div>
            <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Convertidos</p>
              <h3 className="text-xl sm:text-2xl font-bold text-blue-500 mt-1 sm:mt-2">
                {statusCounts.converted === null ? "…" : statusCounts.converted}
              </h3>
            </div>
            <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Total</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {statusCounts.total === null ? "…" : statusCounts.total}
              </h3>
            </div>
            <Tag className="h-6 w-6 sm:h-8 sm:w-8 text-zinc-400" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Buscar por nome, email ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem
                  value="all"
                  className="text-white hover:bg-zinc-700"
                >
                  Todos os Status
                </SelectItem>
                <SelectItem
                  value="pending"
                  className="text-white hover:bg-zinc-700"
                >
                  Pendente
                </SelectItem>
                <SelectItem
                  value="approved"
                  className="text-white hover:bg-zinc-700"
                >
                  Aprovado
                </SelectItem>
                <SelectItem
                  value="rejected"
                  className="text-white hover:bg-zinc-700"
                >
                  Rejeitado
                </SelectItem>
                <SelectItem
                  value="converted"
                  className="text-white hover:bg-zinc-700"
                >
                  Convertido
                </SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={fetchQuotes}
              className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>

          <p className="text-xs text-zinc-500">
            {filteredQuotes.length} orçamento(s) carregado(s)
            {hasMore && " — há mais por carregar"}
          </p>

          {error && (
            <Alert
              variant="destructive"
              className="border-red-500 bg-red-500/10"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Quotes List */}
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        </div>
      ) : filteredQuotes.length === 0 ? (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2 text-white">
              Nenhum orçamento encontrado
            </p>
            <p className="text-zinc-400">
              Os orçamentos solicitados na loja online aparecerão aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredQuotes.map((quote) => (
            <Card key={quote.id} className="bg-zinc-800 border-zinc-700">
              <Collapsible>
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white">
                              {quote.clientInfo?.name || "Cliente"}
                            </h3>
                            <Badge
                              className={`bg-${
                                statusLabels[quote.status]?.color
                              }-500/10 text-${
                                statusLabels[quote.status]?.color
                              }-500`}
                            >
                              {statusLabels[quote.status]?.label ||
                                quote.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-zinc-400">
                            {quote.clientInfo?.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <p className="text-sm text-zinc-400">
                        {formatDate(quote.createdAt)}
                      </p>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-zinc-400 hover:text-white"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="p-4 border-t border-zinc-700">
                    <div className="space-y-4">
                      {/* Client Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-zinc-300">
                            Informações do Cliente
                          </h4>
                          <div className="space-y-1">
                            <p className="text-sm text-zinc-400 flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              {quote.clientInfo?.email}
                            </p>
                            {quote.clientInfo?.phone && (
                              <p className="text-sm text-zinc-400 flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                {quote.clientInfo.phone}
                              </p>
                            )}
                            {quote.clientInfo?.company && (
                              <p className="text-sm text-zinc-400 flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                {quote.clientInfo.company}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-zinc-300">
                            Detalhes do Pedido
                          </h4>
                          <div className="space-y-1">
                            <p className="text-sm text-zinc-400">
                              {quote.items?.length || 0} item(s)
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-zinc-300">
                          Itens
                        </h4>
                        <div className="space-y-2">
                          {quote.items?.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-4 p-2 bg-zinc-700/30 rounded"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium text-white">
                                  {item.name}
                                </p>
                                <p className="text-sm text-zinc-400">
                                  Código: {item.code}
                                </p>
                              </div>
                              <p className="text-sm text-zinc-400">
                                Quantidade: {item.quantity}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-zinc-600 text-zinc-600 hover:bg-zinc-700"
                          onClick={() => viewDetails(quote)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </Button>

                        {quote.status === "pending" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-green-600 text-white hover:bg-green-500/20 bg-green-600"
                              onClick={() =>
                                updateQuoteStatus(quote.id, "approved")
                              }
                              disabled={isUpdating}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Aprovar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-600 text-white hover:bg-red-500/20 bg-red-600"
                              onClick={() =>
                                updateQuoteStatus(quote.id, "rejected")
                              }
                              disabled={isUpdating}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Rejeitar
                            </Button>
                          </>
                        )}

                        {(quote.status === "approved" ||
                          quote.status === "pending") && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-600 text-white hover:bg-blue-500/20 bg-blue-600"
                            onClick={() => convertToOrder(quote)}
                            disabled={isUpdating}
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Converter em Orçamento de Peças
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="border-zinc-600 text-white hover:bg-zinc-700 bg-zinc-600"
                          onClick={() => {
                            setSelectedQuoteForNote(quote);
                            setNoteDialogOpen(true);
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Adicionar Nota
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-zinc-400 hover:bg-zinc-600"
                            >
                              Status
                              <ChevronDown className="h-4 w-4 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-zinc-800 border-zinc-700">
                            {Object.entries(statusLabels).map(
                              ([status, { label }]) => (
                                <DropdownMenuItem
                                  key={status}
                                  className="text-white hover:bg-zinc-700"
                                  onClick={() =>
                                    updateQuoteStatus(quote.id, status)
                                  }
                                  disabled={
                                    quote.status === status || isUpdating
                                  }
                                >
                                  {label}
                                </DropdownMenuItem>
                              )
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          onClick={() => confirmDeleteQuote(quote)}
                          disabled={isUpdating}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      {/* Carregar mais */}
      {hasMore && !isLoading && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800 gap-2"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A carregar...
              </>
            ) : (
              <>
                <ArrowDown className="h-4 w-4" />
                Carregar mais
              </>
            )}
          </Button>
        </div>
      )}

      {/* Quote Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-white max-w-3xl">
          {selectedQuote && (
            <>
              <DialogHeader>
                <DialogTitle>Detalhes do Orçamento</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Informações completas do pedido de orçamento
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Client Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Informações do Cliente
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-700/50 p-4 rounded-lg">
                    <div>
                      <label className="text-sm text-zinc-400">Nome</label>
                      <p className="text-white">
                        {selectedQuote.clientInfo?.name}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400">Email</label>
                      <p className="text-white">
                        {selectedQuote.clientInfo?.email}
                      </p>
                    </div>
                    {selectedQuote.clientInfo?.phone && (
                      <div>
                        <label className="text-sm text-zinc-400">
                          Telefone
                        </label>
                        <p className="text-white">
                          {selectedQuote.clientInfo.phone}
                        </p>
                      </div>
                    )}
                    {selectedQuote.clientInfo?.company && (
                      <div>
                        <label className="text-sm text-zinc-400">Empresa</label>
                        <p className="text-white">
                          {selectedQuote.clientInfo.company}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Itens do Pedido
                  </h3>
                  <div className="space-y-3">
                    {selectedQuote.items?.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center bg-zinc-700/50 p-4 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-white">{item.name}</p>
                          <p className="text-sm text-zinc-400">
                            Código: {item.code}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white">
                            Quantidade: {item.quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Message */}
                {selectedQuote.clientInfo?.message && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Mensagem</h3>
                    <div className="bg-zinc-700/50 p-4 rounded-lg">
                      <p className="text-white whitespace-pre-wrap">
                        {selectedQuote.clientInfo.message}
                      </p>
                    </div>
                  </div>
                )}

                {/* Admin Notes */}
                {selectedQuote.adminNotes?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Notas do Administrador
                    </h3>
                    <div className="space-y-2">
                      {selectedQuote.adminNotes.map((note, index) => (
                        <div
                          key={index}
                          className="bg-zinc-700/50 p-4 rounded-lg"
                        >
                          <p className="text-white">{note.text}</p>
                          <p className="text-sm text-zinc-400 mt-1">
                            {note.adminName} - {formatDate(note.timestamp)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailModal(false)}
                  className="border-zinc-600 text-white hover:bg-zinc-700 bg-zinc-600"
                >
                  Fechar
                </Button>

                {selectedQuote.status === "pending" && (
                  <>
                    <Button
                      onClick={() => {
                        updateQuoteStatus(selectedQuote.id, "approved");
                        setShowDetailModal(false);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={isUpdating}
                    >
                      Aprovar
                    </Button>
                    <Button
                      onClick={() => {
                        updateQuoteStatus(selectedQuote.id, "rejected");
                        setShowDetailModal(false);
                      }}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isUpdating}
                    >
                      Rejeitar
                    </Button>
                  </>
                )}

                {(selectedQuote.status === "approved" ||
                  selectedQuote.status === "pending") && (
                  <Button
                    onClick={() => {
                      convertToOrder(selectedQuote);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={isUpdating}
                  >
                    Converter em Orçamento de Peças
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle>Adicionar Nota</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Adicione uma nota interna para este orçamento
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <textarea
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              className="w-full h-32 p-3 rounded-md border border-zinc-600 bg-zinc-700 text-white"
              placeholder="Digite sua nota aqui..."
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNoteDialogOpen(false)}
              className="border-zinc-600 text-white hover:bg-zinc-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitNote}
              className="bg-green-600 hover:bg-green-700"
              disabled={!currentNote.trim() || isUpdating}
            >
              Salvar Nota
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Quote Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem a certeza que deseja excluir o orçamento de{" "}
              <span className="font-semibold text-white">
                {quoteToDelete?.clientInfo?.name || "Cliente"}
              </span>
              ? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setQuoteToDelete(null);
              }}
              className="border-zinc-600 text-white hover:bg-zinc-700 bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={deleteQuote}
              disabled={isUpdating}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageOnlineQuotes;
