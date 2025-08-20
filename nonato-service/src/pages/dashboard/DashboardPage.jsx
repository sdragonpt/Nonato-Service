import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  getDoc,
  doc,
  limit,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useNavigate } from "react-router-dom";
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
  Clock,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  Plus,
  Euro,
  CheckCircle,
  Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge.jsx";

const DashboardPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    // Stats gerais
    stats: {
      clients: 0,
      orders: 0,
      services: 0,
      budgets: 0,
      checklists: 0,
      inspections: 0,
      appointments: 0,
    },
    // Atividades do dia
    todayActivities: {
      appointments: [],
      urgentOrders: [],
      completedToday: 0,
    },
    // Métricas financeiras
    financialMetrics: {
      monthlyRevenue: 0,
      pendingPayments: 0,
      revenueGrowth: 0,
    },
    // Performance
    performance: {
      completionRate: 0,
      avgResponseTime: 0,
      customerSatisfaction: 0,
    },
    // Ordens abertas por prioridade
    ordersByPriority: {
      high: 0,
      normal: 0,
      low: 0,
    },
    // Atividades recentes
    recentActivities: [],
    // Quick stats
    quickStats: {
      newClientsThisMonth: 0,
      ordersThisWeek: 0,
      appointmentsThisWeek: 0,
    },
  });

  const navigate = useNavigate();

  const priorityColors = {
    high: "text-red-400 bg-red-500/10 border-red-500/50",
    normal: "text-blue-400 bg-blue-500/10 border-blue-500/50",
    low: "text-green-400 bg-green-500/10 border-green-500/50",
  };

  const priorityLabels = {
    high: "Alta",
    normal: "Normal",
    low: "Baixa",
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const today = new Date().toISOString().split("T")[0];
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        // ✅ 1. BUSCAR DADOS BÁSICOS
        const [
          clientsSnap,
          ordersSnap,
          servicesSnap,
          budgetsSnap,
          checklistsSnap,
          inspectionsSnap,
          appointmentsSnap,
        ] = await Promise.all([
          getDocs(collection(db, "clientes")),
          getDocs(collection(db, "ordens")),
          getDocs(collection(db, "servicos")),
          getDocs(collection(db, "orcamentos")),
          getDocs(collection(db, "checklist_machines")),
          getDocs(collection(db, "inspections")),
          getDocs(collection(db, "agendamentos")),
        ]);

        // ✅ 2. AGENDAMENTOS DE HOJE
        const todayAppointmentsQuery = query(
          collection(db, "agendamentos"),
          where("data", "==", today),
          orderBy("hora", "asc")
        );
        const todayAppointmentsSnap = await getDocs(todayAppointmentsQuery);
        const todayAppointments = await Promise.all(
          todayAppointmentsSnap.docs.map(async (docSnapshot) => {
            const appointment = { id: docSnapshot.id, ...docSnapshot.data() };
            if (appointment.clientId) {
              const clientDoc = await getDoc(
                doc(db, "clientes", appointment.clientId)
              );
              appointment.client = clientDoc.exists() ? clientDoc.data() : null;
            }
            return appointment;
          })
        );

        // ✅ 3. ORDENS URGENTES (ALTA PRIORIDADE + EM ABERTO)
        const urgentOrdersQuery = query(
          collection(db, "ordens"),
          where("priority", "==", "high"),
          where("status", "!=", "Fechado"),
          orderBy("status"),
          orderBy("date", "desc"),
          limit(5)
        );
        const urgentOrdersSnap = await getDocs(urgentOrdersQuery);
        const urgentOrders = await Promise.all(
          urgentOrdersSnap.docs.map(async (docSnapshot) => {
            const order = { id: docSnapshot.id, ...docSnapshot.data() };
            if (order.clientId) {
              const clientDoc = await getDoc(doc(db, "clientes", order.clientId));
              order.client = clientDoc.exists() ? clientDoc.data() : null;
            }
            return order;
          })
        );

        // ✅ 4. ORDENS POR PRIORIDADE
        const allOrders = ordersSnap.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        }));
        const openOrders = allOrders.filter((order) => order.status !== "Fechado");
        const ordersByPriority = {
          high: openOrders.filter((order) => order.priority === "high").length,
          normal: openOrders.filter((order) => order.priority === "normal").length,
          low: openOrders.filter((order) => order.priority === "low").length,
        };

        // ✅ 5. ATIVIDADES RECENTES (ÚLTIMAS ORDENS CRIADAS)
        const recentOrdersQuery = query(
          collection(db, "ordens"),
          orderBy("date", "desc"),
          limit(5)
        );
        const recentOrdersSnap = await getDocs(recentOrdersQuery);
        const recentActivities = await Promise.all(
          recentOrdersSnap.docs.map(async (docSnapshot) => {
            const order = { id: docSnapshot.id, ...docSnapshot.data() };
            if (order.clientId) {
              const clientDoc = await getDoc(doc(db, "clientes", order.clientId));
              order.client = clientDoc.exists() ? clientDoc.data() : null;
            }
            return {
              id: order.id,
              type: "order",
              title: `Nova ordem de serviço`,
              description: `${order.client?.name || "Cliente"} - ${order.serviceType}`,
              time: order.date,
              priority: order.priority,
            };
          })
        );

        // ✅ 6. QUICK STATS
        const allClients = clientsSnap.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        }));
        const allAppointments = appointmentsSnap.docs.map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        }));

        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const newClientsThisMonth = allClients.filter((client) => {
          const clientDate = new Date(client.createdAt?.toDate?.() || client.createdAt);
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

        // ✅ 7. PERFORMANCE METRICS (SIMULADOS - VOCÊ PODE CALCULAR REAIS)
        const completedOrders = allOrders.filter((order) => order.status === "Fechado");
        const completionRate = allOrders.length > 0 
          ? Math.round((completedOrders.length / allOrders.length) * 100) 
          : 0;

        // Definir dados da dashboard
        setDashboardData({
          stats: {
            clients: clientsSnap.size,
            orders: ordersSnap.size,
            services: servicesSnap.size,
            budgets: budgetsSnap.size,
            checklists: checklistsSnap.size,
            inspections: inspectionsSnap.size,
            appointments: appointmentsSnap.size,
          },
          todayActivities: {
            appointments: todayAppointments,
            urgentOrders: urgentOrders,
            completedToday: 0, // Você pode calcular
          },
          financialMetrics: {
            monthlyRevenue: 12500, // Simulated - calcule real
            pendingPayments: 3200, // Simulated - calcule real
            revenueGrowth: 15.2, // Simulated - calcule real
          },
          performance: {
            completionRate,
            avgResponseTime: 2.3, // Simulated - calcule real
            customerSatisfaction: 94, // Simulated - calcule real
          },
          ordersByPriority,
          recentActivities,
          quickStats: {
            newClientsThisMonth,
            ordersThisWeek,
            appointmentsThisWeek,
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

  const { stats, todayActivities, financialMetrics, performance, ordersByPriority, recentActivities, quickStats } = dashboardData;

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

      {/* ✅ QUICK STATS - MÉTRICAS RÁPIDAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-800 border-zinc-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-blue-500/5"></div>
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-300 font-medium">Novos Clientes</p>
                <p className="text-2xl font-bold text-white">{quickStats.newClientsThisMonth}</p>
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
                <p className="text-2xl font-bold text-white">{quickStats.ordersThisWeek}</p>
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
                <p className="text-sm text-zinc-300 font-medium">Agendamentos</p>
                <p className="text-2xl font-bold text-white">{quickStats.appointmentsThisWeek}</p>
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
                <p className="text-sm text-zinc-300 font-medium">Taxa Conclusão</p>
                <p className="text-2xl font-bold text-white">{performance.completionRate}%</p>
                <p className="text-xs text-yellow-400">Geral</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ SEÇÃO PRINCIPAL - ATIVIDADES DO DIA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* AGENDAMENTOS DE HOJE */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-400" />
              Agendamentos de Hoje
            </CardTitle>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/50">
              {todayActivities.appointments.length}
            </Badge>
          </CardHeader>
          <CardContent>
            {todayActivities.appointments.length > 0 ? (
              <div className="space-y-3">
                {todayActivities.appointments.slice(0, 4).map((appointment) => (
                  <div
                    key={appointment.id}
                    onClick={() => navigate(`/app/edit-agendamento/${appointment.id}`)}
                    className="p-3 bg-zinc-700/50 hover:bg-zinc-700 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                        <div>
                          <p className="font-medium text-white">
                            {appointment.client?.name || appointment.newClientName || "Cliente"}
                          </p>
                          <p className="text-sm text-zinc-400">
                            {appointment.hora} - {appointment.tipoServico}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          appointment.status === "confirmado"
                            ? "bg-green-500/10 text-green-400 border-green-500/50"
                            : appointment.status === "cancelado"
                            ? "bg-red-500/10 text-red-400 border-red-500/50"
                            : "bg-yellow-500/10 text-yellow-400 border-yellow-500/50"
                        }
                      >
                        {appointment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {todayActivities.appointments.length > 4 && (
                  <Button
                    variant="link"
                    onClick={() => navigate("/app/manage-agenda")}
                    className="text-blue-400 hover:text-blue-300 w-full"
                  >
                    Ver todos os agendamentos <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-400">Nenhum agendamento para hoje</p>
                <Button
                  variant="link"
                  onClick={() => navigate("/app/add-agendamento")}
                  className="text-blue-400 hover:text-blue-300 mt-2"
                >
                  Criar agendamento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ORDENS URGENTES */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-red-400" />
              Ordens Urgentes
            </CardTitle>
            <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/50">
              {todayActivities.urgentOrders.length}
            </Badge>
          </CardHeader>
          <CardContent>
            {todayActivities.urgentOrders.length > 0 ? (
              <div className="space-y-3">
                {todayActivities.urgentOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/app/order-detail/${order.id}`)}
                    className="p-3 bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <div>
                          <p className="font-medium text-white">
                            {order.client?.name || "Cliente"}
                          </p>
                          <p className="text-sm text-zinc-400">
                            {order.serviceType} - {new Date(order.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-red-500/20 text-red-400">
                        URGENTE
                      </Badge>
                    </div>
                  </div>
                ))}
                <Button
                  variant="link"
                  onClick={() => navigate("/app/manage-orders")}
                  className="text-red-400 hover:text-red-300 w-full"
                >
                  Ver todas as ordens <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
                <p className="text-zinc-400">Nenhuma ordem urgente</p>
                <p className="text-sm text-green-400">Tudo sob controle!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ✅ MÉTRICAS DE PERFORMANCE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Receita Mensal</p>
                <h3 className="text-2xl font-bold text-white mt-2">
                  €{financialMetrics.monthlyRevenue.toLocaleString()}
                </h3>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
                  <span className="text-sm text-green-400">+{financialMetrics.revenueGrowth}%</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Euro className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Pagamentos Pendentes</p>
                <h3 className="text-2xl font-bold text-white mt-2">
                  €{financialMetrics.pendingPayments.toLocaleString()}
                </h3>
                <p className="text-sm text-yellow-400 mt-1">A receber</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Satisfação Cliente</p>
                <h3 className="text-2xl font-bold text-white mt-2">
                  {performance.customerSatisfaction}%
                </h3>
                <p className="text-sm text-green-400 mt-1">Excelente</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ SEÇÃO INFERIOR - ORDENS POR PRIORIDADE E ATIVIDADES RECENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* DISTRIBUIÇÃO DE ORDENS POR PRIORIDADE */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-white">Ordens por Prioridade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <span className="text-white">Alta Prioridade</span>
                </div>
                <Badge className="bg-red-500/20 text-red-400">
                  {ordersByPriority.high}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-blue-400" />
                  <span className="text-white">Prioridade Normal</span>
                </div>
                <Badge className="bg-blue-500/20 text-blue-400">
                  {ordersByPriority.normal}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-white">Baixa Prioridade</span>
                </div>
                <Badge className="bg-green-500/20 text-green-400">
                  {ordersByPriority.low}
                </Badge>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={() => navigate("/app/manage-orders")}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 border-green-600 text-white"
            >
              Gerenciar Ordens <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* ATIVIDADES RECENTES */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Atividades Recentes</CardTitle>
            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/50">
              {recentActivities.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 p-2 hover:bg-zinc-700/50 rounded-lg cursor-pointer transition-colors"
                  onClick={() => navigate(`/app/order-detail/${activity.id}`)}
                >
                  <div className={`h-2 w-2 rounded-full ${
                    activity.priority === 'high' ? 'bg-red-400' :
                    activity.priority === 'normal' ? 'bg-blue-400' : 'bg-green-400'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{activity.title}</p>
                    <p className="text-xs text-zinc-400">{activity.description}</p>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {new Date(activity.time).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ STATS GERAIS (SIMPLIFICADOS) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Total Clientes</p>
                <h3 className="text-xl font-bold text-white mt-1">{stats.clients}</h3>
              </div>
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Total Ordens</p>
                <h3 className="text-xl font-bold text-white mt-1">{stats.orders}</h3>
              </div>
              <ClipboardList className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Orçamentos</p>
                <h3 className="text-xl font-bold text-white mt-1">{stats.budgets}</h3>
              </div>
              <FileText className="h-5 w-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Inspeções</p>
                <h3 className="text-xl font-bold text-white mt-1">{stats.inspections}</h3>
              </div>
              <ClipboardCheck className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;