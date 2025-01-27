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
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  CalendarIcon,
  Filter,
  MoreVertical,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ManageAgenda = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [agendamentos, setAgendamentos] = useState([]);
  const [viewMode, setViewMode] = useState("calendar");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
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

        if (searchTerm) {
          filteredAgendamentos = filteredAgendamentos.filter(
            (ag) =>
              ag.cliente?.name
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              ag.hora?.toLowerCase().includes(searchTerm.toLowerCase())
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
  }, [selectedMonth, selectedYear, filterStatus, searchTerm]);

  const handleDelete = async (agendamentoId, e) => {
    if (e) e.stopPropagation();
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

  const handleToggleComplete = async (agendamentoId, isConcluido, e) => {
    if (e) e.stopPropagation();
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
      blue: "bg-blue-500/10 border-blue-500/30 text-blue-400",
      purple: "bg-purple-500/10 border-purple-500/30 text-purple-400",
      red: "bg-red-500/10 border-red-500/30 text-red-400",
      green: "bg-green-500/10 border-green-500/30 text-green-400",
    };

    return (
      <Card className={`${variants[variant]} border`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Icon className="w-6 h-6" />
            <span className="text-2xl font-bold">{value}</span>
          </div>
          <p className="text-sm font-medium">{label}</p>
        </CardContent>
      </Card>
    );
  };

  const getClientColor = (clientId) => {
    const colors = [
      {
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        text: "text-blue-400",
      },
      {
        bg: "bg-purple-500/10",
        border: "border-purple-500/30",
        text: "text-purple-400",
      },
      {
        bg: "bg-green-500/10",
        border: "border-green-500/30",
        text: "text-green-400",
      },
      {
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/30",
        text: "text-yellow-400",
      },
      {
        bg: "bg-pink-500/10",
        border: "border-pink-500/30",
        text: "text-pink-400",
      },
      {
        bg: "bg-orange-500/10",
        border: "border-orange-500/30",
        text: "text-orange-400",
      },
      {
        bg: "bg-indigo-500/10",
        border: "border-indigo-500/30",
        text: "text-indigo-400",
      },
      {
        bg: "bg-teal-500/10",
        border: "border-teal-500/30",
        text: "text-teal-400",
      },
    ];

    if (!clientId) return colors[0];

    let hash = 0;
    for (let i = 0; i < clientId.length; i++) {
      hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const AgendamentoCard = ({ agendamento }) => {
    const isToday = agendamento.data === new Date().toISOString().split("T")[0];
    const isUrgent = agendamento.prioridade === "alta";
    const clientColor = isUrgent
      ? {
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          text: "text-red-400",
        }
      : getClientColor(agendamento.clientId);

    const date = new Date(agendamento.data);
    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(date);

    return (
      <Card
        className={`${clientColor.bg} ${
          clientColor.border
        } hover:bg-opacity-20 transition-colors ${
          isToday ? "ring-2 ring-green-400" : ""
        }`}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${clientColor.text}`} />
              <span
                className={`font-medium ${
                  isToday ? "text-green-400 font-bold" : "text-white"
                }`}
              >
                {agendamento.hora}
              </span>
              {isUrgent && <AlertTriangle className="w-4 h-4 text-red-400" />}
            </div>

            <div className="flex items-center gap-2">
              <User className={`w-4 h-4 ${clientColor.text}`} />
              <span
                className={`font-medium ${
                  isToday ? "font-bold" : ""
                } text-white`}
              >
                {agendamento.cliente?.name || "Cliente não encontrado"}
              </span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-zinc-800 text-white hover:text-white/50"
                >
                  <span className="sr-only">Abrir menu</span>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-zinc-800 border-zinc-700"
              >
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/app/edit-agendamento/${agendamento.id}`);
                  }}
                  className="text-white hover:bg-zinc-700"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) =>
                    handleToggleComplete(
                      agendamento.id,
                      agendamento.concluido,
                      e
                    )
                  }
                  className="text-white hover:bg-zinc-700"
                >
                  {agendamento.concluido ? (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reabrir
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Concluir
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-400 hover:bg-zinc-700 focus:text-red-400"
                  onClick={(e) => handleDelete(agendamento.id, e)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span
              className={`text-xs px-2 py-1 rounded ${getStatusColor(
                agendamento.status
              )}`}
            >
              {agendamento.status}
            </span>
            {isToday && (
              <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
                Hoje
              </span>
            )}
          </div>
        </CardContent>
      </Card>
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
    <div className="container max-w-4xl mx-auto p-4">
      <Card className="mb-8 bg-zinc-800 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-white">
            Agenda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              icon={CheckCircle2}
              value={stats.concluidos}
              label="Concluídos"
              variant="green"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por cliente ou horário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-zinc-900 text-white rounded-md px-3 py-2 border border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="all">Todos os status</option>
                <option value="agendado">Agendado</option>
                <option value="confirmado">Confirmado</option>
                <option value="terminado">Terminado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {error && (
            <Alert
              variant="destructive"
              className="border-red-500 bg-red-500/10"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center bg-zinc-900 rounded-lg">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (selectedMonth === 0) {
                    setSelectedMonth(11);
                    setSelectedYear((prev) => prev - 1);
                  } else {
                    setSelectedMonth((prev) => prev - 1);
                  }
                }}
                className="text-zinc-400 hover:text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <div className="flex items-center px-4">
                <CalendarIcon className="w-5 h-5 text-blue-400 mr-2" />
                <span className="text-lg font-medium text-white">
                  {months[selectedMonth]} {selectedYear}
                </span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (selectedMonth === 11) {
                    setSelectedMonth(0);
                    setSelectedYear((prev) => prev + 1);
                  } else {
                    setSelectedMonth((prev) => prev + 1);
                  }
                }}
                className="text-zinc-400 hover:text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            <div className="hidden md:flex items-center bg-zinc-900 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("calendar")}
                className={`flex items-center gap-2 ${
                  viewMode === "calendar"
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "text-zinc-400 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Calendário</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-2 ${
                  viewMode === "list"
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "text-zinc-400 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm">Lista</span>
              </Button>
            </div>
            <div className="md:hidden">
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="bg-zinc-900 text-white rounded-lg px-3 py-2 border border-zinc-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              >
                <option value="calendar">Calendário</option>
                <option value="list">Lista</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4 mb-24">
        {viewMode === "calendar"
          ? agendamentos
              .reduce((acc, agendamento) => {
                const date = new Date(agendamento.data);
                const dateStr = new Intl.DateTimeFormat("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                }).format(date);

                const existingGroup = acc.find(
                  (group) => group.date === dateStr
                );
                if (existingGroup) {
                  existingGroup.agendamentos.push(agendamento);
                } else {
                  acc.push({
                    date: dateStr,
                    agendamentos: [agendamento],
                  });
                }
                return acc;
              }, [])
              .map((group, index) => (
                <Card key={index} className="bg-zinc-800 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-white capitalize">
                      {group.date}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {group.agendamentos
                      .sort((a, b) => a.hora.localeCompare(b.hora))
                      .map((agendamento) => (
                        <AgendamentoCard
                          key={agendamento.id}
                          agendamento={agendamento}
                        />
                      ))}
                  </CardContent>
                </Card>
              ))
          : agendamentos
              .sort((a, b) => {
                const dateCompare = a.data.localeCompare(b.data);
                return dateCompare === 0
                  ? a.hora.localeCompare(b.hora)
                  : dateCompare;
              })
              .map((agendamento) => (
                <AgendamentoCard
                  key={agendamento.id}
                  agendamento={agendamento}
                />
              ))}

        {agendamentos.length === 0 && (
          <Card className="py-12 bg-zinc-800 border-zinc-700">
            <CardContent className="text-center">
              <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2 text-white">
                Nenhum agendamento encontrado
              </p>
              <p className="text-zinc-400">
                Tente ajustar os filtros ou adicione um novo agendamento
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          onClick={() => navigate("/app/add-agendamento")}
          className="rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        >
          <PlusCircle className="w-5 h-5 md:mr-2" />
          <span className="hidden md:inline">Novo Agendamento</span>
        </Button>
      </div>
    </div>
  );
};

export default ManageAgenda;
