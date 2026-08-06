// ManageAlerts.jsx - Central de Alertas: painel agregado de pendências do sistema
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import {
  Bell,
  Loader2,
  AlertTriangle,
  Users,
  CalendarClock,
  Package,
  FileClock,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";

import {
  calculateServiceFinancials,
  getPaymentStatus,
  formatPrice,
} from "../../utils/financialUtils";

const todayStr = () => new Date().toISOString().split("T")[0];

const daysSince = (dateRaw) => {
  if (!dateRaw) return 0;
  const date = dateRaw?.toDate ? dateRaw.toDate() : new Date(dateRaw);
  if (isNaN(date.getTime())) return 0;
  const diffMs = Date.now() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const ManageAlerts = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [debtors, setDebtors] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [warehousePending, setWarehousePending] = useState([]);
  const [onlineQuotesPending, setOnlineQuotesPending] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        partsBudgetsSnap,
        closuresSnap,
        clientsSnap,
        appointmentsSnap,
        warehouseSnap,
        onlineQuotesSnap,
      ] = await Promise.all([
        getDocs(query(collection(db, "ordens"), where("isQuote", "==", true))),
        getDocs(collection(db, "orcamentos")),
        getDocs(collection(db, "clientes")),
        getDocs(collection(db, "agendamentos")),
        getDocs(collection(db, "pedidosArmazem")),
        getDocs(
          query(collection(db, "orcamentos-online"), where("status", "==", "pending"))
        ),
      ]);

      const clientsMap = {};
      clientsSnap.docs.forEach((d) => {
        clientsMap[d.id] = { id: d.id, ...d.data() };
      });

      // Clientes devedores (ignora ordens excluídas / na Reciclagem)
      const services = [
        ...partsBudgetsSnap.docs.map((d) => ({ id: d.id, type: "parts_budget", ...d.data() })),
        ...closuresSnap.docs.map((d) => ({ id: d.id, type: "closure", ...d.data() })),
      ].filter((service) => !service.eliminadoEm);
      const debtorsMap = {};
      services.forEach((service) => {
        if (!service.clientId) return;
        if (getPaymentStatus(service) !== "overdue") return;
        const financials = calculateServiceFinancials(service);
        if (!debtorsMap[service.clientId]) {
          debtorsMap[service.clientId] = {
            clientId: service.clientId,
            count: 0,
            totalOverdue: 0,
          };
        }
        debtorsMap[service.clientId].count += 1;
        debtorsMap[service.clientId].totalOverdue += financials.totalWithVat;
      });
      const debtorsList = Object.values(debtorsMap)
        .map((entry) => ({ ...entry, client: clientsMap[entry.clientId] }))
        .sort((a, b) => b.totalOverdue - a.totalOverdue);
      setDebtors(debtorsList);

      // Agendamentos de hoje ainda não concluídos
      const today = todayStr();
      const todayList = appointmentsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((a) => a.data === today && a.status !== "terminado")
        .map((a) => ({ ...a, client: clientsMap[a.clientId] }))
        .sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
      setTodayAppointments(todayList);

      // Pedidos de armazém não entregues
      const warehouseList = warehouseSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => r.status && r.status !== "entregue")
        .map((r) => ({ ...r, daysWaiting: daysSince(r.createdAt) }))
        .sort((a, b) => b.daysWaiting - a.daysWaiting);
      setWarehousePending(warehouseList);

      // Orçamentos online pendentes de aprovação
      const onlineList = onlineQuotesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setOnlineQuotesPending(onlineList);
    } catch (err) {
      console.error("Erro ao carregar Central de Alertas:", err);
      setError("Erro ao carregar alertas. Por favor, tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalAlerts = useMemo(
    () =>
      debtors.length +
      todayAppointments.length +
      warehousePending.length +
      onlineQuotesPending.length,
    [debtors, todayAppointments, warehousePending, onlineQuotesPending]
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
            <Bell className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Central de Alertas
            </h1>
            <p className="text-sm text-zinc-400">
              Pendências que precisam da sua atenção
            </p>
          </div>
        </div>
        <Badge className="bg-zinc-700 text-white hover:bg-zinc-700 text-sm px-3 py-1">
          {totalAlerts} alerta(s)
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {totalAlerts === 0 && !error && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
            <p className="text-zinc-300 font-medium">Tudo em dia!</p>
            <p className="text-sm text-zinc-500">Não há pendências no momento.</p>
          </CardContent>
        </Card>
      )}

      {/* Clientes Devedores */}
      {debtors.length > 0 && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-red-400" />
              Clientes Devedores
            </CardTitle>
            <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/20">
              {debtors.length}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {debtors.slice(0, 5).map((entry) => (
              <div
                key={entry.clientId}
                onClick={() => navigate(`/app/client/${entry.clientId}`)}
                className="flex items-center justify-between p-3 bg-zinc-700/30 rounded-lg border border-zinc-600 cursor-pointer hover:bg-zinc-700/50"
              >
                <p className="text-white truncate">
                  {entry.client?.name || "Cliente removido"}
                </p>
                <p className="text-red-400 font-semibold">
                  {formatPrice(entry.totalOverdue)}
                </p>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900 mt-2"
              onClick={() => navigate("/app/clientes-devedores")}
            >
              Ver todos <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Agendamentos de Hoje */}
      {todayAppointments.length > 0 && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-blue-400" />
              Agendamentos de Hoje
            </CardTitle>
            <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/20">
              {todayAppointments.length}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayAppointments.slice(0, 5).map((a) => (
              <div
                key={a.id}
                onClick={() => navigate("/app/manage-agenda")}
                className="flex items-center justify-between p-3 bg-zinc-700/30 rounded-lg border border-zinc-600 cursor-pointer hover:bg-zinc-700/50"
              >
                <p className="text-white truncate">
                  {a.client?.name || a.newClientName || "Cliente"}
                </p>
                <p className="text-zinc-400 text-sm">{a.hora || "--:--"}</p>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900 mt-2"
              onClick={() => navigate("/app/manage-agenda")}
            >
              Ver Agenda <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pedidos de Armazém pendentes */}
      {warehousePending.length > 0 && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-400" />
              Pedidos de Armazém Pendentes
            </CardTitle>
            <Badge className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/20">
              {warehousePending.length}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {warehousePending.slice(0, 5).map((r) => (
              <div
                key={r.id}
                onClick={() => navigate("/app/warehouse")}
                className="flex items-center justify-between p-3 bg-zinc-700/30 rounded-lg border border-zinc-600 cursor-pointer hover:bg-zinc-700/50"
              >
                <p className="text-white truncate">{r.clientName || "Cliente"}</p>
                <p className="text-zinc-400 text-sm">
                  {r.daysWaiting === 0 ? "Hoje" : `${r.daysWaiting} dia(s)`}
                </p>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900 mt-2"
              onClick={() => navigate("/app/warehouse")}
            >
              Ver Armazém <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Orçamentos Online pendentes */}
      {onlineQuotesPending.length > 0 && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <FileClock className="h-4 w-4 text-yellow-400" />
              Orçamentos Online por Aprovar
            </CardTitle>
            <Badge className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20">
              {onlineQuotesPending.length}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {onlineQuotesPending.slice(0, 5).map((q) => (
              <div
                key={q.id}
                onClick={() => navigate("/app/orcamento-online")}
                className="flex items-center justify-between p-3 bg-zinc-700/30 rounded-lg border border-zinc-600 cursor-pointer hover:bg-zinc-700/50"
              >
                <p className="text-white truncate">
                  {q.clientInfo?.name || "Pedido de orçamento"}
                </p>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900 mt-2"
              onClick={() => navigate("/app/orcamento-online")}
            >
              Ver Orçamentos Online <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManageAlerts;
