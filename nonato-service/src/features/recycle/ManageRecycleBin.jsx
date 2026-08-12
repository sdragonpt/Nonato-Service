// src/features/recycle/ManageRecycleBin.jsx
// Reciclagem — ordens de serviço e relatórios (inspeções) excluídos,
// organizados por cliente, com restauro ou eliminação definitiva.
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../../firebase.jsx";
import { searchIncludes } from "../../utils/normalizeSearch.js";
import { fetchPage } from "../../utils/firestorePage.js";
import { formatDateTime as formatDate } from "../../utils/formatDate.js";
import {
  Trash2,
  Loader2,
  AlertTriangle,
  RotateCcw,
  User,
  UserX,
  FileText,
  ClipboardCheck,
  ScrollText,
  Search,
  XCircle,
  ArrowDown,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

const toJsDate = (timestamp) =>
  timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);

const mapOrderItem = (o) => ({
  id: o.id,
  collectionName: "ordens",
  tipo: "ordem",
  label: `Ordem de Serviço — ${o.serviceType || o.id}`,
  clientId: o.clientId,
  eliminadoEm: o.eliminadoEm,
  linkTo: `/app/order-detail/${o.id}`,
});

const mapInspectionItem = (i) => ({
  id: i.id,
  collectionName: "inspections",
  tipo: "inspecao",
  label: `Relatório de Inspeção — ${i.type || i.id}`,
  clientId: i.clientId,
  eliminadoEm: i.eliminadoEm,
  linkTo: `/app/inspection-detail/${i.id}`,
});

// "relatorios" (relatórios gerados via /app/manage-report) — coleção nova,
// sem índice composto (eliminadoEm + orderBy) configurado no Firestore.
// Em vez de replicar o padrão de paginação por cursor das outras duas
// coleções (o que exigiria criar esse índice), lê-se a coleção inteira e
// filtra/ordena do lado do cliente — aceitável porque "relatorios" é uma
// coleção pequena.
const mapReportItem = (r) => ({
  id: r.id,
  collectionName: "relatorios",
  tipo: "relatorio",
  label: `${r.tipo === "especial" ? "Relatório Especial" : "Relatório"}${
    r.orderNumber ? ` — Ordem ${r.orderNumber}` : r.fileName ? ` — ${r.fileName}` : ""
  }`,
  clientId: r.clientId || null,
  eliminadoEm: r.eliminadoEm,
  storagePath: r.storagePath || null,
  linkTo: "/app/biblioteca-relatorios",
});

// "clientes" — mesmo princípio de leitura completa da coleção que
// "relatorios". O próprio cliente é o item (não pertence a outro cliente),
// por isso não entra em nenhum grupo — cai em "Sem cliente associado",
// identificável pelo próprio label.
const mapClientItem = (c) => ({
  id: c.id,
  collectionName: "clientes",
  tipo: "cliente",
  label: `Cliente — ${c.name || c.id}`,
  clientId: null,
  eliminadoEm: c.eliminadoEm,
  storagePath: c.profilePicStoragePath || null,
  linkTo: `/app/client/${c.id}`,
});

// Só os documentos com eliminadoEm (soft-delete) contam — os que nunca
// foram excluídos simplesmente não têm este campo, por isso o filtro
// "!=" já os exclui corretamente, sem varrer a coleção toda no cliente.
const ordersDeletedQuery = query(
  collection(db, "ordens"),
  where("eliminadoEm", "!=", null),
  orderBy("eliminadoEm", "desc")
);
const inspectionsDeletedQuery = query(
  collection(db, "inspections"),
  where("eliminadoEm", "!=", null),
  orderBy("eliminadoEm", "desc")
);

const PAGE_SIZE = 10;
const MAX_AUTO_LOADS = 15;

