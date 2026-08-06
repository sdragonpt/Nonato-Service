// src/features/recycle/ManageRecycleBin.jsx
// Reciclagem — ordens de serviço e relatórios (inspeções) excluídos,
// organizados por cliente, com restauro ou eliminação definitiva.
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  deleteField,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import {
  Trash2,
  Loader2,
  AlertTriangle,
  RotateCcw,
  User,
  FileText,
  ClipboardCheck,
  Search,
  XCircle,
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

const formatDate = (timestamp) => {
  if (!timestamp) return "N/A";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ManageRecycleBin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [clientsMap, setClientsMap] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [restoringId, setRestoringId] = useState(null);
  const [permDeleteTarget, setPermDeleteTarget] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [ordersSnap, inspectionsSnap, clientsSnap] = await Promise.all([
        getDocs(collection(db, "ordens")),
        getDocs(collection(db, "inspections")),
        getDocs(collection(db, "clientes")),
      ]);

      const cMap = {};
      clientsSnap.docs.forEach((d) => {
        cMap[d.id] = { id: d.id, ...d.data() };
      });
      setClientsMap(cMap);

      const deletedOrders = ordersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((o) => o.eliminadoEm)
        .map((o) => ({
          id: o.id,
          collectionName: "ordens",
          tipo: "ordem",
          label: `Ordem de Serviço — ${o.serviceType || o.id}`,
          clientId: o.clientId,
          eliminadoEm: o.eliminadoEm,
          linkTo: `/app/order-detail/${o.id}`,
        }));

      const deletedInspections = inspectionsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((i) => i.eliminadoEm)
        .map((i) => ({
          id: i.id,
          collectionName: "inspections",
          tipo: "inspecao",
          label: `Relatório de Inspeção — ${i.type || i.id}`,
          clientId: i.clientId,
          eliminadoEm: i.eliminadoEm,
          linkTo: `/app/inspection-detail/${i.id}`,
        }));

      const all = [...deletedOrders, ...deletedInspections].sort((a, b) => {
        const dateA = a.eliminadoEm?.toDate ? a.eliminadoEm.toDate() : new Date(a.eliminadoEm);
        const dateB = b.eliminadoEm?.toDate ? b.eliminadoEm.toDate() : new Date(b.eliminadoEm);
        return dateB - dateA;
      });

      setItems(all);
    } catch (err) {
      console.error("Erro ao carregar reciclagem:", err);
      setError("Erro ao carregar itens da reciclagem.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRestore = async (item) => {
    try {
      setRestoringId(item.id);
      await updateDoc(doc(db, item.collectionName, item.id), {
        eliminadoEm: deleteField(),
      });
      setItems((prev) => prev.filter((i) => !(i.id === item.id && i.collectionName === item.collectionName)));
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
      setItems((prev) =>
        prev.filter(
          (i) => !(i.id === permDeleteTarget.id && i.collectionName === permDeleteTarget.collectionName)
        )
      );
      setPermDeleteTarget(null);
    } catch (err) {
      console.error("Erro ao eliminar definitivamente:", err);
      setError("Erro ao eliminar definitivamente. Por favor, tente novamente.");
    }
  };

  const groupedByClient = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    const filtered = items.filter((item) => {
      if (!searchLower) return true;
      const clientName = clientsMap[item.clientId]?.name || "";
      return (
        clientName.toLowerCase().includes(searchLower) ||
        item.label.toLowerCase().includes(searchLower)
      );
    });

    const groups = {};
    const semClienteKey = "__sem_cliente__";
    filtered.forEach((item) => {
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
  }, [items, clientsMap, searchTerm]);

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
            Ordens e relatórios excluídos, organizados por cliente — restaure ou elimine definitivamente
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
              Itens excluídos de Ordens de Serviço e Relatórios de Inspeção aparecem aqui
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
