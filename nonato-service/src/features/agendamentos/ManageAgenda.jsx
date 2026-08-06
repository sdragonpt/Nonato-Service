import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import {
  Search,
  Plus,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  CalendarIcon,
  Filter,
  MoreVertical,
  Calendar,
  RefreshCw,
  ClipboardList,
  AlertCircle,
  X,
  Zap,
  ArrowRight,
  MessageCircle,
  UserCog,
  ChevronDown,
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Button } from "@/components/ui/button.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";

import {
  DEFAULT_DURATION_MINUTES,
  minutesToTime,
  timeToMinutes,
} from "./utils/agendaConflicts.js";
import QuickAddAppointmentDialog from "./components/QuickAddAppointmentDialog.jsx";

// ✅ NOVO: Lembretes via WhatsApp
const buildWhatsAppLink = (phone, message) => {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 9) digits = `351${digits}`; // ✅ Prefixo PT por default
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
};

const buildReminderMessage = (appointment) => {
  const clientName =
    appointment.cliente?.name || appointment.newClientName || "Cliente";
  const date = appointment.data
    ? new Date(appointment.data).toLocaleDateString("pt-PT")
    : "";
  return `Olá ${clientName}, aqui é da Nonato Service. Este é um lembrete da sua visita técnica agendada para ${date} às ${appointment.hora || ""}. Até breve!`;
};

