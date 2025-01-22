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
} from "lucide-react";

const ManageAgenda = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [agendamentos, setAgendamentos] = useState([]);

  const [stats, setStats] = useState({
    total: 0,
    hoje: 0,
    urgentes: 0,
    concluidos: 0,
  });

  // Define os meses do ano
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

        // Buscar informações de clientes e equipamentos
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

        // Filtrar agendamentos do mês selecionado
        const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
        const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
        const firstDayStr = firstDayOfMonth.toISOString().split("T")[0];
        const lastDayStr = lastDayOfMonth.toISOString().split("T")[0];

        const monthAgendamentos = agendamentosWithDetails.filter(
          (ag) => ag.data >= firstDayStr && ag.data <= lastDayStr
        );

        setStats({
          total: monthAgendamentos.length,
          hoje: monthAgendamentos.filter(
            (ag) => ag.data === new Date().toISOString().split("T")[0]
          ).length,
          urgentes: monthAgendamentos.filter((ag) => ag.prioridade === "alta")
            .length,
          concluidos: monthAgendamentos.filter((ag) => ag.concluido).length,
        });

        setAgendamentos(monthAgendamentos);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Erro ao carregar dados. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth, selectedYear]);

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

  const handleCancel = async (agendamentoId) => {
    try {
      await updateDoc(doc(db, "agendamentos", agendamentoId), {
        status: "cancelado",
        concluido: false,
      });
      fetchData();
    } catch (error) {
      console.error("Erro ao cancelar agendamento:", error);
    }
  };

  // Função para obter as semanas do mês
  const getWeeksInMonth = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const weeks = [];

    let currentWeek = [];
    let currentDate = new Date(firstDay);

    // Ajustar para começar no domingo da semana do primeiro dia
    if (currentDate.getDay() !== 0) {
      currentDate.setDate(currentDate.getDate() - currentDate.getDay());
    }

    while (currentDate <= lastDay) {
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

  // Função para obter agendamentos de um dia específico
  const getAgendamentosByDate = (date) => {
    const dateStr = date.toISOString().split("T")[0];
    return agendamentos.filter((ag) => ag.data === dateStr);
  };

  // Função para navegar entre os meses
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-semibold text-center text-white mb-6">
        Agenda
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-500/10 border border-blue-500/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-6 h-6 text-blue-400" />
            <span className="text-2xl font-bold text-blue-400">
              {stats.total}
            </span>
          </div>
          <p className="text-blue-400 text-sm">Total Mensal</p>
        </div>

        <div className="bg-purple-500/10 border border-purple-500/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6 text-purple-400" />
            <span className="text-2xl font-bold text-purple-400">
              {stats.hoje}
            </span>
          </div>
          <p className="text-purple-400 text-sm">Hoje</p>
        </div>

        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <span className="text-2xl font-bold text-red-400">
              {stats.urgentes}
            </span>
          </div>
          <p className="text-red-400 text-sm">Urgentes</p>
        </div>

        <div className="bg-green-500/10 border border-green-500/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <span className="text-2xl font-bold text-green-400">
              {stats.concluidos}
            </span>
          </div>
          <p className="text-green-400 text-sm">Concluídos</p>
        </div>
      </div>

      {/* Month Selector */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateMonth("prev")}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-blue-400 mr-2" />
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
      </div>

      {/* Weeks Grid */}
      <div className="space-y-6">
        {getWeeksInMonth().map((week, weekIndex) => {
          const hasAgendamentos = week.some(
            (date) => getAgendamentosByDate(date).length > 0
          );

          if (!hasAgendamentos) {
            return (
              <div key={weekIndex} className="bg-gray-800 p-4 rounded-lg">
                <h4 className="text-white font-medium mb-2">
                  Semana {weekIndex + 1} ({week[0].toLocaleDateString()} -{" "}
                  {week[week.length - 1].toLocaleDateString()})
                </h4>
                <p className="text-gray-400 text-sm">
                  Nenhum agendamento nesta semana
                </p>
              </div>
            );
          }

          return (
            <div key={weekIndex} className="bg-gray-800 p-4 rounded-lg">
              <h4 className="text-white font-medium mb-4">
                Semana {weekIndex + 1} ({week[0].toLocaleDateString()} -{" "}
                {week[week.length - 1].toLocaleDateString()})
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {week.map((date, dateIndex) => {
                  const dayAgendamentos = getAgendamentosByDate(date);

                  if (dayAgendamentos.length === 0) return null;

                  return (
                    <div
                      key={dateIndex}
                      className="border-l-4 border-blue-500 bg-gray-700/50 rounded-lg p-4 flex flex-col"
                    >
                      <h5 className="text-white font-medium mb-3">
                        {date.toLocaleDateString("pt-BR", {
                          weekday: "long",
                          day: "numeric",
                        })}
                      </h5>

                      <div className="space-y-3">
                        {dayAgendamentos.map((agendamento) => (
                          <div
                            key={agendamento.id}
                            className="bg-gray-800 p-3 rounded-lg"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 text-gray-400 mr-2" />
                                <span className="text-white">
                                  {agendamento.hora}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                                  agendamento.status
                                )}`}
                              >
                                {agendamento.status}
                              </span>
                            </div>

                            <div className="flex items-start space-x-2 mb-2">
                              <User className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                              <div>
                                <p className="text-white text-sm">
                                  {agendamento.cliente?.name ||
                                    "Cliente não encontrado"}
                                </p>
                                {agendamento.equipment && (
                                  <div className="flex items-center mt-1 text-gray-400 text-xs">
                                    <Printer className="w-3 h-3 mr-1" />
                                    <span>
                                      {agendamento.equipment.brand} -{" "}
                                      {agendamento.equipment.model}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() =>
                                  navigate(
                                    `/app/edit-agendamento/${agendamento.id}`
                                  )
                                }
                                className="p-1.5 text-blue-400 hover:bg-blue-400/20 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleComplete(
                                    agendamento.id,
                                    agendamento.concluido
                                  );
                                }}
                                className={`p-2 ${
                                  agendamento.concluido
                                    ? "text-blue-400 hover:bg-blue-400/20"
                                    : "text-green-400 hover:bg-green-400/20"
                                } rounded-lg transition-colors`}
                              >
                                {agendamento.concluido ? (
                                  <RotateCcw className="w-5 h-5" />
                                ) : (
                                  <CheckCircle2 className="w-5 h-5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDelete(agendamento.id)}
                                className="p-1.5 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
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
