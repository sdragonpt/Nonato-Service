import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Loader2,
  Edit2,
  Trash2,
  ArrowUpDown,
  AlertTriangle,
  Wrench,
  MoreVertical,
  RefreshCw,
  Download,
  Euro,
  ClipboardList,
} from "lucide-react";

// UI Components
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

const ManageServices = () => {
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortField, setSortField] = useState("name");
  const [filterType, setFilterType] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const navigate = useNavigate();

  const fetchServices = useCallback(async () => {
    try {
      setIsLoading(true);
      const q = query(
        collection(db, "servicos"),
        orderBy(sortField, sortOrder)
      );
      const snapshot = await getDocs(q);
      const servicesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setServices(servicesData);
      setError(null);
    } catch (err) {
      console.error("Erro ao buscar serviços:", err);
      setError("Erro ao carregar serviços. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [sortField, sortOrder]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleDelete = async (serviceId) => {
    try {
      await deleteDoc(doc(db, "servicos", serviceId));
      setServices((prev) => prev.filter((service) => service.id !== serviceId));
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    } catch (error) {
      console.error("Erro ao deletar serviço:", error);
      setError("Erro ao deletar serviço. Por favor, tente novamente.");
    }
  };

  const confirmDelete = (service, e) => {
    e.stopPropagation();
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  const getTypeLabel = (type) =>
    ({
      base: "Valor Base",
      un: "Despesa",
      hour: "Por Hora",
      day: "Por Dia",
      km: "Por Km",
    }[type] || type);

  const filteredServices = services.filter((service) => {
    const matchesSearch = service.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    if (filterType === "all") return matchesSearch;
    return matchesSearch && service.type === filterType;
  });

  const convertToCSV = (services) => {
    const headers = ["Nome", "Tipo"];
    const rows = services.map((service) => [
      service.name,
      getTypeLabel(service.type),
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Gerenciar Serviços
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Gerencie todos os seus serviços em um só lugar
          </p>
        </div>
        <Button
          onClick={() => navigate("/app/add-service")}
          className="hidden sm:flex bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Serviço
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">
                Total de Serviços
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {services.length}
              </h3>
            </div>
            <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Por Hora</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {services.filter((service) => service.type === "hour").length}
              </h3>
            </div>
            <Wrench className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Valor Base</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {services.filter((service) => service.type === "base").length}
              </h3>
            </div>
            <Euro className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
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
              placeholder="Buscar serviços..."
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
                  value="base"
                  className="text-white hover:bg-zinc-700"
                >
                  Valor Base
                </SelectItem>
                <SelectItem
                  value="hour"
                  className="text-white hover:bg-zinc-700"
                >
                  Por Hora
                </SelectItem>
                <SelectItem
                  value="day"
                  className="text-white hover:bg-zinc-700"
                >
                  Por Dia
                </SelectItem>
                <SelectItem value="km" className="text-white hover:bg-zinc-700">
                  Por Km
                </SelectItem>
                <SelectItem value="un" className="text-white hover:bg-zinc-700">
                  Despesa
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
                  value="type"
                  className="text-white hover:bg-zinc-700"
                >
                  Tipo
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
              {filteredServices.length} serviço(s) encontrado(s)
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
          onClick={() => fetchServices()}
          className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar Lista
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            const csvContent = convertToCSV(services);
            downloadCSV(csvContent, "servicos.csv");
          }}
          className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((service) => (
          <Card
            key={service.id}
            // onClick={() => navigate(`/app/service/${service.id}`)}
            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors cursor-default"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-white truncate">
                    {service.name}
                  </h3>
                  <p className="text-zinc-400 text-sm">
                    {getTypeLabel(service.type)}
                  </p>
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
                      onClick={() =>
                        navigate(`/app/edit-service/${service.id}`)
                      }
                      className="text-white hover:bg-zinc-700 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-400 hover:bg-zinc-700 focus:text-red-400 cursor-pointer"
                      onClick={(e) => confirmDelete(service, e)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredServices.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3 bg-zinc-800 border-zinc-700">
            <CardContent className="p-8 sm:p-12 text-center">
              <Search className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2 text-white">
                Nenhum serviço encontrado
              </p>
              <p className="text-sm sm:text-base text-zinc-400">
                Tente ajustar seus filtros ou adicione um novo serviço
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
              Tem certeza que deseja excluir o serviço{" "}
              <span className="font-semibold text-white">
                {serviceToDelete?.name}
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
              onClick={() => handleDelete(serviceToDelete?.id)}
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
          onClick={() => fetchServices()}
          size="icon"
          className="rounded-full shadow-lg bg-zinc-700 hover:bg-zinc-600"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
        <Button
          onClick={() => {
            const csvContent = convertToCSV(services);
            downloadCSV(csvContent, "servicos.csv");
          }}
          size="icon"
          className="rounded-full shadow-lg bg-zinc-700 hover:bg-zinc-600"
        >
          <Download className="h-5 w-5" />
        </Button>
        <Button
          onClick={() => navigate("/app/add-service")}
          size="icon"
          className="rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ManageServices;
