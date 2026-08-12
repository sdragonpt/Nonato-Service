import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useClients } from "../../context/ClientsContext.jsx";
import { useEquipments } from "../../context/EquipmentsContext.jsx";
import { searchIncludes } from "../../utils/normalizeSearch.js";
import { fetchPage } from "../../utils/firestorePage.js";

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
  Download,
  ArrowUpDown,
  ArrowDown,
} from "lucide-react";

// UI Components
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table.jsx";
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

const PAGE_SIZE = 10;
const MAX_AUTO_LOADS = 15; // salvaguarda: nº máx. de lotes extra a carregar automaticamente ao pesquisar/filtrar

const STATUS_FILTERS = [
  { key: "all", label: "Todas", icon: ClipboardList, iconClass: "text-green-500" },
  { key: "open", label: "Abertas", icon: Clock, iconClass: "text-blue-500" },
  { key: "closed", label: "Fechadas", icon: CheckCircle2, iconClass: "text-green-500" },
];

const OrderRow = ({ order, client, equipment, onDelete, onEdit, navigate }) => {
  const isClosed = order.status === "Fechado";

  return (
    <TableRow
      className="hover:bg-zinc-700/50 border-zinc-700 cursor-pointer"
      onClick={(e) => {
        if (!e.defaultPrevented) navigate(`/app/order-detail/${order.id}`);
      }}
    >
      <TableCell>
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9 shrink-0">
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
          <div className="min-w-0">
            <p className="text-white font-medium truncate">
              {client?.name || order.clientName || "Cliente não encontrado"}
            </p>
            <p className="text-xs text-zinc-500 font-mono">
              {order.orderNumber || `OS-${order.id}`}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-zinc-300">
        <p>{order.serviceType || "N/A"}</p>
        {equipment?.brand && (
          <p className="text-xs text-zinc-500">{equipment.brand}</p>
        )}
      </TableCell>
      <TableCell className="text-zinc-300 whitespace-nowrap">
        {order.date ? new Date(order.date).toLocaleDateString("pt-PT") : "N/A"}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            className={
              isClosed
                ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
            }
          >
            {isClosed ? "Fechada" : "Aberta"}
          </Badge>
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
      </TableCell>
      <TableCell className="text-right">
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
          <DropdownMenuContent align="end" className="bg-zinc-800 border-zinc-700">
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
      </TableCell>
    </TableRow>
  );
};

