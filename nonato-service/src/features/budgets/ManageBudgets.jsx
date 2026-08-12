import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import generateSimpleBudgetPDF from "./components/pdf/generateSimpleBudgetPDF";
import generateBudgetPDF from "./components/pdf/generateBudgetPDF";
import formatEuroNumber from "../../utils/formatters/formatEuroNumber";
import { searchIncludes } from "../../utils/normalizeSearch.js";
import { fetchPage } from "../../utils/firestorePage.js";
import { useClients } from "../../context/ClientsContext.jsx";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";
import {
  collection,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import {
  Search,
  Plus,
  Loader2,
  MoreVertical,
  FileText,
  Trash2,
  Eye,
  UserPlus,
  UserSquare,
  Receipt,
  FileCheck,
  AlertTriangle,
  Edit2,
  ArrowUpDown,
  ArrowDown,
  Wallet,
} from "lucide-react";

// UI Components
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ✅ Metadados por tipo de documento — substitui a antiga divisão "Sem
// Cadastro" / "Com Cadastro" (que era um detalhe técnico, não uma
// categoria útil para o utilizador) por três tipos reais e reconhecíveis.
const DOC_TYPE_META = {
  closure: {
    label: "Fechamento",
    icon: UserPlus,
    badgeClass: "bg-purple-500/15 text-purple-400",
    iconBg: "bg-purple-600",
  },
  budget: {
    label: "Orçamento",
    icon: FileCheck,
    badgeClass: "bg-blue-500/15 text-blue-400",
    iconBg: "bg-blue-600",
  },
  expense: {
    label: "Despesa",
    icon: Receipt,
    badgeClass: "bg-amber-500/15 text-amber-400",
    iconBg: "bg-amber-600",
  },
};

const FILTERS = [
  { key: "all", label: "Todos", icon: FileText },
  { key: "closure", label: "Fechamentos", icon: UserPlus },
  { key: "budget", label: "Orçamentos", icon: FileCheck },
  { key: "expense", label: "Despesas", icon: Receipt },
];

const PAGE_SIZE = 10;
const MAX_AUTO_LOADS = 15; // salvaguarda: nº máx. de lotes extra a carregar automaticamente ao filtrar/pesquisar

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  return new Date(value);
};

