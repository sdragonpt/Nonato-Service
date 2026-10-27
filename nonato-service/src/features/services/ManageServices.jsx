import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { comparePtPt } from "../../utils/sortHelpers.js";
import { useNavigate } from "react-router-dom";
import { useGroups, GROUP_KINDS } from "../../services/groupsStore.js";
import ManageGroupsDialog from "../../components/shared/ManageGroupsDialog.jsx";
import {
  FolderCog,
  Folder,
  Search,
  Plus,
  Loader2,
  Edit2,
  Trash2,
  ArrowUpDown,
  ArrowDown,
  AlertTriangle,
  Wrench,
  MoreVertical,
  Download,
  Euro,
  ClipboardList,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { PageHeader } from "../../components/app";

const ManageServices = () => {
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [sortField, setSortField] = useState("name");
  const [filterType, setFilterType] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all"); // "all" | "none" | id do grupo
  const [manageGroupsOpen, setManageGroupsOpen] = useState(false);
  const { groups, byId: groupsById } = useGroups(GROUP_KINDS.SERVICOS);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  // Scroll infinito: lista pequena e sempre lida por inteiro, por isso não
  // há paginação por cursor à Firestore aqui — só se controla quantos dos
  // que já estão em memória são mostrados de cada vez.
  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const navigate = useNavigate();

  // ✅ Tempo real (onSnapshot): a lista de serviços atualiza-se sozinha
  // quando alguém adiciona/edita/remove um serviço, sem precisar de um
  // botão "Atualizar" manual nem de reler a coleção a cada troca de
  // ordenação (isso agora é feito em memória, ver sortedServices).
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, "servicos"),
      (snapshot) => {
        setServices(
          snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        );
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        console.error("Erro ao buscar serviços:", err);
        setError("Erro ao carregar serviços. Por favor, tente novamente.");
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Nome do grupo de um serviço ("" se não tiver grupo ou o grupo foi apagado).
  const groupNameOf = useCallback(
    (service) => groupsById.get(service.grupoId)?.nome || "",
    [groupsById]
  );

  // Organizado por grupo (por ordem alfabética, "Sem grupo" no fim) e,
  // dentro de cada grupo, pelo campo/ordem escolhidos.
  const sortedServices = useMemo(() => {
    const list = [...services];
    list.sort((a, b) => {
      const ga = groupNameOf(a);
      const gb = groupNameOf(b);
      if (ga !== gb) {
        if (!ga) return 1;
        if (!gb) return -1;
        return comparePtPt(ga, gb);
      }
      const aVal = (a[sortField] ?? "").toString();
      const bVal = (b[sortField] ?? "").toString();
      const cmp = comparePtPt(aVal, bVal);
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return list;
  }, [services, sortField, sortOrder, groupNameOf]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchTerm, filterType, filterGroup]);

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

  const filteredServices = sortedServices.filter((service) => {
    const matchesSearch = service.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || service.type === filterType;
    const matchesGroup =
      filterGroup === "all" ||
      (filterGroup === "none" ? !groupNameOf(service) : service.grupoId === filterGroup);
    return matchesSearch && matchesType && matchesGroup;
  });

  const convertToCSV = (services) => {
    const headers = ["Grupo", "Nome", "Tipo"];
    const rows = services.map((service) => [
      groupNameOf(service),
      service.name,
      getTypeLabel(service.type),
    ]);

    return [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell || ""}"`).join(","))
      .join("\n");
  };

  const currentServices = filteredServices.slice(0, visibleCount);
  const hasMoreVisible = visibleCount < filteredServices.length;

  const loadMoreVisible = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredServices.length));
  }, [filteredServices.length]);

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
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <PageHeader
        title="Gerenciar Serviços"
        description="Gerencie todos os seus serviços em um só lugar"
        actions={
          <>
            <Button
            onClick={() => navigate("/app/add-service")}
            className="hidden sm:flex"
          >
            <Plus className="w-4 h-4" />
            Novo Serviço
          </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total de Serviços
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-1 sm:mt-2">
                {services.length}
              </h3>
            </div>
            <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Por Hora</p>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-1 sm:mt-2">
                {services.filter((service) => service.type === "hour").length}
              </h3>
            </div>
            <Wrench className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Valor Base</p>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-1 sm:mt-2">
                {services.filter((service) => service.type === "base").length}
              </h3>
            </div>
            <Euro className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
          </CardContent>
        </Card>
      </div>

      {/* Filters Card */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* Search */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar serviços..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>

          {/* Grupo */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={filterGroup} onValueChange={setFilterGroup}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Todos os grupos
                </SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.nome}
                  </SelectItem>
                ))}
                <SelectItem value="none" className="text-muted-foreground">
                  Sem grupo
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setManageGroupsOpen(true)}
              className="shrink-0"
            >
              <FolderCog className="w-4 h-4" />
              Gerir grupos
            </Button>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="all"
                 
                >
                  Todos
                </SelectItem>
                <SelectItem
                  value="base"
                 
                >
                  Valor Base
                </SelectItem>
                <SelectItem
                  value="hour"
                 
                >
                  Por Hora
                </SelectItem>
                <SelectItem
                  value="day"
                 
                >
                  Por Dia
                </SelectItem>
                <SelectItem value="km">
                  Por Km
                </SelectItem>
                <SelectItem value="un">
                  Despesa
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortField} onValueChange={setSortField}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="name"
                 
                >
                  Nome
                </SelectItem>
                <SelectItem
                  value="type"
                 
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
              className="w-full sm:w-auto gap-2 bg-primary"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>{sortOrder === "asc" ? "Crescente" : "Decrescente"}</span>
            </Button>
            <span className="text-center sm:text-right text-sm text-muted-foreground">
              A mostrar {currentServices.length} de {filteredServices.length} serviço(s)
            </span>
          </div>

          {error && (
            <Alert
              variant="destructive"
             
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
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
          onClick={() => {
            const csvContent = convertToCSV(sortedServices);
            downloadCSV(csvContent, "servicos.csv");
          }}
          className="bg-accent"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentServices.map((service, index) => {
          const groupName = groupNameOf(service);
          const startsGroup =
            index === 0 || groupName !== groupNameOf(currentServices[index - 1]);
          return (
          <Fragment key={service.id}>
          {startsGroup && (
            <h2 className="md:col-span-2 lg:col-span-3 flex items-center gap-2 pt-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Folder className="h-4 w-4" />
              {groupName || "Sem grupo"}
            </h2>
          )}
          <Card
            className="hover:bg-accent transition-colors cursor-default"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-foreground truncate">
                    {service.name}
                  </h3>
                  <p className="text-muted-foreground text-sm">
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
                      className="rounded-full"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenuItem
                      onClick={() =>
                        navigate(`/app/edit-service/${service.id}`)
                      }
                      className="cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-400 focus:text-red-400 cursor-pointer"
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
          </Fragment>
          );
        })}

        {filteredServices.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="p-8 sm:p-12 text-center">
              <Search className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/70 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2 text-foreground">
                Nenhum serviço encontrado
              </p>
              <p className="text-sm sm:text-base text-muted-foreground">
                Tente ajustar seus filtros ou adicione um novo serviço
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Carregar mais */}
      {hasMoreVisible && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={loadMoreVisible}
            className="gap-2"
          >
            <ArrowDown className="h-4 w-4" />
            Carregar mais
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir o serviço{" "}
              <span className="font-semibold text-foreground">
                {serviceToDelete?.name}
              </span>
              ? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="bg-accent"
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

      <ManageGroupsDialog
        open={manageGroupsOpen}
        onOpenChange={setManageGroupsOpen}
        kind={GROUP_KINDS.SERVICOS}
        title="Grupos de serviços"
        description="Ex: Manutenção, Reparação, Deslocações. Cada serviço pertence a um grupo."
      />

      {/* FAB Menu for Mobile */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 sm:hidden">
        <Button
          onClick={() => {
            const csvContent = convertToCSV(sortedServices);
            downloadCSV(csvContent, "servicos.csv");
          }}
          size="icon"
          className="rounded-full shadow-lg bg-muted hover:bg-accent"
        >
          <Download className="h-5 w-5" />
        </Button>
        <Button
          onClick={() => navigate("/app/add-service")}
          size="icon"
          className="rounded-full shadow-lg"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ManageServices;
