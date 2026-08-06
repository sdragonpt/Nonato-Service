// ManageProtocols.jsx - Protocolos de Serviço (antes/depois por cliente + equipamento)
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, deleteDoc, orderBy, query } from "firebase/firestore";
import { db } from "../../firebase.jsx";
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

const STATUS_LABELS = {
  rascunho: { label: "Rascunho", className: "bg-yellow-500/20 text-yellow-400" },
  concluido: { label: "Concluído", className: "bg-green-500/20 text-green-400" },
};

const ManageProtocols = () => {
  const navigate = useNavigate();
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchProtocols = async () => {
    try {
      setLoading(true);
      setError(null);
      const q = query(
        collection(db, "protocolosServico"),
        orderBy("updatedAt", "desc")
      );
      const snap = await getDocs(q);
      setProtocols(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erro ao carregar protocolos:", err);
      setError("Erro ao carregar protocolos de serviço.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProtocols();
  }, []);

  const filtered = useMemo(() => {
    return protocols.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.equipmentName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [protocols, searchTerm, statusFilter]);

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

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("pt-PT");
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
            Protocolos de Serviço
          </h1>
          <p className="text-sm text-zinc-400">
            Registos antes/depois por cliente e equipamento, com peças trocadas
          </p>
        </div>
        <Button
          onClick={() => navigate("/app/add-protocol")}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Protocolo
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Buscar por título, cliente ou equipamento..."
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
              <SelectItem value="rascunho" className="text-white hover:bg-zinc-700">
                Rascunho
              </SelectItem>
              <SelectItem value="concluido" className="text-white hover:bg-zinc-700">
                Concluído
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-8 sm:p-12 text-center">
            <ClipboardList className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2 text-white">
              Nenhum protocolo encontrado
            </p>
            <p className="text-sm text-zinc-400">
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
                className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/app/protocol/${protocol.id}`)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white truncate">
                        {protocol.title || "Protocolo sem título"}
                      </h3>
                      <div className="flex items-center gap-1.5 text-sm text-zinc-400 mt-1">
                        <User className="h-3.5 w-3.5" />
                        <span className="truncate">
                          {protocol.clientName || "Sem cliente"}
                        </span>
                      </div>
                      {protocol.equipmentName && (
                        <div className="flex items-center gap-1.5 text-sm text-zinc-400 mt-0.5">
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

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-700">
                    <span className="text-xs text-zinc-500">
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
                        className="text-zinc-400 hover:text-white hover:bg-zinc-700 h-8 w-8"
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
                        className="text-zinc-400 hover:text-white hover:bg-zinc-700 h-8 w-8"
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

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem a certeza que deseja apagar este protocolo de serviço? Esta
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

export default ManageProtocols;
