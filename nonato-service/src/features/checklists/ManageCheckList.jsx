import { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useNavigate } from "react-router-dom";
import { comparePtPt } from "../../utils/sortHelpers.js";
import {
  Search,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Settings,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ArrowDown,
  Layers,
  ListChecks,
  ClipboardList,
  ListChecksIcon,
  FolderIcon,
  PackageCheck, // Para recepção
  GraduationCap,
  Wrench,
  Code,
  CheckSquare,
} from "lucide-react";

// UI Components
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
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
import { PageHeader, StatCard, SearchInput, PageLoader, EmptyState } from "../../components/app";

const CATEGORY_ICONS = {
  maintenance: {
    icon: Wrench,
    bgColor: "bg-blue-600",
    iconColor: "text-foreground",
  },
  operational_training: {
    icon: GraduationCap,
    bgColor: "bg-purple-600",
    iconColor: "text-foreground",
  },
  receiving: {
    icon: PackageCheck,
    bgColor: "bg-primary",
    iconColor: "text-foreground",
  },
  programming: {
    icon: Code,
    bgColor: "bg-yellow-600",
    iconColor: "text-foreground",
  },
  installation: {
    icon: Settings,
    bgColor: "bg-orange-600",
    iconColor: "text-foreground",
  },
  pre_operational: {
    icon: ListChecks,
    bgColor: "bg-cyan-600",
    iconColor: "text-foreground",
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
    bgColor: "bg-accent",
    iconColor: "text-foreground",
  };
  const IconComponent = categoryConfig.icon;

  return (
    <Card className="hover:bg-accent transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-full ${categoryConfig.bgColor} flex items-center justify-center`}
          >
            <IconComponent className={`w-5 h-5 ${categoryConfig.iconColor}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg text-foreground truncate">
                {type.type}
              </h3>
            </div>
            <div className="flex items-center text-muted-foreground text-sm gap-3">
              <div className="flex items-center">
                <ClipboardList className="w-4 h-4 mr-1" />
                <span>
                  {CHECKLIST_CATEGORIES_MAP[type.category]?.label ||
                    "Sem categoria"}
                </span>
              </div>
              {type.familyName && (
                <div className="flex items-center">
                  <FolderIcon className="w-4 h-4 mr-1" />
                  <span>
                    {type.familyName}
                    {type.groupName ? ` > ${type.groupName}` : ""}
                  </span>
                </div>
              )}
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
            className="rounded-full"
            onClick={onToggleExpand}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-foreground" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
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
            >
              <DropdownMenuItem
                onClick={onEdit}
                className="cursor-pointer"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-400 focus:text-red-400 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isExpanded && type.groups && type.groups.length > 0 && (
          <div className="mt-4 space-y-4 border-t border-border pt-4">
            {type.groups.map((group, index) => (
              <div key={index} className="bg-muted/50 rounded-lg p-4">
                <h4 className="text-foreground font-medium mb-2">{group.name}</h4>
                <div className="pl-4 space-y-1">
                  {group.characteristics?.map((char, charIndex) => (
                    <div
                      key={charIndex}
                      className="text-muted-foreground text-sm flex items-center gap-2"
                    >
                      <div className="w-1 h-1 rounded-full bg-muted-foreground"></div>
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

  // Scroll infinito: lista pequena e sempre lida por inteiro, por isso não
  // há paginação por cursor à Firestore aqui — só se controla quantos dos
  // que já estão em memória são mostrados de cada vez.
  const PAGE_SIZE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // ✅ Tempo real (onSnapshot): a lista de tipos de checklist atualiza-se
  // sozinha quando alguém adiciona/edita/remove um tipo, sem precisar de um
  // botão "Atualizar" manual. A ordenação é feita em memória (ver sortedTypes)
  // para não precisar reler a coleção.
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, "checklist_machines"),
      (snapshot) => {
        setTypes(
          snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        );
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar tipos:", err);
        setError("Erro ao carregar tipos. Por favor, tente novamente.");
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const sortedTypes = useMemo(() => {
    const list = [...types];
    list.sort((a, b) => comparePtPt(a.type, b.type));
    return list;
  }, [types]);

  const handleDelete = async (typeId) => {
    try {
      await deleteDoc(doc(db, "checklist_machines", typeId));
      // A lista atualiza-se sozinha via onSnapshot
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

  const filteredTypes = sortedTypes.filter((type) => {
    const matchesSearch = type.type
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || type.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Scroll infinito: mostra só os primeiros `visibleCount` tipos já
  // filtrados (a lista inteira está em memória).
  const currentTypes = filteredTypes.slice(0, visibleCount);
  const hasMoreVisible = visibleCount < filteredTypes.length;

  const loadMoreVisible = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredTypes.length));
  }, [filteredTypes.length]);

  // Resetar quantos são mostrados quando os filtros mudarem
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchTerm, categoryFilter]);

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
      <PageLoader />
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <PageHeader
        icon={CheckSquare}
        title="Gerenciar Checklist"
        description="Gerencie todos os seus tipos de checklist em um só lugar"
        actions={
          <>
            <div className="hidden sm:flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/app/checklist-families")}
            >
              <Layers className="w-4 h-4" />
              Famílias / Grupos
            </Button>
            <Button
              onClick={() => navigate("/app/add-checklist-type")}
            >
              <Plus className="w-4 h-4" />
              Novo Tipo
            </Button>
          </div>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total de Checklists"
          value={stats.totalTypes}
          icon={ClipboardList}
        />

        <StatCard
          label="Total de Grupos"
          value={stats.totalGroups}
          icon={FolderIcon}
          tone="info"
        />

        <StatCard
          label="Total de Itens"
          value={stats.totalItems}
          icon={ListChecksIcon}
          tone="violet"
        />
      </div>

      {/* Filters Card */}
      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* Search */}
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Buscar tipos..." className="lg:max-w-none w-full" />

          {/* Category Filter */}
          <div className="flex justify-between items-center">
            <ChecklistFilter
              value={categoryFilter}
              onValueChange={setCategoryFilter}
            />
            <span className="text-sm text-muted-foreground">
              A mostrar {currentTypes.length} de {filteredTypes.length} tipo(s)
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

      {/* Checklist Types Grid */}
      <div className="space-y-4">
        {filteredTypes.length > 0 ? (
          currentTypes.map((type) => (
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
          <EmptyState
            icon={Search}
            title="Nenhum tipo encontrado"
            description="Tente ajustar sua busca ou adicione um novo tipo"
          />
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
              Tem certeza que deseja excluir o tipo{" "}
              <span className="font-semibold text-foreground">
                {typeToDelete?.type}
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
          onClick={() => navigate("/app/add-checklist-type")}
          size="icon"
          className="rounded-full shadow-lg"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ManageChecklist;
