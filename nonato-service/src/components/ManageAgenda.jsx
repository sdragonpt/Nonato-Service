import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  PlusCircle,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Printer,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Calendar as CalendarIcon,
  Filter,
} from "lucide-react";

const ManageAgenda = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [agendamentos, setAgendamentos] = useState([]);
  const [viewMode, setViewMode] = useState("calendar");
  const [filterStatus, setFilterStatus] = useState("all");
  const [stats, setStats] = useState({
    total: 0,
    hoje: 0,
    urgentes: 0,
    concluidos: 0,
  });

  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  // Função para buscar agendamentos
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const agendamentosRef = collection(db, "agendamentos");
        const querySnapshot = await getDocs(agendamentosRef);
        const agendamentosData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const agendamentosWithDetails = await Promise.all(
          agendamentosData.map(async (agendamento) => {
            if (agendamento.clientId) {
              const clientDoc = await getDoc(
                doc(db, "clientes", agendamento.clientId)
              );
              const equipmentDoc = agendamento.equipmentId
                ? await getDoc(doc(db, "equipamentos", agendamento.equipmentId))
                : null;

              return {
                ...agendamento,
                cliente: clientDoc.exists() ? clientDoc.data() : null,
                equipment: equipmentDoc?.exists() ? equipmentDoc.data() : null,
              };
            }
            return agendamento;
          })
        );

        const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
        const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
        const firstDayStr = firstDayOfMonth.toISOString().split("T")[0];
        const lastDayStr = lastDayOfMonth.toISOString().split("T")[0];

        let filteredAgendamentos = agendamentosWithDetails.filter(
          (ag) => ag.data >= firstDayStr && ag.data <= lastDayStr
        );

        if (filterStatus !== "all") {
          filteredAgendamentos = filteredAgendamentos.filter(
            (ag) => ag.status === filterStatus
          );
        }

        setStats({
          total: filteredAgendamentos.length,
          hoje: filteredAgendamentos.filter(
            (ag) => ag.data === new Date().toISOString().split("T")[0]
          ).length,
          urgentes: filteredAgendamentos.filter(
            (ag) => ag.prioridade === "alta"
          ).length,
          concluidos: filteredAgendamentos.filter((ag) => ag.concluido).length,
        });

        setAgendamentos(filteredAgendamentos);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Erro ao carregar dados. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth, selectedYear, filterStatus]);

  const handleDelete = async (agendamentoId) => {
    if (!window.confirm("Tem certeza que deseja excluir este agendamento?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "agendamentos", agendamentoId));
      setAgendamentos((prev) => prev.filter((a) => a.id !== agendamentoId));
    } catch (err) {
      console.error("Erro ao deletar:", err);
      setError("Erro ao deletar agendamento");
    }
  };

  const handleToggleComplete = async (agendamentoId, isConcluido) => {
    try {
      const agendamentoRef = doc(db, "agendamentos", agendamentoId);
      await updateDoc(agendamentoRef, {
        concluido: !isConcluido,
        status: !isConcluido ? "terminado" : "agendado",
        updatedAt: new Date(),
      });

      setAgendamentos((prev) =>
        prev.map((ag) =>
          ag.id === agendamentoId
            ? {
                ...ag,
                concluido: !isConcluido,
                status: !isConcluido ? "terminado" : "agendado",
              }
            : ag
        )
      );
    } catch (err) {
      console.error("Erro ao atualizar agendamento:", err);
      setError("Erro ao atualizar agendamento");
    }
  };

  const getWeeksInMonth = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const weeks = [];
    let currentWeek = [];
    let currentDate = new Date(firstDay);

    while (currentDate.getMonth() === selectedMonth) {
      if (currentDate.getDay() === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentWeek.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  };

  const getAgendamentosByDate = (date) => {
    const dateStr = date.toISOString().split("T")[0];
    return agendamentos.filter((ag) => ag.data === dateStr);
  };

  const navigateMonth = (direction) => {
    if (direction === "next") {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear((prev) => prev + 1);
      } else {
        setSelectedMonth((prev) => prev + 1);
      }
    } else {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear((prev) => prev - 1);
      } else {
        setSelectedMonth((prev) => prev - 1);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "agendado":
        return "text-blue-400 bg-blue-400/20";
      case "confirmado":
        return "text-yellow-400 bg-yellow-400/20";
      case "cancelado":
        return "text-red-400 bg-red-400/20";
      case "terminado":
        return "text-green-400 bg-green-400/20";
      default:
        return "text-gray-400 bg-gray-400/20";
    }
  };

  const StatsCard = ({ icon: Icon, value, label, variant }) => {
    const variants = {
      blue: "bg-blue-500/10 border-blue-500/50 text-blue-400",
      purple:
        "bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400",
      red: "bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/30 text-red-400",
      green:
        "bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30 text-green-400",
    };

    return (
      <div className={`${variants[variant]} border p-4 rounded-lg`}>
        <div className="flex items-center justify-between mb-2">
          <Icon className="w-6 h-6" />
          <span className="text-2xl font-bold">{value}</span>
        </div>
        <p className="text-sm font-medium">{label}</p>
      </div>
    );
  };

  const StatsGrid = () => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatsCard
          icon={Calendar}
          value={stats.total}
          label="Total Mensal"
          variant="blue"
        />
        <StatsCard
          icon={Clock}
          value={stats.hoje}
          label="Hoje"
          variant="purple"
        />
        <StatsCard
          icon={AlertTriangle}
          value={stats.urgentes}
          label="Urgentes"
          variant="red"
        />
        <StatsCard
          icon={CheckCircle}
          value={stats.concluidos}
          label="Concluídos"
          variant="green"
        />
      </div>
    );
  };

  const AgendamentoCard = ({ agendamento }) => {
    return (
      <div className="bg-gray-800 p-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center">
            <Clock className="w-4 h-4 text-gray-400 mr-2" />
            <span className="text-white font-medium">{agendamento.hora}</span>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
              agendamento.status
            )}`}
          >
            {agendamento.status}
          </span>
        </div>

        <div className="flex items-start space-x-3 mb-4">
          <User className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
          <div>
            <p className="text-white font-medium">
              {agendamento.cliente?.name || "Cliente não encontrado"}
            </p>
            {agendamento.equipment && (
              <div className="flex items-center mt-1 text-gray-400 text-sm">
                <Printer className="w-4 h-4 mr-1" />
                <span>
                  {agendamento.equipment.brand} - {agendamento.equipment.model}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => navigate(`/app/edit-agendamento/${agendamento.id}`)}
            className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              handleToggleComplete(agendamento.id, agendamento.concluido)
            }
            className={`p-2 ${
              agendamento.concluido
                ? "text-blue-400 hover:bg-blue-400/20"
                : "text-green-400 hover:bg-green-400/20"
            } rounded-lg transition-colors`}
            title={
              agendamento.concluido
                ? "Desfazer conclusão"
                : "Marcar como concluído"
            }
          >
            {agendamento.concluido ? (
              <RotateCcw className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => handleDelete(agendamento.id)}
            className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const CalendarView = () => {
    return getWeeksInMonth().map((week, weekIndex) => {
      const hasAgendamentos = week.some(
        (date) => getAgendamentosByDate(date).length > 0
      );

      if (!hasAgendamentos) return null;

      return (
        <div key={weekIndex} className="bg-gray-800 p-4 rounded-lg">
          <h4 className="text-white font-medium mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-400" />
            Semana {weekIndex + 1} ({week[0].toLocaleDateString()} -{" "}
            {week[week.length - 1].toLocaleDateString()})
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {week.map((date, dateIndex) => {
              const dayAgendamentos = getAgendamentosByDate(date);
              if (dayAgendamentos.length === 0) return null;

              return (
                <div
                  key={dateIndex}
                  className="border-l-4 border-blue-500 bg-gray-700/50 backdrop-blur-sm rounded-lg p-4"
                >
                  <h5 className="text-white font-medium mb-4 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-blue-400" />
                    {date.toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "numeric",
                    })}
                  </h5>

                  <div className="space-y-4">
                    {dayAgendamentos.map((agendamento) => (
                      <AgendamentoCard
                        key={agendamento.id}
                        agendamento={agendamento}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  };

  const ListView = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agendamentos.map((agendamento) => (
          <AgendamentoCard key={agendamento.id} agendamento={agendamento} />
        ))}
      </div>
    );
  };

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
        Agenda
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <StatsGrid />

      {/* Controls Section */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-700 rounded-lg">
              <button
                onClick={() => navigateMonth("prev")}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center px-4">
                <CalendarIcon className="w-5 h-5 text-blue-400 mr-2" />
                <h3 className="text-lg font-medium text-white">
                  {months[selectedMonth]} {selectedYear}
                </h3>
              </div>

              <button
                onClick={() => navigateMonth("next")}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("calendar")}
                className={`p-2 rounded-lg ${
                  viewMode === "calendar"
                    ? "bg-blue-500/20 text-blue-400"
                    : "text-gray-400 hover:bg-gray-700"
                }`}
              >
                <Calendar className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg ${
                  viewMode === "list"
                    ? "bg-blue-500/20 text-blue-400"
                    : "text-gray-400 hover:bg-gray-700"
                }`}
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="all">Todos os status</option>
              <option value="agendado">Agendado</option>
              <option value="confirmado">Confirmado</option>
              <option value="terminado">Terminado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="space-y-6">
        {viewMode === "calendar" ? <CalendarView /> : <ListView />}
      </div>

      {/* Botão flutuante para novo agendamento */}
      <div className="fixed bottom-4 left-0 right-0 flex justify-center items-center md:left-64">
        <button
          onClick={() => navigate("/app/add-agendamento")}
          className="h-16 px-6 bg-[#117d49] text-white font-medium flex items-center justify-center rounded-full shadow-lg hover:bg-[#0d6238] transition-all hover:scale-105"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Novo Agendamento
        </button>
      </div>
    </div>
  );
};

export default ManageAgenda;
