import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  ClipboardList,
  Wrench,
  FileText,
  CheckSquare,
  Calendar,
  ClipboardCheck,
  Loader2,
} from "lucide-react";

import DailyActivities from "./DailyActivities";

const DashboardPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("daily");
  const [stats, setStats] = useState({
    clients: 0,
    orders: 0,
    services: 0,
    budgets: 0,
    checklists: 0,
    inspections: 0,
    appointments: 0,
  });

  // Mock data for different periods
  const periodData = {
    daily: {
      orders: [
        { time: "00:00", value: 4 },
        { time: "04:00", value: 3 },
        { time: "08:00", value: 7 },
        { time: "12:00", value: 12 },
        { time: "16:00", value: 9 },
        { time: "20:00", value: 6 },
      ],
      revenue: [
        { time: "00:00", value: 400 },
        { time: "04:00", value: 300 },
        { time: "08:00", value: 700 },
        { time: "12:00", value: 1200 },
        { time: "16:00", value: 900 },
        { time: "20:00", value: 600 },
      ],
    },
    weekly: {
      orders: [
        { time: "Dom", value: 15 },
        { time: "Seg", value: 25 },
        { time: "Ter", value: 20 },
        { time: "Qua", value: 30 },
        { time: "Qui", value: 22 },
        { time: "Sex", value: 28 },
        { time: "Sáb", value: 15 },
      ],
      revenue: [
        { time: "Dom", value: 1500 },
        { time: "Seg", value: 2500 },
        { time: "Ter", value: 2000 },
        { time: "Qua", value: 3000 },
        { time: "Qui", value: 2200 },
        { time: "Sex", value: 2800 },
        { time: "Sáb", value: 1500 },
      ],
    },
    monthly: {
      orders: [
        { time: "1", value: 45 },
        { time: "5", value: 55 },
        { time: "10", value: 75 },
        { time: "15", value: 85 },
        { time: "20", value: 65 },
        { time: "25", value: 80 },
        { time: "30", value: 70 },
      ],
      revenue: [
        { time: "1", value: 4500 },
        { time: "5", value: 5500 },
        { time: "10", value: 7500 },
        { time: "15", value: 8500 },
        { time: "20", value: 6500 },
        { time: "25", value: 8000 },
        { time: "30", value: 7000 },
      ],
    },
    yearly: {
      orders: [
        { time: "Jan", value: 150 },
        { time: "Mar", value: 200 },
        { time: "Mai", value: 250 },
        { time: "Jul", value: 300 },
        { time: "Set", value: 280 },
        { time: "Nov", value: 260 },
      ],
      revenue: [
        { time: "Jan", value: 15000 },
        { time: "Mar", value: 20000 },
        { time: "Mai", value: 25000 },
        { time: "Jul", value: 30000 },
        { time: "Set", value: 28000 },
        { time: "Nov", value: 26000 },
      ],
    },
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
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const periodLabels = {
    daily: "Diária",
    weekly: "Semanal",
    monthly: "Mensal",
    yearly: "Anual",
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400">Visão geral do seu negócio</p>
        </div>
        <div className="flex gap-2">
          {Object.keys(periodLabels).map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? "default" : "outline"}
              onClick={() => setSelectedPeriod(period)}
              className={`${
                selectedPeriod === period
                  ? "bg-green-600 hover:bg-green-700"
                  : "border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-800"
              }`}
            >
              {periodLabels[period]}
            </Button>
          ))}
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

      {/* Daily Activities Section */}
      {selectedPeriod === "daily" && <DailyActivities />}

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Orders Trend */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-white">Tendência de Ordens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={periodData[selectedPeriod].orders}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "none",
                    }}
                    labelStyle={{ color: "#F9FAFB" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#10B981"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-white">
              Receita {periodLabels[selectedPeriod]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={periodData[selectedPeriod].revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "none",
                    }}
                    labelStyle={{ color: "#F9FAFB" }}
                  />
                  <Bar dataKey="value" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

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
