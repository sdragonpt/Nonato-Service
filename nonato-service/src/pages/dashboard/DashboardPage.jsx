import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  getCountFromServer,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";

import {
  Users,
  ClipboardList,
  FileText,
  Calendar,
  ClipboardCheck,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  Euro,
  CheckCircle,
  Bell,
  Package,
  CheckSquare,
} from "lucide-react";
import {
  calculateServiceFinancials,
  calculateFinancialSummary,
  getPaymentStatus,
  formatPrice,
} from "../../utils/financialUtils";
import { useClients } from "../../context/ClientsContext.jsx";

const monthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const DashboardPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      clients: 0,
      orders: 0,
      services: 0,
      budgets: 0,
      checklists: 0,
      inspections: 0,
      appointments: 0,
    },
    financial: {
      currentMonthRevenue: 0,
      revenueGrowth: 0,
      overdueAmount: 0,
      averageTicket: 0,
    },
    revenueTrend: [],
    performance: {
      completionRate: 0,
    },
    quickStats: {
      newClientsThisMonth: 0,
      ordersThisWeek: 0,
      appointmentsThisWeek: 0,
    },
    alertsSummary: {
      debtors: 0,
      warehousePending: 0,
      onlineQuotesPending: 0,
    },
  });

  const navigate = useNavigate();
  const { ensureClients } = useClients();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const now = new Date();

        // ✅ 1. BUSCAR DADOS COMPLETOS (só onde precisamos mesmo dos campos)
        // Clientes vêm do ClientsContext partilhado (evita reler a coleção
        // inteira sempre que o dashboard abre — só busca de facto se a
        // cache tiver mais de 5 min ou for a primeira vez na sessão)
        const [allClients, ordersSnap, appointmentsSnap, closuresSnap] =
          await Promise.all([
            ensureClients(),
            getDocs(collection(db, "ordens")),
            getDocs(collection(db, "agendamentos")),
            getDocs(collection(db, "orcamentos")),
          ]);

        // ✅ 1b. CONTAGENS — getCountFromServer em vez de ler a coleção
        // inteira só para saber quantos documentos existem (muito mais barato)
        const [
          servicesCount,
          checklistsCount,
          inspectionsCount,
          onlineQuotesPendingCount,
          warehousePendingCount,
        ] = await Promise.all([
          getCountFromServer(collection(db, "servicos")),
          getCountFromServer(collection(db, "checklist_machines")),
          getCountFromServer(collection(db, "inspections")),
          getCountFromServer(
            query(collection(db, "orcamentos-online"), where("status", "==", "pending"))
          ),
          getCountFromServer(
            query(collection(db, "pedidosArmazem"), where("status", "!=", "entregue"))
          ),
        ]);

        // ✅ 4. Base de ordens (ignora ordens excluídas / na Reciclagem)
        const allOrders = ordersSnap.docs
          .map((docSnapshot) => ({
            id: docSnapshot.id,
            ...docSnapshot.data(),
          }))
          .filter((order) => !order.eliminadoEm);

        // ✅ 6. QUICK STATS
        const allAppointments = appointmentsSnap.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        }));

        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const newClientsThisMonth = allClients.filter((client) => {
          const clientDate = new Date(
            client.createdAt?.toDate?.() || client.createdAt
          );
          return clientDate >= firstDayOfMonth;
        }).length;

        const ordersThisWeek = allOrders.filter((order) => {
          const orderDate = new Date(order.date);
          return orderDate >= weekAgo;
        }).length;

        const appointmentsThisWeek = allAppointments.filter((appointment) => {
          const appointmentDate = new Date(appointment.data);
          return appointmentDate >= weekAgo;
        }).length;

        // ✅ 7. TAXA DE CONCLUSÃO (REAL)
        const completedOrders = allOrders.filter(
          (order) => order.status === "Fechado"
        );
        const completionRate =
          allOrders.length > 0
            ? Math.round((completedOrders.length / allOrders.length) * 100)
            : 0;

        // ✅ 8. FINANCEIRO REAL (orçamentos de peças + fechamentos, ignora excluídas)
        // Orçamentos de peças são "ordens" com isQuote=true — reaproveita allOrders
        // (já carregado acima) em vez de fazer uma segunda leitura da coleção "ordens"
        const financialServices = [
          ...allOrders
            .filter((order) => order.isQuote === true)
            .map((order) => ({ ...order, type: "parts_budget" })),
          ...closuresSnap.docs.map((d) => ({ id: d.id, type: "closure", ...d.data() })),
        ].filter((service) => !service.eliminadoEm);

        const revenueByMonth = {};
        financialServices.forEach((service) => {
          const raw = service.createdAt;
          const date = raw?.toDate ? raw.toDate() : new Date(raw);
          if (!date || isNaN(date.getTime())) return;
          const key = monthKey(date);
          const financials = calculateServiceFinancials(service);
          if (!revenueByMonth[key]) revenueByMonth[key] = 0;
          revenueByMonth[key] += financials.totalWithVat;
        });

        const currentMonthKey = monthKey(now);
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthKey = monthKey(prevMonthDate);
        const currentMonthRevenue = revenueByMonth[currentMonthKey] || 0;
        const prevMonthRevenue = revenueByMonth[prevMonthKey] || 0;
        const revenueGrowth =
          prevMonthRevenue > 0
            ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
            : currentMonthRevenue > 0
            ? 100
            : 0;

        const financialSummary = calculateFinancialSummary(financialServices);

        const revenueTrend = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = monthKey(d);
          revenueTrend.push({
            month: d.toLocaleDateString("pt-PT", { month: "short" }),
            faturamento: Math.round(revenueByMonth[key] || 0),
          });
        }

        // ✅ 9. ALERTAS (resumo)
        const debtorClientIds = new Set();
        financialServices.forEach((service) => {
          if (service.clientId && getPaymentStatus(service) === "overdue") {
            debtorClientIds.add(service.clientId);
          }
        });
        const warehousePending = warehousePendingCount.data().count;

        setDashboardData({
          stats: {
            clients: allClients.length,
            orders: ordersSnap.size,
            services: servicesCount.data().count,
            budgets: closuresSnap.size,
            checklists: checklistsCount.data().count,
            inspections: inspectionsCount.data().count,
            appointments: appointmentsSnap.size,
          },
          financial: {
            currentMonthRevenue,
            revenueGrowth,
            overdueAmount: financialSummary.overdueAmount,
            averageTicket: financialSummary.averageTicket,
          },
          revenueTrend,
          performance: {
            completionRate,
          },
          quickStats: {
            newClientsThisMonth,
            ordersThisWeek,
            appointmentsThisWeek,
          },
          alertsSummary: {
            debtors: debtorClientIds.size,
            warehousePending,
            onlineQuotesPending: onlineQuotesPendingCount.data().count,
          },
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const {
    stats,
    financial,
    revenueTrend,
    performance,
    quickStats,
    alertsSummary,
  } = dashboardData;

  const totalAlerts =
    alertsSummary.debtors +
    alertsSummary.warehousePending +
    alertsSummary.onlineQuotesPending;

  return (
    <div className="space-y-6">
      {/* ✅ HEADER COM AÇÕES RÁPIDAS */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400">
            Bem-vindo de volta! Aqui está o que está acontecendo hoje.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/app/add-agendamento")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Agendar
          </Button>
          <Button
            onClick={() => navigate("/app/add-order")}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Ordem
          </Button>
        </div>
      </div>

      {/* ✅ FINANCEIRO REAL */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-800 border-zinc-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-green-500/5"></div>
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-300 font-medium">
                  Faturamento do Mês
                </p>
                <p className="text-2xl font-bold text-white">
                  {formatPrice(financial.currentMonthRevenue)}
                </p>
                <p
                  className={`text-xs flex items-center gap-1 ${
                    financial.revenueGrowth >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {financial.revenueGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(Math.round(financial.revenueGrowth))}% vs mês anterior
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Euro className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-zinc-800 border-zinc-700 relative overflow-hidden cursor-pointer hover:border-red-500/50 transition-colors"
          onClick={() => navigate("/app/clientes-devedores")}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-red-500/5"></div>
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-300 font-medium">Em Atraso</p>
                <p className="text-2xl font-bold text-white">
                  {formatPrice(financial.overdueAmount)}
                </p>
                <p className="text-xs text-red-400">
                  {alertsSummary.debtors} cliente(s)
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-blue-500/5"></div>
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-300 font-medium">
                  Ticket Médio
                </p>
                <p className="text-2xl font-bold text-white">
                  {formatPrice(financial.averageTicket)}
                </p>
                <p className="text-xs text-blue-400">Por documento</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-zinc-800 border-zinc-700 relative overflow-hidden cursor-pointer hover:border-yellow-500/50 transition-colors"
          onClick={() => navigate("/app/alerts")}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/10 to-yellow-500/5"></div>
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-300 font-medium">
                  Central de Alertas
                </p>
                <p className="text-2xl font-bold text-white">{totalAlerts}</p>
                <p className="text-xs text-yellow-400">
                  {alertsSummary.warehousePending} armazém ·{" "}
                  {alertsSummary.onlineQuotesPending} orçamentos
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Bell className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ GRÁFICO DE FATURAMENTO */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
            Faturamento — Últimos 6 Meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="month" stroke="#a1a1aa" fontSize={12} />
                <YAxis
                  stroke="#a1a1aa"
                  fontSize={12}
                  tickFormatter={(value) => `€${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#27272a",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  formatter={(value) => [formatPrice(value), "Faturamento"]}
                />
                <Area
                  type="monotone"
                  dataKey="faturamento"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* ✅ QUICK STATS - MÉTRICAS RÁPIDAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-800 border-zinc-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-blue-500/5"></div>
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-300 font-medium">
                  Novos Clientes
                </p>
                <p className="text-2xl font-bold text-white">
                  {quickStats.newClientsThisMonth}
                </p>
                <p className="text-xs text-blue-400">Este mês</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-green-500/5"></div>
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-300 font-medium">Ordens</p>
                <p className="text-2xl font-bold text-white">
                  {quickStats.ordersThisWeek}
                </p>
                <p className="text-xs text-green-400">Esta semana</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-purple-500/5"></div>
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-300 font-medium">
                  Agendamentos
                </p>
                <p className="text-2xl font-bold text-white">
                  {quickStats.appointmentsThisWeek}
                </p>
                <p className="text-xs text-purple-400">Esta semana</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/10 to-yellow-500/5"></div>
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-300 font-medium">
                  Taxa Conclusão
                </p>
                <p className="text-2xl font-bold text-white">
                  {performance.completionRate}%
                </p>
                <p className="text-xs text-yellow-400">Ordens fechadas</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ STATS GERAIS */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card
          className="bg-zinc-800 border-zinc-700 cursor-pointer hover:bg-zinc-750 transition-colors"
          onClick={() => navigate("/app/manage-clients")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Clientes</p>
                <h3 className="text-xl font-bold text-white mt-1">
                  {stats.clients}
                </h3>
              </div>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-zinc-800 border-zinc-700 cursor-pointer hover:bg-zinc-750 transition-colors"
          onClick={() => navigate("/app/manage-orders")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Ordens</p>
                <h3 className="text-xl font-bold text-white mt-1">
                  {stats.orders}
                </h3>
              </div>
              <ClipboardList className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-zinc-800 border-zinc-700 cursor-pointer hover:bg-zinc-750 transition-colors"
          onClick={() => navigate("/app/manage-finances")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Orçamentos</p>
                <h3 className="text-xl font-bold text-white mt-1">
                  {stats.budgets}
                </h3>
              </div>
              <FileText className="h-5 w-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-zinc-800 border-zinc-700 cursor-pointer hover:bg-zinc-750 transition-colors"
          onClick={() => navigate("/app/manage-inspection")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Inspeções</p>
                <h3 className="text-xl font-bold text-white mt-1">
                  {stats.inspections}
                </h3>
              </div>
              <ClipboardCheck className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-zinc-800 border-zinc-700 cursor-pointer hover:bg-zinc-750 transition-colors"
          onClick={() => navigate("/app/manage-checklist")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Checklists</p>
                <h3 className="text-xl font-bold text-white mt-1">
                  {stats.checklists}
                </h3>
              </div>
              <CheckSquare className="h-5 w-5 text-teal-500" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="bg-zinc-800 border-zinc-700 cursor-pointer hover:bg-zinc-750 transition-colors"
          onClick={() => navigate("/app/warehouse")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Armazém</p>
                <h3 className="text-xl font-bold text-white mt-1">
                  {alertsSummary.warehousePending}
                </h3>
              </div>
              <Package className="h-5 w-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
