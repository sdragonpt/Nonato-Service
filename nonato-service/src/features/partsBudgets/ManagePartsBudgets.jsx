// src/features/partsBudgets/ManagePartsBudgets.jsx - ✅ CORRIGIDO
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  Search,
  Plus,
  Loader2,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle2,
  Calculator,
  AlertTriangle,
  Package,
  ChevronLeft,
  ChevronRight,
  FileText,
  ArrowLeft, // ✅ NOVO: Para voltar atrás
  Undo2, // ✅ NOVO: Para voltar atrás
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
} from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

const ManagePartsBudgets = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [clients, setClients] = useState({}); // ✅ NOVO: Para clientes registrados
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedQuoteForNote, setSelectedQuoteForNote] = useState(null);
  const [currentNote, setCurrentNote] = useState("");
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState(null);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchQuotes = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // ✅ BUSCAR ORÇAMENTOS E CLIENTES EM PARALELO
      const [quotesSnapshot, clientsSnapshot] = await Promise.all([
        getDocs(
          query(
            collection(db, "ordens"),
            where("isQuote", "==", true),
            orderBy("createdAt", "desc")
          )
        ),
        getDocs(collection(db, "clientes")),
      ]);

      const quotesData = quotesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // ✅ NOVO: Mapear clientes por ID para acesso rápido
      const clientsData = clientsSnapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = { id: doc.id, ...doc.data() };
        return acc;
      }, {});

      setQuotes(quotesData);
      setClients(clientsData);
    } catch (err) {
      console.error("Erro ao buscar orçamentos:", err);
      setError("Erro ao carregar orçamentos. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  // ✅ NOVO: Função para obter dados do cliente (registrado ou não)
  const getClientData = (quote) => {
    if (quote.isUnregisteredClient) {
      return {
        name: quote.unregisteredClient?.name || "Cliente não informado",
        email: quote.unregisteredClient?.email || "",
        phone: quote.unregisteredClient?.phone || "",
        company: quote.unregisteredClient?.company || "",
        profilePic: null, // Cliente não registrado não tem foto
      };
    } else if (quote.clientId && clients[quote.clientId]) {
      const client = clients[quote.clientId];
      return {
        name: client.name || "Cliente não informado",
        email: client.email || "",
        phone: client.phone || "",
        company: client.company || "",
        profilePic: client.profilePic || null, // ✅ NOVO: Usar imagem se disponível
      };
    }
    return {
      name: "Cliente não informado",
      email: "",
      phone: "",
      company: "",
      profilePic: null,
    };
  };

  // Filtrar e paginar orçamentos
  const getFilteredAndPaginatedQuotes = () => {
    let filteredQuotes = quotes.filter((quote) => {
      const clientData = getClientData(quote);

      const matchesSearch =
        quote.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientData.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.serviceType?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || quote.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    const totalFiltered = filteredQuotes.length;
    const totalPages = Math.ceil(totalFiltered / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedQuotes = filteredQuotes.slice(
      startIndex,
      startIndex + itemsPerPage
    );

    return {
      paginatedQuotes,
      totalFiltered,
      totalPages,
    };
  };

  // ✅ NOVO: Update quote status com possibilidade de voltar atrás
  const updateQuoteStatus = async (quoteId, newStatus) => {
    try {
      setIsUpdating(true);
      await updateDoc(doc(db, "ordens", quoteId), {
        status: newStatus,
        lastUpdated: new Date(),
      });

      // Atualizar lista local
      setQuotes((prev) =>
        prev.map((quote) =>
          quote.id === quoteId
            ? { ...quote, status: newStatus, lastUpdated: new Date() }
            : quote
        )
      );
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      setError("Erro ao atualizar status. Por favor, tente novamente.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Add note to quote
  const addNoteToQuote = async () => {
    try {
      setIsUpdating(true);
      await updateDoc(doc(db, "ordens", selectedQuoteForNote.id), {
        adminNote: currentNote,
        lastUpdated: new Date(),
      });

      setQuotes((prev) =>
        prev.map((quote) =>
          quote.id === selectedQuoteForNote.id
            ? { ...quote, adminNote: currentNote, lastUpdated: new Date() }
            : quote
        )
      );

      setNoteDialogOpen(false);
      setCurrentNote("");
      setSelectedQuoteForNote(null);
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
    setCurrentNote(quote.adminNote || "");
    setNoteDialogOpen(true);
  };

  // View details
  const viewDetails = (quote) => {
    navigate(`/app/part-budget-detail/${quote.id}`);
  };

  // Edit quote
  const editQuote = (quote) => {
    navigate(`/app/edit-part-budget/${quote.id}`);
  };

  // Delete quote
  const deleteQuote = async () => {
    if (!quoteToDelete) return;

    try {
      setIsUpdating(true);
      await deleteDoc(doc(db, "ordens", quoteToDelete.id));
      setQuotes((prev) =>
        prev.filter((quote) => quote.id !== quoteToDelete.id)
      );
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
    } catch (err) {
      console.error("Erro ao excluir orçamento:", err);
      setError("Erro ao excluir orçamento. Por favor, tente novamente.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Format price
  const formatPrice = (price) => {
    return `€ ${parseFloat(price || 0).toFixed(2)}`;
  };

  // Calculate quote total
  const calculateQuoteTotal = (quote) => {
    const itemsTotal = (quote.partsQuoteItems || []).reduce((total, item) => {
      const basePrice = item.price || 0;
      const quantity = item.quantity || 1;

      // Aplicar margem se existir
      const priceWithMargin = quote.profitMargin
        ? basePrice * (1 + quote.profitMargin / 100)
        : basePrice;

      return total + quantity * priceWithMargin;
    }, 0);

    const shipping = parseFloat(quote.shippingPrice) || 0;
    const totalBeforeVat = itemsTotal + shipping;

    if (quote.includeVat) {
      const vatAmount = (totalBeforeVat * (quote.vatRate || 23)) / 100;
      return totalBeforeVat + vatAmount;
    }

    return totalBeforeVat;
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("pt-PT");
  };

  // Get initials for avatar
  const getInitials = (name) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "??"
    );
  };

  // Pagination
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const { paginatedQuotes, totalFiltered, totalPages } =
    getFilteredAndPaginatedQuotes();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Orçamento de Peças
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Gerencie os orçamentos de peças da loja online e criados diretamente
          </p>
        </div>

        {/* ✅ NOVO BOTÃO PARA CRIAR ORÇAMENTO */}
        <Button
          onClick={() => navigate("/app/add-part-budget")}
          className="bg-green-600 hover:bg-green-700 text-white border-0 shadow-md"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Orçamento
        </Button>
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
            <Calculator className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
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
            <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
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
            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-zinc-400" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Pesquisar orçamentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-400"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-zinc-700 border-zinc-600 text-white hover:bg-zinc-600 hover:border-zinc-500">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-600 shadow-lg">
                  <SelectItem
                    value="all"
                    className="text-white hover:bg-zinc-700 hover:text-white focus:bg-zinc-700 focus:text-white"
                  >
                    Todos
                  </SelectItem>
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

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-700">
            <span className="text-sm text-zinc-400">
              {totalFiltered} orçamento(s) encontrado(s) - Página {currentPage}{" "}
              de {totalPages || 1}
            </span>
          </div>

          {error && (
            <Alert
              variant="destructive"
              className="mt-4 border-red-500 bg-red-500/10"
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
      <div className="space-y-4">
        {paginatedQuotes.map((quote) => {
          const clientData = getClientData(quote); // ✅ NOVO: Dados unificados do cliente

          return (
            <Card
              key={quote.id}
              className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700/50 transition-colors"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* ✅ NOVO: Avatar com imagem se disponível */}
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={clientData.profilePic} />
                      <AvatarFallback className="bg-zinc-700 text-zinc-300">
                        {getInitials(clientData.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {/* ✅ CORRIGIDO: Nome sempre presente */}
                        <h3 className="font-medium text-white truncate">
                          {clientData.name}
                        </h3>

                        <Badge
                          className={
                            quote.status === "Fechado"
                              ? "bg-green-500/20 text-green-400"
                              : quote.status === "Em Andamento"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }
                        >
                          {quote.status === "Aberto"
                            ? "Em Análise"
                            : quote.status}
                        </Badge>

                        {/* ✅ BADGE DE MARGEM DE LUCRO - CORRIGIDO */}
                        {quote.includeProfitMargin && quote.profitMargin && quote.profitMargin > 0 && (
                          <Badge className="bg-purple-500/20 text-purple-400">
                            +{quote.profitMargin}% lucro
                          </Badge>
                        )}

                        {/* ✅ BADGE CLIENTE TIPO */}
                        {quote.isUnregisteredClient ? (
                          <Badge className="bg-orange-500/20 text-orange-400">
                            Novo
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-500/20 text-blue-400">
                            Registrado
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-zinc-400">ID do Orçamento</p>
                          <p className="text-white font-mono">
                            #{quote.id.substring(0, 8)}
                          </p>
                        </div>
                        <div>
                          <p className="text-zinc-400">Data</p>
                          <p className="text-white">
                            {formatDate(quote.createdAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-zinc-400">Itens</p>
                          <p className="text-white">
                            {(quote.partsQuoteItems || []).length} peça(s)
                          </p>
                        </div>
                        <div>
                          <p className="text-zinc-400">Total</p>
                          <p className="text-white font-bold">
                            {formatPrice(calculateQuoteTotal(quote))}
                          </p>
                        </div>
                      </div>

                      {quote.adminNote && (
                        <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded">
                          <p className="text-sm text-blue-400">
                            <strong>Nota:</strong> {quote.adminNote}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* ✅ NOVO: Status Update Buttons com possibilidade de voltar atrás */}
                    <div className="flex gap-1">
                      {quote.status === "Aberto" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateQuoteStatus(quote.id, "Em Andamento")
                          }
                          disabled={isUpdating}
                          className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                        >
                          Iniciar
                        </Button>
                      )}

                      {quote.status === "Em Andamento" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateQuoteStatus(quote.id, "Aberto")
                            }
                            disabled={isUpdating}
                            className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/20 hover:text-yellow-300 hover:border-yellow-400"
                          >
                            <ArrowLeft className="w-3 h-3 mr-1" />
                            Voltar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              updateQuoteStatus(quote.id, "Fechado")
                            }
                            disabled={isUpdating}
                            className="bg-green-600 hover:bg-green-700 text-white border-0"
                          >
                            Concluir
                          </Button>
                        </>
                      )}

                      {quote.status === "Fechado" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateQuoteStatus(quote.id, "Em Andamento")
                          }
                          disabled={isUpdating}
                          className="border-blue-500 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 hover:border-blue-400"
                        >
                          <Undo2 className="w-3 h-3 mr-1" />
                          Reabrir
                        </Button>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-600 border border-zinc-600 hover:border-zinc-500"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-zinc-800 border-zinc-600 shadow-lg"
                      >
                        <DropdownMenuItem
                          onClick={() => viewDetails(quote)}
                          className="text-white hover:bg-zinc-700 hover:text-white focus:bg-zinc-700 focus:text-white cursor-pointer"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => editQuote(quote)}
                          className="text-white hover:bg-zinc-700 hover:text-white focus:bg-zinc-700 focus:text-white cursor-pointer"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openNoteDialog(quote)}
                          className="text-white hover:bg-zinc-700 hover:text-white focus:bg-zinc-700 focus:text-white cursor-pointer"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Adicionar Nota
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setQuoteToDelete(quote);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-red-400 hover:bg-red-500/20 hover:text-red-300 focus:bg-red-500/20 focus:text-red-300 cursor-pointer"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {paginatedQuotes.length === 0 && !isLoading && (
          <Card className="bg-zinc-800 border-zinc-700">
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2 text-white">
                Nenhum orçamento encontrado
              </p>
              <p className="text-zinc-400 mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "Tente ajustar os filtros de pesquisa"
                  : "Comece criando seu primeiro orçamento de peças"}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button
                  onClick={() => navigate("/app/add-part-budget")}
                  className="bg-green-600 hover:bg-green-700 text-white border-0 shadow-md"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Orçamento
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className="border-zinc-600 text-white hover:bg-zinc-700 hover:border-zinc-500 bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            let pageNumber = i + 1;
            if (totalPages > 5) {
              if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }
            }

            if (pageNumber >= 1 && pageNumber <= totalPages) {
              return (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? "secondary" : "outline"}
                  size="icon"
                  onClick={() => paginate(pageNumber)}
                  className={`border-zinc-600 ${
                    currentPage === pageNumber
                      ? "bg-zinc-700 text-white hover:bg-zinc-600 border-zinc-500"
                      : "text-white hover:bg-zinc-700 hover:border-zinc-500 bg-zinc-800"
                  }`}
                >
                  {pageNumber}
                </Button>
              );
            }
            return null;
          })}

          <Button
            variant="outline"
            size="icon"
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="border-zinc-600 text-white hover:bg-zinc-700 hover:border-zinc-500 bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Adicionar Nota Administrativa
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Adicione uma nota interna para este orçamento de peças.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <textarea
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              placeholder="Digite sua nota aqui..."
              className="w-full h-32 p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 resize-none"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNoteDialogOpen(false)}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-white hover:border-zinc-500"
            >
              Cancelar
            </Button>
            <Button
              onClick={addNoteToQuote}
              disabled={isUpdating || !currentNote.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white border-0"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Nota"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir este orçamento? Esta ação não pode
              ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-white hover:border-zinc-500"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={deleteQuote}
              disabled={isUpdating}
              className="bg-red-600 hover:bg-red-700 text-white border-0"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagePartsBudgets;
