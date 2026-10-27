// src/features/disassembled/ManageDisassembledParts.jsx
// Peças Desmontadas — inventário de peças retiradas de equipamentos
// (ex: substituídas mas ainda em bom estado), com localização em prateleira.
// No sistema do cliente este CRUD existia mas era inacessível na UI.
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { fetchPage } from "../../utils/firestorePage.js";
import {
  Search,
  Plus,
  Loader2,
  MoreVertical,
  Trash2,
  Edit2,
  PackageOpen,
  MapPin,
  AlertTriangle,
  ArrowDown,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
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
import { PageHeader, StatCard, SearchInput, PageLoader, EmptyState } from "../../components/app";

export const ESTADO_META = {
  reutilizavel: { label: "Reutilizável", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  vendido: { label: "Vendido", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  descartar: { label: "Para Descartar", className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const PAGE_SIZE = 10;
const MAX_AUTO_LOADS = 15;

const partsBaseQuery = query(collection(db, "pecasDesmontadas"), orderBy("createdAt", "desc"));

const ManageDisassembledParts = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Contagens totais (cheap: aggregation query, não lê os docs) para os
  // cartões de estatísticas continuarem exatos mesmo com a lista paginada.
  const [totalCount, setTotalCount] = useState(0);
  const [reutilizavelCount, setReutilizavelCount] = useState(0);

  const cursorRef = useRef(null);
  const autoLoadCountRef = useRef(0);

  const loadPage = useCallback(async (cursor) => {
    const { docs, cursor: nextCursor, hasMore: more } = await fetchPage(partsBaseQuery, {
      pageSize: PAGE_SIZE,
      cursor,
    });
    cursorRef.current = nextCursor;
    setHasMore(more);
    return docs;
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      cursorRef.current = null;
      const [docs, totalSnap, reutilizavelSnap] = await Promise.all([
        loadPage(null),
        getCountFromServer(collection(db, "pecasDesmontadas")),
        getCountFromServer(
          query(collection(db, "pecasDesmontadas"), where("estado", "==", "reutilizavel"))
        ),
      ]);
      setItems(docs);
      setTotalCount(totalSnap.data().count);
      setReutilizavelCount(reutilizavelSnap.data().count);
    } catch (err) {
      console.error("Erro ao carregar peças desmontadas:", err);
      setError("Erro ao carregar peças desmontadas.");
    } finally {
      setIsLoading(false);
    }
  }, [loadPage]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !cursorRef.current) return;
    setIsLoadingMore(true);
    try {
      const docs = await loadPage(cursorRef.current);
      setItems((prev) => [...prev, ...docs]);
    } catch (err) {
      console.error("Erro ao carregar mais peças desmontadas:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, loadPage]);


  const handleDelete = (id) => {
    setItemToDelete(items.find((i) => i.id === id));
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, "pecasDesmontadas", itemToDelete.id));
      setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      if (itemToDelete.estado === "reutilizavel") {
        setReutilizavelCount((prev) => Math.max(0, prev - 1));
      }
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (err) {
      console.error("Erro ao excluir peça desmontada:", err);
      setError("Erro ao excluir. Por favor, tente novamente.");
    }
  };

  const filteredItems = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return items.filter((i) => {
      const matchesSearch =
        (i.nome && i.nome.toLowerCase().includes(searchLower)) ||
        (i.localizacao && i.localizacao.toLowerCase().includes(searchLower)) ||
        (i.origemClientName && i.origemClientName.toLowerCase().includes(searchLower)) ||
        (i.origemEquipamento && i.origemEquipamento.toLowerCase().includes(searchLower));
      const matchesEstado = estadoFilter === "all" || i.estado === estadoFilter;
      return matchesSearch && matchesEstado;
    });
  }, [items, searchTerm, estadoFilter]);

  // Pesquisa/filtro só opera sobre os lotes já carregados; se os
  // resultados ficarem escassos com pesquisa ativa, carrega mais.
  useEffect(() => {
    if (
      (searchTerm || estadoFilter !== "all") &&
      hasMore &&
      !isLoadingMore &&
      !isLoading &&
      filteredItems.length < PAGE_SIZE &&
      autoLoadCountRef.current < MAX_AUTO_LOADS
    ) {
      autoLoadCountRef.current += 1;
      loadMore();
    }
  }, [searchTerm, estadoFilter, filteredItems.length, hasMore, isLoadingMore, isLoading, loadMore]);

  if (isLoading) {
    return (
      <PageLoader />
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        icon={PackageOpen}
        title="Peças Desmontadas"
        description="Peças retiradas de equipamentos, ainda reaproveitáveis, com localização em prateleira"
        actions={
          <>
            <Button
            onClick={() => navigate("/app/add-disassembled-part")}
            className="hidden sm:flex"
          >
            <Plus className="w-4 h-4" />
            Nova Peça Desmontada
          </Button>
          </>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total"
          value={totalCount}
          icon={PackageOpen}
          tone="violet"
        />
        <StatCard
          label="Reutilizáveis"
          value={reutilizavelCount}
          icon={PackageOpen}
        />
        <StatCard
          label="Resultados"
          value={filteredItems.length}
          icon={Search}
          tone="muted"
          className="col-span-2 md:col-span-2"
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Pesquisar por nome, localização, cliente de origem..." className="lg:max-w-none flex-1" />
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                {Object.entries(ESTADO_META).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredItems.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={searchTerm || estadoFilter !== "all"
                ? "Nenhuma peça encontrada"
                : "Nenhuma peça desmontada registada"}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const meta = ESTADO_META[item.estado] || ESTADO_META.reutilizavel;
            return (
              <Card
                key={item.id}
                onClick={() => navigate(`/app/edit-disassembled-part/${item.id}`)}
                className="hover:bg-accent transition-colors cursor-pointer"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-foreground truncate">{item.nome || "Sem nome"}</h3>
                      {item.quantidade && (
                        <p className="text-sm text-muted-foreground">Qtd: {item.quantidade}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuItem
                          onClick={() => navigate(`/app/edit-disassembled-part/${item.id}`)}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(item.id)}
                          className="text-red-400"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Badge className={`${meta.className} border mb-2`}>{meta.label}</Badge>
                  <div className="space-y-1">
                    {item.localizacao && (
                      <p className="text-muted-foreground text-xs sm:text-sm truncate flex items-center gap-2">
                        <MapPin className="w-4 h-4 shrink-0" />
                        {item.localizacao}
                      </p>
                    )}
                    {item.origemClientName && (
                      <p className="text-muted-foreground text-xs truncate">
                        Origem: {item.origemClientName}
                        {item.origemEquipamento ? ` — ${item.origemEquipamento}` : ""}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Carregar mais */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="gap-2"
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tem a certeza que deseja excluir &ldquo;{itemToDelete?.nome}&rdquo;? Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="text-foreground/90"
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-6 right-6 flex flex-col gap-2 sm:hidden">
        <Button
          onClick={() => navigate("/app/add-disassembled-part")}
          size="icon"
          className="rounded-full shadow-lg"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ManageDisassembledParts;