const BudgetCard = ({ budget, onDelete, onViewPDF, navigate }) => {
  const meta = DOC_TYPE_META[budget.docType];
  const Icon = meta.icon;
  const date = toDate(budget.createdAt);

  return (
    <Card className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-full ${meta.iconBg} flex items-center justify-center shrink-0`}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-white truncate">
                {budget.displayName}
              </h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${meta.badgeClass}`}
              >
                {meta.label}
              </span>
            </div>
            <p className="text-zinc-400 text-sm font-mono">
              {budget.budgetNumber || budget.orderNumber}
            </p>
            <div className="flex items-center gap-3 text-sm text-zinc-400 mt-1">
              {date && <span>{date.toLocaleDateString("pt-PT")}</span>}
              <span className="font-medium text-white">
                {formatEuroNumber(budget.total)}€
              </span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-zinc-700 text-white shrink-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-zinc-800 border-zinc-700"
            >
              <DropdownMenuItem
                onClick={() =>
                  navigate(
                    `/app/edit-${
                      budget.type === "simple" ? "simple-" : ""
                    }budget/${budget.id}`
                  )
                }
                className="text-white hover:bg-zinc-700 cursor-pointer"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onViewPDF(budget, true)}
                className="text-white hover:bg-zinc-700 cursor-pointer"
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver PDF com IVA
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onViewPDF(budget, false)}
                className="text-white hover:bg-zinc-700 cursor-pointer"
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver PDF sem IVA
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-400 hover:bg-zinc-700 focus:text-red-400 cursor-pointer"
                onClick={() => onDelete(budget.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

const ManageBudgets = () => {
  const navigate = useNavigate();
  const { ensureClients, getClientById } = useClients();

  // ✅ Lista única, carregada por lotes (cursor do Firestore) em vez de ler
  // a coleção "orcamentos" inteira de uma só vez.
  const [items, setItems] = useState([]);
  const [clientNames, setClientNames] = useState({});
  const clientNamesRef = useRef({});
  const cursorRef = useRef(null);
  const autoLoadCountRef = useRef(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [, setIsGeneratingPDF] = useState(false);
  const [documentTypeFilter, setDocumentTypeFilter] = useState(() => {
    const saved = localStorage.getItem("documentTypeFilter");
    return saved || "all";
  });
  const [sortDirection, setSortDirection] = useState("desc"); // desc = mais recentes primeiro

  // Contagens exatas (via aggregation query — não exigem ler os documentos)
  const [counts, setCounts] = useState({
    all: null,
    closure: null,
    budget: null,
    expense: null,
  });

  // Estados para confirmação de exclusão
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState(null);

  useEffect(() => {
    localStorage.setItem("documentTypeFilter", documentTypeFilter);
  }, [documentTypeFilter]);

  useEffect(() => {
    clientNamesRef.current = clientNames;
  }, [clientNames]);

  // Contagens totais por tipo (cheap: aggregation query, não lê os docs)
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const budgetsRef = collection(db, "orcamentos");
        const [totalSnap, expenseSnap, budgetSnap] = await Promise.all([
          getCountFromServer(budgetsRef),
          getCountFromServer(query(budgetsRef, where("isExpense", "==", true))),
          getCountFromServer(
            query(
              budgetsRef,
              where("type", "==", "simple"),
              where("isExpense", "==", false)
            )
          ),
        ]);
        const total = totalSnap.data().count;
        const expense = expenseSnap.data().count;
        const budgetCount = budgetSnap.data().count;
        setCounts({
          all: total,
          expense,
          budget: budgetCount,
          closure: total - expense - budgetCount,
        });
      } catch (err) {
        console.error("Erro ao contar orçamentos:", err);
      }
    };
    fetchCounts();
  }, []);

  // Busca nomes de clientes só para os fechamentos ainda não resolvidos
  // (populados aos poucos, à medida que novos lotes chegam). Usa o cache
  // partilhado (ClientsContext) em vez de um getDoc por cliente — na
  // maioria dos casos os clientes já estão em cache de outra página desta
  // sessão, e mesmo numa cache fria isto é 1 leitura (a coleção inteira,
  // já partilhada com o resto da app) em vez de N leituras individuais.
  const enrichClientNames = useCallback(
    async (docs) => {
      const missingIds = [
        ...new Set(
          docs
            .filter((b) => b.clientId && !b.clientData)
            .map((b) => b.clientId)
        ),
      ].filter((id) => !clientNamesRef.current[id]);
      if (!missingIds.length) return;

      await ensureClients();
      const entries = missingIds.map((clientId) => [
        clientId,
        getClientById(clientId)?.name || "Cliente não encontrado",
      ]);
      setClientNames((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    },
    [ensureClients, getClientById]
  );

  const loadPage = useCallback(
    async (cursor) => {
      const budgetsRef = collection(db, "orcamentos");
      const baseQuery = query(budgetsRef, orderBy("createdAt", "desc"));
      const { docs, cursor: nextCursor, hasMore: more } = await fetchPage(baseQuery, {
        pageSize: PAGE_SIZE,
        cursor,
      });
      await enrichClientNames(docs);
      cursorRef.current = nextCursor;
      setHasMore(more);
      return docs;
    },
    [enrichClientNames]
  );

  // Primeiro lote
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        cursorRef.current = null;
        const docs = await loadPage(null);
        setItems(docs);
      } catch (err) {
        console.error("Error fetching budgets:", err);
        setError("Erro ao carregar orçamentos");
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !cursorRef.current) return;
    setIsLoadingMore(true);
    try {
      const docs = await loadPage(cursorRef.current);
      setItems((prev) => [...prev, ...docs]);
    } catch (err) {
      console.error("Error loading more budgets:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, loadPage]);

  const handleDelete = (budgetId) => {
    setBudgetToDelete(budgetId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!budgetToDelete) return;
    try {
      await deleteDoc(doc(db, "orcamentos", budgetToDelete));
      setItems((prev) => prev.filter((b) => b.id !== budgetToDelete));
      setDeleteDialogOpen(false);
      setBudgetToDelete(null);
    } catch (error) {
      setError("Erro ao excluir orçamento");
      console.error(error);
    }
  };

  const handleViewPDF = async (budget, showIVA = false) => {
    try {
      setIsGeneratingPDF(true);

      // Define mobile environment first
      const isMobile = window?.Capacitor?.isNative;

      // Determine if this is a regular budget (with registration) or simple budget
      const isRegularBudget = Boolean(budget.clientId);
      let pdfBlob;

      if (isRegularBudget) {
        // Handle regular budget (com cadastro)
        const formattedServices = budget.services.map((service) => ({
          ...service,
          value: parseFloat(service.value || 0),
          quantity: parseFloat(service.quantity || 1),
          total:
            parseFloat(service.value || 0) * parseFloat(service.quantity || 1),
        }));

        const clientData = {
          name: clientNames[budget.clientId] || "Cliente não encontrado",
        };

        // Passar showIVA e ivaRate para o generateBudgetPDF
        pdfBlob = await generateBudgetPDF(
          { ...budget, showIVA, ivaRate: budget.ivaRate || 23 },
          clientData,
          formattedServices,
          budget.orderNumber
        );

        if (!isMobile || !pdfBlob) {
          return;
        }
      } else {
        // Handle simple budget (sem cadastro)
        const formattedServices = budget.services.map((service) => ({
          name: service.name || "",
          type: service.type || "un",
          value: parseFloat(service.value || 0),
          quantity: parseFloat(service.quantity || 1),
          total:
            parseFloat(service.value || 0) * parseFloat(service.quantity || 1),
        }));

        const formattedBudget = {
          ...budget,
          budgetNumber: budget.budgetNumber || "",
          clientData: {
            name: budget.clientData?.name || "",
            phone: budget.clientData?.phone || "",
            address: budget.clientData?.address || "",
          },
          services: formattedServices,
          total: formattedServices.reduce(
            (acc, service) => acc + service.total,
            0
          ),
          createdAt: budget.createdAt || new Date(),
          isExpense: budget.isExpense || false,
          showIVA, // Adicionar showIVA
          ivaRate: budget.ivaRate || 23, // Garantir que ivaRate está definido
        };

        pdfBlob = await generateSimpleBudgetPDF(formattedBudget);
      }

      // ✅ Nome do ficheiro = número do documento (fechamentos e orçamentos
      // simples partilham o mesmo contador ORC, por isso nunca colidem entre
      // si) + sufixo -C/-S consoante a versão com ou sem IVA, para as duas
      // versões descarregadas não se substituírem uma à outra.
      const docNumber = isRegularBudget
        ? budget.orderNumber || budget.budgetNumber || `ORC-${budget.id}`
        : budget.budgetNumber ||
          `${budget.isExpense ? "DESP" : "ORC"}-${budget.id}`;
      const fileName = `${docNumber}${showIVA ? "-C" : "-S"}.pdf`;

      // Handle file saving/opening based on platform
      if (isMobile) {
        try {
          const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(pdfBlob);
          });

          await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true,
          });

          const { uri } = await Filesystem.getUri({
            directory: Directory.Documents,
            path: fileName,
          });

          await FileOpener.open({
            filePath: uri,
            contentType: "application/pdf",
          });
        } catch (error) {
          console.error("Error saving/opening file on device:", error);
          throw error;
        }
      } else {
        // Web download handling
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      setError("Erro ao gerar PDF. Por favor, tente novamente.");
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ✅ Tipo real por documento (fechamento / orçamento / despesa), derivado
  // dos itens já carregados.
  const allBudgets = useMemo(() => {
    return items.map((b) => {
      if (b.clientData) {
        return {
          ...b,
          docType: b.isExpense ? "expense" : "budget",
          displayName: b.clientData?.name || "Cliente não informado",
        };
      }
      return {
        ...b,
        docType: "closure",
        displayName: clientNames[b.clientId] || "Cliente não encontrado",
      };
    });
  }, [items, clientNames]);

  const filteredBudgets = useMemo(() => {
    try {
      const filtered = allBudgets.filter((budget) => {
        const matchesSearch =
          searchIncludes(budget.displayName, searchTerm) ||
          searchIncludes(budget.budgetNumber || budget.orderNumber, searchTerm);
        const matchesType =
          documentTypeFilter === "all" || budget.docType === documentTypeFilter;
        return matchesSearch && matchesType;
      });

      return filtered.sort((a, b) => {
        const dateA = toDate(a.createdAt)?.getTime() || 0;
        const dateB = toDate(b.createdAt)?.getTime() || 0;
        return sortDirection === "desc" ? dateB - dateA : dateA - dateB;
      });
    } catch (error) {
      console.error("Error filtering budgets:", error);
      return [];
    }
  }, [allBudgets, searchTerm, documentTypeFilter, sortDirection]);

  const totalValue = useMemo(
    () => filteredBudgets.reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0),
    [filteredBudgets]
  );

  // Reinicia o contador de carregamentos automáticos sempre que a busca ou
  // o filtro mudam.
  useEffect(() => {
    autoLoadCountRef.current = 0;
  }, [searchTerm, documentTypeFilter]);

  // Ao pesquisar ou filtrar por tipo, os resultados só existem dentro do
  // que já foi carregado — por isso, se houver poucos resultados e ainda
  // houver mais documentos por trás, vamos buscando lotes extra
  // automaticamente até haver resultados suficientes (ou a coleção acabar).
  // Isto mantém a busca "completa" sem obrigar a ler tudo logo de início.
  useEffect(() => {
    const isFiltering = Boolean(searchTerm) || documentTypeFilter !== "all";
    if (
      isFiltering &&
      hasMore &&
      !isLoadingMore &&
      !isLoading &&
      filteredBudgets.length < PAGE_SIZE &&
      autoLoadCountRef.current < MAX_AUTO_LOADS
    ) {
      autoLoadCountRef.current += 1;
      loadMore();
    }
  }, [
    searchTerm,
    documentTypeFilter,
    filteredBudgets.length,
    hasMore,
    isLoadingMore,
    isLoading,
    loadMore,
  ]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Gerenciar Orçamentos
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Fechamentos, orçamentos e despesas, tudo num só lugar
          </p>
        </div>
        <div className="hidden sm:flex gap-2">
          <Button
            onClick={() => navigate("/app/add-simple-budget")}
            variant="outline"
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800"
          >
            <Plus className="w-4 h-4 mr-2" />
            Orçamento / Despesa
          </Button>
          <Button
            onClick={() => navigate("/app/add-budget")}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Fechar Ordem
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {FILTERS.map(({ key, label, icon: StatIcon }) => (
          <Card
            key={key}
            className={`bg-zinc-800 border-zinc-700 cursor-pointer transition-colors ${
              documentTypeFilter === key ? "ring-1 ring-green-500" : "hover:bg-zinc-700"
            }`}
            onClick={() => setDocumentTypeFilter(key)}
          >
            <CardContent className="flex items-center justify-between p-4 sm:p-5">
              <div>
                <p className="text-sm font-medium text-zinc-400">{label}</p>
                <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
                  {counts[key] === null ? "…" : counts[key]}
                </h3>
              </div>
              <StatIcon
                className={`h-6 w-6 sm:h-7 sm:w-7 ${
                  key === "all"
                    ? "text-green-500"
                    : key === "closure"
                    ? "text-purple-400"
                    : key === "budget"
                    ? "text-blue-400"
                    : "text-amber-400"
                }`}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="space-y-4 p-3 sm:p-6">
          {/* Search */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Buscar por cliente ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Filter Buttons + Sort */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map(({ key, label, icon: FilterIcon }) => (
                <Button
                  key={key}
                  variant="outline"
                  onClick={() => setDocumentTypeFilter(key)}
                  className={`gap-2 border-zinc-700 ${
                    documentTypeFilter === key
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
              {sortDirection === "desc" ? "Mais recentes" : "Mais antigos"}
            </Button>
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

      {/* Results summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-400">
        <span>
          {filteredBudgets.length}{" "}
          {filteredBudgets.length === 1 ? "documento carregado" : "documentos carregados"}
          {hasMore && " (há mais por carregar)"}
        </span>
        <span className="flex items-center gap-1.5 text-white font-medium">
          <Wallet className="w-4 h-4 text-green-500" />
          Total: {formatEuroNumber(totalValue)}€
        </span>
      </div>

      {/* Documents List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredBudgets.length > 0 ? (
          filteredBudgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              onDelete={handleDelete}
              onViewPDF={handleViewPDF}
              navigate={navigate}
            />
          ))
        ) : (
          <Card className="bg-zinc-800 border-zinc-700">
            <CardContent className="p-8 sm:p-12 text-center">
              <Search className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2 text-white">
                Nenhum documento encontrado
              </p>
              <p className="text-sm sm:text-base text-zinc-400">
                Tente ajustar a busca ou os filtros, ou adicione um novo documento
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Carregar mais */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoadingMore}
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

      {/* Mobile FAB Menu */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 sm:hidden z-50">
        <Button
          onClick={() => navigate("/app/add-simple-budget")}
          size="icon"
          className="rounded-full shadow-lg bg-zinc-700 hover:bg-zinc-600"
        >
          <UserSquare className="h-5 w-5" />
        </Button>

        <Button
          onClick={() => navigate("/app/add-budget")}
          size="icon"
          className="rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        >
          <UserPlus className="h-5 w-5" />
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem a certeza que deseja excluir este orçamento? Esta ação não
              pode ser desfeita.
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
            <Button variant="destructive" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageBudgets;
