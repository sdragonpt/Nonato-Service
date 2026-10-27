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
import {
  useGroups,
  GROUP_KINDS,
  migrateClientGroupsToServiceGroups,
} from "../../services/groupsStore.js";
import {
  FolderCog,
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
  Edit2,
  Phone,
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  PageHeader,
  StatCard,
  StatGrid,
  FilterBar,
  SearchInput,
  EmptyState,
  PageLoader,
  LoadMoreButton,
  Fab,
  useConfirm,
} from "../../components/app";
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
  let statusColor = '';
  let statusBadge = null;

  if (hasOverdueServices) {
    clientStatus = 'overdue';
    statusColor = 'border-red-500/40';
    statusBadge = {
      text: 'Devedor',
      tone: 'danger',
      icon: AlertTriangle
    };
  } else if (hasPendingServices) {
    clientStatus = 'pending';
    statusColor = 'border-warning/40';
    statusBadge = {
      text: 'Pendente',
      tone: 'warning',
      icon: Clock
    };
  } else if (totalAmount > 0) {
    statusBadge = {
      text: 'Em Dia',
      tone: 'success',
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
  const StatusIcon = financialStatus?.statusBadge?.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onView(client.id)}
      onKeyDown={(e) => e.key === "Enter" && onView(client.id)}
      className={`surface group flex cursor-pointer flex-col p-4 shadow-elev transition-colors hover:border-white/15 hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
        financialStatus?.statusColor || ""
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-11 w-11 shrink-0 ring-1 ring-white/10">
          <AvatarImage src={client.profilePic} alt={client.name} />
          <AvatarFallback className="bg-muted text-sm font-semibold">
            {getInitials(client.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium" title={client.name}>
            {client.name}
          </h3>
          <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground" title={client.phone}>
            <Phone className="h-3.5 w-3.5 shrink-0" />
            {client.phone || "Sem telefone"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {financialStatus?.statusBadge && (
            <Badge variant={financialStatus.statusBadge.tone}>
              {StatusIcon && <StatusIcon className="mr-1 h-3 w-3" />}
              {financialStatus.statusBadge.text}
            </Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="Ações">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onView(client.id)}>
                <Eye className="h-4 w-4" />
                Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(client.id)}>
                <Edit2 className="h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={confirmDelete} className="text-red-400 focus:text-red-400">
                <Trash2 className="h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {groupNames?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {groupNames.map((nome) => (
            <Badge key={nome} variant="muted" className="font-medium">
              {nome}
            </Badge>
          ))}
        </div>
      )}

      {/* Endereço (uma linha só — NIF e detalhe financeiro ficam na ficha do cliente) */}
      {client.address && (
        <p className="mt-3 flex items-center gap-2 truncate text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">{client.address}</span>
        </p>
      )}

      {/* Resumo financeiro — uma linha, o detalhe fica na ficha do cliente */}
      {financialStatus && financialStatus.servicesCount > 0 && (
        <div className="mt-auto flex items-center justify-between border-t pt-3 text-sm [&:not(:first-child)]:mt-3">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5" />
            {financialStatus.servicesCount} serviço(s)
          </span>
          <span
            className={`font-semibold tabular-nums ${
              financialStatus.status === "overdue"
                ? "text-red-400"
                : financialStatus.status === "pending"
                ? "text-warning"
                : ""
            }`}
          >
            {formatPrice(financialStatus.totalAmount)}
          </span>
        </div>
      )}
    </div>
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
  // Os grupos dos clientes são os de Serviços e Valores (tabelas de preços).
  const { groups, byId: groupsById } = useGroups(GROUP_KINDS.SERVICOS);
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

  const { ensureClients, removeClientFromCache, updateClientInCache } = useClients();

  // Uma vez: grupos de clientes antigos → grupos de Serviços e Valores.
  useEffect(() => {
    migrateClientGroupsToServiceGroups()
      .then(({ clientes }) => {
        const ids = Object.keys(clientes);
        if (!ids.length) return;
        ids.forEach((id) => updateClientInCache(id, { grupoIds: clientes[id] }));
        setClients((prev) =>
          prev.map((c) => (clientes[c.id] ? { ...c, grupoIds: clientes[c.id] } : c))
        );
      })
      .catch((err) => console.error("Erro ao migrar grupos de clientes:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const confirm = useConfirm();
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

  const handleDelete = async (clientId) => {
    const clientToDelete = clients.find((c) => c.id === clientId);
    if (!clientToDelete) return;

    const ok = await confirm({
      title: "Excluir cliente?",
      description: `"${clientToDelete.name}" vai para a Reciclagem e pode ser restaurado mais tarde, se for preciso.`,
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return;

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
    return <PageLoader />;
  }

  const hasFilters = Boolean(searchTerm) || statusFilter !== "all" || groupFilter !== "all";
  const toggleStatusFilter = (value) => setStatusFilter((prev) => (prev === value ? "all" : value));

  return (
    <div className="space-y-6 pb-24 sm:pb-0">
      <PageHeader
        title="Clientes"
        description="Todos os clientes, o seu estado financeiro e equipamentos"
        icon={Users}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/app/manage-services")}>
              <FolderCog className="h-4 w-4" />
              Grupos e valores
            </Button>
            <Button variant="outline" onClick={exportToCSV} className="hidden sm:inline-flex">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button onClick={() => navigate("/app/add-client")} className="hidden sm:inline-flex">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </>
        }
      />

      <StatGrid cols={4}>
        <StatCard label="Total de clientes" value={stats.total} icon={Users} tone="info" />
        <StatCard label="Com equipamentos" value={stats.withEquipments} icon={Building2} tone="default" />
        <StatCard
          label="Com pendências"
          value={stats.withPending}
          hint={formatPrice(stats.totalPendingAmount)}
          icon={Clock}
          tone="warning"
          loading={isLoadingFinancial}
          active={statusFilter === "pending"}
          onClick={() => toggleStatusFilter("pending")}
        />
        <StatCard
          label="Devedores"
          value={stats.withOverdue}
          hint={formatPrice(stats.totalOverdueAmount)}
          icon={AlertTriangle}
          tone="danger"
          loading={isLoadingFinancial}
          active={statusFilter === "overdue"}
          onClick={() => toggleStatusFilter("overdue")}
        />
      </StatGrid>

      <FilterBar
        footer={
          <>
            <span>
              A mostrar {currentClients.length} de {filteredClients.length} cliente(s)
            </span>
            {isLoadingFinancial && (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                A calcular dados financeiros…
              </span>
            )}
          </>
        }
      >
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Pesquisar por nome, telefone, NIF ou morada…"
        />
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:ml-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as situações</SelectItem>
              <SelectItem value="good">Em dia</SelectItem>
              <SelectItem value="pending">Com pendências</SelectItem>
              <SelectItem value="overdue">Devedores</SelectItem>
            </SelectContent>
          </Select>

          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Grupo" />
            </SelectTrigger>
            <SelectContent>
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
            <SelectTrigger className="sm:w-36">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nome</SelectItem>
              <SelectItem value="createdAt">Data</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
            title="Inverter ordem"
          >
            <ArrowUpDown className="h-4 w-4" />
            {sortOrder === "asc" ? "A-Z" : "Z-A"}
          </Button>
        </div>
      </FilterBar>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {filteredClients.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title={hasFilters ? "Nenhum cliente encontrado" : "Ainda não há clientes"}
          description={hasFilters ? "Tente ajustar a pesquisa ou os filtros." : "Comece por adicionar o primeiro cliente."}
          action={
            !hasFilters && (
              <Button onClick={() => navigate("/app/add-client")}>
                <Plus className="h-4 w-4" />
                Adicionar Cliente
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
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
      )}

      {hasMoreVisible && <LoadMoreButton onClick={loadMoreVisible} />}


      <Fab
        actions={[
          { icon: Download, label: "Exportar", onClick: exportToCSV },
          { icon: Plus, label: "Novo Cliente", onClick: () => navigate("/app/add-client") },
        ]}
      />
    </div>
  );
};

export default ManageClients;