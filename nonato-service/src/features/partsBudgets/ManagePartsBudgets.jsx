import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Loader2,
  AlertTriangle,
  Eye,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  ChevronDown,
  Mail,
  Phone,
  Building2,
  ShoppingCart,
  Tag,
  Calendar,
  Trash2,
  Calculator,
  Package2,
  Euro,
  Edit,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

const ManagePartsBudgets = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [clients, setClients] = useState({});
  const [equipments, setEquipments] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // ✅ NOVOS ESTADOS PARA PAGINAÇÃO
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Itens por página

  // Missing state variables for note dialog
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState("");
  const [selectedQuoteForNote, setSelectedQuoteForNote] = useState(null);

  // Quote status labels (baseado no status da ordem)
  const statusLabels = {
    Aberto: { label: "Em Análise", color: "yellow" },
    "Em Andamento": { label: "Em Andamento", color: "blue" },
    Fechado: { label: "Concluído", color: "green" },
  };

  // Fetch converted quotes (ordens com isQuote: true)
  const fetchQuotes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [ordersSnapshot, clientsSnapshot, equipmentsSnapshot] =
        await Promise.all([
          getDocs(collection(db, "ordens")),
          getDocs(collection(db, "clientes")),
          getDocs(collection(db, "equipamentos")),
        ]);

      // Filtrar apenas orçamentos convertidos (isQuote: true)
      const quotesData = ordersSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((order) => order.isQuote === true)
        // ✅ ORDENAÇÃO MAIS PRECISA: Das mais recentes para mais antigas
        .sort((a, b) => {
          const dateA = new Date(
            a.createdAt?.toDate?.() || a.createdAt || a.date
          );
          const dateB = new Date(
            b.createdAt?.toDate?.() || b.createdAt || b.date
          );
          return dateB - dateA; // Ordem decrescente (mais recente primeiro)
        });

      const clientsData = clientsSnapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = { id: doc.id, ...doc.data() };
        return acc;
      }, {});

      const equipmentsData = equipmentsSnapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = { id: doc.id, ...doc.data() };
        return acc;
      }, {});

      setQuotes(quotesData);
      setClients(clientsData);
      setEquipments(equipmentsData);
    } catch (err) {
      console.error("Erro ao buscar orçamentos:", err);
      setError("Erro ao carregar orçamentos. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // ✅ FUNÇÃO PARA FILTRAR E PAGINAR
  const getFilteredAndPaginatedQuotes = () => {
    // Primeiro filtrar
    const filtered = quotes.filter((quote) => {
      const clientName = quote.isUnregisteredClient
        ? quote.unregisteredClient?.name || ""
        : clients[quote.clientId]?.name || quote.clientName || "";

      const matchesSearch =
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || quote.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Calcular total de páginas (SEM setState)
    const totalPagesCalculated = Math.ceil(filtered.length / itemsPerPage);

    // Aplicar paginação
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    return {
      paginatedQuotes: filtered.slice(startIndex, endIndex),
      totalFiltered: filtered.length,
      totalPages: totalPagesCalculated, // ✅ Retorna direto, sem setState
    };
  };

  // ✅ RESETAR PÁGINA QUANDO FILTROS MUDAM
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // ✅ FUNÇÕES DE PAGINAÇÃO
  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  // ✅ GERAR NÚMEROS DE PÁGINA VISÍVEIS
  const getVisiblePageNumbers = () => {
    const delta = 2; // Quantas páginas mostrar de cada lado
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots.filter(
      (item, index, arr) => arr.indexOf(item) === index
    );
  };

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

  // Format price
  const formatPrice = (price) => {
    return `€ ${parseFloat(price || 0).toFixed(2)}`;
  };

  // Update quote status
  const updateQuoteStatus = async (quoteId, newStatus) => {
    try {
      setIsUpdating(true);
      const quoteRef = doc(db, "ordens", quoteId);
      await updateDoc(quoteRef, {
        status: newStatus,
        lastUpdated: new Date(),
      });

      fetchQuotes();
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      setError("Erro ao atualizar status. Por favor, tente novamente.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Edit quote (redirect to edit part budget)
  const editQuote = (quote) => {
    navigate(`/app/edit-part-budget/${quote.id}`);
  };

  // Convert to order function
  const convertToOrder = async (quote) => {
    try {
      setIsUpdating(true);

      // Navigate to create order with quote data
      navigate("/app/create-service-order", {
        state: {
          fromQuote: true,
          quoteData: quote,
        },
      });
    } catch (err) {
      console.error("Erro ao converter para ordem:", err);
      setError("Erro ao converter para ordem de serviço.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle submit note
  const handleSubmitNote = async () => {
    if (!currentNote.trim() || !selectedQuoteForNote) return;

    try {
      setIsUpdating(true);
      const quoteRef = doc(db, "ordens", selectedQuoteForNote.id);

      const newNote = {
        text: currentNote.trim(),
        timestamp: new Date(),
        adminName: "Admin",
      };

      const updatedAdminNotes = [
        ...(selectedQuoteForNote.adminNotes || []),
        newNote,
      ];

      await updateDoc(quoteRef, {
        adminNotes: updatedAdminNotes,
        lastUpdated: new Date(),
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

  // Open note dialog
  const openNoteDialog = (quote) => {
    setSelectedQuoteForNote(quote);
    setCurrentNote("");
    setNoteDialogOpen(true);
  };

  // View details
  const viewDetails = (quote) => {
    navigate(`/app/part-budget-detail/${quote.id}`);
  };

  // Delete quote
  const deleteQuote = async (quoteId) => {
    if (!confirm("Tem certeza que deseja excluir este orçamento?")) return;

    try {
      setIsUpdating(true);
      await deleteDoc(doc(db, "ordens", quoteId));
      fetchQuotes();
    } catch (err) {
      console.error("Erro ao excluir orçamento:", err);
      setError("Erro ao excluir orçamento. Por favor, tente novamente.");
    } finally {
      setIsUpdating(false);
    }
  };

  // ✅ OBTER DADOS PAGINADOS
  const { paginatedQuotes, totalFiltered, totalPages } =
    getFilteredAndPaginatedQuotes();

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="bg-zinc-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Orçamento de Peças
            </h1>
            <p className="text-sm sm:text-base text-zinc-400">
              Gerencie os pedidos de orçamento de peças recebidos pela loja
              online
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Em Análise</p>
              <h3 className="text-xl sm:text-2xl font-bold text-yellow-500 mt-1 sm:mt-2">
                {quotes.filter((q) => q.status === "Aberto").length}
              </h3>
            </div>
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Em Andamento</p>
              <h3 className="text-xl sm:text-2xl font-bold text-blue-500 mt-1 sm:mt-2">
                {quotes.filter((q) => q.status === "Em Andamento").length}
              </h3>
            </div>
            <Package2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Concluídos</p>
              <h3 className="text-xl sm:text-2xl font-bold text-green-500 mt-1 sm:mt-2">
                {quotes.filter((q) => q.status === "Fechado").length}
              </h3>
            </div>
            <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Total</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {quotes.length}
              </h3>
            </div>
            <Calculator className="h-6 w-6 sm:h-8 sm:w-8 text-zinc-400" />
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

            <Button
              variant="outline"
              onClick={fetchQuotes}
              className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>

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

          {/* ✅ INFORMAÇÕES DE PAGINAÇÃO */}
          {totalFiltered > 0 && (
            <div className="flex items-center justify-between text-sm text-zinc-400">
              <span>
                Mostrando{" "}
                {Math.min((currentPage - 1) * itemsPerPage + 1, totalFiltered)}{" "}
                - {Math.min(currentPage * itemsPerPage, totalFiltered)} de{" "}
                {totalFiltered} orçamentos
              </span>
              <span>
                Página {currentPage} de {totalPages}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quotes List */}
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        </div>
      ) : paginatedQuotes.length === 0 ? (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-8 text-center">
            <Calculator className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2 text-white">
              Nenhum orçamento encontrado
            </p>
            <p className="text-zinc-400">
              {searchTerm || statusFilter !== "all"
                ? "Tente ajustar os filtros de pesquisa"
                : "Os orçamentos de peças solicitados na loja online aparecerão aqui"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Lista de orçamentos */}
          <div className="space-y-4">
            {paginatedQuotes.map((quote) => (
              <Card key={quote.id} className="bg-zinc-800 border-zinc-700">
                <Collapsible>
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-white">
                                {quote.isUnregisteredClient
                                  ? quote.unregisteredClient?.name || "Cliente"
                                  : clients[quote.clientId]?.name ||
                                    quote.clientName ||
                                    "Cliente"}
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
                              {quote.originalQuoteId && (
                                <Badge className="bg-blue-500/10 text-blue-400">
                                  Online
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-zinc-400">
                              {quote.isUnregisteredClient
                                ? quote.unregisteredClient?.email
                                : clients[quote.clientId]?.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <p className="text-sm text-zinc-400">
                          {formatDate(quote.createdAt || quote.date)}
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
                                {quote.isUnregisteredClient
                                  ? quote.unregisteredClient?.email
                                  : clients[quote.clientId]?.email}
                              </p>
                              {(quote.isUnregisteredClient
                                ? quote.unregisteredClient?.phone
                                : clients[quote.clientId]?.phone) && (
                                <p className="text-sm text-zinc-400 flex items-center gap-2">
                                  <Phone className="h-4 w-4" />
                                  {quote.isUnregisteredClient
                                    ? quote.unregisteredClient.phone
                                    : clients[quote.clientId].phone}
                                </p>
                              )}
                              {(quote.isUnregisteredClient
                                ? quote.unregisteredClient?.company
                                : clients[quote.clientId]?.company) && (
                                <p className="text-sm text-zinc-400 flex items-center gap-2">
                                  <Building2 className="h-4 w-4" />
                                  {quote.isUnregisteredClient
                                    ? quote.unregisteredClient.company
                                    : clients[quote.clientId].company}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-zinc-300">
                              Detalhes do Orçamento
                            </h4>
                            <div className="space-y-1">
                              <p className="text-sm text-zinc-400">
                                {(quote.partsQuoteItems || quote.items)
                                  ?.length || 0}{" "}
                                item(s)
                              </p>
                              <p className="text-sm text-zinc-400">
                                Tipo: {quote.serviceType}
                              </p>
                              {quote.originalQuoteId && (
                                <p className="text-sm text-zinc-400">
                                  ID Original:{" "}
                                  {quote.originalQuoteId.substring(0, 8)}...
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Items Preview */}
                        {(quote.partsQuoteItems || quote.items) &&
                          (quote.partsQuoteItems || quote.items).length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-zinc-300">
                                Itens do Orçamento
                              </h4>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {(quote.partsQuoteItems || quote.items)
                                  .slice(0, 3)
                                  .map((item, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center justify-between p-2 bg-zinc-700/30 rounded text-sm"
                                    >
                                      <div className="flex-1">
                                        <span className="text-white font-medium">
                                          {item.name}
                                        </span>
                                        <span className="text-zinc-400 ml-2">
                                          (Cód: {item.code})
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-zinc-400">
                                          Qtd: {item.quantity}
                                        </span>
                                        {item.price > 0 && (
                                          <div className="text-green-400 font-medium">
                                            {formatPrice(
                                              item.price * item.quantity
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                {(quote.partsQuoteItems || quote.items).length >
                                  3 && (
                                  <p className="text-xs text-zinc-500 text-center">
                                    +
                                    {(quote.partsQuoteItems || quote.items)
                                      .length - 3}{" "}
                                    item(s) adicional(is)
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-zinc-600 text-zinc-400 hover:bg-zinc-700"
                            onClick={() => viewDetails(quote)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-600 text-white hover:bg-blue-500/20 bg-blue-600"
                            onClick={() => editQuote(quote)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Definir Preços
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="border-zinc-600 text-zinc-400 hover:bg-zinc-700"
                            onClick={() => openNoteDialog(quote)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
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
                            onClick={() => deleteQuote(quote.id)}
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

          {/* ✅ CONTROLES DE PAGINAÇÃO */}
          {totalPages > 1 && (
            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="border-zinc-700 text-white hover:bg-zinc-700 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    {getVisiblePageNumbers().map((pageNum, index) =>
                      pageNum === "..." ? (
                        <span key={index} className="px-3 py-1 text-zinc-400">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={index}
                          variant={
                            currentPage === pageNum ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => goToPage(pageNum)}
                          className={`
                            ${
                              currentPage === pageNum
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "border-zinc-700 text-white hover:bg-zinc-700"
                            }
                          `}
                        >
                          {pageNum}
                        </Button>
                      )
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className="border-zinc-700 text-white hover:bg-zinc-700 disabled:opacity-50"
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Quote Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-white max-w-3xl">
          {selectedQuote && (
            <>
              <DialogHeader>
                <DialogTitle>Detalhes do Orçamento de Peças</DialogTitle>
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
                        {selectedQuote.isUnregisteredClient
                          ? selectedQuote.unregisteredClient?.name
                          : clients[selectedQuote.clientId]?.name}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400">Email</label>
                      <p className="text-white">
                        {selectedQuote.isUnregisteredClient
                          ? selectedQuote.unregisteredClient?.email
                          : clients[selectedQuote.clientId]?.email}
                      </p>
                    </div>
                    {(selectedQuote.isUnregisteredClient
                      ? selectedQuote.unregisteredClient?.phone
                      : clients[selectedQuote.clientId]?.phone) && (
                      <div>
                        <label className="text-sm text-zinc-400">
                          Telefone
                        </label>
                        <p className="text-white">
                          {selectedQuote.isUnregisteredClient
                            ? selectedQuote.unregisteredClient.phone
                            : clients[selectedQuote.clientId].phone}
                        </p>
                      </div>
                    )}
                    {(selectedQuote.isUnregisteredClient
                      ? selectedQuote.unregisteredClient?.company
                      : clients[selectedQuote.clientId]?.company) && (
                      <div>
                        <label className="text-sm text-zinc-400">Empresa</label>
                        <p className="text-white">
                          {selectedQuote.isUnregisteredClient
                            ? selectedQuote.unregisteredClient.company
                            : clients[selectedQuote.clientId].company}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Peças Solicitadas
                  </h3>
                  <div className="space-y-3">
                    {(
                      selectedQuote.partsQuoteItems || selectedQuote.items
                    )?.map((item, index) => (
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
                          {item.price > 0 && (
                            <p className="text-green-400 font-medium">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Message */}
                {selectedQuote.resultDescription && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Observações</h3>
                    <div className="bg-zinc-700/50 p-4 rounded-lg">
                      <p className="text-white whitespace-pre-wrap">
                        {selectedQuote.resultDescription}
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

                <Button
                  onClick={() => {
                    setShowDetailModal(false);
                    editQuote(selectedQuote);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isUpdating}
                >
                  Definir Preços
                </Button>
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
              className="w-full h-32 p-3 rounded-md border border-zinc-600 bg-zinc-700 text-white placeholder:text-zinc-400"
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
    </div>
  );
};

export default ManagePartsBudgets;
