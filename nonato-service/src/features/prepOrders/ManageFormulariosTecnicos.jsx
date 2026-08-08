// src/features/prepOrders/ManageFormulariosTecnicos.jsx
// Formulários e Checklist para Técnicos — lista/gestão dos formulários gerados
// a partir de Ordens de Preparação (ou, futuramente, de outros checklists).
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, updateDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { fetchPage } from "../../utils/firestorePage.js";
import { Search, Loader2, FileCheck2, AlertTriangle, CheckCircle2, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";

import { Card, CardContent } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";

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
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          Formulários e Checklist para Técnicos
        </h1>
        <p className="text-sm text-zinc-400">
          Fila de formulários gerados a partir de ordens de preparação e checklists
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Pesquisar por código, cliente ou técnico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-400"
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full sm:w-56 bg-zinc-900 border-zinc-700 text-white">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                <SelectItem value="all">Todos os Tipos</SelectItem>
                {Object.entries(TIPO_META).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-zinc-900 border-zinc-700 text-white">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
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
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-8 sm:p-12 text-center">
            <FileCheck2 className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2 text-white">Nenhum formulário encontrado</p>
            <p className="text-sm text-zinc-400">
              Os formulários aparecem aqui depois de gerados a partir de uma Ordem de
              Preparação.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const tipoMeta = TIPO_META[item.tipo] || TIPO_META["ordem-preparacao"];
            const statusMeta = STATUS_META[item.status] || STATUS_META.pendente;
            const isFinal = item.status === "concluido";
            return (
              <Card key={item.id} className="bg-zinc-800 border-zinc-700">
                <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                  <div
                    className="min-w-0 cursor-pointer flex-1"
                    onClick={() =>
                      item.ordemPreparacaoId &&
                      navigate(`/app/ordem-preparacao/${item.ordemPreparacaoId}`)
                    }
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-medium">SME_UP {item.codigoSmeUp || "—"}</p>
                      <Badge className={tipoMeta.className}>{tipoMeta.label}</Badge>
                      <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
                    </div>
                    <p className="text-sm text-zinc-400 truncate">
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
    </div>
  );
};

export default ManageFormulariosTecnicos;
