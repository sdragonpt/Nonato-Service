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
  MessageSquare,
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

const ManageOnlineQuotes = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState("");
  const [selectedQuoteForNote, setSelectedQuoteForNote] = useState(null);

  // Quote status labels
  const statusLabels = {
    pending: { label: "Pendente", color: "yellow" },
    approved: { label: "Aprovado", color: "green" },
    rejected: { label: "Rejeitado", color: "red" },
    converted: { label: "Convertido", color: "blue" },
  };

  // Fetch quotes
  const fetchQuotes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let q = query(
        collection(db, "orcamentos-online"),
        orderBy("createdAt", "desc")
      );

      if (statusFilter !== "all") {
        q = query(
          collection(db, "orcamentos-online"),
          where("status", "==", statusFilter),
          orderBy("createdAt", "desc")
        );
      }

      const snapshot = await getDocs(q);
      const quotesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setQuotes(quotesData);
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

  // Convert to order
  // ManageOnlineQuotes.jsx - Atualizar a função convertToOrder

  const convertToOrder = async (quote) => {
    try {
      setIsUpdating(true);

      // Criar dados da nova ordem
      const orderData = {
        date: new Date().toISOString().split("T")[0],
        clientInfo: quote.clientInfo,
        // Criar um novo "cliente" para compatibilidade com ordens
        clientName: quote.clientInfo.name,
        clientId: null, // Será preenchido se encontrarmos o cliente no sistema
        equipment: {
          brand: "Diversos",
          model: "Diversos",
          serialNumber: "N/A",
        },
        equipmentId: null,
        serviceType: "Orçamento", // Sempre orçamento
        priority: "normal",
        description: `Orçamento online #${quote.id}`,
        status: "Aberto",
        resultDescription: "",
        pontosEmAberto: "",
        source: "online-quote",
        originalQuoteId: quote.id,
        items: quote.items, // Manter os items do orçamento
        isQuote: true, // Flag para identificar como orçamento
        checklist: {
          concluido: false,
          retorno: false,
          funcionarios: false,
          documentacao: false,
          producao: false,
          pecas: false,
        },
        createdAt: new Date(),
        lastUpdated: new Date(),
        type: "online-order",
      };

      // Tentar encontrar o cliente existente
      const clientsSnapshot = await getDocs(collection(db, "clientes"));
      const existingClient = clientsSnapshot.docs.find(
        (doc) =>
          doc.data().email?.toLowerCase() ===
          quote.clientInfo.email?.toLowerCase()
      );

      if (existingClient) {
        orderData.clientId = existingClient.id;
      }

      // Adicionar à coleção de ordens
      await setDoc(doc(collection(db, "ordens")), orderData);

      // Atualizar status do orçamento
      await updateQuoteStatus(quote.id, "converted");

      setShowDetailModal(false);
      alert("Orçamento convertido em ordem de serviço com sucesso!");
    } catch (err) {
      console.error("Erro ao converter em ordem:", err);
      setError("Erro ao converter orçamento. Por favor, tente novamente.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter quotes
  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch =
      quote.clientInfo?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      quote.clientInfo?.email
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      quote.clientInfo?.company
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

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
        adminName: "Admin", // You might want to use actual admin name
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
  const deleteQuote = async (quoteId) => {
    if (!confirm("Tem certeza que deseja excluir este orçamento?")) return;

    try {
      setIsUpdating(true);
      await deleteDoc(doc(db, "orcamentos-online", quoteId));
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
                {quotes.filter((q) => q.status === "pending").length}
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
                {quotes.filter((q) => q.status === "approved").length}
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
                {quotes.filter((q) => q.status === "converted").length}
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
                {quotes.length}
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
                            Converter em Ordem
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
                    Converter em Ordem
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
    </div>
  );
};

export default ManageOnlineQuotes;
