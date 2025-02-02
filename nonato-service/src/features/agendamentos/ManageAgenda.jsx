import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
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
} from "lucide-react";

// UI Components
import { Card, CardContent } from "@/components/ui/card.jsx";
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
              <p className="text-zinc-400 text-sm">{appointment.hora}</p>
              <div className="flex gap-2 mt-1">
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
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState("calendar");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);

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
        appointment.data < today && appointment.status === "agendado"
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
        appointment.data < today && appointment.status === "agendado"
          ? { ...appointment, status: "terminado", concluido: true }
          : appointment
      );
    } catch (error) {
      console.error("Erro ao atualizar agendamentos passados:", error);
      return appointments;
    }
  };

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
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError("Erro ao carregar agendamentos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

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
        <Button
          onClick={() => navigate("/app/add-agendamento")}
          className="hidden sm:flex bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      </div>

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

      {/* Quick Actions - Desktop Only */}
      <div className="hidden sm:flex gap-2">
        <Button
          variant="outline"
          onClick={fetchAppointments}
          className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-600"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar Lista
        </Button>
      </div>

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
                      className={`h-32 p-2 rounded-lg ${
                        isToday
                          ? "bg-green-900/20 border-2 border-green-500"
                          : "bg-zinc-800 border border-zinc-700"
                      } overflow-y-auto`}
                    >
                      <div className="text-right mb-2">
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

                            return (
                              <div
                                key={appointment.id}
                                className={`${clientColor.bg} ${clientColor.border} border rounded-md p-1 cursor-pointer text-xs`}
                                onClick={() =>
                                  navigate(
                                    `/app/edit-agendamento/${appointment.id}`
                                  )
                                }
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
                              </div>
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
