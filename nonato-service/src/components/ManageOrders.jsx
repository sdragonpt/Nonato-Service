import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.jsx";
import {
  PlusCircle,
  ClipboardCheck,
  ClipboardList,
  AlertCircle,
  Clock,
  CheckCircle2,
  Loader2,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const StatsCard = ({ Icon, value, label, color, onClick }) => (
  <Card
    onClick={onClick}
    className={`bg-${color}-500/10 border-${color}-500/50 hover:bg-${color}-500/20 transition-colors cursor-pointer`}
  >
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-6 h-6 text-${color}-400`} />
        <span className={`text-2xl font-bold text-${color}-400`}>{value}</span>
      </div>
      <p className={`text-${color}-400 text-sm`}>{label}</p>
    </CardContent>
  </Card>
);

const ActionCard = ({ Icon, title, description, onClick }) => (
  <Card
    onClick={onClick}
    className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer"
  >
    <CardContent className="p-6 text-center">
      <div className="flex justify-center mb-3">
        <Icon className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-400">{description}</p>
    </CardContent>
  </Card>
);

const ManageOrders = () => {
  const [stats, setStats] = useState({
    open: 0,
    closed: 0,
    urgent: 0,
    todayTotal: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const ordersSnapshot = await getDocs(collection(db, "ordens"));
        const orders = ordersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt:
            doc.data().createdAt?.toDate() || new Date(doc.data().date),
        }));

        setStats({
          open: orders.filter((order) => order.status === "Aberto").length,
          closed: orders.filter((order) => order.status === "Fechado").length,
          urgent: orders.filter((order) => order.priority === "high").length,
          todayTotal: orders.filter((order) => {
            const orderDate = new Date(order.date);
            orderDate.setHours(0, 0, 0, 0);
            return orderDate.getTime() === today.getTime();
          }).length,
        });
        setError(null);
      } catch (err) {
        console.error("Erro ao buscar estatísticas:", err);
        setError("Erro ao carregar dados. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto p-4">
      <Card className="mb-8 bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-white">
            Ordens de Serviço
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert
              variant="destructive"
              className="border-red-500 bg-red-500/10"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatsCard
              Icon={ClipboardList}
              value={stats.open}
              label="Ordens Abertas"
              color="blue"
              onClick={() => navigate("/app/open-orders")}
            />
            <StatsCard
              Icon={ClipboardCheck}
              value={stats.closed}
              label="Ordens Fechadas"
              color="green"
              onClick={() => navigate("/app/closed-orders")}
            />
            <StatsCard
              Icon={AlertCircle}
              value={stats.urgent}
              label="Ordens Urgentes"
              color="red"
            />
            <StatsCard
              Icon={Calendar}
              value={stats.todayTotal}
              label="Ordens de Hoje"
              color="purple"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 mb-24">
        <ActionCard
          Icon={Clock}
          title="Ordens Abertas"
          description="Visualizar e gerenciar ordens em andamento"
          onClick={() => navigate("/app/open-orders")}
        />
        <ActionCard
          Icon={CheckCircle2}
          title="Ordens Fechadas"
          description="Histórico de ordens concluídas"
          onClick={() => navigate("/app/closed-orders")}
        />
      </div>

      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          onClick={() => navigate("/app/add-order")}
          className="rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        >
          <PlusCircle className="w-5 h-5 md:mr-2" />
          <span className="hidden md:inline">Nova Ordem de Serviço</span>
        </Button>
      </div>
    </div>
  );
};

export default ManageOrders;
