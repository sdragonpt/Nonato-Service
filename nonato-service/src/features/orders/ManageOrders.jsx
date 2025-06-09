import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase.jsx";

// Lucide Icons
import {
  Search,
  Plus,
  Loader2,
  MoreVertical,
  Edit2,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ClipboardList,
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
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
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
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar.jsx";

const OrderCard = ({
  order,
  onDelete,
  onEdit,
  client,
  equipment,
  navigate,
}) => {
  return (
    <Card
      className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
      onClick={(e) => {
        // Previne a navegação se o clique foi nos botões de ação
        if (!e.defaultPrevented) {
          navigate(`/app/order-detail/${order.id}`);
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={client?.profilePic || "/nonato.png"}
                alt={client?.name || order.clientName}
              />
              <AvatarFallback>
                {(client?.name || order.clientName || "??")
                  .substring(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div>
              <h3 className="font-semibold text-lg text-white">
                {client?.name || order.clientName || "Cliente não encontrado"}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-2">
              {order.priority === "high" && (
                <Badge
                  variant="destructive"
                  className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Urgente
                </Badge>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-zinc-700 text-white"
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-zinc-800 border-zinc-700"
              >
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    onEdit(order.id);
                  }}
                  className="text-white hover:bg-zinc-700 cursor-pointer"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-400 hover:bg-zinc-700 focus:text-red-400 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(order);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-zinc-400">
              <span className="font-medium">Marca:</span>{" "}
              {equipment?.brand || "N/A"}
            </p>
            <p className="text-zinc-400">
              <span className="font-medium">Tipo:</span>{" "}
              {order?.serviceType || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-zinc-400">
              <span className="font-medium">Data:</span>{" "}
              {new Date(order.date).toLocaleDateString()}
            </p>
            <p className="text-zinc-400">
              <span className="font-medium">Descrição:</span>{" "}
              {order.description || "N/A"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ManageOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState({});
  const [equipments, setEquipments] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);

  // Estados para paginação
  const [currentOpenPage, setCurrentOpenPage] = useState(1);
  const [currentClosedPage, setCurrentClosedPage] = useState(1);
  const [currentQuotePage, setCurrentQuotePage] = useState(1);
  const itemsPerPage = 5; // Ajuste conforme necessário para cards maiores

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const [ordersSnapshot, clientsSnapshot, equipmentsSnapshot] =
        await Promise.all([
          getDocs(collection(db, "ordens")),
          getDocs(collection(db, "clientes")),
          getDocs(collection(db, "equipamentos")),
        ]);

      const ordersData = ordersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const clientsData = clientsSnapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = { id: doc.id, ...doc.data() };
        return acc;
      }, {});

      const equipmentsData = equipmentsSnapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = { id: doc.id, ...doc.data() };
        return acc;
      }, {});

      setOrders(ordersData);
      setClients(clientsData);
      setEquipments(equipmentsData);
      setError(null);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Erro ao carregar dados. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleDelete = async (orderId) => {
    try {
      await deleteDoc(doc(db, "ordens", orderId));
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    } catch (error) {
      console.error("Error deleting order:", error);
      setError("Erro ao deletar ordem. Por favor, tente novamente.");
    }
  };

  const confirmDelete = (order) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  const filteredOrders = orders
    .filter((order) => {
      const clientName =
        clients[order.clientId]?.name || order.clientName || "";
      return (
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    })
    // Ordenar por data decrescente (mais recente primeiro)
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA; // Ordem decrescente
    });

  // Filtrar ordens abertas, fechadas e orçamentos
  const openOrders = filteredOrders.filter(
    (order) => order.status !== "Fechado" && !order.isQuote
  );
  const closedOrders = filteredOrders.filter(
    (order) => order.status === "Fechado" && !order.isQuote
  );
  const quoteOrders = filteredOrders.filter((order) => order.isQuote);

  // Calcular paginação para ordens abertas
  const indexOfLastOpenOrder = currentOpenPage * itemsPerPage;
  const indexOfFirstOpenOrder = indexOfLastOpenOrder - itemsPerPage;
  const currentOpenOrders = openOrders.slice(
    indexOfFirstOpenOrder,
    indexOfLastOpenOrder
  );
  const totalOpenPages = Math.ceil(openOrders.length / itemsPerPage);

  // Calcular paginação para ordens fechadas
  const indexOfLastClosedOrder = currentClosedPage * itemsPerPage;
  const indexOfFirstClosedOrder = indexOfLastClosedOrder - itemsPerPage;
  const currentClosedOrders = closedOrders.slice(
    indexOfFirstClosedOrder,
    indexOfLastClosedOrder
  );
  const totalClosedPages = Math.ceil(closedOrders.length / itemsPerPage);

  // Calcular paginação para orçamentos
  const indexOfLastQuoteOrder = currentQuotePage * itemsPerPage;
  const indexOfFirstQuoteOrder = indexOfLastQuoteOrder - itemsPerPage;
  const currentQuoteOrders = quoteOrders.slice(
    indexOfFirstQuoteOrder,
    indexOfLastQuoteOrder
  );
  const totalQuotePages = Math.ceil(quoteOrders.length / itemsPerPage);

  // Funções de paginação
  const paginateOpen = (pageNumber) => {
    setCurrentOpenPage(pageNumber);
    window.scrollTo(0, 0);
  };

  const paginateClosed = (pageNumber) => {
    setCurrentClosedPage(pageNumber);
    window.scrollTo(0, 0);
  };

  const paginateQuote = (pageNumber) => {
    setCurrentQuotePage(pageNumber);
    window.scrollTo(0, 0);
  };

  // Resetar paginação quando o termo de busca mudar
  useEffect(() => {
    setCurrentOpenPage(1);
    setCurrentClosedPage(1);
    setCurrentQuotePage(1);
  }, [searchTerm]);

  const stats = {
    total: orders.length,
    open: orders.filter((order) => order.status !== "Fechado" && !order.isQuote)
      .length,
    closed: orders.filter(
      (order) => order.status === "Fechado" && !order.isQuote
    ).length,
    quotes: orders.filter((order) => order.isQuote).length,
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Gerenciar Ordens de Serviço
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Gerencie todas as suas ordens de serviço em um só lugar
          </p>
        </div>
        <Button
          onClick={() => navigate("/app/add-order")}
          className="hidden sm:flex bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Ordem
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">
                Total de Ordens
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {stats.total}
              </h3>
            </div>
            <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Em Aberto</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {stats.open}
              </h3>
            </div>
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Concluídas</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {stats.closed}
              </h3>
            </div>
            <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Orçamentos</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {stats.quotes}
              </h3>
            </div>
            <svg
              className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </CardContent>
        </Card>
      </div>

      {/* Search Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="p-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Buscar por cliente ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          {error && (
            <Alert
              variant="destructive"
              className="border-red-500 bg-red-500/10 mt-4"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Orders Sections */}
      <div className="space-y-6">
        {/* Open and Closed Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Open Orders */}
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="w-5 h-5 text-blue-500" />
                Ordens Abertas
                <Badge className="ml-auto bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">
                  {openOrders.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentOpenOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  client={clients[order.clientId]}
                  equipment={equipments[order.equipmentId]}
                  onDelete={confirmDelete}
                  onEdit={(id) => navigate(`/app/edit-service-order/${id}`)}
                  navigate={navigate}
                />
              ))}

              {/* Controles de paginação para ordens abertas */}
              {totalOpenPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginateOpen(currentOpenPage - 1)}
                    disabled={currentOpenPage === 1}
                    className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800 disabled:opacity-50 h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <span className="text-sm text-zinc-400">
                    {currentOpenPage} / {totalOpenPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginateOpen(currentOpenPage + 1)}
                    disabled={currentOpenPage === totalOpenPages}
                    className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800 disabled:opacity-50 h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {openOrders.length === 0 && (
                <Card className="bg-zinc-800 border-zinc-700">
                  <CardContent className="p-6 text-center">
                    <p className="text-zinc-400">
                      Nenhuma ordem aberta encontrada
                    </p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Closed Orders */}
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Ordens Fechadas
                <Badge className="ml-auto bg-green-500/10 text-green-400 hover:bg-green-500/20">
                  {closedOrders.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentClosedOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  client={clients[order.clientId]}
                  equipment={equipments[order.equipmentId]}
                  onDelete={confirmDelete}
                  onEdit={(id) => navigate(`/app/edit-service-order/${id}`)}
                  navigate={navigate}
                />
              ))}

              {/* Controles de paginação para ordens fechadas */}
              {totalClosedPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginateClosed(currentClosedPage - 1)}
                    disabled={currentClosedPage === 1}
                    className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800 disabled:opacity-50 h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <span className="text-sm text-zinc-400">
                    {currentClosedPage} / {totalClosedPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginateClosed(currentClosedPage + 1)}
                    disabled={currentClosedPage === totalClosedPages}
                    className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800 disabled:opacity-50 h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {closedOrders.length === 0 && (
                <Card className="bg-zinc-800 border-zinc-700">
                  <CardContent className="p-6 text-center">
                    <p className="text-zinc-400">
                      Nenhuma ordem fechada encontrada
                    </p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quotes Section */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <svg
                className="w-5 h-5 text-orange-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              Orçamentos Online
              <Badge className="ml-auto bg-orange-500/10 text-orange-400 hover:bg-orange-500/20">
                {quoteOrders.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {quoteOrders.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQuoteOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      client={clients[order.clientId]}
                      equipment={equipments[order.equipmentId]}
                      onDelete={confirmDelete}
                      onEdit={(id) => navigate(`/app/edit-service-order/${id}`)}
                      navigate={navigate}
                    />
                  ))}
                </div>

                {/* Controles de paginação para orçamentos */}
                {totalQuotePages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => paginateQuote(currentQuotePage - 1)}
                      disabled={currentQuotePage === 1}
                      className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800 disabled:opacity-50 h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <span className="text-sm text-zinc-400">
                      {currentQuotePage} / {totalQuotePages}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => paginateQuote(currentQuotePage + 1)}
                      disabled={currentQuotePage === totalQuotePages}
                      className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800 disabled:opacity-50 h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Card className="bg-zinc-800 border-zinc-700">
                <CardContent className="p-6 text-center">
                  <p className="text-zinc-400">Nenhum orçamento encontrado</p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir esta ordem? Esta ação não pode ser
              desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDelete(orderToDelete?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FAB Menu for Mobile */}
      <div className="fixed bottom-6 right-6 sm:hidden">
        <Button
          onClick={() => navigate("/app/add-order")}
          size="icon"
          className="rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

// Utility Functions
const convertToCSV = (orders) => {
  const headers = [
    "Número",
    "Cliente",
    "Status",
    "Prioridade",
    "Data",
    "Descrição",
  ];
  const rows = orders.map((order) => [
    order.orderNumber,
    order.clientName,
    order.status,
    order.priority,
    new Date(order.date).toLocaleDateString(),
    order.description,
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell || ""}"`).join(","))
    .join("\n");
};

const downloadCSV = (content, filename) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export default ManageOrders;
