// src/features/clients/components/ClientDetail.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../../../firebase";
import { useClients } from "../../../context/ClientsContext.jsx";
import { useEquipments } from "../../../context/EquipmentsContext.jsx";
import { downloadFileFromUrl } from "../../../utils/reportStorage.js";
import { formatDate } from "../../../utils/formatDate.js";
import { getInitials } from "../../../utils/getInitials.js";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Edit2,
  Trash2,
  Users,
  Printer,
  Phone,
  MapPin,
  Calendar,
  Euro,
  Calculator,
  FileText,
  Package,
  CreditCard,
  Plus,
  Paperclip,
  Upload,
  Download,
  ClipboardCheck,
  ChevronRight,
  UserCheck,
  UserCog,
  LayoutGrid,
  FolderOpen,
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";

// Financial Components
import {
  PaymentStatusBadge,
  PaymentStatusButtons,
} from "../../../components/financial/FinancialComponents";
import {
  calculateServiceFinancials,
  getPaymentStatus,
  formatPrice,
} from "../../../utils/financialUtils";


// ===================================
// COMPONENTE DE SEÇÃO FINANCEIRA
// ===================================
const ClientFinancialSection = ({ clientId }) => {
  const [financialData, setFinancialData] = useState({
    partsBudgets: [],
    closures: [],
    summary: {
      total: 0,
      paid: 0,
      pending: 0,
      overdue: 0,
      vatTotal: 0,
      salesTotal: 0,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch dados financeiros do cliente
  const fetchFinancialData = async () => {
    try {
      setIsLoading(true);

      // Buscar orçamentos de peças (isQuote: true)
      const partsBudgetsQuery = query(
        collection(db, "ordens"),
        where("clientId", "==", clientId),
        where("isQuote", "==", true)
      );

      // Buscar fechamentos (orçamentos regulares)
      const closuresQuery = query(
        collection(db, "orcamentos"),
        where("clientId", "==", clientId)
      );

      const [partsBudgetsSnapshot, closuresSnapshot] = await Promise.all([
        getDocs(partsBudgetsQuery),
        getDocs(closuresQuery),
      ]);

      const partsBudgets = partsBudgetsSnapshot.docs.map((doc) => ({
        id: doc.id,
        type: "parts_budget",
        ...doc.data(),
      }));

      const closures = closuresSnapshot.docs.map((doc) => ({
        id: doc.id,
        type: "closure",
        ...doc.data(),
      }));

      // Calcular resumo financeiro
      const allServices = [...partsBudgets, ...closures];
      const summary = calculateFinancialSummary(allServices);

      setFinancialData({
        partsBudgets,
        closures,
        summary,
      });
    } catch (error) {
      console.error("Erro ao carregar dados financeiros:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular resumo financeiro
  const calculateFinancialSummary = (services) => {
    let total = 0;
    let paid = 0;
    let pending = 0;
    let overdue = 0;
    let vatTotal = 0;
    let salesTotal = 0;

    services.forEach((service) => {
      const financials = calculateServiceFinancials(service);
      const paymentStatus = getPaymentStatus(service);

      total += financials.totalWithVat;
      vatTotal += financials.vatAmount;
      salesTotal += financials.salesAmount;

      switch (paymentStatus) {
        case "paid":
          paid += financials.totalWithVat;
          break;
        case "pending":
          pending += financials.totalWithVat;
          break;
        case "overdue":
          overdue += financials.totalWithVat;
          break;
      }
    });

    return { total, paid, pending, overdue, vatTotal, salesTotal };
  };

  // Atualizar status de pagamento
  const updatePaymentStatus = async (serviceId, serviceType, newStatus) => {
    try {
      setIsUpdating(true);

      const collection_name =
        serviceType === "parts_budget" ? "ordens" : "orcamentos";
      await updateDoc(doc(db, collection_name, serviceId), {
        paymentStatus: newStatus,
        paymentUpdatedAt: new Date(),
      });

      // Recarregar dados
      await fetchFinancialData();
    } catch (error) {
      console.error("Erro ao atualizar status de pagamento:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchFinancialData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (isLoading) {
    return (
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Euro className="h-5 w-5" />
            Situação Financeira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const allServices = [
    ...financialData.partsBudgets,
    ...financialData.closures,
  ];

  return (
    <Card className="bg-zinc-800 border-zinc-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Euro className="h-5 w-5" />
          Situação Financeira
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resumo Financeiro */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-700/50 p-4 rounded-lg">
            <p className="text-sm text-zinc-400">Total Faturado</p>
            <p className="text-xl font-bold text-white">
              {formatPrice(financialData.summary.total)}
            </p>
          </div>

          <div className="bg-green-500/10 p-4 rounded-lg">
            <p className="text-sm text-zinc-400">Pagos</p>
            <p className="text-xl font-bold text-green-400">
              {formatPrice(financialData.summary.paid)}
            </p>
          </div>

          <div className="bg-yellow-500/10 p-4 rounded-lg">
            <p className="text-sm text-zinc-400">Pendentes</p>
            <p className="text-xl font-bold text-yellow-400">
              {formatPrice(financialData.summary.pending)}
            </p>
          </div>

          <div className="bg-red-500/10 p-4 rounded-lg">
            <p className="text-sm text-zinc-400">Devedores</p>
            <p className="text-xl font-bold text-red-400">
              {formatPrice(financialData.summary.overdue)}
            </p>
          </div>
        </div>

        {/* Detalhamento IVA/Vendas */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-700">
          <div className="bg-blue-500/10 p-4 rounded-lg">
            <p className="text-sm text-zinc-400">IVA Total</p>
            <p className="text-lg font-bold text-blue-400">
              {formatPrice(financialData.summary.vatTotal)}
            </p>
          </div>

          <div className="bg-purple-500/10 p-4 rounded-lg">
            <p className="text-sm text-zinc-400">Vendas (s/ IVA)</p>
            <p className="text-lg font-bold text-purple-400">
              {formatPrice(financialData.summary.salesTotal)}
            </p>
          </div>
        </div>

        {/* Lista de Serviços */}
        {allServices.length > 0 ? (
          <div className="space-y-4">
            <h4 className="font-medium text-white border-b border-zinc-700 pb-2">
              Histórico de Serviços ({allServices.length})
            </h4>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {allServices.map((service) => {
                const financials = calculateServiceFinancials(service);
                const paymentStatus = getPaymentStatus(service);

                return (
                  <div
                    key={`${service.type}-${service.id}`}
                    className="bg-zinc-700/30 p-4 rounded-lg border border-zinc-600"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {service.type === "parts_budget" ? (
                          <Package className="h-4 w-4 text-blue-400" />
                        ) : (
                          <FileText className="h-4 w-4 text-green-400" />
                        )}
                        <span className="font-medium text-white">
                          {service.type === "parts_budget"
                            ? "Orçamento"
                            : "Fechamento"}
                        </span>
                        <Badge
                          variant="outline"
                          className="border-orange-500/50 text-orange-400"
                        >
                          {service.id}
                        </Badge>
                      </div>

                      <PaymentStatusBadge status={paymentStatus} size="sm" />
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-zinc-400">Data</p>
                        <p className="text-white">
                          {formatDate(service.createdAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-zinc-400">Subtotal</p>
                        <p className="text-white">
                          {formatPrice(financials.totalBeforeVat)}
                        </p>
                      </div>

                      <div>
                        <p className="text-zinc-400">IVA</p>
                        <p className="text-white">
                          {formatPrice(financials.vatAmount)}
                        </p>
                      </div>

                      <div>
                        <p className="text-zinc-400">Total</p>
                        <p className="text-white font-bold">
                          {formatPrice(financials.totalWithVat)}
                        </p>
                      </div>
                    </div>

                    {/* Botões de Status */}
                    <div className="mt-4">
                      <PaymentStatusButtons
                        currentStatus={paymentStatus}
                        onStatusChange={(newStatus) =>
                          updatePaymentStatus(
                            service.id,
                            service.type,
                            newStatus
                          )
                        }
                        isLoading={isUpdating}
                        size="sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Calculator className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">
              Nenhum serviço financeiro encontrado
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ===================================
// COMPONENTE DE SEÇÃO DE ANEXOS
// ===================================
const ClientAttachments = ({ clientId }) => {
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const fileInputRef = useRef(null);

  const fetchAttachments = async () => {
    try {
      setIsLoading(true);
      const q = query(
        collection(db, "clientes", clientId, "anexos"),
        orderBy("uploadedAt", "desc")
      );
      const snap = await getDocs(q);
      setAttachments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erro ao carregar anexos:", err);
      setError("Erro ao carregar anexos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) fetchAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("O ficheiro deve ter menos de 10MB.");
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);

    const safeName = file.name.replace(/[^a-zA-Z0-9_\-. ]/g, "_");
    const storagePath = `clientes/${clientId}/anexos/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, storagePath);
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      "state_changed",
      (snap) =>
        setUploadProgress(
          Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
        ),
      (err) => {
        console.error("Erro ao enviar anexo:", err);
        setError("Erro ao enviar o ficheiro.");
        setUploading(false);
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          await addDoc(collection(db, "clientes", clientId, "anexos"), {
            name: file.name,
            url,
            storagePath,
            size: file.size,
            uploadedAt: new Date(),
          });
          await fetchAttachments();
        } catch (err) {
          console.error("Erro ao guardar anexo:", err);
          setError("Erro ao guardar a referência do anexo.");
        } finally {
          setUploading(false);
        }
      }
    );
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.storagePath) {
        try {
          await deleteObject(ref(storage, deleteTarget.storagePath));
        } catch {
          // Ficheiro pode já não existir no Storage — ignorar
        }
      }
      await deleteDoc(doc(db, "clientes", clientId, "anexos", deleteTarget.id));
      setAttachments((prev) => prev.filter((a) => a.id !== deleteTarget.id));
    } catch (err) {
      console.error("Erro ao apagar anexo:", err);
      setError("Erro ao apagar anexo.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "";
    const kb = bytes / 1024;
    return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <Card className="bg-zinc-800 border-zinc-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Anexos ({attachments.length})
          </CardTitle>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-green-600 hover:bg-green-700"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  A enviar... {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Carregar Anexo
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert
            variant="destructive"
            className="border-red-500 bg-red-500/10 mb-4"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        ) : attachments.length > 0 ? (
          <div className="space-y-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between p-3 bg-zinc-700/50 rounded-lg border border-zinc-600"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-white truncate">{att.name}</p>
                    <p className="text-xs text-zinc-400">
                      {formatSize(att.size)} · {formatDate(att.uploadedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(att.url, "_blank")}
                    className="text-zinc-400 hover:text-white hover:bg-zinc-700"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(att)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Paperclip className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">
              Nenhum anexo (contratos, solicitações, documentos) carregado
            </p>
          </div>
        )}
      </CardContent>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Apagar anexo</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem a certeza que deseja apagar &ldquo;{deleteTarget?.name}
              &rdquo;? Esta ação não pode ser desfeita.
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
              Apagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

// Inspeções Recentes — reaproveita a coleção "inspections" (já usada em
// src/features/inspections) filtrando por clientId, sem duplicar dados.
const ClientInspectionsSection = ({ clientId }) => {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInspections = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "inspections"),
          where("clientId", "==", clientId)
        );
        const snap = await getDocs(q);

        const checklistIds = [
          ...new Set(snap.docs.map((d) => d.data().checklistTypeId).filter(Boolean)),
        ];
        const checklistDocs = await Promise.all(
          checklistIds.map((id) => getDoc(doc(db, "checklist_machines", id)))
        );
        const checklistMap = {};
        checklistDocs.forEach((d) => {
          if (d.exists()) checklistMap[d.id] = d.data().type;
        });

        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((insp) => !insp.eliminadoEm)
          .map((insp) => ({
            ...insp,
            checklistTypeName: checklistMap[insp.checklistTypeId] || "Checklist",
          }))
          .sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
          });
        setInspections(list);
      } catch (err) {
        console.error("Erro ao carregar inspeções do cliente:", err);
      } finally {
        setLoading(false);
      }
    };

    if (clientId) fetchInspections();
  }, [clientId]);

  return (
    <Card className="bg-zinc-800 border-zinc-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Inspeções Recentes ({inspections.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : inspections.length === 0 ? (
          <div className="text-center py-6">
            <ClipboardCheck className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">Nenhuma inspeção registada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {inspections.slice(0, 5).map((insp) => {
              const isCompleted = insp.status === "completed";
              const dateRaw = insp.completedAt || insp.createdAt;
              const date = dateRaw?.toDate ? dateRaw.toDate() : new Date(dateRaw || 0);
              return (
                <div
                  key={insp.id}
                  onClick={() => navigate(`/app/inspection-detail/${insp.id}`)}
                  className="flex items-center justify-between p-3 bg-zinc-700/30 hover:bg-zinc-700/60 rounded-lg border border-zinc-600 cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {insp.checklistTypeName}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {date.toLocaleDateString("pt-PT")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? "bg-green-500/20 text-green-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {isCompleted ? "Concluída" : "Pendente"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-500" />
                  </div>
                </div>
              );
            })}
            {inspections.length > 5 && (
              <div className="text-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/app/manage-inspection?clientId=${clientId}`)}
                  className="border-zinc-600 text-zinc-300 bg-zinc-800 hover:bg-zinc-700"
                >
                  Ver todas ({inspections.length})
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Relatórios Gerados — histórico dos relatórios (normais e especiais)
// criados em /app/manage-report para este cliente (coleção "relatorios").
// Sem orderBy no Firestore de propósito (só equality em clientId), para
// não precisar de índice composto — ordena-se aqui. Excluir move para a
// Reciclagem (soft-delete via eliminadoEm), tal como ordens e inspeções.
const ClientReportsSection = ({ clientId }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "relatorios"), where("clientId", "==", clientId));
      const snap = await getDocs(q);
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => !r.eliminadoEm)
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA;
        });
      setReports(list);
    } catch (err) {
      console.error("Erro ao carregar relatórios do cliente:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleDownload = async (report) => {
    try {
      await downloadFileFromUrl(report.url, report.fileName || `${report.orderNumber || "relatorio"}.pdf`);
    } catch (err) {
      console.error("Erro ao descarregar relatório:", err);
    }
  };

  const handleDelete = async (report) => {
    try {
      setDeletingId(report.id);
      await updateDoc(doc(db, "relatorios", report.id), { eliminadoEm: new Date() });
      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch (err) {
      console.error("Erro ao excluir relatório:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="bg-zinc-800 border-zinc-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Relatórios ({reports.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-6">
            <FileText className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">Nenhum relatório gerado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-3 bg-zinc-700/30 hover:bg-zinc-700/60 rounded-lg border border-zinc-600 transition-colors"
              >
                <div
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() => handleDownload(report)}
                >
                  <p className="text-white text-sm font-medium truncate">
                    {report.tipo === "especial" ? "Relatório Especial" : "Relatório"}
                    {report.orderNumber ? ` — Ordem ${report.orderNumber}` : ""}
                    {report.equipmentLabel ? ` — ${report.equipmentLabel}` : ""}
                  </p>
                  <p className="text-xs text-zinc-400">{formatDate(report.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(report)}
                    className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(report)}
                    disabled={deletingId === report.id}
                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    {deletingId === report.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ===================================
// COMPONENTE PRINCIPAL ClientDetail
// ===================================
const ClientDetail = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { removeClientFromCache } = useClients();
  const { ensureEquipments } = useEquipments();
  const [client, setClient] = useState(null);
  const [services, setServices] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [clientDoc, servicesSnapshot, allEquipments] =
          await Promise.all([
            getDoc(doc(db, "clientes", clientId)),
            getDocs(
              query(collection(db, "ordens"), where("clientId", "==", clientId))
            ),
            ensureEquipments(),
          ]);

        if (!clientDoc.exists()) {
          setError("Cliente não encontrado");
          return;
        }

        setClient({ id: clientDoc.id, ...clientDoc.data() });

        const servicesList = servicesSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((service) => !service.eliminadoEm);
        setServices(servicesList);

        setEquipments(allEquipments.filter((e) => e.clientId === clientId));
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError(
          "Erro ao carregar dados do cliente. Por favor, tente novamente."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [clientId, ensureEquipments]);

  // ✅ Exclusão suave — igual ao resto da app (ordens, inspeções,
  // relatórios): o cliente e as suas ordens ficam marcados como eliminados
  // e podem ser restaurados na Reciclagem, em vez de desaparecerem para
  // sempre. Os equipamentos continuam a ser apagados definitivamente,
  // porque ainda não têm exclusão suave em lado nenhum da app.
  const handleDeleteClient = async () => {
    try {
      setIsSubmitting(true);

      const now = new Date();
      const ordersSoftDeletePromises = services.map((service) =>
        updateDoc(doc(db, "ordens", service.id), { eliminadoEm: now })
      );
      await Promise.all(ordersSoftDeletePromises);

      const equipmentsDeletePromises = equipments.map(async (equipment) => {
        await deleteDoc(doc(db, "equipamentos", equipment.id));
        // ✅ Limpa também a foto no Storage, se o equipamento tiver uma
        // (ver AddEquipment.jsx/EditEquipment.jsx — foto passou a ser
        // guardada no Storage em vez de base64 no documento).
        if (equipment.equipmentPicStoragePath) {
          try {
            await deleteObject(ref(storage, equipment.equipmentPicStoragePath));
          } catch {
            // foto pode já não existir no storage
          }
        }
      });
      await Promise.all(equipmentsDeletePromises);

      await updateDoc(doc(db, "clientes", clientId), { eliminadoEm: now });
      removeClientFromCache(clientId);

      navigate("/app/manage-clients");
    } catch (err) {
      console.error("Erro ao apagar cliente:", err);
      setError("Erro ao apagar cliente. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-white">
            Cliente não encontrado
          </p>
          <Button
            onClick={() => navigate("/app/manage-clients")}
            className="mt-4 bg-green-600 hover:bg-green-700"
          >
            Voltar à Lista
          </Button>
        </div>
      </div>
    );
  }

  const isCompany = client.type === "company";

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Detalhes do Cliente</h1>
            <p className="text-sm text-zinc-400">
              Visualize e gerencie informações do cliente
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/app/manage-clients")}
          className="h-10 w-10 rounded-full border-zinc-700 text-white hover:bg-green-700 bg-green-600 shrink-0"
        >
          <ArrowLeft className="h-4 w-4 text-white" />
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* Identidade — sempre visível, independente do separador ativo */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-zinc-700 shrink-0">
              <AvatarImage src={client.profilePic} className="object-cover" />
              <AvatarFallback className="bg-zinc-700 text-zinc-300 text-xl">
                {getInitials(client.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold text-white truncate">{client.name}</h3>
                <Badge
                  className={
                    isCompany
                      ? "bg-blue-500/20 text-blue-400 flex items-center gap-1"
                      : "bg-green-500/20 text-green-400 flex items-center gap-1"
                  }
                >
                  {isCompany ? <UserCog className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                  {isCompany ? "Empresa" : "Pessoa Física"}
                </Badge>
              </div>
              {client.company && (
                <p className="text-sm text-zinc-400">{client.company}</p>
              )}
              <p className="text-sm text-zinc-400">{client.nif || "Sem NIF"}</p>
            </div>

            <div className="flex gap-2 shrink-0">
              <Button
                onClick={() => navigate(`/app/edit-client/${clientId}`)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Separadores — antes eram 7 secções empilhadas numa scroll só */}
      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-zinc-800 border border-zinc-700">
          <TabsTrigger value="geral" className="flex items-center gap-2 data-[state=active]:bg-green-600">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="equipamentos" className="flex items-center gap-2 data-[state=active]:bg-green-600">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Equipamentos</span>
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="flex items-center gap-2 data-[state=active]:bg-green-600">
            <Euro className="h-4 w-4" />
            <span className="hidden sm:inline">Financeiro</span>
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center gap-2 data-[state=active]:bg-green-600">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Documentos</span>
          </TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="geral" className="space-y-4">
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white">Informações do Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Telefone</p>
                    <p className="text-white">{client.phone || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-400">NIF</p>
                    <p className="text-white">{client.nif || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Endereço</p>
                    <p className="text-white">{client.address || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Código Postal</p>
                    <p className="text-white">{client.postalCode || "N/A"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Cliente desde</p>
                    <p className="text-white">{formatDate(client.createdAt)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service History */}
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Histórico de Serviços ({services.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {services.length > 0 ? (
                <div className="space-y-3">
                  {services
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 5)
                    .map((service) => (
                      <div
                        key={service.id}
                        className="p-4 bg-zinc-700/50 rounded-lg border border-zinc-600"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-white">
                            {service.isQuote ? "Orçamento" : "Fechamento"}
                          </h4>
                          <Badge
                            className={
                              service.status === "Fechado"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-blue-500/20 text-blue-400"
                            }
                          >
                            {service.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-zinc-400 mb-2 font-mono">
                          {service.id}
                        </p>
                        <div className="text-xs text-zinc-500">
                          {formatDate(service.date || service.createdAt)}
                        </div>
                      </div>
                    ))}

                  {services.length > 5 && (
                    <div className="text-center pt-4">
                      <Button
                        variant="outline"
                        onClick={() => navigate("/app/manage-orders")}
                        className="border-zinc-600 text-zinc-300 bg-zinc-800 hover:bg-zinc-700"
                      >
                        Ver todos os serviços ({services.length})
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">Nenhum serviço registrado</p>
                  <Button
                    onClick={() => navigate(`/app/add-order?clientId=${clientId}`)}
                    className="mt-4 bg-green-600 hover:bg-green-700"
                  >
                    Criar Primeira Ordem
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Equipamentos */}
        <TabsContent value="equipamentos">
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Equipamentos ({equipments.length})
                </CardTitle>
                <Button
                  onClick={() =>
                    navigate(`/app/add-equipment?clientId=${clientId}`)
                  }
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Equipamento
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {equipments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {equipments.map((equipment) => (
                    <div
                      key={equipment.id}
                      className="flex items-center gap-3 p-4 bg-zinc-700/50 rounded-lg border border-zinc-600 hover:bg-zinc-700 hover:border-zinc-500 transition-colors cursor-pointer"
                      onClick={() => navigate(`/app/equipment/${equipment.id}`)}
                    >
                      <Avatar className="h-12 w-12 border border-zinc-600 shrink-0">
                        <AvatarImage src={equipment.equipmentPic} className="object-cover" />
                        <AvatarFallback className="bg-zinc-800 text-blue-400">
                          <Printer className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-white truncate">
                            {equipment.brand} {equipment.model}
                          </h4>
                          {equipment.type && (
                            <Badge variant="outline" className="text-[10px] border-zinc-600 text-zinc-400 shrink-0">
                              {equipment.type}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-zinc-400 truncate">
                          {equipment.serialNumber || "Sem nº série"}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Adicionado em {formatDate(equipment.createdAt)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Printer className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">Nenhum equipamento cadastrado</p>
                  <p className="text-sm text-zinc-500 mt-2">
                    Use o botão &ldquo;Adicionar Equipamento&rdquo; acima para começar
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financeiro */}
        <TabsContent value="financeiro">
          <ClientFinancialSection clientId={clientId} />
        </TabsContent>

        {/* Documentos: anexos + relatórios + inspeções */}
        <TabsContent value="documentos" className="space-y-4">
          <ClientAttachments clientId={clientId} />
          <ClientReportsSection clientId={clientId} />
          <ClientInspectionsSection clientId={clientId} />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir este cliente? As ordens de serviço
              associadas vão para a Reciclagem junto com o cliente (podem ser
              restauradas mais tarde). Os equipamentos associados são apagados
              definitivamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isSubmitting}
              className="border-zinc-600 text-zinc-300 bg-zinc-800 hover:bg-zinc-700"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClient}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir Cliente"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDetail;
