// ManageTechnicianStatus.jsx - Estado Visual do Técnico: quadro de disponibilidade
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useClients } from "../../context/ClientsContext.jsx";
import { useUsers } from "../../context/UsersContext.jsx";
import {
  UserCog,
  Loader2,
  AlertTriangle,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";

import { isStaffRole, getRoleLabel, getRoleBadgeStyle } from "../../config/roles.js";
import { timeToMinutes, DEFAULT_DURATION_MINUTES } from "../agendamentos/utils/agendaConflicts.js";

const todayStr = () => new Date().toISOString().split("T")[0];

const currentMinutesNow = () => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

const initials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
};

const ManageTechnicianStatus = () => {
  const navigate = useNavigate();
  const { ensureClients } = useClients();
  const { ensureUsers } = useUsers();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [staffUsers, setStaffUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [clientsMap, setClientsMap] = useState({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [allUsers, appointmentsSnap, allClients] = await Promise.all([
        ensureUsers(),
        getDocs(collection(db, "agendamentos")),
        ensureClients(),
      ]);

      const staff = allUsers.filter((u) => isStaffRole(u.role));
      setStaffUsers(staff);

      const cMap = {};
      allClients.forEach((client) => {
        cMap[client.id] = client;
      });
      setClientsMap(cMap);

      const today = todayStr();
      const relevant = appointmentsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((a) => a.status !== "cancelado" && a.data >= today);
      setAppointments(relevant);
    } catch (err) {
      console.error("Erro ao carregar estado dos técnicos:", err);
      setError("Erro ao carregar estado dos técnicos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const boardData = useMemo(() => {
    const today = todayStr();
    const nowMinutes = currentMinutesNow();

    return staffUsers.map((user) => {
      const userAppointments = appointments.filter((a) => a.tecnicoId === user.id);
      const todayAppointments = userAppointments
        .filter((a) => a.data === today)
        .sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
      const futureCount = userAppointments.filter((a) => a.data > today).length;

      let status = "livre";
      let statusDetail = null;

      for (const appt of todayAppointments) {
        const start = timeToMinutes(appt.hora);
        if (start === null) continue;
        const end =
          start + (parseInt(appt.duracaoMinutos, 10) || DEFAULT_DURATION_MINUTES);
        if (nowMinutes >= start && nowMinutes < end) {
          status = "em_servico";
          statusDetail = {
            clientName:
              clientsMap[appt.clientId]?.name ||
              appt.newClientName ||
              "Cliente",
            hora: appt.hora,
            fimEstimado: `${String(Math.floor(end / 60) % 24).padStart(2, "0")}:${String(
              end % 60
            ).padStart(2, "0")}`,
          };
          break;
        }
      }

      if (status === "livre") {
        const next = todayAppointments.find((appt) => {
          const start = timeToMinutes(appt.hora);
          return start !== null && start > nowMinutes;
        });
        if (next) {
          status = "proximo";
          statusDetail = {
            clientName:
              clientsMap[next.clientId]?.name ||
              next.newClientName ||
              "Cliente",
            hora: next.hora,
          };
        }
      }

      return {
        user,
        status,
        statusDetail,
        todayCount: todayAppointments.length,
        futureCount,
      };
    });
  }, [staffUsers, appointments, clientsMap]);

  const STATUS_META = {
    livre: { label: "Livre", className: "bg-green-500/20 text-green-400 border-green-500/30" },
    em_servico: { label: "Em Serviço", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    proximo: { label: "Próximo Agendamento", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
            <UserCog className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Estado Visual do Técnico
            </h1>
            <p className="text-sm text-zinc-400">
              Disponibilidade da equipa em tempo real
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/app/technician-skills")}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
          >
            <GraduationCap className="h-4 w-4 mr-2" />
            Competências
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/app/manage-agenda")}
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Ver Agenda
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {boardData.length === 0 ? (
        <Card className="bg-zinc-800 border-zinc-700">
          <CardContent className="p-8 text-center">
            <UserCog className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">
              Nenhum utilizador com papel de equipa interna (gestor/técnico) encontrado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boardData.map(({ user, status, statusDetail, todayCount, futureCount }) => {
            const meta = STATUS_META[status];
            return (
              <Card key={user.id} className="bg-zinc-800 border-zinc-700">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
                  <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {initials(user.displayName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base text-white truncate">
                      {user.displayName || "Sem nome"}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`mt-1 text-xs ${getRoleBadgeStyle(user.role)}`}
                    >
                      {getRoleLabel(user.role)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge className={`${meta.className} border w-full justify-center py-1.5`}>
                    {status === "em_servico" && <Clock className="h-3.5 w-3.5 mr-1.5" />}
                    {status === "livre" && <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                    {status === "proximo" && <Calendar className="h-3.5 w-3.5 mr-1.5" />}
                    {meta.label}
                  </Badge>

                  {status === "em_servico" && statusDetail && (
                    <p className="text-sm text-zinc-300 text-center">
                      {statusDetail.clientName} · {statusDetail.hora}–
                      {statusDetail.fimEstimado}
                    </p>
                  )}
                  {status === "proximo" && statusDetail && (
                    <p className="text-sm text-zinc-300 text-center">
                      {statusDetail.hora} · {statusDetail.clientName}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-700 pt-2">
                    <span>{todayCount} agendamento(s) hoje</span>
                    <span>{futureCount} futuro(s)</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Button
        variant="link"
        onClick={() => navigate("/app/manage-agenda")}
        className="text-green-400 hover:text-green-300"
      >
        Ir para a Agenda completa <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
};

export default ManageTechnicianStatus;
