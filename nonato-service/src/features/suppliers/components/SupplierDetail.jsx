// src/features/suppliers/components/SupplierDetail.jsx
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../../firebase.jsx";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Loader2,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  FileText,
  CreditCard,
  Plus,
  Receipt,
  AlertTriangle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { PageHeader, PageLoader } from "../../../components/app";

const STATUS_LABELS = {
  pendente: { label: "Pendente", className: "bg-yellow-500/20 text-yellow-400" },
  paga: { label: "Paga", className: "bg-green-500/20 text-green-400" },
  vencida: { label: "Vencida", className: "bg-red-500/20 text-red-400" },
};

const InfoRow = ({ icon: Icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
};

const SupplierDetail = () => {
  const { supplierId } = useParams();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState(null);
  const [faturas, setFaturas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [showAddFatura, setShowAddFatura] = useState(false);
  const [faturaForm, setFaturaForm] = useState({
    numeroFatura: "",
    mes: "",
    valor: "",
    status: "pendente",
  });
  const [savingFatura, setSavingFatura] = useState(false);

  const fetchSupplier = useCallback(async () => {
    try {
      setIsLoading(true);
      const snapshot = await getDoc(doc(db, "fornecedores", supplierId));
      if (!snapshot.exists()) {
        setError("Fornecedor não encontrado");
        return;
      }
      setSupplier({ id: snapshot.id, ...snapshot.data() });

      const faturasSnapshot = await getDocs(
        query(collection(db, "fornecedores", supplierId, "faturas"), orderBy("mes", "desc"))
      );
      setFaturas(faturasSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setError(null);
    } catch (err) {
      console.error("Erro ao carregar fornecedor:", err);
      setError("Erro ao carregar dados do fornecedor");
    } finally {
      setIsLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    if (supplierId) fetchSupplier();
  }, [supplierId, fetchSupplier]);

  const handleDeleteSupplier = async () => {
    try {
      await deleteDoc(doc(db, "fornecedores", supplierId));
      navigate("/app/manage-suppliers");
    } catch (err) {
      console.error("Erro ao excluir fornecedor:", err);
      setError("Erro ao excluir fornecedor. Por favor, tente novamente.");
    }
  };

  const handleAddFatura = async (e) => {
    e.preventDefault();
    if (!faturaForm.numeroFatura.trim() || !faturaForm.mes.trim()) {
      setError("Preencha pelo menos o número da fatura e o mês");
      return;
    }
    try {
      setSavingFatura(true);
      await addDoc(collection(db, "fornecedores", supplierId, "faturas"), {
        numeroFatura: faturaForm.numeroFatura,
        mes: faturaForm.mes,
        valor: parseFloat(faturaForm.valor) || 0,
        status: faturaForm.status,
        createdAt: new Date(),
      });
      setFaturaForm({ numeroFatura: "", mes: "", valor: "", status: "pendente" });
      setShowAddFatura(false);
      await fetchSupplier();
    } catch (err) {
      console.error("Erro ao adicionar fatura:", err);
      setError("Erro ao adicionar fatura. Por favor, tente novamente.");
    } finally {
      setSavingFatura(false);
    }
  };

  const handleDeleteFatura = async (faturaId) => {
    try {
      await deleteDoc(doc(db, "fornecedores", supplierId, "faturas", faturaId));
      setFaturas((prev) => prev.filter((f) => f.id !== faturaId));
    } catch (err) {
      console.error("Erro ao excluir fatura:", err);
      setError("Erro ao excluir fatura. Por favor, tente novamente.");
    }
  };

  if (isLoading) {
    return (
      <PageLoader />
    );
  }

  if (error && !supplier) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-foreground">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/app/manage-suppliers")}
        >
          Voltar à lista
        </Button>
      </div>
    );
  }

  const totalFaturado = faturas.reduce((sum, f) => sum + (f.valor || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={supplier?.nomeEmpresa}
        description="Ficha de Fornecedor"
        icon={Building2}
        actions={
          <>
            <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate("/app/manage-suppliers")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(`/app/edit-supplier/${supplierId}`)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDeleteDialogOpen(true)}
              className="border-red-500/40 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          </>
        }
      />

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações de Contacto</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow icon={User} label="Pessoa de Contacto" value={supplier?.contato} />
          <InfoRow icon={Phone} label="Telefone" value={supplier?.telefones} />
          <InfoRow icon={Mail} label="Email" value={supplier?.email} />
          <InfoRow
            icon={MapPin}
            label="Morada"
            value={[supplier?.morada, supplier?.localidade, supplier?.codigoPostal, supplier?.pais]
              .filter(Boolean)
              .join(", ")}
          />
          <InfoRow icon={FileText} label="NIF" value={supplier?.numeroContribuicaoFiscal} />
          <InfoRow icon={CreditCard} label="IBAN" value={supplier?.iban} />
        </CardContent>
      </Card>

      {/* Faturas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-green-500" />
            Faturas ({faturas.length})
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setShowAddFatura((v) => !v)}
          >
            <Plus className="h-4 w-4" />
            Nova Fatura
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddFatura && (
            <form
              onSubmit={handleAddFatura}
              className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-4 bg-muted/50 rounded-lg border border-border"
            >
              <Input
                placeholder="Nº Fatura"
                value={faturaForm.numeroFatura}
                onChange={(e) => setFaturaForm((p) => ({ ...p, numeroFatura: e.target.value }))}
              />
              <Input
                placeholder="Mês (AAAA-MM)"
                value={faturaForm.mes}
                onChange={(e) => setFaturaForm((p) => ({ ...p, mes: e.target.value }))}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Valor (€)"
                value={faturaForm.valor}
                onChange={(e) => setFaturaForm((p) => ({ ...p, valor: e.target.value }))}
              />
              <Select
                value={faturaForm.status}
                onValueChange={(v) => setFaturaForm((p) => ({ ...p, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="paga">Paga</SelectItem>
                  <SelectItem value="vencida">Vencida</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={savingFatura}>
                {savingFatura ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
              </Button>
            </form>
          )}

          {faturas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Ainda não há faturas registadas para este fornecedor.
            </p>
          ) : (
            <div className="space-y-2">
              {faturas.map((fatura) => {
                const statusMeta = STATUS_LABELS[fatura.status] || STATUS_LABELS.pendente;
                return (
                  <div
                    key={fatura.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{fatura.numeroFatura}</p>
                        <p className="text-xs text-muted-foreground">{fatura.mes}</p>
                      </div>
                      <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-medium text-foreground">
                        {(fatura.valor || 0).toLocaleString("pt-PT", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:bg-red-500/10"
                        onClick={() => handleDeleteFatura(fatura.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-end pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Total:{" "}
                  <span className="text-foreground font-semibold">
                    {totalFaturado.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}
                  </span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tem a certeza que deseja excluir o fornecedor "{supplier?.nomeEmpresa}"? Esta ação
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
            <Button variant="destructive" onClick={handleDeleteSupplier}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierDetail;
