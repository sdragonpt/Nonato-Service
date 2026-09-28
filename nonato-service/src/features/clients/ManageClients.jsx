// src/features/clients/ManageClients.jsx
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, updateDoc, doc, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useClients } from "../../context/ClientsContext.jsx";
import { useEquipments } from "../../context/EquipmentsContext.jsx";
import { useOrcamentos } from "../../context/OrcamentosContext.jsx";
import { searchIncludes } from "../../utils/normalizeSearch.js";
import { getCached } from "../../utils/sessionCache.js";
import { getInitials } from "../../utils/getInitials.js";
import { useGroups, GROUP_KINDS } from "../../services/groupsStore.js";
import ManageGroupsDialog from "../../components/shared/ManageGroupsDialog.jsx";
import {
  FolderCog,
  Search,
  Plus,
  Loader2,
  MoreVertical,
  Eye,
  Trash2,
  Users,
  Building2,
  UserPlus,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle,
  CreditCard,
  MapPin,
  ArrowUpDown,
  ArrowDown,
  Edit2
} from "lucide-react";

// UI Components
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Financial utils
import { 
  calculateServiceFinancials, 
  getPaymentStatus, 
  formatPrice
} from "../../utils/financialUtils";

// ===================================
// HOOK PARA STATUS FINANCEIRO DOS CLIENTES
// ===================================
// ✅ "ordens" (isQuote) partilhado via sessionCache com as mesmas chaves
// usadas em ManageAlerts.jsx e ManageDebtors.jsx — visitar mais do que uma
// destas páginas na mesma sessão só paga a leitura uma vez. "orcamentos"
// vem do OrcamentosContext (cache partilhado por toda a app, tempo real).
const CLIENT_FINANCIAL_CACHE_TTL = 5 * 60 * 1000;

const useClientFinancialStatus = (clients) => {
  const [financialStatuses, setFinancialStatuses] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { ensureOrcamentos } = useOrcamentos();

  useEffect(() => {
    if (!clients?.length) {
      setFinancialStatuses({});
      return;
    }

    const calculateStatuses = async () => {
      setIsLoading(true);

      try {
        // Buscar todos os serviços financeiros
        const [partsBudgetsSnapshot, closures] = await Promise.all([
          getCached("finances:ordensQuotes", CLIENT_FINANCIAL_CACHE_TTL, () =>
            getDocs(query(collection(db, "ordens"), where("isQuote", "==", true)))
          ),
          ensureOrcamentos(),
        ]);

        // Ignora ordens excluídas / na Reciclagem
        const allServices = [
          ...partsBudgetsSnapshot.docs.map(doc => ({ id: doc.id, type: 'parts_budget', ...doc.data() })),
          ...closures.map(o => ({ type: 'closure', ...o }))
        ].filter(service => !service.eliminadoEm);

        const statuses = {};

        clients.forEach(client => {
          const clientServices = allServices.filter(service => service.clientId === client.id);
          const status = calculateClientFinancialStatus(clientServices);
          statuses[client.id] = status;
        });

        setFinancialStatuses(statuses);
      } catch (error) {
        console.error("Erro ao calcular status financeiros:", error);
      } finally {
        setIsLoading(false);
      }
    };

    calculateStatuses();
  }, [clients, ensureOrcamentos]);

  return { financialStatuses, isLoading };
};

