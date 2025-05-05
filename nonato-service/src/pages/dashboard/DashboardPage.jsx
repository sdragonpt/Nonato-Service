import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  getDoc,
  doc,
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
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar.jsx";
import {
  Users,
  ClipboardList,
  Wrench,
  FileText,
  CheckSquare,
  Calendar,
  ClipboardCheck,
  Loader2,
  AlertTriangle,
  Clock,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

const DashboardPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [openOrders, setOpenOrders] = useState([]);
  const [totalOpenOrders, setTotalOpenOrders] = useState(0);
  const [stats, setStats] = useState({
    clients: 0,
    orders: 0,
    services: 0,
    budgets: 0,
    checklists: 0,
    inspections: 0,
    appointments: 0,
  });
  const navigate = useNavigate();

  const priorityColors = {
    high: "text-red-400 bg-red-500/10",
    normal: "text-blue-400 bg-blue-500/10",
    low: "text-green-400 bg-green-500/10",
  };

  const priorityLabels = {
    high: "Alta",
    normal: "Normal",
    low: "Baixa",
  };

  const priorityIcons = {
    high: AlertCircle,
    normal: Clock,
    low: AlertTriangle,
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        // Fetch counts from each collection
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

        setStats({
          clients: clientsSnap.size,
          orders: ordersSnap.size,
          services: servicesSnap.size,
          budgets: budgetsSnap.size,
          checklists: checklistsSnap.size,
          inspections: inspectionsSnap.size,
          appointments: appointmentsSnap.size,
        });

        // Fetch open orders
        const openOrdersQuery = query(
          collection(db, "ordens"),
          where("status", "!=", "Fechado"),
          orderBy("status", "desc"),
          orderBy("date", "desc")
        );

        const openOrdersSnap = await getDocs(openOrdersQuery);

        // Process open orders
        let ordersData = openOrdersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Fetch client data for each order
        const clientIds = [
          ...new Set(ordersData.map((order) => order.clientId)),
        ];
        const clientPromises = clientIds.map((id) =>
          getDoc(doc(db, "clientes", id))
        );
        const clientsDocs = await Promise.all(clientPromises);

        const clientsMap = {};
        clientsDocs.forEach((doc) => {
          if (doc.exists()) {
            clientsMap[doc.id] = { id: doc.id, ...doc.data() };
          }
        });

        // Combine orders with client data
        ordersData = ordersData.map((order) => ({
          ...order,
          client: clientsMap[order.clientId],
        }));

        // Sort orders by priority and then by date
        const sortedOrders = ordersData.sort((a, b) => {
          const priorityOrder = { high: 0, normal: 1, low: 2 };
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          return new Date(b.date) - new Date(a.date);
        });

        setTotalOpenOrders(sortedOrders.length);
        setOpenOrders(sortedOrders.slice(0, 5)); // Show only first 5 orders
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400">Visão geral do seu negócio</p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Clientes</p>
                <h3 className="text-2xl font-bold text-white mt-2">
                  {stats.clients}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Ordens</p>
                <h3 className="text-2xl font-bold text-white mt-2">
                  {stats.orders}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Serviços</p>
                <h3 className="text-2xl font-bold text-white mt-2">
                  {stats.services}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Wrench className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Orçamentos</p>
                <h3 className="text-2xl font-bold text-white mt-2">
                  {stats.budgets}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Open Orders Section */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Ordens em Aberto</CardTitle>
          <Button
            variant="outline"
            onClick={() => navigate("/app/manage-orders")}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-green-600"
          >
            Ver Todas
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardHeader>
        <CardContent>
          {openOrders.length > 0 ? (
            <div className="space-y-4">
              {openOrders.map((order) => {
                const PriorityIcon = priorityIcons[order.priority];

                const clientName =
                  order.client?.name || "Cliente não encontrado";
                const clientPhoto = order.client?.profilePic || "";

                return (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/app/order-detail/${order.id}`)}
                    className="p-4 bg-zinc-700/50 hover:bg-zinc-700 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-8 w-8 rounded-full ${
                            priorityColors[order.priority]
                          } flex items-center justify-center`}
                        >
                          <PriorityIcon className="h-4 w-4" />
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={clientPhoto} alt={clientName} />
                          <AvatarFallback>
                            {clientName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-white">{clientName}</p>
                          <p className="text-sm text-zinc-400">
                            {order.serviceType}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            priorityColors[order.priority]
                          }`}
                        >
                          {priorityLabels[order.priority]}
                        </div>
                        <p className="text-sm text-zinc-400">
                          {new Date(order.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {totalOpenOrders > 5 && (
                <div className="text-center pt-4 border-t border-zinc-700">
                  <p className="text-zinc-400">
                    {totalOpenOrders - 5} outras ordens abertas
                  </p>
                  <Button
                    variant="link"
                    onClick={() => navigate("/app/manage-orders")}
                    className="text-green-500 hover:text-green-400 mt-2"
                  >
                    Ver todas as ordens de serviço
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <ClipboardList className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">Nenhuma ordem em aberto</p>
              <p className="text-sm text-zinc-500">
                Todas as ordens estão fechadas
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Checklists</p>
                <h3 className="text-2xl font-bold text-white mt-2">
                  {stats.checklists}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-pink-500/10 flex items-center justify-center">
                <CheckSquare className="h-6 w-6 text-pink-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">Inspeções</p>
                <h3 className="text-2xl font-bold text-white mt-2">
                  {stats.inspections}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <ClipboardCheck className="h-6 w-6 text-indigo-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-400">
                  Agendamentos
                </p>
                <h3 className="text-2xl font-bold text-white mt-2">
                  {stats.appointments}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
