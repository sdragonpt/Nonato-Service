// src/features/reports/ManageReport.jsx
// Central de Criação de Relatórios — fluxo: escolher tipo → cliente →
// ordem existente OU relatório isolado (sem ordem) → preencher/editar
// dados (formulário completo, tipo ordem de serviço) → gerar e guardar.
//
// Relatório Normal e Relatório Especial usam o mesmo formulário e o mesmo
// fluxo — a única diferença é o gerador de PDF usado no fim (o especial
// acrescenta a secção de horas agrupadas por máquina).
import { useState, useCallback, useMemo, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useClients } from "../../context/ClientsContext.jsx";
import { searchIncludes } from "../../utils/normalizeSearch.js";
import { generateAndSaveReport } from "./reportActions.js";
import { downloadFileFromUrl } from "../../utils/reportStorage.js";
import ReportOrderForm, { emptyReportDraft } from "./components/ReportOrderForm.jsx";
import {
  FileText,
  Cpu,
  Search,
  Loader2,
  ArrowLeft,
  User,
  UserX,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Download,
  RotateCcw,
  FilePlus,
  Plus,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("pt-PT");
};

const toDateInputValue = (value) => {
  if (!value) return new Date().toISOString().split("T")[0];
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().split("T")[0];
  return date.toISOString().split("T")[0];
};

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const StepHeader = ({ title, subtitle, onBack }) => (
  <div className="flex items-center gap-3">
    {onBack && (
      <Button
        variant="outline"
        size="icon"
        onClick={onBack}
        className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900 shrink-0"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
    )}
    <div className="min-w-0">
      <h2 className="text-white font-medium">{title}</h2>
      {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
    </div>
  </div>
);

const ManageReport = () => {
  const { ensureClients } = useClients();

  // step: "landing" | "clientes" | "ordens" | "formulario" | "sucesso"
  const [step, setStep] = useState("landing");
  const [reportType, setReportType] = useState("normal"); // "normal" | "especial"

  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [isolatedFlow, setIsolatedFlow] = useState(false);

  const [clientOrders, setClientOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [clientEquipments, setClientEquipments] = useState([]);

  const [draft, setDraft] = useState(emptyReportDraft());
  const [isolatedClient, setIsolatedClient] = useState({ name: "", phone: "", address: "" });
  const [loadingForm, setLoadingForm] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setClientsLoading(true);
        const list = await ensureClients();
        setClients(list);
      } catch (err) {
        console.error("Erro ao carregar clientes:", err);
      } finally {
        setClientsLoading(false);
      }
    })();
  }, [ensureClients]);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    return clients.filter((c) => searchIncludes(c.name, clientSearch));
  }, [clients, clientSearch]);

  const startFlow = (type) => {
    setReportType(type);
    setGenError(null);
    setSaved(null);
    setIsolatedFlow(false);
    setStep("clientes");
  };

  const handleIsolatedClient = () => {
    setSelectedClient(null);
    setSelectedOrder(null);
    setIsolatedFlow(true);
    setIsolatedClient({ name: "", phone: "", address: "" });
    setDraft(emptyReportDraft());
    setGenError(null);
    setStep("formulario");
  };

  const handleSelectClient = useCallback(async (client) => {
    setSelectedClient(client);
    setSelectedOrder(null);
    setIsolatedFlow(false);
    setGenError(null);
    setStep("ordens");
    setOrdersLoading(true);
    try {
      const [ordersSnap, equipSnap] = await Promise.all([
        getDocs(query(collection(db, "ordens"), where("clientId", "==", client.id))),
        getDocs(query(collection(db, "equipamentos"), where("clientId", "==", client.id))),
      ]);
      const list = ordersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((o) => !o.isQuote && !o.eliminadoEm)
        .sort((a, b) => {
          const da = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
          const dbb = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
          return dbb - da;
        });
      setClientOrders(list);
      setClientEquipments(equipSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erro ao carregar dados do cliente:", err);
      setGenError("Erro ao carregar as ordens de serviço deste cliente.");
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const buildDraftFromOrder = useCallback(async (order) => {
    const workdaysSnap = await getDocs(
      query(collection(db, "workdays"), where("orderId", "==", order.id))
    );
    const workdays = workdaysSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        workDate: toDateInputValue(data.workDate),
        departureTime: data.departureTime || "",
        arrivalTime: data.arrivalTime || "",
        kmDeparture: data.kmDeparture || "",
        kmReturn: data.kmReturn || "",
        pause: !!data.pause,
        pauseHours: data.pauseHours || "",
        returnDepartureTime: data.returnDepartureTime || "",
        returnArrivalTime: data.returnArrivalTime || "",
        description: data.description || "",
        machineEntries: (data.machineEntries || []).map((entry) => ({
          id: genId(),
          equipmentLabel: entry.equipmentLabel || "",
          startHour: entry.startHour || "",
          endHour: entry.endHour || "",
        })),
      };
    });

    const hasManual = !!order.manualEquipment?.model;
    const equipamentos = order.equipmentId || hasManual
      ? [
          {
            id: genId(),
            equipmentId: hasManual ? "" : order.equipmentId || "",
            brand: hasManual ? order.manualEquipment?.brand || "" : "",
            model: hasManual ? order.manualEquipment?.model || "" : "",
            serialNumber: hasManual ? order.manualEquipment?.serialNumber || "" : "",
          },
        ]
      : [];

    return {
      equipamentos,
      date: toDateInputValue(order.date),
      serviceType: order.serviceType || "",
      priority: order.priority || "normal",
      checklist: {
        concluido: false,
        retorno: false,
        funcionarios: false,
        documentacao: false,
        producao: false,
        pecas: false,
        ...(order.checklist || {}),
      },
      resultDescription: order.resultDescription || "",
      pontosEmAberto: order.pontosEmAberto || "",
      partsQuoteItems: (order.partsQuoteItems || []).map((p) => ({ id: genId(), ...p })),
      workdays,
    };
  }, []);

  const handleSelectOrder = useCallback(
    async (order) => {
      setSelectedOrder(order);
      setGenError(null);
      setLoadingForm(true);
      setStep("formulario");
      try {
        const nextDraft = await buildDraftFromOrder(order);
        setDraft(nextDraft);
      } catch (err) {
        console.error("Erro ao preparar dados da ordem:", err);
        setGenError("Erro ao carregar os dados desta ordem.");
        setDraft(emptyReportDraft());
      } finally {
        setLoadingForm(false);
      }
    },
    [buildDraftFromOrder]
  );

  const handleIsolatedReport = () => {
    setSelectedOrder(null);
    setDraft(emptyReportDraft());
    setGenError(null);
    setStep("formulario");
  };

  const handleGenerate = useCallback(async () => {
    if (!isolatedFlow && !selectedClient) return;
    try {
      setGenerating(true);
      setGenError(null);

      // Resolve os dados completos de cada equipamento adicionado — para
      // equipamento registado, procura marca/modelo/nº de série no cliente;
      // para equipamento manual (só em serviços isolados), já vêm no draft.
      const resolvedEquipments = draft.equipamentos.map((eq) => {
        if (isolatedFlow) {
          return { equipmentId: null, brand: eq.brand || "", model: eq.model || "", serialNumber: eq.serialNumber || "" };
        }
        const match = clientEquipments.find((e) => e.id === eq.equipmentId);
        return {
          equipmentId: eq.equipmentId || null,
          brand: match?.brand || eq.brand || "",
          model: match?.model || eq.model || "",
          serialNumber: match?.serialNumber || eq.serialNumber || "",
        };
      });
      const primaryEquipment = resolvedEquipments[0] || { brand: "", model: "", serialNumber: "" };

      const clientData = isolatedFlow
        ? {
            name: isolatedClient.name || "Cliente não registado",
            phone: isolatedClient.phone || "",
            address: isolatedClient.address || "",
          }
        : {
            name: selectedClient.name || "",
            phone: selectedClient.phone || "",
            address: selectedClient.address || "",
          };

      const order = {
        date: draft.date,
        serviceType: draft.serviceType,
        priority: draft.priority,
        checklist: draft.checklist,
        resultDescription: draft.resultDescription,
        pontosEmAberto: draft.pontosEmAberto,
        partsQuoteItems: draft.checklist.pecas ? draft.partsQuoteItems : [],
      };

      const workdays = draft.workdays.map((w) => ({
        ...w,
        machineEntries: w.machineEntries.filter((e) => e.equipmentLabel || e.startHour || e.endHour),
      }));

      const result = await generateAndSaveReport({
        tipo: reportType,
        orderId: selectedOrder?.id || null,
        orderNumber: selectedOrder?.orderNumber || null,
        order,
        client: isolatedFlow ? null : selectedClient,
        clientData,
        equipmentData: primaryEquipment,
        equipmentId: primaryEquipment.equipmentId || null,
        workdays,
      });

      setSaved(result);
      setStep("sucesso");
    } catch (err) {
      console.error("Erro ao gerar relatório:", err);
      setGenError("Erro ao gerar o relatório. Por favor, tente novamente.");
    } finally {
      setGenerating(false);
    }
  }, [selectedClient, selectedOrder, draft, clientEquipments, reportType, isolatedFlow, isolatedClient]);

  const resetFlow = useCallback(() => {
    setStep("landing");
    setSelectedClient(null);
    setSelectedOrder(null);
    setIsolatedFlow(false);
    setIsolatedClient({ name: "", phone: "", address: "" });
    setClientOrders([]);
    setClientEquipments([]);
    setDraft(emptyReportDraft());
    setClientSearch("");
    setGenError(null);
    setSaved(null);
  }, []);

  const typeLabel = reportType === "especial" ? "Relatório Especial" : "Relatório Normal";

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Criar Relatório</h1>
        <p className="text-sm text-zinc-400">
          Gera e guarda relatórios normais e especiais (horas por equipamento)
        </p>
      </div>

      {genError && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{genError}</AlertDescription>
        </Alert>
      )}

      {/* Landing: dois botões */}
      {step === "landing" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card
            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700/50 transition-colors cursor-pointer"
            onClick={() => startFlow("normal")}
          >
            <CardContent className="p-8 text-center space-y-3">
              <FileText className="w-10 h-10 text-blue-400 mx-auto" />
              <p className="text-white font-medium">Novo Relatório</p>
              <p className="text-sm text-zinc-400">
                Relatório de serviço normal, associado a um cliente
              </p>
            </CardContent>
          </Card>
          <Card
            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700/50 transition-colors cursor-pointer"
            onClick={() => startFlow("especial")}
          >
            <CardContent className="p-8 text-center space-y-3">
              <Cpu className="w-10 h-10 text-orange-400 mx-auto" />
              <p className="text-white font-medium">Novo Relatório Especial</p>
              <p className="text-sm text-zinc-400">
                Igual ao normal, mais horas agrupadas por equipamento/máquina
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Passo: escolher cliente */}
      {step === "clientes" && (
        <div className="space-y-4">
          <StepHeader
            title={`${typeLabel} — escolhe o cliente`}
            subtitle="O relatório vai ficar associado a este cliente"
            onBack={() => setStep("landing")}
          />
          <Card
            className="bg-zinc-800 border-green-700/50 hover:bg-zinc-700/50 transition-colors cursor-pointer"
            onClick={handleIsolatedClient}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-green-900/40 flex items-center justify-center shrink-0">
                <UserX className="h-4 w-4 text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium">Não é cliente (serviço isolado)</p>
                <p className="text-xs text-zinc-400">
                  Preenche os dados do cliente à mão — fica guardado à parte, em &ldquo;Avulsos&rdquo;
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0 ml-auto" />
            </CardContent>
          </Card>

          <Card className="bg-zinc-800 border-zinc-700">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Pesquisar cliente..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
            </CardContent>
          </Card>

          {clientsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredClients.map((client) => (
                <Card
                  key={client.id}
                  className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700/50 transition-colors cursor-pointer"
                  onClick={() => handleSelectClient(client)}
                >
                  <CardContent className="p-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-zinc-300" />
                      </div>
                      <p className="text-white text-sm font-medium truncate">{client.name}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Passo: escolher ordem ou relatório isolado */}
      {step === "ordens" && (
        <div className="space-y-4">
          <StepHeader
            title={`${typeLabel} de ${selectedClient?.name || "cliente"}`}
            subtitle="Escolhe uma ordem existente para partir dela, ou cria um relatório isolado"
            onBack={() => setStep("clientes")}
          />

          <Card
            className="bg-zinc-800 border-green-700/50 hover:bg-zinc-700/50 transition-colors cursor-pointer"
            onClick={handleIsolatedReport}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-green-900/40 flex items-center justify-center shrink-0">
                <FilePlus className="h-4 w-4 text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium">Relatório Isolado (sem ordem de serviço)</p>
                <p className="text-xs text-zinc-400">Preenche os dados de raiz, sem partir de nenhuma ordem</p>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0 ml-auto" />
            </CardContent>
          </Card>

          {ordersLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          ) : clientOrders.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">
              Este cliente ainda não tem ordens de serviço.
            </p>
          ) : (
            <div className="space-y-2">
              {clientOrders.map((order) => (
                <Card
                  key={order.id}
                  className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700/50 transition-colors cursor-pointer"
                  onClick={() => handleSelectOrder(order)}
                >
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        Ordem {order.orderNumber || order.id}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(order.date || order.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        className={
                          order.status === "Fechado"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-blue-500/20 text-blue-400"
                        }
                      >
                        {order.status || "Aberto"}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Passo: formulário */}
      {step === "formulario" && (
        <div className="space-y-4">
          <StepHeader
            title={
              selectedOrder
                ? `Editar dados — Ordem ${selectedOrder.orderNumber || selectedOrder.id}`
                : isolatedFlow
                ? "Preencher dados do serviço isolado"
                : "Preencher dados do relatório isolado"
            }
            subtitle={
              isolatedFlow
                ? `${typeLabel} — serviço isolado, sem cliente registado`
                : `${typeLabel} de ${selectedClient?.name || "cliente"}`
            }
            onBack={() => setStep(isolatedFlow ? "clientes" : "ordens")}
          />

          {loadingForm ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          ) : (
            <>
              {isolatedFlow && (
                <Card className="bg-zinc-800 border-zinc-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-white flex items-center gap-2">
                      <UserX className="h-4 w-4" />
                      Dados do Cliente (não registado)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      placeholder="Nome"
                      value={isolatedClient.name}
                      onChange={(e) => setIsolatedClient((prev) => ({ ...prev, name: e.target.value }))}
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                    <Input
                      placeholder="Telefone"
                      value={isolatedClient.phone}
                      onChange={(e) => setIsolatedClient((prev) => ({ ...prev, phone: e.target.value }))}
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                    <Input
                      placeholder="Morada"
                      value={isolatedClient.address}
                      onChange={(e) => setIsolatedClient((prev) => ({ ...prev, address: e.target.value }))}
                      className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                  </CardContent>
                </Card>
              )}
              <ReportOrderForm
                clientEquipments={clientEquipments}
                value={draft}
                onChange={setDraft}
                isolated={isolatedFlow}
                reportType={reportType}
              />
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Gerar e Guardar Relatório
              </Button>
            </>
          )}
        </div>
      )}

      {/* Sucesso */}
      {step === "sucesso" && saved && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <p className="text-white font-medium">Relatório gerado e guardado</p>
              <p className="text-sm text-zinc-400">
                {isolatedFlow
                  ? "Já está disponível em Avulsos, na Biblioteca de Relatórios"
                  : `Já está disponível no perfil de ${selectedClient?.name} e na Biblioteca de Relatórios`}
              </p>
            </div>
            <div className="flex justify-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => downloadFileFromUrl(saved.url, saved.fileName || "relatorio.pdf")}
                className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
              >
                <Download className="w-4 h-4 mr-2" />
                Descarregar novamente
              </Button>
              <Button onClick={resetFlow} className="bg-green-600 hover:bg-green-700">
                <RotateCcw className="w-4 h-4 mr-2" />
                Criar Outro Relatório
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManageReport;
