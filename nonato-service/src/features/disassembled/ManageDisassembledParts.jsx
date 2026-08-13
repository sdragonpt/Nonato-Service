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
import { Input } from "@/components/ui/input.jsx";
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
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Peças Desmontadas</h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Peças retiradas de equipamentos, ainda reaproveitáveis, com localização em prateleira
          </p>
        </div>
        <Button
          onClick={() => navigate("/app/add-disassembled-part")}
          className="hidden sm:flex bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Peça Desmontada
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Total</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {totalCount}
              </h3>
            </div>
            <PackageOpen className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
          </CardContent>
        </Card>
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Reutilizáveis</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {reutilizavelCount}
              </h3>
            </div>
            <PackageOpen className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </CardContent>
        </Card>
        <Card className="bg-zinc-800 border-zinc-700 col-span-2 md:col-span-2">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Resultados</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {filteredItems.length}
              </h3>
            </div>
            <Search className="h-6 w-6 sm:h-8 sm:w-8 text-zinc-500" />
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Pesquisar por nome, localização, cliente de origem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-400"
              />
            </div>
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-zinc-900 border-zinc-700 text-white">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
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
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-8 sm:p-12 text-center">
            <PackageOpen className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2 text-white">
              {searchTerm || estadoFilter !== "all"
                ? "Nenhuma peça encontrada"
                : "Nenhuma peça desmontada registada"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const meta = ESTADO_META[item.estado] || ESTADO_META.reutilizavel;
            return (
              <Card
                key={item.id}
                onClick={() => navigate(`/app/edit-disassembled-part/${item.id}`)}
                className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-white truncate">{item.nome || "Sem nome"}</h3>
                      {item.quantidade && (
                        <p className="text-sm text-zinc-400">Qtd: {item.quantidade}</p>
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
                        className="bg-zinc-800 border-zinc-700"
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
                      <p className="text-zinc-400 text-xs sm:text-sm truncate flex items-center gap-2">
                        <MapPin className="w-4 h-4 shrink-0" />
                        {item.localizacao}
                      </p>
                    )}
                    {item.origemClientName && (
                      <p className="text-zinc-500 text-xs truncate">
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem a certeza que deseja excluir &ldquo;{itemToDelete?.nome}&rdquo;? Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 bg-zinc-800"
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
          className="rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ManageDisassembledParts;
