import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Loader2,
  MoreVertical,
  Edit2,
  Trash2,
  Settings,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Layers,
  ListChecks,
  ClipboardList,
  ListChecksIcon,
  FolderIcon,
  RefreshCw,
  PackageCheck, // Para recepção
  GraduationCap,
  Wrench,
  Code,
} from "lucide-react";

// UI Components
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

import { CHECKLIST_CATEGORIES_MAP } from "./components/ChecklistCategories";
import ChecklistFilter from "./components/ChecklistFilter";

const CATEGORY_ICONS = {
  maintenance: {
    icon: Wrench,
    bgColor: "bg-blue-600",
    iconColor: "text-white",
  },
  operational_training: {
    icon: GraduationCap,
    bgColor: "bg-purple-600",
    iconColor: "text-white",
  },
  receiving: {
    icon: PackageCheck,
    bgColor: "bg-green-600",
    iconColor: "text-white",
  },
  programming: {
    icon: Code,
    bgColor: "bg-yellow-600",
    iconColor: "text-white",
  },
  installation: {
    icon: Settings,
    bgColor: "bg-orange-600",
    iconColor: "text-white",
  },
};

const ChecklistTypeCard = ({
  type,
  onDelete,
  onEdit,
  onToggleExpand,
  isExpanded,
}) => {
  // Pega o ícone e cores correspondentes à categoria, ou usa o padrão
  const categoryConfig = CATEGORY_ICONS[type.category] || {
    icon: Settings,
    bgColor: "bg-zinc-600",
    iconColor: "text-white",
  };
  const IconComponent = categoryConfig.icon;

  return (
    <Card className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-full ${categoryConfig.bgColor} flex items-center justify-center`}
          >
            <IconComponent className={`w-5 h-5 ${categoryConfig.iconColor}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg text-white truncate">
                {type.type}
              </h3>
            </div>
            <div className="flex items-center text-zinc-400 text-sm gap-3">
              <div className="flex items-center">
                <ClipboardList className="w-4 h-4 mr-1" />
                <span>
                  {CHECKLIST_CATEGORIES_MAP[type.category]?.label ||
                    "Sem categoria"}
                </span>
              </div>
              <div className="flex items-center">
                <Layers className="w-4 h-4 mr-1" />
                <span>{type.groups?.length || 0} grupo(s)</span>
              </div>
              <div className="flex items-center">
                <ListChecks className="w-4 h-4 mr-1" />
                <span>
                  {type.groups?.reduce(
                    (total, group) =>
                      total + (group.characteristics?.length || 0),
                    0
                  )}{" "}
                  item(ns)
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-zinc-600"
            onClick={onToggleExpand}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-white" />
            ) : (
              <ChevronRight className="h-4 w-4 text-white" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
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
              className="bg-zinc-800 border-zinc-700"
            >
              <DropdownMenuItem
                onClick={onEdit}
                className="text-white hover:bg-zinc-700 cursor-pointer"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-400 hover:bg-zinc-700 focus:text-red-400 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isExpanded && type.groups && type.groups.length > 0 && (
          <div className="mt-4 space-y-4 border-t border-zinc-700 pt-4">
            {type.groups.map((group, index) => (
              <div key={index} className="bg-zinc-900 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">{group.name}</h4>
                <div className="pl-4 space-y-1">
                  {group.characteristics?.map((char, charIndex) => (
                    <div
                      key={charIndex}
                      className="text-zinc-400 text-sm flex items-center gap-2"
                    >
                      <div className="w-1 h-1 rounded-full bg-zinc-500"></div>
                      {char}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ManageChecklist = () => {
  const [types, setTypes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTypes, setExpandedTypes] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState(null);
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState("all");

  const fetchTypes = async () => {
    try {
      setIsLoading(true);
      const q = query(
        collection(db, "checklist_machines"),
        orderBy("type", "asc")
      );
      const snapshot = await getDocs(q);
      setTypes(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setError(null);
    } catch (err) {
      console.error("Erro ao carregar tipos:", err);
      setError("Erro ao carregar tipos. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleDelete = async (typeId) => {
    try {
      await deleteDoc(doc(db, "checklist_machines", typeId));
      setTypes(types.filter((type) => type.id !== typeId));
      setDeleteDialogOpen(false);
      setTypeToDelete(null);
    } catch (error) {
      console.error("Erro ao deletar tipo:", error);
      setError("Erro ao deletar tipo. Por favor, tente novamente.");
    }
  };

  const confirmDelete = (type, e) => {
    e.stopPropagation();
    setTypeToDelete(type);
    setDeleteDialogOpen(true);
  };

  const toggleExpand = (typeId) => {
    setExpandedTypes((prev) => ({ ...prev, [typeId]: !prev[typeId] }));
  };

  const filteredTypes = types.filter((type) => {
    const matchesSearch = type.type
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || type.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    totalTypes: types.length,
    totalGroups: types.reduce(
      (acc, type) => acc + (type.groups?.length || 0),
      0
    ),
    totalItems: types.reduce(
      (acc, type) =>
        acc +
        (type.groups?.reduce(
          (groupAcc, group) => groupAcc + (group.characteristics?.length || 0),
          0
        ) || 0),
      0
    ),
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
            Gerenciar Checklist
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Gerencie todos os seus tipos de checklist em um só lugar
          </p>
        </div>
        <Button
          onClick={() => navigate("/app/add-checklist-type")}
          className="hidden sm:flex bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Tipo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">
                Total de Checklists
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {stats.totalTypes}
              </h3>
            </div>
            <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">
                Total de Grupos
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {stats.totalGroups}
              </h3>
            </div>
            <FolderIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">
                Total de Itens
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {stats.totalItems}
              </h3>
            </div>
            <ListChecksIcon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
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
              placeholder="Buscar tipos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex justify-between items-center">
            <ChecklistFilter
              value={categoryFilter}
              onValueChange={setCategoryFilter}
            />
            <span className="text-sm text-zinc-400">
              {filteredTypes.length} tipo(s) encontrado(s)
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
          onClick={fetchTypes}
          className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar Lista
        </Button>
      </div>

      {/* Checklist Types Grid */}
      <div className="space-y-4">
        {filteredTypes.length > 0 ? (
          filteredTypes.map((type) => (
            <ChecklistTypeCard
              key={type.id}
              type={type}
              isExpanded={expandedTypes[type.id]}
              onToggleExpand={() => toggleExpand(type.id)}
              onEdit={(e) => {
                e.stopPropagation();
                navigate(`/app/edit-checklist-type/${type.id}`);
              }}
              onDelete={(e) => confirmDelete(type, e)}
            />
          ))
        ) : (
          <Card className="bg-zinc-800 border-zinc-700">
            <CardContent className="p-8 sm:p-12 text-center">
              <Search className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2 text-white">
                Nenhum tipo encontrado
              </p>
              <p className="text-sm sm:text-base text-zinc-400">
                Tente ajustar sua busca ou adicione um novo tipo
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
              Tem certeza que deseja excluir o tipo{" "}
              <span className="font-semibold text-white">
                {typeToDelete?.type}
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
              onClick={() => handleDelete(typeToDelete?.id)}
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
          onClick={fetchTypes}
          size="icon"
          className="rounded-full shadow-lg bg-zinc-700 hover:bg-zinc-600"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
        <Button
          onClick={() => navigate("/app/add-checklist-type")}
          size="icon"
          className="rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ManageChecklist;