// Função para calcular status financeiro de um cliente
const calculateClientFinancialStatus = (clientServices) => {
  let totalAmount = 0;
  let paidAmount = 0;
  let pendingAmount = 0;
  let overdueAmount = 0;
  let hasOverdueServices = false;
  let hasPendingServices = false;

  clientServices.forEach(service => {
    const financials = calculateServiceFinancials(service);
    const paymentStatus = getPaymentStatus(service);
    
    totalAmount += financials.totalWithVat;

    switch (paymentStatus) {
      case 'paid':
        paidAmount += financials.totalWithVat;
        break;
      case 'pending':
        pendingAmount += financials.totalWithVat;
        hasPendingServices = true;
        break;
      case 'overdue':
        overdueAmount += financials.totalWithVat;
        hasOverdueServices = true;
        break;
    }
  });

  // Determinar status geral do cliente
  let clientStatus = 'good';
  let statusColor = 'border-zinc-700';
  let statusBadge = null;

  if (hasOverdueServices) {
    clientStatus = 'overdue';
    statusColor = 'border-red-500 bg-red-500/10';
    statusBadge = {
      text: 'Devedor',
      color: 'bg-red-500/20 text-red-400',
      icon: AlertTriangle
    };
  } else if (hasPendingServices) {
    clientStatus = 'pending';
    statusColor = 'border-yellow-500 bg-yellow-500/5';
    statusBadge = {
      text: 'Pendente',
      color: 'bg-yellow-500/20 text-yellow-400',
      icon: Clock
    };
  } else if (totalAmount > 0) {
    statusBadge = {
      text: 'Em Dia',
      color: 'bg-green-500/20 text-green-400',
      icon: CheckCircle
    };
  }

  return {
    status: clientStatus,
    statusColor,
    statusBadge,
    totalAmount,
    paidAmount,
    pendingAmount,
    overdueAmount,
    servicesCount: clientServices.length
  };
};

