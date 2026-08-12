// ManageReportsLibrary.jsx - Biblioteca de Relatórios: arquivo por Cliente → Equipamento
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useClients } from "../../context/ClientsContext.jsx";
import { useEquipments } from "../../context/EquipmentsContext.jsx";
import { searchIncludes } from "../../utils/normalizeSearch.js";
import { downloadFileFromUrl } from "../../utils/reportStorage.js";
import { getCached, invalidateCache } from "../../utils/sessionCache.js";
import {
  Search,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  User,
  Printer,
  FileText,
  Package,
  ChevronRight,
  FolderOpen,
  Download,
  Trash2,
  UserX,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";

const formatDate = (timestamp) => {
  if (!timestamp) return "N/A";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("pt-PT");
};

// Linha de um relatório gerado (normal ou especial) — clicar descarrega;
// botão à parte para excluir (soft-delete, vai para a Reciclagem).
const ReportRow = ({ report, onDownload, onDelete, deleting }) => (
  <div className="flex items-center justify-between gap-2 p-3 bg-zinc-700/30 rounded-lg border border-zinc-600 hover:bg-zinc-700/60">
    <div className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer" onClick={() => onDownload(report)}>
      <Download className="h-4 w-4 text-blue-300 shrink-0" />
      <div className="min-w-0">
        <p className="text-white text-sm truncate">
          {report.tipo === "especial" ? "Relatório Especial" : "Relatório Gerado"}
          {report.orderNumber ? ` — Ordem ${report.orderNumber}` : ""}
          {!report.clientId && report.clientName ? ` — ${report.clientName}` : ""}
        </p>
        <p className="text-xs text-zinc-500">{formatDate(report.createdAt)}</p>
      </div>
    </div>
    <div className="flex items-center gap-1 shrink-0">
      <Badge className="bg-blue-500/20 text-blue-300">PDF</Badge>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(report)}
        disabled={deleting}
        className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-400/10"
      >
        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </Button>
    </div>
  </div>
);

// ✅ "ordens"/"orcamentos"/"relatorios" são lidos por inteiro para calcular
// a contagem de documentos por cliente (Firestore não tem forma barata de
// agregar "quantos documentos tem este cliente" sem isso). Para não repetir
// esta leitura pesada sempre que a página é aberta na mesma sessão, o
// resultado fica em cache por 5 minutos (ver src/utils/sessionCache.js).
const LIBRARY_CACHE_TTL = 5 * 60 * 1000;

