// src/features/prepOrders/ManageOrdensPreparacao.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import {
  Search,
  Plus,
  Loader2,
  Trash2,
  ClipboardList,
  AlertTriangle,
  ClipboardCheck,
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
import { PageHeader } from "../../components/app";

const STATUS_META = {
  rascunho: { label: "Rascunho", className: "bg-yellow-500/20 text-yellow-400" },
  finalizada: { label: "Finalizada", className: "bg-green-500/20 text-green-400" },
};

const ManageOrdensPreparacao = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const q = query(collection(db, "ordensPreparacao"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erro ao carregar ordens de preparação:", err);
      setError("Erro ao carregar ordens de preparação.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return orders;
    return orders.filter(
      (o) =>
        (o.codigoSmeUp || "").toLowerCase().includes(term) ||
        (o.clientName || "").toLowerCase().includes(term) ||
        (o.tecnicoResponsavelNome || "").toLowerCase().includes(term) ||
        (o.descricao || "").toLowerCase().includes(term)
    );
  }, [orders, searchTerm]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, "ordensPreparacao", deleteTarget.id));
      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Erro ao apagar ordem de preparação:", err);
      setError("Erro ao apagar.");
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
      <PageHeader
        icon={ClipboardCheck}
        title="Ordens de Preparação"
        description="Formulários técnicos de preparação pré-instalação (Código SME_UP)"
        actions={
          <>
            <Button
            onClick={() => navigate("/app/add-ordem-preparacao")}
          >
            <Plus className="w-4 h-4" />
            Nova Ordem
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

      <Card>
        <CardContent className="pt-6">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por código SME_UP, cliente ou técnico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-muted"
            />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 sm:p-12 text-center">
            <ClipboardList className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/70 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2 text-foreground">
              {searchTerm ? "Nenhuma ordem encontrada" : "Nenhuma ordem de preparação criada"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((order) => {
            const meta = STATUS_META[order.status] || STATUS_META.rascunho;
            return (
              <Card
                key={order.id}
                onClick={() => navigate(`/app/ordem-preparacao/${order.id}`)}
                className="hover:bg-accent transition-colors cursor-pointer"
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-foreground font-medium truncate">
                        SME_UP {order.codigoSmeUp}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {order.descricao || "Sem descrição"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(order);
                      }}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Badge className={meta.className}>{meta.label}</Badge>
                  <div className="text-xs text-muted-foreground space-y-0.5 pt-1">
                    {order.clientName && <p>Cliente: {order.clientName}</p>}
                    {order.tecnicoResponsavelNome && (
                      <p>Técnico: {order.tecnicoResponsavelNome}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tem a certeza que deseja excluir a ordem de preparação &ldquo;SME_UP{" "}
              {deleteTarget?.codigoSmeUp}&rdquo;? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
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
          onClick={() => navigate("/app/add-ordem-preparacao")}
          size="icon"
          className="rounded-full shadow-lg"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ManageOrdensPreparacao;