// ===================================
// COMPONENTE ClientCard OTIMIZADO
// ===================================
const ClientCard = ({ client, onEdit, onDelete, onView, financialStatus, groupNames }) => {
  const confirmDelete = (e) => {
    e.stopPropagation();
    onDelete(client.id);
  };
  
  return (
    <Card 
      onClick={() => onView(client.id)}
      className={`bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer ${
        financialStatus?.statusColor || 'border-zinc-700'
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
              <AvatarImage src={client.profilePic} alt={client.name} />
              <AvatarFallback className="bg-zinc-700 text-zinc-300">
                {getInitials(client.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-white truncate" title={client.name}>
                {client.name}
              </h3>
              <p className="text-sm text-zinc-400 truncate" title={client.phone}>
                {client.phone || "Sem telefone"}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {/* Badge de Status Financeiro */}
            {financialStatus?.statusBadge && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                financialStatus.statusBadge.color
              }`}>
                <financialStatus.statusBadge.icon className="h-3 w-3" />
                {financialStatus.statusBadge.text}
              </div>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger 
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="bg-zinc-800 border-zinc-700"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem onClick={() => onView(client.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(client.id)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={confirmDelete}
                  className="text-red-400"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {groupNames?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {groupNames.map((nome) => (
              <span
                key={nome}
                className="rounded-full border border-zinc-600 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-300"
              >
                {nome}
              </span>
            ))}
          </div>
        )}

        {/* Endereço (uma linha só — NIF e detalhe financeiro ficam na ficha do cliente) */}
        {client.address && (
          <p className="text-zinc-400 text-xs sm:text-sm truncate flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 shrink-0" />
            {client.address}
          </p>
        )}

        {/* Resumo financeiro — uma linha, o detalhe fica na ficha do cliente */}
        {financialStatus && financialStatus.servicesCount > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-zinc-700 text-sm">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <CreditCard className="h-3.5 w-3.5" />
              {financialStatus.servicesCount} serviço(s)
            </span>
            <span
              className={`font-medium ${
                financialStatus.status === "overdue"
                  ? "text-red-400"
                  : financialStatus.status === "pending"
                  ? "text-yellow-400"
                  : "text-white"
              }`}
            >
              {formatPrice(financialStatus.totalAmount)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ===================================
// COMPONENTE PRINCIPAL ManageClients
// ===================================
const ManageClients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all"); // "all" | "none" | id do grupo
  const [manageGroupsOpen, setManageGroupsOpen] = useState(false);
  const { groups, byId: groupsById } = useGroups(GROUP_KINDS.CLIENTES);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  // Scroll infinito: em vez de páginas numeradas, mostra-se um número
  // crescente de clientes já carregados/filtrados em memória. Nota: ao
  // contrário das outras listas do programa, esta página não faz leituras
  // parciais à Firestore — os clientes vêm sempre completos do
  // ClientsContext partilhado (cache de 5 min), porque os cartões de
  // estatísticas e o estado financeiro por cliente precisam do conjunto
  // completo para serem exatos. O scroll infinito aqui só controla quantos
  // já carregados são desenhados no ecrã de cada vez.
  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Usar o hook de status financeiro
  const { financialStatuses, isLoading: isLoadingFinancial } = useClientFinancialStatus(clients);

  const { ensureClients, removeClientFromCache } = useClients();
  const { ensureEquipments } = useEquipments();
  // Guarda a lista "crua" (com contagem de equipamentos já calculada, mas
  // sem ordenação aplicada) para podermos reordenar em memória quando o
  // utilizador muda o critério de ordenação, sem voltar a ler a Firestore
  const rawClientsRef = useRef([]);

  const applySort = useCallback(
    (list) => {
      return [...list].sort((a, b) => {
        const aVal = a[sortField] ?? "";
        const bVal = b[sortField] ?? "";
        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    },
    [sortField, sortOrder]
  );

  const fetchClients = useCallback(
    async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Clientes vêm do ClientsContext partilhado por toda a app (tempo
        // real), em vez de uma leitura própria desta página
        const clientsList = await ensureClients();

        // Contagem de equipamentos: usa o cache partilhado (EquipmentsContext)
        // e agrupa em memória, em vez de uma query separada por cliente
        // (eram N queries à Firestore, uma por cada cliente na lista)
        const allEquipments = await ensureEquipments();
        const countByClient = new Map();
        allEquipments.forEach((equipment) => {
          const clientId = equipment.clientId;
          if (!clientId) return;
          countByClient.set(clientId, (countByClient.get(clientId) || 0) + 1);
        });

        const clientsWithEquipmentCount = clientsList.map((client) => ({
          ...client,
          equipmentCount: countByClient.get(client.id) || 0,
        }));

        rawClientsRef.current = clientsWithEquipmentCount;
        setClients(applySort(clientsWithEquipmentCount));
      } catch (err) {
        console.error("Error fetching clients:", err);
        setError("Erro ao carregar clientes. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    },
    [ensureClients, applySort]
  );

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mudar a ordenação só reordena os dados já carregados — não volta a
  // pedir nada à Firestore
  useEffect(() => {
    if (rawClientsRef.current.length > 0) {
      setClients(applySort(rawClientsRef.current));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortField, sortOrder]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchTerm, statusFilter, groupFilter, sortField, sortOrder]);

  // Nomes dos grupos de um cliente (ignora grupos que entretanto foram apagados).
  const groupNamesOf = useCallback(
    (client) =>
      (client.grupoIds || [])
        .map((id) => groupsById.get(id)?.nome)
        .filter(Boolean),
    [groupsById]
  );

  const handleEdit = (clientId) => {
    navigate(`/app/edit-client/${clientId}`);
  };

  const handleView = (clientId) => {
    navigate(`/app/client/${clientId}`);
  };

  const handleDelete = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    try {
      // ✅ Exclusão suave — igual ao resto da app (ordens, inspeções,
      // relatórios): o cliente fica marcado como eliminado e pode ser
      // restaurado na Reciclagem, em vez de ser apagado para sempre.
      await updateDoc(doc(db, "clientes", clientToDelete.id), {
        eliminadoEm: new Date(),
      });
      setClients((prev) => prev.filter((client) => client.id !== clientToDelete.id));
      rawClientsRef.current = rawClientsRef.current.filter(
        (client) => client.id !== clientToDelete.id
      );
      // Mantém o cache partilhado (ClientsContext) em sincronia, para que
      // outras páginas não continuem a mostrar este cliente já excluído
      removeClientFromCache(clientToDelete.id);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    } catch (err) {
      console.error("Error deleting client:", err);
      setError("Erro ao excluir cliente. Por favor, tente novamente.");
    }
  };

  // Calcular estatísticas incluindo informações financeiras
  const stats = useMemo(() => {
    const clientsWithOverdue = Object.values(financialStatuses).filter(
      status => status.status === 'overdue'
    ).length;
    
    const clientsWithPending = Object.values(financialStatuses).filter(
      status => status.status === 'pending'
    ).length;

    const totalPendingAmount = Object.values(financialStatuses).reduce(
      (total, status) => total + (status.pendingAmount || 0), 0
    );

    const totalOverdueAmount = Object.values(financialStatuses).reduce(
      (total, status) => total + (status.overdueAmount || 0), 0
    );

    return {
      total: clients.length,
      withEquipments: clients.filter(client => client.equipmentCount > 0).length,
      withOverdue: clientsWithOverdue,
      withPending: clientsWithPending,
      totalPendingAmount,
      totalOverdueAmount
    };
  }, [clients, financialStatuses]);

  // Filtrar clientes - CORRIGIDO: Verificar se propriedades existem antes de usar toLowerCase
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // ✅ Pesquisa insensível a acentos: "Sergio" encontra "Sérgio"
      const matchesSearch =
        searchIncludes(client.name, searchTerm) ||
        (client.phone && client.phone.includes(searchTerm)) ||
        searchIncludes(client.address, searchTerm) ||
        (client.nif && client.nif.includes(searchTerm)) ||
        (client.postalCode && client.postalCode.includes(searchTerm));
      
      const financialStatus = financialStatuses[client.id];

      if (groupFilter === "none" && groupNamesOf(client).length > 0) return false;
      if (
        groupFilter !== "all" &&
        groupFilter !== "none" &&
        !(client.grupoIds || []).includes(groupFilter)
      ) {
        return false;
      }

      switch (statusFilter) {
        case 'overdue':
          return matchesSearch && financialStatus?.status === 'overdue';
        case 'pending':
          return matchesSearch && financialStatus?.status === 'pending';
        case 'good':
          return matchesSearch && (!financialStatus || financialStatus.status === 'good');
        default:
          return matchesSearch;
      }
    });
  }, [clients, searchTerm, statusFilter, groupFilter, groupNamesOf, financialStatuses]);

  // Scroll infinito: mostra só os primeiros `visibleCount` da lista já
  // filtrada/ordenada (que está inteira em memória).
  const currentClients = filteredClients.slice(0, visibleCount);
  const hasMoreVisible = visibleCount < filteredClients.length;

  const loadMoreVisible = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredClients.length));
  }, [filteredClients.length]);

  const exportToCSV = () => {
    const csvContent = [
      ["Nome da Empresa", "Grupos", "Telefone", "Endereço", "Código Postal", "NIF", "Equipamentos", "Status Financeiro", "Total Faturado", "Pendente", "Devedor"],
      ...filteredClients.map(client => {
        const financial = financialStatuses[client.id];
        return [
          client.name || "",
          groupNamesOf(client).join(" / "),
          client.phone || "",
          client.address || "",
          client.postalCode || "",
          client.nif || "",
          client.equipmentCount || 0,
          financial?.statusBadge?.text || "Sem serviços",
          financial?.totalAmount ? formatPrice(financial.totalAmount) : "€ 0,00",
          financial?.pendingAmount ? formatPrice(financial.pendingAmount) : "€ 0,00",
          financial?.overdueAmount ? formatPrice(financial.overdueAmount) : "€ 0,00"
        ];
      })
    ]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "clientes.csv";
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">{/* Espaço para FAB mobile */}
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Gerenciar Clientes
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Gerencie todos os seus clientes em um só lugar
          </p>
        </div>
        <Button
          onClick={() => navigate("/app/add-client")}
          className="hidden sm:flex bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Total de Clientes</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {stats.total}
              </h3>
            </div>
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Com Equipamentos</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {stats.withEquipments}
              </h3>
            </div>
            <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Clientes com Pendências</p>
              <h3 className="text-xl sm:text-2xl font-bold text-yellow-500 mt-1 sm:mt-2">
                {stats.withPending}
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                {formatPrice(stats.totalPendingAmount)}
              </p>
            </div>
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Clientes Devedores</p>
              <h3 className="text-xl sm:text-2xl font-bold text-red-500 mt-1 sm:mt-2">
                {stats.withOverdue}
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                {formatPrice(stats.totalOverdueAmount)}
              </p>
            </div>
            <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Pesquisar por nome, telefone, NIF ou endereço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-400"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-zinc-700 border-zinc-600 text-white">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  <SelectItem value="good">Em dia</SelectItem>
                  <SelectItem value="pending">Com pendências</SelectItem>
                  <SelectItem value="overdue">Devedores</SelectItem>
                </SelectContent>
              </Select>

              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-zinc-700 border-zinc-600 text-white">
                  <SelectValue placeholder="Filtrar por grupo" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">Todos os grupos</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nome}
                    </SelectItem>
                  ))}
                  <SelectItem value="none">Sem grupo</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortField} onValueChange={setSortField}>
                <SelectTrigger className="w-full sm:w-32 bg-zinc-700 border-zinc-600 text-white">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="createdAt">Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setManageGroupsOpen(true)}
                className="flex-1 sm:flex-none bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-700"
              >
                <FolderCog className="w-4 h-4 mr-2" />
                Grupos
              </Button>

              <Button
                variant="outline"
                onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                className="flex-1 sm:flex-none bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-700"
              >
                <ArrowUpDown className="w-4 h-4 mr-2" />
                {sortOrder === "asc" ? "A-Z" : "Z-A"}
              </Button>

              <Button
                variant="outline"
                onClick={exportToCSV}
                className="flex-1 sm:flex-none bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-700">
            <span className="text-sm text-zinc-400">
              A mostrar {currentClients.length} de {filteredClients.length} cliente(s)
            </span>
            {isLoadingFinancial && (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculando dados financeiros...
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentClients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            financialStatus={financialStatuses[client.id]}
            groupNames={groupNamesOf(client)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
          />
        ))}
      </div>

      {filteredClients.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <UserPlus className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            {searchTerm || statusFilter !== "all"
              ? "Nenhum cliente encontrado"
              : "Nenhum cliente cadastrado"}
          </h3>
          <p className="text-zinc-400 mb-4">
            {searchTerm || statusFilter !== "all"
              ? "Tente ajustar os filtros de pesquisa"
              : "Comece adicionando o seu primeiro cliente"}
          </p>
          {!searchTerm && statusFilter === "all" && (
            <Button
              onClick={() => navigate("/app/add-client")}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Cliente
            </Button>
          )}
        </div>
      )}

      {/* Carregar mais */}
      {hasMoreVisible && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={loadMoreVisible}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800 gap-2"
          >
            <ArrowDown className="h-4 w-4" />
            Carregar mais
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir o cliente &ldquo;{clientToDelete?.name}
              &rdquo;? O cliente vai para a Reciclagem e pode ser restaurado
              mais tarde, se for preciso.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="bg-zinc-900 border-zinc-600 text-zinc-300 hover:bg-zinc-700"
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ManageGroupsDialog
        open={manageGroupsOpen}
        onOpenChange={setManageGroupsOpen}
        kind={GROUP_KINDS.CLIENTES}
        title="Grupos de clientes"
        description="Ex: Marcenarias, Revendedores, Contrato de manutenção. Um cliente pode estar em vários grupos."
      />

      {/* FAB Menu for Mobile */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 sm:hidden">
        <Button
          onClick={exportToCSV}
          size="icon"
          className="rounded-full shadow-lg bg-zinc-700 hover:bg-zinc-600"
        >
          <Download className="h-5 w-5" />
        </Button>
        <Button
          onClick={() => navigate("/app/add-client")}
          size="icon"
          className="rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ManageClients;