const ManageOrders = () => {
  const navigate = useNavigate();
  const { ensureClients } = useClients();
  const { ensureEquipments } = useEquipments();

  // ✅ Carregado por lotes (cursor do Firestore, ordenado por data), em vez
  // de ler a coleção "ordens" inteira de uma só vez.
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState({});
  const [equipments, setEquipments] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | open | closed
  const [sortDirection, setSortDirection] = useState("desc"); // desc = mais recentes primeiro
  const [isLoading, setIsLoading] = useState(true);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);

  // Contagens totais exatas (aggregation query — 1 leitura cada, não lê os
  // documentos), para os cartões mostrarem o total real da coleção e não
  // só o que já foi carregado na página.
  const [totalCounts, setTotalCounts] = useState({ all: null, closed: null });

  const cursorRef = useRef(null);
  const autoLoadCountRef = useRef(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const ordersRef = collection(db, "ordens");
        // ✅ "Todas" exclui orçamentos de peças (isQuote). Nenhuma ordem
        // normal tem isQuote definido como "false" explicitamente (só é
        // gravado como "true" nos orçamentos de peças), por isso filtrar
        // com where("isQuote","==",false) excluía quase todas as ordens
        // reais (o Firestore não faz match de "==" em campos ausentes).
        // Em vez disso: conta o total da coleção (sempre fiável) e subtrai
        // os orçamentos de peças (isQuote == true, esse sim sempre gravado).
        const [totalSnap, quotesSnap, closedTotalSnap, closedQuotesSnap] =
          await Promise.all([
            getCountFromServer(ordersRef),
            getCountFromServer(query(ordersRef, where("isQuote", "==", true))),
            getCountFromServer(query(ordersRef, where("status", "==", "Fechado"))),
            getCountFromServer(
              query(
                ordersRef,
                where("isQuote", "==", true),
                where("status", "==", "Fechado")
              )
            ),
          ]);
        setTotalCounts({
          all: totalSnap.data().count - quotesSnap.data().count,
          closed: closedTotalSnap.data().count - closedQuotesSnap.data().count,
        });
      } catch (err) {
        console.error("Erro ao contar ordens:", err);
      }
    };
    fetchCounts();
  }, []);

  // Cada separador (Todas/Abertas/Fechadas) tem a sua própria query no
  // Firestore, para que "carregar mais" traga sempre as próximas mais
  // recentes DESSE separador — e não 10 ordens quaisquer que depois calham
  // a corresponder ao filtro. Nota: "Abertas" usa status=="Aberto" (não
  // status!="Fechado") porque o Firestore exclui documentos sem o campo
  // "status" em filtros de desigualdade, e porque uma ordem só tem esses
  // dois estados possíveis.
  // ⚠️ Isto requer um índice composto (status + date) no Firestore. Se
  // aparecer um erro "The query requires an index" na consola, basta abrir
  // o link que a Firebase mostra nesse erro para o criar automaticamente.
  const loadPage = useCallback(async (cursor, filter) => {
    const ordersRef = collection(db, "ordens");
    const baseQuery =
      filter === "open"
        ? query(ordersRef, where("status", "==", "Aberto"), orderBy("date", "desc"))
        : filter === "closed"
        ? query(ordersRef, where("status", "==", "Fechado"), orderBy("date", "desc"))
        : query(ordersRef, orderBy("date", "desc"));
    const { docs, cursor: nextCursor, hasMore: more } = await fetchPage(baseQuery, {
      pageSize: PAGE_SIZE,
      cursor,
    });
    cursorRef.current = nextCursor;
    setHasMore(more);
    return docs;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        cursorRef.current = null;
        const [firstBatch, allClients, allEquipments] = await Promise.all([
          loadPage(null, "all"),
          ensureClients(),
          ensureEquipments(),
        ]);

        setOrders(firstBatch);

        const clientsData = allClients.reduce((acc, client) => {
          acc[client.id] = client;
          return acc;
        }, {});
        setClients(clientsData);

        const equipmentsData = allEquipments.reduce((acc, equipment) => {
          acc[equipment.id] = equipment;
          return acc;
        }, {});
        setEquipments(equipmentsData);

        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Erro ao carregar dados. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trocar de separador recomeça a paginação com a query própria desse
  // estado (ver loadPage acima), em vez de continuar a filtrar o que já
  // estava carregado para "Todas".
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    (async () => {
      try {
        setIsTabLoading(true);
        cursorRef.current = null;
        const firstBatch = await loadPage(null, statusFilter);
        setOrders(firstBatch);
        setError(null);
      } catch (err) {
        console.error("Erro ao trocar de separador:", err);
        setError("Erro ao carregar dados. Por favor, tente novamente.");
      } finally {
        setIsTabLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !cursorRef.current) return;
    setIsLoadingMore(true);
    try {
      const docs = await loadPage(cursorRef.current, statusFilter);
      setOrders((prev) => [...prev, ...docs]);
    } catch (err) {
      console.error("Error loading more orders:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, loadPage, statusFilter]);

  const handleDelete = async (orderId) => {
    try {
      // Soft-delete: move para a Reciclagem em vez de apagar definitivamente
      await updateDoc(doc(db, "ordens", orderId), {
        eliminadoEm: new Date(),
      });
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    } catch (error) {
      console.error("Error deleting order:", error);
      setError("Erro ao excluir ordem. Por favor, tente novamente.");
    }
  };

  const confirmDelete = (order) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  // ✅ Ordens de serviço normais (sem orçamentos online, sem excluídas)
  const serviceOrders = useMemo(
    () => orders.filter((order) => !order.isQuote && !order.eliminadoEm),
    [orders]
  );

  // Cartões de estatística: usam a contagem real da coleção inteira
  // (getCountFromServer, buscada uma vez acima) em vez do que já está
  // carregado na página. Enquanto essa contagem não chega, mostra o que
  // já foi carregado como aproximação.
  const stats = useMemo(() => {
    const closedLoaded = serviceOrders.filter(
      (order) => order.status === "Fechado"
    ).length;
    const all = totalCounts.all ?? serviceOrders.length;
    const closed = totalCounts.closed ?? closedLoaded;
    return {
      all,
      closed,
      open: all - closed,
    };
  }, [serviceOrders, totalCounts]);

  // Nota: já não filtra por estado aqui — "orders" já vem filtrado do
  // Firestore consoante o separador ativo (ver loadPage). Só falta aplicar
  // a pesquisa por texto ao que está carregado.
  const filteredOrders = useMemo(() => {
    const filtered = serviceOrders.filter((order) => {
      const clientName =
        clients[order.clientId]?.name || order.clientName || "";
      return (
        searchIncludes(clientName, searchTerm) ||
        searchIncludes(order.description, searchTerm) ||
        searchIncludes(order.orderNumber, searchTerm)
      );
    });

    return [...filtered].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return sortDirection === "desc" ? dateB - dateA : dateA - dateB;
    });
  }, [serviceOrders, clients, searchTerm, sortDirection]);

  // Ao pesquisar, os resultados só existem dentro do que já foi carregado —
  // por isso, se houver poucos resultados e ainda houver mais ordens por
  // trás, vamos buscando lotes extra automaticamente até haver resultados
  // suficientes (ou a coleção acabar). Nota: isto não se aplica à troca de
  // separador (Todas/Abertas/Fechadas) — essa já pede diretamente ao
  // Firestore as ordens certas para esse estado (ver loadPage acima), sem
  // precisar de carregar lotes extra às escondidas.
  useEffect(() => {
    autoLoadCountRef.current = 0;
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    const isFiltering = Boolean(searchTerm);
    if (
      isFiltering &&
      hasMore &&
      !isLoadingMore &&
      !isLoading &&
      !isTabLoading &&
      filteredOrders.length < PAGE_SIZE &&
      autoLoadCountRef.current < MAX_AUTO_LOADS
    ) {
      autoLoadCountRef.current += 1;
      loadMore();
    }
  }, [searchTerm, statusFilter, filteredOrders.length, hasMore, isLoadingMore, isLoading, isTabLoading, loadMore]);

  // Exportação CSV: lê a coleção toda diretamente (ação explícita e pontual
  // do utilizador), para garantir que o ficheiro sai completo mesmo que só
  // uma parte das ordens esteja carregada na página neste momento.
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const snap = await getDocs(
        query(collection(db, "ordens"), orderBy("date", "desc"))
      );
      const allOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const exportable = allOrders.filter((order) => {
        if (order.isQuote || order.eliminadoEm) return false;
        const clientName =
          clients[order.clientId]?.name || order.clientName || "";
        return (
          searchIncludes(clientName, searchTerm) ||
          searchIncludes(order.description, searchTerm) ||
          searchIncludes(order.orderNumber, searchTerm)
        );
      });
      downloadCSV(convertToCSV(exportable), "ordens-de-servico.csv");
    } catch (err) {
      console.error("Erro ao exportar CSV:", err);
      setError("Erro ao exportar CSV. Por favor, tente novamente.");
    } finally {
      setIsExporting(false);
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Gerenciar Ordens de Serviço
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Gerencie todas as suas ordens de serviço em um só lugar
          </p>
        </div>
        <div className="hidden sm:flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/app/recycle-bin")}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Reciclagem
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Exportar CSV
          </Button>
          <Button
            onClick={() => navigate("/app/add-order")}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Ordem
          </Button>
        </div>
      </div>

      {/* Stats Cards — clicáveis, funcionam como filtro de estado */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STATUS_FILTERS.map(({ key, label, icon: StatIcon, iconClass }) => (
          <Card
            key={key}
            className={`bg-zinc-800 border-zinc-700 cursor-pointer transition-colors ${
              statusFilter === key ? "ring-1 ring-green-500" : "hover:bg-zinc-700"
            }`}
            onClick={() => setStatusFilter(key)}
          >
            <CardContent className="flex items-center justify-between p-4 sm:p-6">
              <div>
                <p className="text-sm font-medium text-zinc-400">{label}</p>
                <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                  {stats[key]}
                </h3>
              </div>
              <StatIcon className={`h-6 w-6 sm:h-8 sm:w-8 ${iconClass}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="space-y-4 p-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Buscar por cliente, descrição ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map(({ key, label, icon: FilterIcon }) => (
                <Button
                  key={key}
                  variant="outline"
                  onClick={() => setStatusFilter(key)}
                  className={`gap-2 border-zinc-700 ${
                    statusFilter === key
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "text-white hover:bg-zinc-700 bg-zinc-600"
                  }`}
                >
                  <FilterIcon className="w-4 h-4" />
                  {label}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() =>
                setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))
              }
              className="gap-2 border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortDirection === "desc" ? "Mais recentes" : "Mais antigas"}
            </Button>
          </div>

          {hasMore && (
            <p className="text-xs text-zinc-500">
              A mostrar {serviceOrders.length} de {stats[statusFilter]}{" "}
              {statusFilter === "all"
                ? "ordens"
                : STATUS_FILTERS.find((f) => f.key === statusFilter)?.label.toLowerCase()}{" "}
              — carrega mais em baixo.
            </p>
          )}

          {error && (
            <Alert variant="destructive" className="border-red-500 bg-red-500/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="p-0">
          {isTabLoading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : filteredOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-zinc-800 border-zinc-700">
                  <TableHead className="text-zinc-400">Cliente</TableHead>
                  <TableHead className="text-zinc-400">Serviço</TableHead>
                  <TableHead className="text-zinc-400">Data</TableHead>
                  <TableHead className="text-zinc-400">Estado</TableHead>
                  <TableHead className="text-zinc-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    client={clients[order.clientId]}
                    equipment={equipments[order.equipmentId]}
                    onDelete={confirmDelete}
                    onEdit={(id) => navigate(`/app/edit-service-order/${id}`)}
                    navigate={navigate}
                  />
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 sm:p-12 text-center">
              <ClipboardList className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2 text-white">
                Nenhuma ordem encontrada
              </p>
              <p className="text-sm sm:text-base text-zinc-400">
                Tente ajustar a busca ou os filtros, ou adicione uma nova ordem
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Carregar mais */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoadingMore || isTabLoading}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir esta ordem? A ordem será movida
              para a Reciclagem e pode ser restaurada mais tarde.
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
