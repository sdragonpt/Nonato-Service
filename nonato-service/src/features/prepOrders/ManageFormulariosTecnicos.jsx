// src/features/prepOrders/ManageFormulariosTecnicos.jsx
// Formulários e Checklist para Técnicos — lista/gestão dos formulários gerados
// a partir de Ordens de Preparação (ou, futuramente, de outros checklists).
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, updateDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { fetchPage } from "../../utils/firestorePage.js";
import { Loader2, FileCheck2, AlertTriangle, CheckCircle2, ArrowDown, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";

import { Card, CardContent } from "@/components/ui/card.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { PageHeader, SearchInput, PageLoader, EmptyState } from "../../components/app";

const TIPO_META = {
  "ordem-preparacao": { label: "Ordem de Preparação", className: "bg-blue-500/20 text-blue-400" },
  "checklist-gerado": { label: "Checklist Gerado", className: "bg-purple-500/20 text-purple-400" },
};

const STATUS_META = {
  pendente: { label: "Pendente", className: "bg-yellow-500/20 text-yellow-400" },
  em_andamento: { label: "Em Andamento", className: "bg-blue-500/20 text-blue-400" },
  concluido: { label: "Concluído", className: "bg-green-500/20 text-green-400" },
};

const STATUS_ORDER = ["pendente", "em_andamento", "concluido"];

const PAGE_SIZE = 10;
const MAX_AUTO_LOADS = 15;

const formulariosBaseQuery = query(
  collection(db, "formulariosChecklistTecnicos"),
  orderBy("createdAt", "desc")
);

const ManageFormulariosTecnicos = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [savingId, setSavingId] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const cursorRef = useRef(null);
  const autoLoadCountRef = useRef(0);

  const loadPage = useCallback(async (cursor) => {
    const { docs, cursor: nextCursor, hasMore: more } = await fetchPage(formulariosBaseQuery, {
      pageSize: PAGE_SIZE,
      cursor,
    });
    cursorRef.current = nextCursor;
    setHasMore(more);
    return docs;
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      cursorRef.current = null;
      const docs = await loadPage(null);
      setItems(docs);
    } catch (err) {
      console.error("Erro ao carregar formulários:", err);
      setError("Erro ao carregar formulários.");
    } finally {
      setLoading(false);
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
      console.error("Erro ao carregar mais formulários:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, loadPage]);


  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return items.filter((i) => {
      const matchesSearch =
        !term ||
        (i.codigoSmeUp || "").toLowerCase().includes(term) ||
        (i.clientName || "").toLowerCase().includes(term) ||
        (i.tecnicoResponsavelNome || "").toLowerCase().includes(term);
      const matchesTipo = tipoFilter === "all" || i.tipo === tipoFilter;
      const matchesStatus = statusFilter === "all" || i.status === statusFilter;
      return matchesSearch && matchesTipo && matchesStatus;
    });
  }, [items, searchTerm, tipoFilter, statusFilter]);

  // Pesquisa/filtro só opera sobre os lotes já carregados; se os
  // resultados ficarem escassos com pesquisa ativa, carrega mais.
  useEffect(() => {
    if (
      (searchTerm || tipoFilter !== "all" || statusFilter !== "all") &&
      hasMore &&
      !isLoadingMore &&
      !loading &&
      filtered.length < PAGE_SIZE &&
      autoLoadCountRef.current < MAX_AUTO_LOADS
    ) {
      autoLoadCountRef.current += 1;
      loadMore();
    }
  }, [searchTerm, tipoFilter, statusFilter, filtered.length, hasMore, isLoadingMore, loading, loadMore]);

  const advanceStatus = async (item) => {
    const currentIdx = STATUS_ORDER.indexOf(item.status);
    const next = STATUS_ORDER[Math.min(currentIdx + 1, STATUS_ORDER.length - 1)];
    if (next === item.status) return;
    try {
      setSavingId(item.id);
      await updateDoc(doc(db, "formulariosChecklistTecnicos", item.id), { status: next });
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: next } : i)));
    } catch (err) {
      console.error("Erro ao atualizar estado:", err);
      setError("Erro ao atualizar estado.");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <PageLoader />
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        icon={CheckSquare}
        title="Formulários e Checklist para Técnicos"
        description="Fila de formulários gerados a partir de ordens de preparação e checklists"
        actions={
          <>
            <p className="text-sm text-muted-foreground">
            Fila de formulários gerados a partir de ordens de preparação e checklists
          </p>
          </>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Pesquisar por código, cliente ou técnico..." className="lg:max-w-none flex-1" />
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                {Object.entries(TIPO_META).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Estados</SelectItem>
                {Object.entries(STATUS_META).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="Nenhum formulário encontrado"
          description="Os formulários aparecem aqui depois de gerados a partir de uma Ordem de Preparação."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const tipoMeta = TIPO_META[item.tipo] || TIPO_META["ordem-preparacao"];
            const statusMeta = STATUS_META[item.status] || STATUS_META.pendente;
            const isFinal = item.status === "concluido";
            return (
              <Card key={item.id}>
                <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                  <div
                    className="min-w-0 cursor-pointer flex-1"
                    onClick={() =>
                      item.ordemPreparacaoId &&
                      navigate(`/app/ordem-preparacao/${item.ordemPreparacaoId}`)
                    }
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-foreground font-medium">SME_UP {item.codigoSmeUp || "—"}</p>
                      <Badge className={tipoMeta.className}>{tipoMeta.label}</Badge>
                      <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {item.clientName || "Sem cliente"}
                      {item.tecnicoResponsavelNome ? ` · ${item.tecnicoResponsavelNome}` : ""}
                    </p>
                  </div>
                  {!isFinal && (
                    <button
                      type="button"
                      onClick={() => advanceStatus(item)}
                      disabled={savingId === item.id}
                      className="text-sm text-green-400 hover:text-green-300 flex items-center gap-1 shrink-0"
                    >
                      {savingId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Avançar estado
                    </button>
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
    </div>
  );
};

export default ManageFormulariosTecnicos;
