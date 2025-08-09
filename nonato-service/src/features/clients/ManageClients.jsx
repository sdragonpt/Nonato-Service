// src/features/clients/ManageClients.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, deleteDoc, doc, query, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import {
  Search,
  Plus,
  Loader2,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Users,
  Building2,
  UserPlus,
  Download,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle,
  CreditCard,
  Euro,
  Phone,
  MapPin,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Edit2
} from "lucide-react";

// UI Components
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

// Financial utils
import { 
  calculateServiceFinancials, 
  getPaymentStatus, 
  formatPrice,
  isServiceOverdue
} from "../../utils/financialUtils";

// ===================================
// HOOK PARA STATUS FINANCEIRO DOS CLIENTES
// ===================================
const useClientFinancialStatus = (clients) => {
  const [financialStatuses, setFinancialStatuses] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!clients?.length) {
      setFinancialStatuses({});
      return;
    }

    const calculateStatuses = async () => {
      setIsLoading(true);
      
      try {
        // Buscar todos os serviços financeiros
        const [partsBudgetsSnapshot, closuresSnapshot] = await Promise.all([
          getDocs(query(collection(db, "ordens"), where("isQuote", "==", true))),
          getDocs(collection(db, "orcamentos"))
        ]);

        const allServices = [
          ...partsBudgetsSnapshot.docs.map(doc => ({ id: doc.id, type: 'parts_budget', ...doc.data() })),
          ...closuresSnapshot.docs.map(doc => ({ id: doc.id, type: 'closure', ...doc.data() }))
        ];

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
  }, [clients]);

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
const ClientCard = ({ client, onEdit, onDelete, onView, financialStatus }) => {
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

        {/* Contact Info */}
        <div className="space-y-1.5 mb-4">
          {client.address && (
            <p className="text-zinc-400 text-xs sm:text-sm truncate flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0" />
              {client.address}
            </p>
          )}
          {client.nif && (
            <p className="text-zinc-400 text-xs sm:text-sm truncate flex items-center gap-2">
              <CreditCard className="w-4 h-4 shrink-0" />
              NIF: {client.nif}
            </p>
          )}
        </div>

        {/* Informações Financeiras */}
        {financialStatus && financialStatus.servicesCount > 0 && (
          <div className="pt-3 border-t border-zinc-700">
            <div className="flex items-center gap-2 mb-2">
              <Euro className="h-4 w-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-300">
                Situação Financeira
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-zinc-400">Total Faturado</p>
                <p className="text-white font-medium">
                  {formatPrice(financialStatus.totalAmount)}
                </p>
              </div>
              
              {financialStatus.pendingAmount > 0 && (
                <div>
                  <p className="text-yellow-400">Pendente</p>
                  <p className="text-yellow-400 font-medium">
                    {formatPrice(financialStatus.pendingAmount)}
                  </p>
                </div>
              )}
              
              {financialStatus.overdueAmount > 0 && (
                <div>
                  <p className="text-red-400">Devedor</p>
                  <p className="text-red-400 font-medium">
                    {formatPrice(financialStatus.overdueAmount)}
                  </p>
                </div>
              )}
              
              {financialStatus.paidAmount > 0 && (
                <div>
                  <p className="text-green-400">Pago</p>
                  <p className="text-green-400 font-medium">
                    {formatPrice(financialStatus.paidAmount)}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1 mt-2 text-xs text-zinc-400">
              <CreditCard className="h-3 w-3" />
              {financialStatus.servicesCount} serviço(s)
            </div>
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const itemsPerPage = 12;

  // Usar o hook de status financeiro
  const { financialStatuses, isLoading: isLoadingFinancial } = useClientFinancialStatus(clients);

  const fetchClients = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const q = query(
        collection(db, "clientes"),
        orderBy(sortField, sortOrder)
      );
      const clientsSnapshot = await getDocs(q);
      const clientsList = clientsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // Buscar contagem de equipamentos para cada cliente
      const clientsWithEquipmentCount = await Promise.all(
        clientsList.map(async (client) => {
          const equipmentsSnapshot = await getDocs(
            query(collection(db, "equipamentos"), where("clientId", "==", client.id))
          );
          return {
            ...client,
            equipmentCount: equipmentsSnapshot.docs.length,
          };
        })
      );
      
      setClients(clientsWithEquipmentCount);
    } catch (err) {
      console.error("Error fetching clients:", err);
      setError("Erro ao carregar clientes. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [sortField, sortOrder]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortField, sortOrder]);

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
      await deleteDoc(doc(db, "clientes", clientToDelete.id));
      setClients((prev) => prev.filter((client) => client.id !== clientToDelete.id));
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
      const searchLower = searchTerm.toLowerCase();
      
      const matchesSearch = 
        (client.name && client.name.toLowerCase().includes(searchLower)) ||
        (client.phone && client.phone.includes(searchTerm)) ||
        (client.address && client.address.toLowerCase().includes(searchLower)) ||
        (client.nif && client.nif.includes(searchTerm)) ||
        (client.postalCode && client.postalCode.includes(searchTerm));
      
      const financialStatus = financialStatuses[client.id];
      
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
  }, [clients, searchTerm, statusFilter, financialStatuses]);

  // Paginação
  const indexOfLastClient = currentPage * itemsPerPage;
  const indexOfFirstClient = indexOfLastClient - itemsPerPage;
  const currentClients = filteredClients.slice(indexOfFirstClient, indexOfLastClient);
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  const exportToCSV = () => {
    const csvContent = [
      ["Nome da Empresa", "Telefone", "Endereço", "Código Postal", "NIF", "Equipamentos", "Status Financeiro", "Total Faturado", "Pendente", "Devedor"],
      ...filteredClients.map(client => {
        const financial = financialStatuses[client.id];
        return [
          client.name || "",
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
                onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                className="flex-1 sm:flex-none border-zinc-700 text-white hover:bg-zinc-700"
              >
                <ArrowUpDown className="w-4 h-4 mr-2" />
                {sortOrder === "asc" ? "A-Z" : "Z-A"}
              </Button>
              
              <Button
                variant="outline"
                onClick={fetchClients}
                className="flex-1 sm:flex-none border-zinc-700 text-white hover:bg-zinc-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
              
              <Button
                variant="outline"
                onClick={exportToCSV}
                className="flex-1 sm:flex-none border-zinc-700 text-white hover:bg-zinc-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-700">
            <span className="text-sm text-zinc-400">
              {filteredClients.length} cliente(s) encontrado(s) - Página {currentPage} de {totalPages || 1}
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

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {currentPage > 3 && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => paginate(1)}
                className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800"
              >
                1
              </Button>
              {currentPage > 4 && <span className="text-zinc-400">...</span>}
            </>
          )}

          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            let pageNumber;
            if (totalPages <= 5) {
              pageNumber = i + 1;
            } else if (currentPage <= 3) {
              pageNumber = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNumber = totalPages - 4 + i;
            } else {
              pageNumber = currentPage - 2 + i;
            }

            if (pageNumber >= 1 && pageNumber <= totalPages) {
              return (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? "secondary" : "outline"}
                  size="icon"
                  onClick={() => paginate(pageNumber)}
                  className={`border-zinc-700 ${
                    currentPage === pageNumber
                      ? "bg-zinc-700 text-white hover:bg-zinc-600"
                      : "text-white hover:bg-zinc-700 bg-zinc-800"
                  }`}
                >
                  {pageNumber}
                </Button>
              );
            }
            return null;
          })}

          {currentPage < totalPages - 2 && (
            <>
              {currentPage < totalPages - 3 && (
                <span className="text-zinc-400">...</span>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => paginate(totalPages)}
                className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800"
              >
                {totalPages}
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800 disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir o cliente "{clientToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FAB Menu for Mobile */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 sm:hidden">
        <Button
          onClick={fetchClients}
          size="icon"
          className="rounded-full shadow-lg bg-zinc-700 hover:bg-zinc-600"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
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