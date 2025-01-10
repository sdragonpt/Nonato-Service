import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
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

        // Filtrar agendamentos do mês selecionado
        const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
        const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
        const firstDayStr = firstDayOfMonth.toISOString().split("T")[0];
        const lastDayStr = lastDayOfMonth.toISOString().split("T")[0];

        const monthAgendamentos = agendamentosData.filter(
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

        setAgendamentos(agendamentosData);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Erro ao carregar dados. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth, selectedYear]);

  // Função para obter as semanas do mês
  const getWeeksInMonth = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const weeks = [];

    let currentWeek = [];
    let currentDate = new Date(firstDay);

    // Ajustar para pegar os dias corretos de cada semana
    if (currentDate.getDay() !== 0) {
      // Se não começar no domingo, ajustar para o início dessa semana
      currentDate.setDate(currentDate.getDate() - currentDate.getDay());
    }

    while (currentDate <= lastDay) {
      if (currentDate.getDay() === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      // Só adicionar o dia se ele pertencer ao mês atual
      if (currentDate.getMonth() === selectedMonth) {
        currentWeek.push(new Date(currentDate));
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  };

  const getAgendamentosUrgentes = (week) => {
    const startOfWeek = week[0].toISOString().split("T")[0];
    const endOfWeek = week[week.length - 1].toISOString().split("T")[0];

    return agendamentos.filter(
      (agendamento) =>
        agendamento.data >= startOfWeek &&
        agendamento.data <= endOfWeek &&
        agendamento.prioridade === "alta"
    ).length;
  };

  const getAgendamentosConcluidos = (week) => {
    const startOfWeek = week[0].toISOString().split("T")[0];
    const endOfWeek = week[week.length - 1].toISOString().split("T")[0];

    return agendamentos.filter(
      (agendamento) =>
        agendamento.data >= startOfWeek &&
        agendamento.data <= endOfWeek &&
        agendamento.concluido
    ).length;
  };

  // Função para contar agendamentos por semana
  const getAgendamentosCount = (week) => {
    const startOfWeek = week[0].toISOString().split("T")[0];
    const endOfWeek = week[week.length - 1].toISOString().split("T")[0];

    return agendamentos.filter((agendamento) => {
      return agendamento.data >= startOfWeek && agendamento.data <= endOfWeek;
    }).length;
  };

  //   const getAgendamentosInfo = (week) => {
  //     const startOfWeek = week[0].toISOString().split("T")[0];
  //     const endOfWeek = week[week.length - 1].toISOString().split("T")[0];

  //     const weekAgendamentos = agendamentos.filter(
  //       (agendamento) =>
  //         agendamento.data >= startOfWeek && agendamento.data <= endOfWeek
  //     );

  //     return {
  //       total: weekAgendamentos.length,
  //       urgentes: weekAgendamentos.filter((a) => a.prioridade === "alta").length,
  //     };
  //   };

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Total de Agendamentos */}
        <div className="bg-blue-500/10 border border-blue-500/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-6 h-6 text-blue-400" />
            <span className="text-2xl font-bold text-blue-400">
              {stats.total}
            </span>
          </div>
          <p className="text-blue-400 text-sm">Total Mensal</p>
        </div>

        {/* Agendamentos de Hoje */}
        <div className="bg-purple-500/10 border border-purple-500/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6 text-purple-400" />
            <span className="text-2xl font-bold text-purple-400">
              {stats.hoje}
            </span>
          </div>
          <p className="text-purple-400 text-sm">Hoje</p>
        </div>

        {/* Agendamentos Urgentes */}
        <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <span className="text-2xl font-bold text-red-400">
              {stats.urgentes}
            </span>
          </div>
          <p className="text-red-400 text-sm">Urgentes</p>
        </div>

        {/* Agendamentos Concluídos */}
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

      {/* Seletor de Mês */}
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

      {/* Grid de Semanas */}
      <div className="grid gap-4">
        {getWeeksInMonth().map((week, index) => (
          <div
            key={index}
            className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
            onClick={() =>
              navigate(
                `/app/agenda/${selectedYear}/${selectedMonth + 1}/week/${
                  index + 1
                }`
              )
            }
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-3 sm:space-y-0">
              <div>
                <h4 className="text-white font-medium">Semana {index + 1}</h4>
                <p className="text-gray-400 text-sm mt-1">
                  {week[0].toLocaleDateString()} -{" "}
                  {week[week.length - 1].toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center bg-blue-500/20 px-3 py-2 rounded-full self-start sm:self-auto">
                <Clock className="w-4 h-4 text-blue-400 mr-1.5" />
                <span className="text-blue-400 font-medium text-sm">
                  {getAgendamentosCount(week)}
                  <span className="ml-1">
                    {getAgendamentosCount(week) === 1
                      ? "agendamento"
                      : "agendamentos"}
                  </span>
                </span>
              </div>
            </div>

            {/* Indicadores adicionais para mobile */}
            <div className="flex gap-2 mt-3 sm:hidden">
              {getAgendamentosUrgentes(week) > 0 && (
                <span className="text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded-full flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {getAgendamentosUrgentes(week)} urgentes
                </span>
              )}
              {getAgendamentosConcluidos(week) > 0 && (
                <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-full flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {getAgendamentosConcluidos(week)} concluídos
                </span>
              )}
            </div>
          </div>
        ))}
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
