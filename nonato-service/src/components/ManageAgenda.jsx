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
} from "lucide-react";

const ManageAgenda = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [agendamentos, setAgendamentos] = useState([]);

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

        setAgendamentos(agendamentosData);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Erro ao carregar dados. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Função para obter as semanas do mês
  const getWeeksInMonth = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const weeks = [];

    let currentWeek = [];
    let currentDate = new Date(firstDay);

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

      {/* Botão de Novo Agendamento */}
      <div className="mb-8">
        <button
          onClick={() => navigate("/app/add-agendamento")}
          className="w-full p-4 bg-[#117d49] hover:bg-[#0d6238] text-white rounded-lg transition-colors flex items-center justify-center"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Novo Agendamento
        </button>
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
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-white font-medium">Semana {index + 1}</h4>
                <p className="text-gray-400 text-sm">
                  {week[0].toLocaleDateString()} -{" "}
                  {week[week.length - 1].toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center bg-blue-500/20 px-3 py-1 rounded-full">
                <Clock className="w-4 h-4 text-blue-400 mr-1" />
                <span className="text-blue-400 font-medium">
                  {getAgendamentosCount(week)} agendamentos
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManageAgenda;
