// ManageProtocols.jsx - Protocolos de Serviço (antes/depois por cliente + equipamento)
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, doc, deleteDoc, orderBy, query } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { searchIncludes } from "../../utils/normalizeSearch.js";
import { fetchPage } from "../../utils/firestorePage.js";
import { formatDate } from "../../utils/formatDate.js";
import {
  Search,
  Plus,
  Loader2,
  AlertTriangle,
  ClipboardList,
  Trash2,
  Eye,
  User,
  Printer,
  CheckCircle2,
  FileEdit,
  ArrowDown,
  ClipboardCheck,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { PageHeader } from "../../components/app";

const STATUS_LABELS = {
  rascunho: { label: "Rascunho", className: "bg-yellow-500/20 text-yellow-400" },
  concluido: { label: "Concluído", className: "bg-green-500/20 text-green-400" },
};

const PAGE_SIZE = 10;
const MAX_AUTO_LOADS = 15;

const protocolsBaseQuery = query(
  collection(db, "protocolosServico"),
  orderBy("updatedAt", "desc")
);

const ManageProtocols = () => {
  const navigate = useNavigate();
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const cursorRef = useRef(null);
  const autoLoadCountRef = useRef(0);

  const loadPage = useCallback(async (cursor) => {
    const { docs, cursor: nextCursor, hasMore: more } = await fetchPage(protocolsBaseQuery, {
      pageSize: PAGE_SIZE,
      cursor,
    });
    cursorRef.current = nextCursor;
    setHasMore(more);
    return docs;
  }, []);

  const fetchProtocols = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      cursorRef.current = null;
      const docs = await loadPage(null);
      setProtocols(docs);
    } catch (err) {
      console.error("Erro ao carregar protocolos:", err);
      setError("Erro ao carregar protocolos de serviço.");
    } finally {
      setLoading(false);
    }
  }, [loadPage]);

  useEffect(() => {
    fetchProtocols();
  }, [fetchProtocols]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !cursorRef.current) return;
    setIsLoadingMore(true);
    try {
      const docs = await loadPage(cursorRef.current);
      setProtocols((prev) => [...prev, ...docs]);
    } catch (err) {
      console.error("Erro ao carregar mais protocolos:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, loadPage]);

  const filtered = useMemo(() => {
    return protocols.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        searchIncludes(p.title, searchTerm) ||
        searchIncludes(p.protocolNumber, searchTerm) ||
        searchIncludes(p.clientName, searchTerm) ||
        searchIncludes(p.equipmentName, searchTerm);
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [protocols, searchTerm, statusFilter]);

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "protocolosServico", deleteTarget.id));
      setProtocols((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    } catch (err) {
      console.error("Erro ao apagar protocolo:", err);
      setError("Erro ao apagar protocolo.");
    } finally {
      setDeleteTarget(null);
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <PageHeader
        icon={ClipboardCheck}
        title="Protocolos de Serviço"
        description="Registos antes/depois por cliente e equipamento, com peças trocadas"
        actions={
          <>
            <Button
            onClick={() => navigate("/app/add-protocol")}
          >
            <Plus className="w-4 h-4" />
            Novo Protocolo
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, cliente ou equipamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Todos os estados
              </SelectItem>
              <SelectItem value="rascunho">
                Rascunho
              </SelectItem>
              <SelectItem value="concluido">
                Concluído
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 sm:p-12 text-center">
            <ClipboardList className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/70 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2 text-foreground">
              Nenhum protocolo encontrado
            </p>
            <p className="text-sm text-muted-foreground">
              Crie um protocolo de serviço para começar
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((protocol) => {
            const statusMeta =
              STATUS_LABELS[protocol.status] || STATUS_LABELS.rascunho;
            return (
              <Card
                key={protocol.id}
                className="hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => navigate(`/app/protocol/${protocol.id}`)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {protocol.title || "Protocolo sem título"}
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono">
                        {protocol.protocolNumber || `PROT-${protocol.id}`}
                      </p>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                        <User className="h-3.5 w-3.5" />
                        <span className="truncate">
                          {protocol.clientName || "Sem cliente"}
                        </span>
                      </div>
                      {protocol.equipmentName && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                          <Printer className="h-3.5 w-3.5" />
                          <span className="truncate">{protocol.equipmentName}</span>
                        </div>
                      )}
                    </div>
                    <Badge className={statusMeta.className}>
                      {statusMeta.label === "Concluído" && (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      )}
                      {statusMeta.label}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      Atualizado em {formatDate(protocol.updatedAt)}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/app/edit-protocol/${protocol.id}`);
                        }}
                        className="text-muted-foreground h-8 w-8"
                      >
                        <FileEdit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/app/protocol/${protocol.id}`);
                        }}
                        className="text-muted-foreground h-8 w-8"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(protocol);
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tem a certeza que deseja apagar este protocolo de serviço? Esta
              ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="bg-accent"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Apagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageProtocols;