const ManageRecycleBin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [reportItems, setReportItems] = useState([]);
  const [clientItems, setClientItems] = useState([]);
  const [clientsMap, setClientsMap] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [restoringId, setRestoringId] = useState(null);
  const [permDeleteTarget, setPermDeleteTarget] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Duas coleções (ordens + inspecções) são combinadas cronologicamente
  // por eliminadoEm. Cada uma tem o seu próprio cursor Firestore; um
  // pequeno "buffer" local guarda docs já lidos mas ainda não mostrados,
  // para se poder intercalar as duas fontes por data sem perder nada.
  const ordersCursorRef = useRef(null);
  const inspectionsCursorRef = useRef(null);
  const ordersDoneRef = useRef(false);
  const inspectionsDoneRef = useRef(false);
  const ordersBufferRef = useRef([]);
  const inspectionsBufferRef = useRef([]);
  const autoLoadCountRef = useRef(0);

  const ensureBuffer = useCallback(
    async (bufferRef, cursorRef, doneRef, baseQuery, mapFn) => {
      if (bufferRef.current.length > 0 || doneRef.current) return;
      const { docs, cursor, hasMore: more } = await fetchPage(baseQuery, {
        pageSize: PAGE_SIZE,
        cursor: cursorRef.current,
      });
      bufferRef.current = docs.map(mapFn);
      cursorRef.current = cursor;
      doneRef.current = !more;
    },
    []
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore) return;
    const noMoreLeft =
      ordersDoneRef.current &&
      inspectionsDoneRef.current &&
      ordersBufferRef.current.length === 0 &&
      inspectionsBufferRef.current.length === 0;
    if (noMoreLeft) {
      setHasMore(false);
      return;
    }

    setIsLoadingMore(true);
    try {
      await Promise.all([
        ensureBuffer(ordersBufferRef, ordersCursorRef, ordersDoneRef, ordersDeletedQuery, mapOrderItem),
        ensureBuffer(inspectionsBufferRef, inspectionsCursorRef, inspectionsDoneRef, inspectionsDeletedQuery, mapInspectionItem),
      ]);

      const merged = [];
      while (
        merged.length < PAGE_SIZE &&
        (ordersBufferRef.current.length > 0 || inspectionsBufferRef.current.length > 0)
      ) {
        const nextOrder = ordersBufferRef.current[0];
        const nextInsp = inspectionsBufferRef.current[0];
        let pickRef;
        if (nextOrder && nextInsp) {
          pickRef = toJsDate(nextOrder.eliminadoEm) >= toJsDate(nextInsp.eliminadoEm)
            ? ordersBufferRef
            : inspectionsBufferRef;
        } else {
          pickRef = nextOrder ? ordersBufferRef : inspectionsBufferRef;
        }
        merged.push(pickRef.current.shift());
      }

      setItems((prev) => [...prev, ...merged]);

      const stillHasMore =
        !ordersDoneRef.current ||
        !inspectionsDoneRef.current ||
        ordersBufferRef.current.length > 0 ||
        inspectionsBufferRef.current.length > 0;
      setHasMore(stillHasMore);
    } catch (err) {
      console.error("Erro ao carregar reciclagem:", err);
      setError("Erro ao carregar itens da reciclagem.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, ensureBuffer]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        // ✅ Leitura direta e SEM filtro de eliminadoEm — ao contrário do
        // cache partilhado (ClientsContext.ensureClients), que agora exclui
        // clientes eliminados de propósito. Aqui precisamos exatamente do
        // contrário: dos clientes eliminados (para os listar) e de todos os
        // outros (para conseguir mostrar o nome certo nos itens agrupados).
        const allClientsSnap = await getDocs(collection(db, "clientes"));
        const allClientsData = allClientsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const cMap = {};
        allClientsData.forEach((client) => {
          cMap[client.id] = client;
        });
        setClientsMap(cMap);

        const deletedClients = allClientsData
          .filter((c) => !!c.eliminadoEm)
          .sort((a, b) => toJsDate(b.eliminadoEm) - toJsDate(a.eliminadoEm))
          .map(mapClientItem);
        setClientItems(deletedClients);

        // "relatorios" é lida por inteiro (sem índice composto) e filtrada
        // do lado do cliente — ver nota junto de mapReportItem.
        const reportsSnap = await getDocs(collection(db, "relatorios"));
        const deletedReports = reportsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((r) => !!r.eliminadoEm)
          .sort((a, b) => toJsDate(b.eliminadoEm) - toJsDate(a.eliminadoEm))
          .map(mapReportItem);
        setReportItems(deletedReports);

        await loadMore();
      } catch (err) {
        console.error("Erro ao carregar reciclagem:", err);
        setError("Erro ao carregar itens da reciclagem.");
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestore = async (item) => {
    try {
      setRestoringId(item.id);
      await updateDoc(doc(db, item.collectionName, item.id), {
        eliminadoEm: deleteField(),
      });
      if (item.collectionName === "relatorios") {
        setReportItems((prev) => prev.filter((i) => i.id !== item.id));
      } else if (item.collectionName === "clientes") {
        setClientItems((prev) => prev.filter((i) => i.id !== item.id));
      } else {
        setItems((prev) => prev.filter((i) => !(i.id === item.id && i.collectionName === item.collectionName)));
      }
    } catch (err) {
      console.error("Erro ao restaurar item:", err);
      setError("Erro ao restaurar item. Por favor, tente novamente.");
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!permDeleteTarget) return;
    try {
      await deleteDoc(doc(db, permDeleteTarget.collectionName, permDeleteTarget.id));
      if (permDeleteTarget.storagePath) {
        try {
          await deleteObject(ref(storage, permDeleteTarget.storagePath));
        } catch (storageErr) {
          console.warn("Erro ao eliminar ficheiro do Storage:", storageErr);
        }
      }
      if (permDeleteTarget.collectionName === "relatorios") {
        setReportItems((prev) => prev.filter((i) => i.id !== permDeleteTarget.id));
      } else if (permDeleteTarget.collectionName === "clientes") {
        setClientItems((prev) => prev.filter((i) => i.id !== permDeleteTarget.id));
      } else {
        setItems((prev) =>
          prev.filter(
            (i) => !(i.id === permDeleteTarget.id && i.collectionName === permDeleteTarget.collectionName)
          )
        );
      }
      setPermDeleteTarget(null);
    } catch (err) {
      console.error("Erro ao eliminar definitivamente:", err);
      setError("Erro ao eliminar definitivamente. Por favor, tente novamente.");
    }
  };

  const allItems = useMemo(
    () => [...items, ...reportItems, ...clientItems],
    [items, reportItems, clientItems]
  );

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (!searchTerm) return true;
      const clientName = clientsMap[item.clientId]?.name || "";
      return (
        searchIncludes(clientName, searchTerm) ||
        searchIncludes(item.label, searchTerm)
      );
    });
  }, [allItems, clientsMap, searchTerm]);

  const groupedByClient = useMemo(() => {
    const groups = {};
    const semClienteKey = "__sem_cliente__";
    filteredItems.forEach((item) => {
      const key = item.clientId && clientsMap[item.clientId] ? item.clientId : semClienteKey;
      if (!groups[key]) {
        groups[key] = {
          clientId: key === semClienteKey ? null : key,
          clientName: key === semClienteKey ? "Sem cliente associado" : clientsMap[key]?.name || "Cliente",
          items: [],
        };
      }
      groups[key].items.push(item);
    });

    return Object.values(groups).sort((a, b) => b.items.length - a.items.length);
  }, [filteredItems, clientsMap]);

  // Pesquisa/filtro só opera sobre os lotes já carregados. Se o
  // utilizador está a pesquisar e os resultados ainda são poucos,
  // carrega automaticamente mais lotes para a pesquisa "parecer completa".
  useEffect(() => {
    if (
      searchTerm &&
      hasMore &&
      !isLoadingMore &&
      !loading &&
      filteredItems.length < PAGE_SIZE &&
      autoLoadCountRef.current < MAX_AUTO_LOADS
    ) {
      autoLoadCountRef.current += 1;
      loadMore();
    }
  }, [searchTerm, filteredItems.length, hasMore, isLoadingMore, loading, loadMore]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
          <Trash2 className="h-5 w-5 text-red-500" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Reciclagem</h1>
          <p className="text-sm text-zinc-400">
            Clientes, ordens e relatórios excluídos, organizados por cliente — restaure ou elimine definitivamente
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Pesquisar por cliente ou item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-zinc-700 border-zinc-600 text-white placeholder:text-zinc-400"
            />
          </div>
        </CardContent>
      </Card>

      {groupedByClient.length === 0 ? (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-8 sm:p-12 text-center">
            <Trash2 className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2 text-white">A reciclagem está vazia</p>
            <p className="text-sm text-zinc-400">
              Clientes, ordens de serviço, inspeções e relatórios excluídos aparecem aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedByClient.map((group) => (
            <Card key={group.clientId || "sem-cliente"} className="bg-zinc-800 border-zinc-700">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-700">
                  <User className="h-4 w-4 text-zinc-400" />
                  <span className="text-white font-medium">{group.clientName}</span>
                  <Badge variant="outline" className="ml-auto text-zinc-400 border-zinc-600">
                    {group.items.length} item(ns)
                  </Badge>
                </div>

                {group.items.map((item) => (
                  <div
                    key={`${item.collectionName}-${item.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-zinc-700/30 rounded-lg border border-zinc-600"
                  >
                    <div
                      className="flex items-center gap-2 min-w-0 cursor-pointer"
                      onClick={() => navigate(item.linkTo)}
                    >
                      {item.tipo === "ordem" ? (
                        <FileText className="h-4 w-4 text-green-400 shrink-0" />
                      ) : item.tipo === "relatorio" ? (
                        <ScrollText className="h-4 w-4 text-amber-400 shrink-0" />
                      ) : item.tipo === "cliente" ? (
                        <UserX className="h-4 w-4 text-purple-400 shrink-0" />
                      ) : (
                        <ClipboardCheck className="h-4 w-4 text-blue-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-white text-sm truncate">{item.label}</p>
                        <p className="text-xs text-zinc-500">
                          Excluído em {formatDate(item.eliminadoEm)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(item)}
                        disabled={restoringId === item.id}
                        className="border-green-600 text-green-400 hover:bg-green-600/10 bg-transparent"
                      >
                        {restoringId === item.id ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Restaurar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPermDeleteTarget(item)}
                        className="border-red-600 text-red-400 hover:bg-red-600/10 bg-transparent"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
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

      <Dialog open={!!permDeleteTarget} onOpenChange={(open) => !open && setPermDeleteTarget(null)}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Eliminar definitivamente</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem a certeza que deseja eliminar definitivamente &ldquo;{permDeleteTarget?.label}
              &rdquo;? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPermDeleteTarget(null)}
              className="border-zinc-600 text-zinc-300 hover:bg-zinc-700"
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handlePermanentDelete}>
              Eliminar Definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageRecycleBin;
