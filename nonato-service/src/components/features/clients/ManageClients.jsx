import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  Search,
  UserPlus,
  Loader2,
  Edit2,
  Trash2,
  ArrowUpDown,
  AlertTriangle,
  Phone,
  Map,
  MoreVertical,
  Building2,
  Mail,
  Users,
  User,
  RefreshCw,
  Download,
} from "lucide-react";

// UI Components
import { Card, CardContent } from "@/components/ui/card.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

const ManageClients = () => {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortField, setSortField] = useState("name");
  const [filterType, setFilterType] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const navigate = useNavigate();

  const fetchClients = useCallback(async () => {
    try {
      setIsLoading(true);
      const q = query(
        collection(db, "clientes"),
        orderBy(sortField, sortOrder)
      );
      const snapshot = await getDocs(q);
      const clientsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        type: doc.data().type || "individual", // Ensure type exists
      }));
      setClients(clientsData);
      setError(null);
    } catch (err) {
      console.error("Erro ao buscar clientes:", err);
      setError("Erro ao carregar clientes. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [sortField, sortOrder]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleDelete = async (clientId) => {
    try {
      await deleteDoc(doc(db, "clientes", clientId));
      setClients((prev) => prev.filter((client) => client.id !== clientId));
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    } catch (error) {
      console.error("Erro ao deletar cliente:", error);
      setError("Erro ao deletar cliente. Por favor, tente novamente.");
    }
  };

  const confirmDelete = (client, e) => {
    e.stopPropagation();
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.address?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterType === "all") return matchesSearch;
    return matchesSearch && client.type === filterType;
  });

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
          <UserPlus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">
                Total de Clientes
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {clients.length}
              </h3>
            </div>
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Pessoa</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {
                  clients.filter((client) => client.type === "individual")
                    .length
                }
              </h3>
            </div>
            <User className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Empresa</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {clients.filter((client) => client.type === "company").length}
              </h3>
            </div>
            <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
          </CardContent>
        </Card>
      </div>

      {/* Filters Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* Search */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Buscar por nome, telefone, email ou endereço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem
                  value="all"
                  className="text-white hover:bg-zinc-700"
                >
                  Todos
                </SelectItem>
                <SelectItem
                  value="individual"
                  className="text-white hover:bg-zinc-700"
                >
                  Pessoa Física
                </SelectItem>
                <SelectItem
                  value="company"
                  className="text-white hover:bg-zinc-700"
                >
                  Empresa
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortField} onValueChange={setSortField}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem
                  value="name"
                  className="text-white hover:bg-zinc-700"
                >
                  Nome
                </SelectItem>
                <SelectItem
                  value="createdAt"
                  className="text-white hover:bg-zinc-700"
                >
                  Data de Cadastro
                </SelectItem>
                <SelectItem
                  value="lastUpdate"
                  className="text-white hover:bg-zinc-700"
                >
                  Última Atualização
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order and Results Count */}
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <Button
              variant="outline"
              onClick={() =>
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
              }
              className="w-full sm:w-auto gap-2 text-white border-zinc-700 hover:bg-zinc-700 bg-green-600"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>{sortOrder === "asc" ? "Crescente" : "Decrescente"}</span>
            </Button>
            <span className="text-center sm:text-right text-sm text-zinc-400">
              {filteredClients.length} cliente(s) encontrado(s)
            </span>
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

      {/* Quick Actions - Desktop Only */}
      <div className="hidden sm:flex gap-2">
        <Button
          variant="outline"
          onClick={() => fetchClients()}
          className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar Lista
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            const csvContent = convertToCSV(clients);
            downloadCSV(csvContent, "clientes.csv");
          }}
          className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
          <Card
            key={client.id}
            onClick={() => navigate(`/app/client/${client.id}`)}
            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                  <AvatarImage src={client.profilePic} alt={client.name} />
                  <AvatarFallback className="bg-zinc-700 text-white text-sm">
                    {getInitials(client.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base sm:text-lg text-white truncate">
                      {client.name}
                    </h3>
                    <Badge
                      className={`text-xs ${
                        client.type === "company"
                          ? "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20"
                          : "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                      }`}
                    >
                      {client.type === "company" ? "E" : "P"}
                    </Badge>
                  </div>
                  {client.company && (
                    <p className="text-zinc-400 text-xs sm:text-sm truncate">
                      {client.company}
                    </p>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full hover:bg-zinc-700 text-white"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    onClick={(e) => e.stopPropagation()}
                    className="bg-zinc-800 border-zinc-700"
                  >
                    <DropdownMenuItem
                      onClick={() => navigate(`/app/edit-client/${client.id}`)}
                      className="text-white hover:bg-zinc-700 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-400 hover:bg-zinc-700 focus:text-red-400 cursor-pointer"
                      onClick={(e) => confirmDelete(client, e)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Contact Info */}
              <div className="mt-3 space-y-1.5">
                {client.email && (
                  <p className="text-zinc-400 text-xs sm:text-sm truncate flex items-center gap-2">
                    <Mail className="w-4 h-4 shrink-0" />
                    {client.email}
                  </p>
                )}
                {client.phone && (
                  <p className="text-zinc-400 text-xs sm:text-sm truncate flex items-center gap-2">
                    <Phone className="w-4 h-4 shrink-0" />
                    {client.phone}
                  </p>
                )}
                {client.address && (
                  <p className="text-zinc-400 text-xs sm:text-sm truncate flex items-center gap-2">
                    <Map className="w-4 h-4 shrink-0" />
                    {client.address}
                  </p>
                )}
                {client.cnpj && (
                  <p className="text-zinc-400 text-xs sm:text-sm truncate flex items-center gap-2">
                    <Building2 className="w-4 h-4 shrink-0" />
                    {client.cnpj}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredClients.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3 bg-zinc-800 border-zinc-700">
            <CardContent className="p-8 sm:p-12 text-center">
              <Search className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2 text-white">
                Nenhum cliente encontrado
              </p>
              <p className="text-sm sm:text-base text-zinc-400">
                Tente ajustar seus filtros ou adicione um novo cliente
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir o cliente{" "}
              <span className="font-semibold text-white">
                {clientToDelete?.name}
              </span>
              ? Esta ação não pode ser desfeita.
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
              onClick={() => handleDelete(clientToDelete?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FAB Menu for Mobile */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 sm:hidden">
        <Button
          onClick={() => fetchClients()}
          size="icon"
          className="rounded-full shadow-lg bg-zinc-700 hover:bg-zinc-600"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
        <Button
          onClick={() => {
            const csvContent = convertToCSV(clients);
            downloadCSV(csvContent, "clientes.csv");
          }}
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
          <UserPlus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

// Utility Functions
const convertToCSV = (clients) => {
  const headers = ["Nome", "Email", "Telefone", "Endereço", "Tipo", "CNPJ"];
  const rows = clients.map((client) => [
    client.name,
    client.email,
    client.phone,
    client.address,
    client.type === "company" ? "Empresa" : "Pessoa",
    client.cnpj || "",
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

export default ManageClients;
