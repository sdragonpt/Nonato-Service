// ManageWarehouse.jsx - Almoxarifado / Armazém: pedidos de separação de peças
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { searchIncludes } from "../../utils/normalizeSearch.js";
import { fetchPage } from "../../utils/firestorePage.js";
import { formatDate } from "../../utils/formatDate.js";
import {
  Search,
  Plus,
  Loader2,
  AlertTriangle,
  Package,
  Trash2,
  User,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Truck,
  ArrowDown,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Checkbox } from "@/components/ui/checkbox.jsx";
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

const STATUS_META = {
  pendente: { label: "Pendente", className: "bg-yellow-500/20 text-yellow-400" },
  em_separacao: { label: "Em Separação", className: "bg-blue-500/20 text-blue-400" },
  separado: { label: "Separado", className: "bg-purple-500/20 text-purple-400" },
  entregue: { label: "Entregue", className: "bg-green-500/20 text-green-400" },
};

const STATUS_ORDER = ["pendente", "em_separacao", "separado", "entregue"];

const PAGE_SIZE = 10;
const MAX_AUTO_LOADS = 15;

const warehouseBaseQuery = query(collection(db, "pedidosArmazem"), orderBy("updatedAt", "desc"));

const ManageWarehouse = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const cursorRef = useRef(null);
  const autoLoadCountRef = useRef(0);

  const loadPage = useCallback(async (cursor) => {
    const { docs, cursor: nextCursor, hasMore: more } = await fetchPage(warehouseBaseQuery, {
      pageSize: PAGE_SIZE,
      cursor,
    });
    cursorRef.current = nextCursor;
    setHasMore(more);
    return docs;
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      cursorRef.current = null;
      const docs = await loadPage(null);
      setRequests(docs);
    } catch (err) {
      console.error("Erro ao carregar pedidos de armazém:", err);
      setError("Erro ao carregar pedidos de armazém.");
    } finally {
      setLoading(false);
    }
  }, [loadPage]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !cursorRef.current) return;
    setIsLoadingMore(true);
    try {
      const docs = await loadPage(cursorRef.current);
      setRequests((prev) => [...prev, ...docs]);
    } catch (err) {
      console.error("Erro ao carregar mais pedidos de armazém:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, loadPage]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchesSearch =
        !searchTerm ||
        searchIncludes(r.clientName, searchTerm) ||
        searchIncludes(r.orderLabel, searchTerm);
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requests, searchTerm, statusFilter]);

  // Pesquisa/filtro só opera sobre os lotes já carregados; se os
  // resultados ficarem escassos com pesquisa ativa, carrega mais.
  useEffect(() => {
    if (
      (searchTerm || statusFilter !== "all") &&
      hasMore &&
      !isLoadingMore &&
      !loading &&
      filtered.length < PAGE_SIZE &&
      autoLoadCountRef.current < MAX_AUTO_LOADS
    ) {
      autoLoadCountRef.current += 1;
      loadMore();
    }
  }, [searchTerm, statusFilter, filtered.length, hasMore, isLoadingMore, loading, loadMore]);

  const persistRequest = async (id, patch) => {
    try {
      setSavingId(id);
      await updateDoc(doc(db, "pedidosArmazem", id), { ...patch, updatedAt: new Date() });
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
      );
    } catch (err) {
      console.error("Erro ao atualizar pedido:", err);
      setError("Erro ao atualizar pedido de armazém.");
    } finally {
      setSavingId(null);
    }
  };

  const toggleItemPicked = (request, itemId) => {
    const updatedItens = request.itens.map((item) =>
      item.id === itemId ? { ...item, separado: !item.separado } : item
    );
    const allPicked = updatedItens.every((item) => item.separado);
    const nextStatus =
      allPicked && request.status !== "entregue" ? "separado" : request.status === "pendente" ? "em_separacao" : request.status;

    persistRequest(request.id, { itens: updatedItens, status: nextStatus });
  };

  const advanceStatus = (request) => {
    const idx = STATUS_ORDER.indexOf(request.status);
    const next = STATUS_ORDER[Math.min(idx + 1, STATUS_ORDER.length - 1)];
    persistRequest(request.id, { status: next });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "pedidosArmazem", deleteTarget.id));
      setRequests((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    } catch (err) {
      console.error("Erro ao apagar pedido:", err);
      setError("Erro ao apagar pedido de armazém.");
    } finally {
      setDeleteTarget(null);
    }
  };


  if (loading) {
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
            Almoxarifado / Armazém
          </h1>
          <p className="text-sm text-zinc-400">
            Pedidos de separação de peças para clientes e ordens de serviço
          </p>
        </div>
        <Button
          onClick={() => navigate("/app/add-warehouse-request")}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Pedido
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* Filtros */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Buscar por cliente ou ordem..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white sm:w-56">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="all" className="text-white hover:bg-zinc-700">
                Todos os estados
              </SelectItem>
              {STATUS_ORDER.map((status) => (
                <SelectItem key={status} value={status} className="text-white hover:bg-zinc-700">
                  {STATUS_META[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-8 sm:p-12 text-center">
            <Package className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2 text-white">
              Nenhum pedido de armazém encontrado
            </p>
            <p className="text-sm text-zinc-400">
              Use o botão &ldquo;Novo Pedido&rdquo; para registar uma separação de peças
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((request) => {
            const statusMeta = STATUS_META[request.status] || STATUS_META.pendente;
            const isExpanded = expandedId === request.id;
            const pickedCount = (request.itens || []).filter((i) => i.separado).length;

            return (
              <Card key={request.id} className="bg-zinc-800 border-zinc-700">
                <CardContent className="p-4 space-y-3">
                  <div
                    className="flex items-center justify-between gap-3 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : request.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-zinc-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">
                          {request.clientName || "Cliente removido"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <span>{formatDate(request.updatedAt)}</span>
                          {request.orderLabel && (
                            <>
                              <span>·</span>
                              <span>{request.orderLabel}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>
                            {pickedCount}/{(request.itens || []).length} separadas
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-zinc-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-zinc-500" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="pt-3 border-t border-zinc-700 space-y-2">
                      {(request.itens || []).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-2 bg-zinc-700/30 rounded-lg border border-zinc-600"
                        >
                          <Checkbox
                            checked={!!item.separado}
                            onCheckedChange={() => toggleItemPicked(request, item.id)}
                            disabled={savingId === request.id}
                          />
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm ${
                                item.separado ? "text-zinc-500 line-through" : "text-white"
                              }`}
                            >
                              {item.partName}
                              {item.partCode ? ` (${item.partCode})` : ""}
                            </p>
                          </div>
                          <Badge className="bg-zinc-700 text-white hover:bg-zinc-700">
                            x{item.quantity || 1}
                          </Badge>
                        </div>
                      ))}

                      {request.observacoes && (
                        <p className="text-sm text-zinc-400 italic pt-1">
                          {request.observacoes}
                        </p>
                      )}

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(request)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Apagar
                        </Button>
                        {request.status !== "entregue" && (
                          <Button
                            size="sm"
                            onClick={() => advanceStatus(request)}
                            disabled={savingId === request.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {request.status === "separado" ? (
                              <>
                                <Truck className="w-4 h-4 mr-2" />
                                Marcar como Entregue
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Avançar Estado
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
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

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem a certeza que deseja apagar este pedido de armazém? Esta
              ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Apagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageWarehouse;
