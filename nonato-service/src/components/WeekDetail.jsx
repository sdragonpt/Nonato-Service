import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase.jsx";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Trash2,
  XCircle,
  CheckCircle,
  ArrowDown,
  RotateCcw,
  Printer,
} from "lucide-react";

const WeekDetail = () => {
  const { year, month, week } = useParams();
  const navigate = useNavigate();
  const [agendamentos, setAgendamentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const getWeekDates = () => {
    const firstDayOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
    let weekStart = new Date(firstDayOfMonth);
    weekStart.setDate(weekStart.getDate() + (parseInt(week) - 1) * 7);

    let weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    return { weekStart, weekEnd };
  };

  useEffect(() => {
    const fetchAgendamentos = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { weekStart, weekEnd } = getWeekDates();
        const startDateStr = weekStart.toISOString().split("T")[0];
        const endDateStr = weekEnd.toISOString().split("T")[0];

        const agendamentosRef = collection(db, "agendamentos");
        const querySnapshot = await getDocs(agendamentosRef);

        const agendamentosData = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((agendamento) => {
            return (
              agendamento.data >= startDateStr && agendamento.data <= endDateStr
            );
          });

        const clientPromises = agendamentosData.map(async (agendamento) => {
          if (agendamento.clientId) {
            const [clientDoc, equipmentDoc] = await Promise.all([
              getDoc(doc(db, "clientes", agendamento.clientId)),
              agendamento.equipmentId
                ? getDoc(doc(db, "equipamentos", agendamento.equipmentId))
                : null,
            ]);

            return {
              ...agendamento,
              cliente: clientDoc.exists() ? clientDoc.data() : null,
              equipment: equipmentDoc?.exists() ? equipmentDoc.data() : null,
            };
          }
          return agendamento;
        });

        const agendamentosWithData = await Promise.all(clientPromises);
        setAgendamentos(
          agendamentosWithData.sort(
            (a, b) =>
              a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora)
          )
        );
      } catch (err) {
        console.error("Erro ao carregar agendamentos:", err);
        setError("Erro ao carregar dados. Por favor, tente novamente.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgendamentos();
  }, [year, month, week]);

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

  const getStatusInfo = (status) => {
    switch (status) {
      case "agendado":
        return {
          icon: <Clock className="w-4 h-4 mr-1" />,
          color: "text-blue-400 bg-blue-400/20",
        };
      case "confirmado":
        return {
          icon: <AlertCircle className="w-4 h-4 mr-1" />,
          color: "text-yellow-400 bg-yellow-400/20",
        };
      case "cancelado":
        return {
          icon: <XCircle className="w-4 h-4 mr-1" />,
          color: "text-red-400 bg-red-400/20",
        };
      case "terminado":
        return {
          icon: <CheckCircle className="w-4 h-4 mr-1" />,
          color: "text-green-400 bg-green-400/20",
        };
      default:
        return {
          icon: <Clock className="w-4 h-4 mr-1" />,
          color: "text-gray-400 bg-gray-400/20",
        };
    }
  };

  const getPriorityIcon = (prioridade) => {
    switch (prioridade) {
      case "alta":
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case "normal":
        return <Clock className="w-4 h-4 text-blue-400" />;
      case "baixa":
        return <ArrowDown className="w-4 h-4 text-green-400" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const { weekStart, weekEnd } = getWeekDates();

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 flex items-center justify-center"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <h2 className="text-2xl font-semibold text-center text-white mb-6">
        Agendamentos da Semana
      </h2>

      <div className="bg-gray-800 p-4 rounded-lg mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Calendar className="w-5 h-5 text-blue-400 mr-2" />
          <span className="text-white">
            {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
          </span>
        </div>
        <span className="text-gray-400">
          {agendamentos.length} agendamento(s)
        </span>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {agendamentos.length > 0 ? (
          agendamentos.map((agendamento) => (
            <div
              key={agendamento.id}
              className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              {/* Cabeçalho do card */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-white font-medium">
                      {new Date(agendamento.data).toLocaleDateString()} às{" "}
                      {agendamento.hora}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {agendamento.tipoServico}
                    </p>
                  </div>
                </div>

                {/* Status e Prioridade */}
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs flex items-center ${
                      getStatusInfo(agendamento.status).color
                    }`}
                  >
                    {getStatusInfo(agendamento.status).icon}
                    {agendamento.status.charAt(0).toUpperCase() +
                      agendamento.status.slice(1)}
                  </span>
                  {getPriorityIcon(agendamento.prioridade)}
                </div>
              </div>

              {/* Informações do cliente e equipamento */}
              <div className="flex items-start space-x-4 mb-4">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-white">
                    {agendamento.cliente?.name || "Cliente não encontrado"}
                  </p>
                  {agendamento.cliente?.phone && (
                    <p className="text-gray-400 text-sm">
                      {agendamento.cliente.phone}
                    </p>
                  )}
                  {agendamento.equipment && (
                    <div className="flex items-center mt-2 text-gray-400 text-sm">
                      <Printer className="w-4 h-4 mr-2" />
                      <span>
                        {agendamento.equipment.brand} -{" "}
                        {agendamento.equipment.model}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Observações */}
              {agendamento.observacoes && (
                <div className="text-gray-400 text-sm mt-2 bg-gray-900 p-3 rounded-lg">
                  {agendamento.observacoes}
                </div>
              )}

              {/* Ações */}
              <div className="flex justify-end items-center mt-4 space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleComplete(agendamento.id, agendamento.concluido);
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
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/app/edit-agendamento/${agendamento.id}`);
                  }}
                  className="p-2 text-blue-400 hover:bg-blue-400/20 rounded-lg transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(agendamento.id);
                  }}
                  className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 bg-gray-800 rounded-lg">
            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400">Nenhum agendamento nesta semana</p>
            <button
              onClick={() => navigate("/app/add-agendamento")}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Criar Agendamento
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeekDetail;