// ✅ Linha compacta para pré-agendamentos (evita ocupar muito espaço no topo)
const PreAgendamentoRow = ({ preAgendamento, onConvert, onDelete }) => {
  const isUrgent = preAgendamento.priority === "alta";
  const clientName = preAgendamento.isRegisteredClient
    ? preAgendamento.cliente?.name || "Cliente não encontrado"
    : preAgendamento.newClientName;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-yellow-800/10 border border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
      <div
        className={`h-8 w-8 shrink-0 rounded-full ${
          isUrgent ? "bg-red-600" : "bg-yellow-600"
        } flex items-center justify-center`}
      >
        <Zap className="w-4 h-4 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-white truncate">
            {clientName}
          </span>
          {isUrgent && (
            <Badge className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0">
              Urgente
            </Badge>
          )}
          {!preAgendamento.isRegisteredClient && (
            <Badge className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0">
              Novo
            </Badge>
          )}
        </div>
        <p className="text-xs text-zinc-400 truncate">
          {preAgendamento.machineType} • {preAgendamento.serviceType}
          {preAgendamento.quickNotes ? ` — ${preAgendamento.quickNotes}` : ""}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          onClick={() => onConvert(preAgendamento)}
          className="bg-green-600 hover:bg-green-700 h-8"
          size="sm"
        >
          <ArrowRight className="w-3.5 h-3.5 mr-1" />
          Agendar
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-zinc-700 text-yellow-400"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-zinc-800 border-zinc-700"
          >
            <DropdownMenuItem
              onClick={() => onConvert(preAgendamento)}
              className="text-white hover:bg-zinc-700 cursor-pointer"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Converter em Agendamento
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-400 hover:bg-zinc-700 focus:text-red-400 cursor-pointer"
              onClick={() => onDelete(preAgendamento)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

const AppointmentCard = ({
  appointment,
  onDelete,
  onEdit,
  onToggleComplete,
}) => {
  const statusColors = {
    agendado: "text-blue-400 bg-blue-500/10",
    confirmado: "text-yellow-400 bg-yellow-500/10",
    cancelado: "text-red-400 bg-red-500/10",
    terminado: "text-green-400 bg-green-500/10",
  };

  const isToday = appointment.data === new Date().toISOString().split("T")[0];
  const isUrgent = appointment.prioridade === "alta";
  const phone = appointment.cliente?.phone || appointment.newClientPhone;
  const whatsappLink = buildWhatsAppLink(phone, buildReminderMessage(appointment));

  return (
    <Card className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-full ${
                isUrgent ? "bg-red-600" : "bg-green-600"
              } flex items-center justify-center`}
            >
              <Clock className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-white truncate">
                {appointment.cliente?.name || "Cliente não encontrado"}
              </h3>
              <p className="text-zinc-400 text-sm">
                {appointment.hora}
                {appointment.hora && (
                  <>
                    {" "}
                    –{" "}
                    {minutesToTime(
                      timeToMinutes(appointment.hora) +
                        (parseInt(appointment.duracaoMinutos, 10) || DEFAULT_DURATION_MINUTES)
                    )}
                  </>
                )}
              </p>
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge className={statusColors[appointment.status]}>
                  {appointment.status}
                </Badge>
                {isToday && (
                  <Badge
                    variant="outline"
                    className="bg-green-500/10 text-green-400 border-green-500/30"
                  >
                    Hoje
                  </Badge>
                )}
                {isUrgent && (
                  <Badge
                    variant="outline"
                    className="bg-red-500/10 text-red-400 border-red-500/30"
                  >
                    Urgente
                  </Badge>
                )}
                {appointment.tecnicoNome ? (
                  <Badge
                    variant="outline"
                    className="bg-zinc-700/50 text-zinc-300 border-zinc-600 flex items-center gap-1"
                  >
                    <UserCog className="h-3 w-3" />
                    {appointment.tecnicoNome}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                  >
                    Sem técnico
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-zinc-700 text-white"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-zinc-800 border-zinc-700"
            >
              <DropdownMenuItem
                onClick={() => onEdit(appointment.id)}
                className="text-white hover:bg-zinc-700 cursor-pointer"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              {whatsappLink && (
                <DropdownMenuItem
                  onClick={() => window.open(whatsappLink, "_blank")}
                  className="text-green-400 hover:bg-zinc-700 focus:text-green-400 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Enviar Lembrete WhatsApp
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() =>
                  onToggleComplete(appointment.id, appointment.concluido)
                }
                className="text-white hover:bg-zinc-700 cursor-pointer"
              >
                {appointment.concluido ? (
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
                className="text-red-400 hover:bg-zinc-700 focus:text-red-400 cursor-pointer"
                onClick={() => onDelete(appointment)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

const ManageAgenda = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [preAgendamentos, setPreAgendamentos] = useState([]); // ✅ NOVO
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState("calendar");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false); // ✅ NOVO
  const [preAgendamentoToConvert, setPreAgendamentoToConvert] = useState(null); // ✅ NOVO
  const [convertFormData, setConvertFormData] = useState({
    date: "",
    time: "",
  }); // ✅ NOVO
  const [remindersDialogOpen, setRemindersDialogOpen] = useState(false); // ✅ NOVO
  const [preAgendamentosOpen, setPreAgendamentosOpen] = useState(false); // ✅ Recolhido por defeito para não ocupar espaço
  const [quickAddOpen, setQuickAddOpen] = useState(false); // ✅ Marcar clicando no dia
  const [quickAddDate, setQuickAddDate] = useState(null);

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

  const updatePastAppointments = async (appointments) => {
    const today = new Date().toISOString().split("T")[0];
    const updatesNeeded = appointments.filter(
      (appointment) =>
        appointment.data < today &&
        (appointment.status === "agendado" ||
          appointment.status === "confirmado")
    );

    if (updatesNeeded.length === 0) return appointments;

    try {
      await Promise.all(
        updatesNeeded.map((appointment) =>
          updateDoc(doc(db, "agendamentos", appointment.id), {
            status: "terminado",
            concluido: true,
          })
        )
      );

      return appointments.map((appointment) =>
        appointment.data < today &&
        (appointment.status === "agendado" ||
          appointment.status === "confirmado")
          ? { ...appointment, status: "terminado", concluido: true }
          : appointment
      );
    } catch (error) {
      console.error("Erro ao atualizar agendamentos passados:", error);
      return appointments;
    }
  };

  // ✅ FUNÇÃO ATUALIZADA: Buscar pré-agendamentos com equipamentos
  const fetchPreAgendamentos = useCallback(async () => {
    try {
      const preAgendamentosRef = collection(db, "pre_agendamentos");
      const querySnapshot = await getDocs(preAgendamentosRef);
      const preAgendamentosData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Buscar dados dos clientes registrados e equipamentos
      const preAgendamentosWithDetails = await Promise.all(
        preAgendamentosData.map(async (preAgendamento) => {
          let updatedPreAgendamento = { ...preAgendamento };

          // Buscar dados do cliente se registrado
          if (preAgendamento.isRegisteredClient && preAgendamento.clientId) {
            const clientDoc = await getDoc(
              doc(db, "clientes", preAgendamento.clientId)
            );
            if (clientDoc.exists()) {
              updatedPreAgendamento.cliente = clientDoc.data();
            }
          }

          // ✅ NOVO: Buscar dados do equipamento se selecionado
          if (preAgendamento.equipmentId) {
            const equipmentDoc = await getDoc(
              doc(db, "equipamentos", preAgendamento.equipmentId)
            );
            if (equipmentDoc.exists()) {
              updatedPreAgendamento.equipment = equipmentDoc.data();
            }
          }

          return updatedPreAgendamento;
        })
      );

      setPreAgendamentos(preAgendamentosWithDetails);
    } catch (err) {
      console.error("Error fetching pre agendamentos:", err);
    }
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const appointmentsRef = collection(db, "agendamentos");
      const querySnapshot = await getDocs(appointmentsRef);
      const appointmentsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const appointmentsWithDetails = await Promise.all(
        appointmentsData.map(async (appointment) => {
          if (appointment.clientId) {
            const clientDoc = await getDoc(
              doc(db, "clientes", appointment.clientId)
            );
            return {
              ...appointment,
              cliente: clientDoc.exists() ? clientDoc.data() : null,
            };
          }
          return appointment;
        })
      );

      // Atualiza agendamentos passados e define o estado
      const updatedAppointments = await updatePastAppointments(
        appointmentsWithDetails
      );
      setAppointments(updatedAppointments);

      // ✅ NOVO: Buscar pré-agendamentos também
      await fetchPreAgendamentos();
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError("Erro ao carregar agendamentos");
    } finally {
      setIsLoading(false);
    }
  }, [fetchPreAgendamentos]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // ✅ NOVA FUNÇÃO: Converter pré-agendamento
  const handleConvertPreAgendamento = async () => {
    try {
      const preAgendamento = preAgendamentoToConvert;

      // Criar agendamento completo
      const agendamentoData = {
        data: convertFormData.date,
        hora: convertFormData.time,
        clientId: preAgendamento.isRegisteredClient
          ? preAgendamento.clientId
          : "",
        tipoServico: `${preAgendamento.machineType} - ${preAgendamento.serviceType}`,
        observacoes: preAgendamento.quickNotes || "",
        status: "agendado",
        prioridade: preAgendamento.priority,
        tecnicoId: "",
        tecnicoNome: "",
        duracaoMinutos: DEFAULT_DURATION_MINUTES,
        // Se cliente novo, incluir dados
        ...(preAgendamento.isRegisteredClient
          ? {}
          : {
              newClientName: preAgendamento.newClientName,
              newClientPhone: preAgendamento.newClientPhone,
            }),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, "agendamentos"), agendamentoData);

      // Remover pré-agendamento
      await deleteDoc(doc(db, "pre_agendamentos", preAgendamento.id));

      // Atualizar listas
      await fetchAppointments();
      setConvertDialogOpen(false);
      setPreAgendamentoToConvert(null);
      setConvertFormData({ date: "", time: "" });
    } catch (error) {
      console.error("Erro ao converter pré-agendamento:", error);
      setError("Erro ao converter pré-agendamento");
    }
  };

  const handleDelete = async (appointmentId) => {
    try {
      await deleteDoc(doc(db, "agendamentos", appointmentId));
      setAppointments((prev) => prev.filter((a) => a.id !== appointmentId));
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
    } catch (error) {
      console.error("Error deleting appointment:", error);
      setError("Erro ao deletar agendamento");
    }
  };

  // ✅ NOVA FUNÇÃO: Deletar pré-agendamento
  const handleDeletePreAgendamento = async (preAgendamento) => {
    try {
      await deleteDoc(doc(db, "pre_agendamentos", preAgendamento.id));
      setPreAgendamentos((prev) =>
        prev.filter((p) => p.id !== preAgendamento.id)
      );
    } catch (error) {
      console.error("Erro ao deletar pré-agendamento:", error);
      setError("Erro ao deletar pré-agendamento");
    }
  };

  const handleToggleComplete = async (appointmentId, isConcluido) => {
    try {
      const appointmentRef = doc(db, "agendamentos", appointmentId);
      await updateDoc(appointmentRef, {
        concluido: !isConcluido,
        status: !isConcluido ? "terminado" : "agendado",
      });

      setAppointments((prev) =>
        prev.map((app) =>
          app.id === appointmentId
            ? {
                ...app,
                concluido: !isConcluido,
                status: !isConcluido ? "terminado" : "agendado",
              }
            : app
        )
      );
    } catch (error) {
      console.error("Error updating appointment:", error);
      setError("Erro ao atualizar agendamento");
    }
  };

  // Function to generate a consistent color for each client
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

    // Generate a consistent index based on clientId
    let hash = 0;
    for (let i = 0; i < clientId.length; i++) {
      hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch =
      appointment.cliente?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      appointment.hora?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" || appointment.status === filterStatus;

    const appointmentDate = new Date(appointment.data);
    const matchesMonth =
      appointmentDate.getMonth() === selectedMonth &&
      appointmentDate.getFullYear() === selectedYear;

    return matchesSearch && matchesFilter && matchesMonth;
  });

  const stats = {
    total: filteredAppointments.length,
    today: filteredAppointments.filter(
      (app) => app.data === new Date().toISOString().split("T")[0]
    ).length,
    urgent: filteredAppointments.filter((app) => app.prioridade === "alta")
      .length,
    completed: filteredAppointments.filter((app) => app.status === "terminado")
      .length,
    preAgendamentos: preAgendamentos.length, // ✅ NOVO
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Gerenciar Agenda
          </h1>
          <p className="text-sm sm:text-base text-zinc-400">
            Gerencie todos os seus agendamentos em um só lugar
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate("/app/add-pre-agendamento")}
            variant="outline"
            className="hidden sm:flex border-yellow-600 text-white bg-yellow-600 hover:bg-yellow-500/20"
          >
            <Zap className="w-4 h-4 mr-2" />
            Pré-Agendamento
          </Button>
          <Button
            onClick={() => navigate("/app/add-agendamento")}
            className="hidden sm:flex bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Total do Mês</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {stats.total}
              </h3>
            </div>
            <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Hoje</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {stats.today}
              </h3>
            </div>
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Urgentes</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {stats.urgent}
              </h3>
            </div>
            <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">Concluídos</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {stats.completed}
              </h3>
            </div>
            <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
          </CardContent>
        </Card>

        {/* ✅ CARD: Pré-Agendamentos - clicável para expandir/recolher a lista */}
        <Card
          className={`bg-zinc-800 border-zinc-700 ${
            stats.preAgendamentos > 0
              ? "cursor-pointer hover:border-yellow-500/40 transition-colors"
              : ""
          }`}
          onClick={() =>
            stats.preAgendamentos > 0 &&
            setPreAgendamentosOpen((prev) => !prev)
          }
        >
          <CardContent className="flex items-center justify-between p-4 sm:p-6">
            <div>
              <p className="text-sm font-medium text-zinc-400">
                Pré-Agendamentos
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-2">
                {stats.preAgendamentos}
              </h3>
            </div>
            {stats.preAgendamentos > 0 ? (
              <ChevronDown
                className={`h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 transition-transform ${
                  preAgendamentosOpen ? "rotate-180" : ""
                }`}
              />
            ) : (
              <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pré-Agendamentos Pendentes - compacto, só aparece quando expandido */}
      {preAgendamentos.length > 0 && preAgendamentosOpen && (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              Pré-Agendamentos Pendentes
            </CardTitle>
            <Button
              onClick={() => navigate("/app/add-pre-agendamento")}
              variant="outline"
              size="sm"
              className="h-8 bg-yellow-800/20 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Novo
            </Button>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {preAgendamentos.map((preAgendamento) => (
              <PreAgendamentoRow
                key={preAgendamento.id}
                preAgendamento={preAgendamento}
                onConvert={(pre) => {
                  setPreAgendamentoToConvert(pre);
                  setConvertDialogOpen(true);
                }}
                onDelete={handleDeletePreAgendamento}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filters Card */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardContent className="space-y-4 p-4 sm:p-6">
          {/* Search */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Buscar por cliente ou horário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          {/* Month Selector and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem
                  value="all"
                  className="text-white hover:bg-zinc-700"
                >
                  Todos os status
                </SelectItem>
                <SelectItem
                  value="agendado"
                  className="text-white hover:bg-zinc-700"
                >
                  Agendado
                </SelectItem>
                <SelectItem
                  value="confirmado"
                  className="text-white hover:bg-zinc-700"
                >
                  Confirmado
                </SelectItem>
                <SelectItem
                  value="terminado"
                  className="text-white hover:bg-zinc-700"
                >
                  Terminado
                </SelectItem>
                <SelectItem
                  value="cancelado"
                  className="text-white hover:bg-zinc-700"
                >
                  Cancelado
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <Button
              variant="outline"
              onClick={() =>
                setViewMode(viewMode === "calendar" ? "list" : "calendar")
              }
              className="w-full sm:w-auto gap-2 text-white border-zinc-700 hover:bg-zinc-700 bg-green-600"
            >
              {viewMode === "calendar" ? (
                <>
                  <Filter className="w-4 h-4" />
                  <span>Visualizar Lista</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>Visualizar Calendário</span>
                </>
              )}
            </Button>
            <span className="text-center sm:text-right text-sm text-zinc-400">
              {filteredAppointments.length} agendamento(s) encontrado(s)
            </span>
          </div>

          {/* Ações rápidas - Desktop Only */}
          <div className="hidden sm:flex gap-2 pt-1 border-t border-zinc-700/50">
            <Button
              variant="outline"
              onClick={fetchAppointments}
              className="mt-3 border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar Lista
            </Button>
            <Button
              variant="outline"
              onClick={() => setRemindersDialogOpen(true)}
              disabled={stats.today === 0}
              className="mt-3 border-green-600 text-white hover:bg-green-700 bg-green-600"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Lembretes de Hoje ({stats.today})
            </Button>
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
        </CardContent>
      </Card>

      {/* Appointments Grid */}
      <div className="space-y-6">
        {viewMode === "calendar" ? (
          <>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-4 mb-4">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                <div
                  key={day}
                  className="text-center font-medium text-zinc-400"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-4">
              {(() => {
                const firstDay = new Date(selectedYear, selectedMonth, 1);
                const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
                const days = [];

                // Add empty cells for days before the first day of the month
                for (let i = 0; i < firstDay.getDay(); i++) {
                  days.push(
                    <div
                      key={`empty-start-${i}`}
                      className="h-32 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
                    />
                  );
                }

                // Add cells for each day of the month
                for (let date = 1; date <= lastDay.getDate(); date++) {
                  const currentDate = new Date(
                    selectedYear,
                    selectedMonth,
                    date
                  );
                  const dateStr = currentDate.toISOString().split("T")[0];
                  const dayAppointments = filteredAppointments.filter(
                    (app) => app.data === dateStr
                  );
                  const isToday =
                    dateStr === new Date().toISOString().split("T")[0];

                  days.push(
                    <div
                      key={date}
                      onClick={() => {
                        setQuickAddDate(dateStr);
                        setQuickAddOpen(true);
                      }}
                      className={`h-32 p-2 rounded-lg cursor-pointer group ${
                        isToday
                          ? "bg-green-900/20 border-2 border-green-500"
                          : "bg-zinc-800 border border-zinc-700 hover:border-green-500/40"
                      } overflow-y-auto transition-colors`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Plus className="h-3.5 w-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span
                          className={`text-sm ${
                            isToday
                              ? "text-green-400 font-bold"
                              : "text-zinc-400"
                          }`}
                        >
                          {date}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {dayAppointments
                          .sort((a, b) => a.hora.localeCompare(b.hora))
                          .map((appointment) => {
                            const clientColor = getClientColor(
                              appointment.clientId
                            );
                            const StatusIcon = () => {
                              switch (appointment.status) {
                                case "terminado":
                                  return (
                                    <CheckCircle2 className="h-3 w-3 text-green-400" />
                                  );
                                case "cancelado":
                                  return <X className="h-3 w-3 text-red-400" />;
                                case "agendado":
                                  return (
                                    <Clock className="h-3 w-3 text-blue-400" />
                                  );
                                case "confirmado":
                                  return (
                                    <AlertCircle className="h-3 w-3 text-yellow-400" />
                                  );
                                default:
                                  return null;
                              }
                            };

                            const phone =
                              appointment.cliente?.phone ||
                              appointment.newClientPhone;
                            const whatsappLink = buildWhatsAppLink(
                              phone,
                              buildReminderMessage(appointment)
                            );

                            return (
                              <DropdownMenu key={appointment.id}>
                                <DropdownMenuTrigger asChild>
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className={`${clientColor.bg} ${clientColor.border} border rounded-md p-1 cursor-pointer text-xs`}
                                  >
                                    <div
                                      className={`${clientColor.text} font-medium truncate flex items-center justify-between`}
                                    >
                                      <span>{appointment.hora}</span>
                                      <StatusIcon />
                                    </div>
                                    <div className="truncate text-white">
                                      {appointment.cliente?.name ||
                                        "Cliente não encontrado"}
                                    </div>
                                    {appointment.tecnicoNome && (
                                      <div className="truncate text-zinc-400 flex items-center gap-1">
                                        <UserCog className="h-2.5 w-2.5 shrink-0" />
                                        {appointment.tecnicoNome}
                                      </div>
                                    )}
                                  </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="start"
                                  onClick={(e) => e.stopPropagation()}
                                  className="bg-zinc-800 border-zinc-700"
                                >
                                  <DropdownMenuItem
                                    onClick={() =>
                                      navigate(
                                        `/app/edit-agendamento/${appointment.id}`
                                      )
                                    }
                                    className="text-white hover:bg-zinc-700 cursor-pointer"
                                  >
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  {whatsappLink && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        window.open(whatsappLink, "_blank")
                                      }
                                      className="text-green-400 hover:bg-zinc-700 focus:text-green-400 cursor-pointer"
                                    >
                                      <MessageCircle className="w-4 h-4 mr-2" />
                                      Enviar Lembrete WhatsApp
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleToggleComplete(
                                        appointment.id,
                                        appointment.concluido
                                      )
                                    }
                                    className="text-white hover:bg-zinc-700 cursor-pointer"
                                  >
                                    {appointment.concluido ? (
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
                                    className="text-red-400 hover:bg-zinc-700 focus:text-red-400 cursor-pointer"
                                    onClick={() => {
                                      setAppointmentToDelete(appointment);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            );
                          })}
                      </div>
                    </div>
                  );
                }

                // Add empty cells for days after the last day of the month
                const remainingCells = 42 - days.length; // 6 weeks × 7 days = 42
                for (let i = 0; i < remainingCells; i++) {
                  days.push(
                    <div
                      key={`empty-end-${i}`}
                      className="h-32 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
                    />
                  );
                }

                return days;
              })()}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAppointments
              .sort((a, b) => {
                const dateCompare = a.data.localeCompare(b.data);
                return dateCompare === 0
                  ? a.hora.localeCompare(b.hora)
                  : dateCompare;
              })
              .map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onDelete={() => {
                    setAppointmentToDelete(appointment);
                    setDeleteDialogOpen(true);
                  }}
                  onEdit={(id) => navigate(`/app/edit-agendamento/${id}`)}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
          </div>
        )}

        {filteredAppointments.length === 0 && (
          <Card className="bg-zinc-800 border-zinc-700">
            <CardContent className="p-8 sm:p-12 text-center">
              <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2 text-white">
                Nenhum agendamento encontrado
              </p>
              <p className="text-sm sm:text-base text-zinc-400">
                Tente ajustar seus filtros ou adicione um novo agendamento
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ✅ DIALOG ATUALIZADO: Para converter pré-agendamento */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Converter em Agendamento
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Defina a data e hora para finalizar o agendamento
            </DialogDescription>
          </DialogHeader>

          {preAgendamentoToConvert && (
            <div className="space-y-4">
              <div className="p-3 bg-zinc-700/50 rounded-lg space-y-2">
                <div>
                  <p className="text-sm text-zinc-400">Cliente:</p>
                  <p className="text-white font-medium">
                    {preAgendamentoToConvert.isRegisteredClient
                      ? preAgendamentoToConvert.cliente?.name
                      : preAgendamentoToConvert.newClientName}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-zinc-400">Serviço:</p>
                  <p className="text-sm text-zinc-300">
                    {preAgendamentoToConvert.machineType} -{" "}
                    {preAgendamentoToConvert.serviceType}
                  </p>
                </div>

                {/* ✅ NOVO: Mostrar equipamento se selecionado */}
                {preAgendamentoToConvert.equipment && (
                  <div>
                    <p className="text-sm text-zinc-400">Equipamento:</p>
                    <p className="text-sm text-zinc-300">
                      {preAgendamentoToConvert.equipment.brand}{" "}
                      {preAgendamentoToConvert.equipment.model}
                      {preAgendamentoToConvert.equipment.serialNumber && (
                        <span className="text-zinc-500">
                          {" "}
                          - {preAgendamentoToConvert.equipment.serialNumber}
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {preAgendamentoToConvert.quickNotes && (
                  <div>
                    <p className="text-sm text-zinc-400">Observações:</p>
                    <p className="text-sm text-zinc-300">
                      {preAgendamentoToConvert.quickNotes}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Data *
                  </label>
                  <Input
                    type="date"
                    value={convertFormData.date}
                    onChange={(e) =>
                      setConvertFormData((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                    className="bg-zinc-900 border-zinc-700 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Hora *
                  </label>
                  <Input
                    type="time"
                    value={convertFormData.time}
                    onChange={(e) =>
                      setConvertFormData((prev) => ({
                        ...prev,
                        time: e.target.value,
                      }))
                    }
                    className="bg-zinc-900 border-zinc-700 text-white"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConvertDialogOpen(false)}
              className="border-zinc-700 text-white hover:bg-zinc-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConvertPreAgendamento}
              disabled={!convertFormData.date || !convertFormData.time}
              className="bg-green-600 hover:bg-green-700"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ NOVO: Dialog de Lembretes de Hoje via WhatsApp */}
      <Dialog open={remindersDialogOpen} onOpenChange={setRemindersDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              Lembretes de Hoje
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Envie um lembrete via WhatsApp para cada cliente com visita
              agendada hoje.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {appointments
              .filter(
                (a) => a.data === new Date().toISOString().split("T")[0]
              )
              .sort((a, b) => a.hora?.localeCompare(b.hora))
              .map((appointment) => {
                const phone =
                  appointment.cliente?.phone || appointment.newClientPhone;
                const link = buildWhatsAppLink(
                  phone,
                  buildReminderMessage(appointment)
                );
                return (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-3 bg-zinc-700/50 rounded-lg border border-zinc-600"
                  >
                    <div>
                      <p className="text-white font-medium">
                        {appointment.cliente?.name ||
                          appointment.newClientName ||
                          "Cliente"}
                      </p>
                      <p className="text-sm text-zinc-400">
                        {appointment.hora} · {phone || "sem telefone"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={!link}
                      onClick={() => window.open(link, "_blank")}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Enviar
                    </Button>
                  </div>
                );
              })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemindersDialogOpen(false)}
              className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar exclusão</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir este agendamento? Esta ação não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-zinc-700 text-white hover:text-white hover:bg-zinc-700 bg-zinc-600"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDelete(appointmentToDelete?.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ Marcar rapidamente ao clicar num dia do calendário */}
      <QuickAddAppointmentDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        date={quickAddDate}
        onCreated={fetchAppointments}
      />

      {/* FAB Menu for Mobile */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 sm:hidden">
        <Button
          onClick={fetchAppointments}
          size="icon"
          className="rounded-full shadow-lg bg-zinc-700 hover:bg-zinc-600"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
        <Button
          onClick={() => navigate("/app/add-pre-agendamento")}
          size="icon"
          className="rounded-full shadow-lg bg-yellow-600 hover:bg-yellow-700"
        >
          <Zap className="h-5 w-5" />
        </Button>
        <Button
          onClick={() => navigate("/app/add-agendamento")}
          size="icon"
          className="rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ManageAgenda;