const ManageReportsLibrary = () => {
  const navigate = useNavigate();
  const { ensureClients } = useClients();
  const { ensureEquipments } = useEquipments();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [orders, setOrders] = useState([]); // relatórios de serviço / OS
  const [closures, setClosures] = useState([]); // fechamentos
  const [generatedReports, setGeneratedReports] = useState([]); // gerados em /app/manage-report

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [deletingReportId, setDeletingReportId] = useState(null);

  const ISOLATED_KEY = "__isolados__";

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);
        const [allClients, allEquipments, ordersSnap, closuresSnap, reportsSnap] =
          await Promise.all([
            ensureClients(),
            ensureEquipments(),
            getCached("reportsLibrary:ordens", LIBRARY_CACHE_TTL, () =>
              getDocs(collection(db, "ordens"))
            ),
            getCached("reportsLibrary:orcamentos", LIBRARY_CACHE_TTL, () =>
              getDocs(collection(db, "orcamentos"))
            ),
            getCached("reportsLibrary:relatorios", LIBRARY_CACHE_TTL, () =>
              getDocs(collection(db, "relatorios"))
            ),
          ]);

        setClients(allClients);
        setEquipments(allEquipments);
        setOrders(
          ordersSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((o) => !o.isQuote && !o.eliminadoEm)
        );
        setClosures(closuresSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setGeneratedReports(
          reportsSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((r) => !r.eliminadoEm)
        );
      } catch (err) {
        console.error("Erro ao carregar biblioteca de relatórios:", err);
        setError("Erro ao carregar a biblioteca de relatórios.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Contagem de documentos por cliente
  const docsCountByClient = useMemo(() => {
    const map = {};
    [...orders, ...closures, ...generatedReports].forEach((doc) => {
      if (!doc.clientId) return;
      map[doc.clientId] = (map[doc.clientId] || 0) + 1;
    });
    return map;
  }, [orders, closures, generatedReports]);

  const filteredClients = useMemo(() => {
    return clients
      .filter((c) => !searchTerm || searchIncludes(c.name, searchTerm))
      .filter((c) => (docsCountByClient[c.id] || 0) > 0)
      .sort((a, b) => (docsCountByClient[b.id] || 0) - (docsCountByClient[a.id] || 0));
  }, [clients, searchTerm, docsCountByClient]);

  // Relatórios "isolados" — criados sem cliente associado (serviço avulso).
  // Não se perdem: ficam arquivados aqui, num cartão próprio.
  const isolatedReports = useMemo(
    () => generatedReports.filter((r) => !r.clientId),
    [generatedReports]
  );

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const handleDownloadReport = async (report) => {
    try {
      await downloadFileFromUrl(report.url, report.fileName || `${report.orderNumber || "relatorio"}.pdf`);
    } catch (err) {
      console.error("Erro ao descarregar relatório:", err);
    }
  };

  const handleDeleteReport = async (report) => {
    try {
      setDeletingReportId(report.id);
      await updateDoc(doc(db, "relatorios", report.id), { eliminadoEm: new Date() });
      setGeneratedReports((prev) => prev.filter((r) => r.id !== report.id));
      // Cache desatualizada — a próxima visita a esta página (dentro da
      // janela de 5 min) deve refletir a exclusão em vez de mostrar dados
      // antigos.
      invalidateCache("reportsLibrary:relatorios");
    } catch (err) {
      console.error("Erro ao excluir relatório:", err);
    } finally {
      setDeletingReportId(null);
    }
  };

  // Agrupar documentos do cliente selecionado por equipamento
  const groupedByEquipment = useMemo(() => {
    if (!selectedClientId) return [];

    const clientOrders = orders.filter((o) => o.clientId === selectedClientId);
    const clientClosures = closures.filter((c) => c.clientId === selectedClientId);
    const clientReports = generatedReports.filter((r) => r.clientId === selectedClientId);
    const clientEquipments = equipments.filter((e) => e.clientId === selectedClientId);

    const groups = {};
    const geralKey = "__geral__";
    groups[geralKey] = { equipment: null, orders: [], closures: [], reports: [] };

    clientEquipments.forEach((eq) => {
      groups[eq.id] = { equipment: eq, orders: [], closures: [], reports: [] };
    });

    clientOrders.forEach((order) => {
      const key = order.equipmentId && groups[order.equipmentId] ? order.equipmentId : geralKey;
      groups[key].orders.push(order);
    });

    clientClosures.forEach((closure) => {
      groups[geralKey].closures.push(closure);
    });

    clientReports.forEach((report) => {
      const key = report.equipmentId && groups[report.equipmentId] ? report.equipmentId : geralKey;
      groups[key].reports.push(report);
    });

    return Object.entries(groups)
      .map(([key, value]) => ({ key, ...value }))
      .filter((g) => g.orders.length > 0 || g.closures.length > 0 || g.reports.length > 0)
      .sort((a, b) => {
        if (a.key === geralKey) return 1;
        if (b.key === geralKey) return -1;
        return 0;
      });
  }, [selectedClientId, orders, closures, generatedReports, equipments]);

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
      <div className="flex items-center gap-3">
        {selectedClientId ? (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedClientId(null)}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : null}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Biblioteca de Relatórios
          </h1>
          <p className="text-sm text-zinc-400">
            {selectedClientId === ISOLATED_KEY
              ? "Serviços Isolados — relatórios sem cliente associado"
              : selectedClientId
              ? `${selectedClient?.name || "Cliente"} — arquivo por equipamento`
              : "Arquivo de relatórios de serviço e fechamentos por cliente"}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {!selectedClientId ? (
        <>
          {/* Busca de clientes */}
          <Card className="bg-zinc-800 border-zinc-700">
            <CardContent className="p-4 sm:p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
            </CardContent>
          </Card>

          {filteredClients.length === 0 && isolatedReports.length === 0 ? (
            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="p-8 sm:p-12 text-center">
                <FolderOpen className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2 text-white">
                  Nenhum arquivo encontrado
                </p>
                <p className="text-sm text-zinc-400">
                  Os clientes aparecem aqui assim que tiverem relatórios ou
                  fechamentos registados
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isolatedReports.length > 0 && (
                <Card
                  className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedClientId(ISOLATED_KEY)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                        <UserX className="h-5 w-5 text-zinc-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">
                          Serviços Isolados / Sem Cliente
                        </p>
                        <p className="text-xs text-zinc-400">
                          {isolatedReports.length} documento(s)
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                  </CardContent>
                </Card>
              )}
              {filteredClients.map((client) => (
                <Card
                  key={client.id}
                  className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedClientId(client.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-zinc-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{client.name}</p>
                        <p className="text-xs text-zinc-400">
                          {docsCountByClient[client.id] || 0} documento(s)
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : selectedClientId === ISOLATED_KEY ? (
        <div className="space-y-2">
          {isolatedReports.map((report) => (
            <ReportRow
              key={`isolated-${report.id}`}
              report={report}
              onDownload={handleDownloadReport}
              onDelete={handleDeleteReport}
              deleting={deletingReportId === report.id}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByEquipment.map((group) => (
            <Card key={group.key} className="bg-zinc-800 border-zinc-700">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-700">
                  {group.equipment ? (
                    <>
                      <Printer className="h-4 w-4 text-blue-400" />
                      <span className="text-white font-medium">
                        {group.equipment.brand} {group.equipment.model}
                        {group.equipment.serialNumber
                          ? ` — ${group.equipment.serialNumber}`
                          : ""}
                      </span>
                    </>
                  ) : (
                    <>
                      <FolderOpen className="h-4 w-4 text-zinc-400" />
                      <span className="text-white font-medium">
                        Sem equipamento / Fechamentos
                      </span>
                    </>
                  )}
                </div>

                {group.orders.map((order) => (
                  <div
                    key={`order-${order.id}`}
                    className="flex items-center justify-between p-3 bg-zinc-700/30 rounded-lg border border-zinc-600 cursor-pointer hover:bg-zinc-700/60"
                    onClick={() => navigate(`/app/order-detail/${order.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-400" />
                      <div>
                        <p className="text-white text-sm">
                          Relatório de Serviço — {order.id}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatDate(order.date || order.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400">
                      {order.status || "Aberto"}
                    </Badge>
                  </div>
                ))}

                {group.reports.map((report) => (
                  <ReportRow
                    key={`report-${report.id}`}
                    report={report}
                    onDownload={handleDownloadReport}
                    onDelete={handleDeleteReport}
                    deleting={deletingReportId === report.id}
                  />
                ))}

                {group.closures.map((closure) => (
                  <div
                    key={`closure-${closure.id}`}
                    className="flex items-center justify-between p-3 bg-zinc-700/30 rounded-lg border border-zinc-600 cursor-pointer hover:bg-zinc-700/60"
                    onClick={() => navigate(`/app/edit-budget/${closure.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-purple-400" />
                      <div>
                        <p className="text-white text-sm">
                          Fechamento — {closure.id}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatDate(closure.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-purple-500/20 text-purple-400">
                      Fechamento
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageReportsLibrary;
