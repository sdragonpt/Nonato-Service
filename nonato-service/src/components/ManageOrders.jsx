import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
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

const ManageOrders = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    open: 0,
    closed: 0,
    urgent: 0,
    todayTotal: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Buscar todas as ordens de serviço
        const ordersRef = collection(db, "ordens");

        // Buscar todos os serviços de uma vez
        const ordersSnapshot = await getDocs(ordersRef);
        const orders = ordersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt:
            doc.data().createdAt?.toDate() || new Date(doc.data().date),
        }));

        // Calcular estatísticas
        const stats = {
          open: orders.filter((order) => order.status === "Aberto").length,
          closed: orders.filter((order) => order.status === "Fechado").length,
          urgent: orders.filter((order) => order.priority === "high").length,
          todayTotal: orders.filter((order) => {
            const orderDate = new Date(order.date);
            orderDate.setHours(0, 0, 0, 0);
            return orderDate.getTime() === today.getTime();
          }).length,
        };

        setStats(stats);
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
    <div className="w-full max-w-3xl mx-auto rounded-lg p-4">
      <h2 className="text-2xl font-semibold text-center text-white mb-6">
        Ordens de Serviço
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center text-red-500">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Card - Ordens Abertas */}
        <div
          onClick={() => navigate("/app/open-orders")}
          className="bg-blue-500/10 border border-blue-500/50 p-4 rounded-lg cursor-pointer hover:bg-blue-500/20 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <ClipboardList className="w-6 h-6 text-blue-400" />
            <span className="text-2xl font-bold text-blue-400">
              {stats.open}
            </span>
          </div>
          <p className="text-blue-400 text-sm">Ordens Abertas</p>
        </div>

        {/* Card - Ordens Fechadas */}
        <div
          onClick={() => navigate("/app/closed-orders")}
          className="bg-green-500/10 border border-green-500/50 p-4 rounded-lg cursor-pointer hover:bg-green-500/20 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <ClipboardCheck className="w-6 h-6 text-green-400" />
            <span className="text-2xl font-bold text-green-400">
              {stats.closed}
            </span>
          </div>
          <p className="text-green-400 text-sm">Ordens Fechadas</p>
        </div>

        {/* Card - Urgentes */}
        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <span className="text-2xl font-bold text-red-400">
              {stats.urgent}
            </span>
          </div>
          <p className="text-red-400 text-sm">Ordens Urgentes</p>
        </div>

        {/* Card - Hoje */}
        <div className="bg-purple-500/10 border border-purple-500/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-6 h-6 text-purple-400" />
            <span className="text-2xl font-bold text-purple-400">
              {stats.todayTotal}
            </span>
          </div>
          <p className="text-purple-400 text-sm">Ordens de Hoje</p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-4 mb-32">
        {/* Ordens Abertas Card */}
        <button
          onClick={() => navigate("/app/open-orders")}
          className="p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
        >
          <div className="flex items-center justify-center mb-3">
            <Clock className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="text-lg font-medium text-center text-white mb-2">
            Ordens Abertas
          </h3>
          <p className="text-sm text-gray-400 text-center">
            Visualizar e gerenciar ordens em andamento
          </p>
        </button>

        {/* Ordens Fechadas Card */}
        <button
          onClick={() => navigate("/app/closed-orders")}
          className="p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
        >
          <div className="flex items-center justify-center mb-3">
            <CheckCircle2 className="w-8 h-8 text-green-400 group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="text-lg font-medium text-center text-white mb-2">
            Ordens Fechadas
          </h3>
          <p className="text-sm text-gray-400 text-center">
            Histórico de ordens concluídas
          </p>
        </button>
      </div>

      {/* Botão flutuante para nova ordem */}
      <div className="fixed bottom-4 left-0 right-0 flex justify-center items-center md:left-64">
        <button
          onClick={() => navigate("/app/add-order")}
          className="h-16 px-6 bg-[#117d49] text-white font-medium flex items-center justify-center rounded-full shadow-lg hover:bg-[#0d6238] transition-all hover:scale-105"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Nova Ordem de Serviço
        </button>
      </div>
    </div>
  );
};

export default ManageOrders;
