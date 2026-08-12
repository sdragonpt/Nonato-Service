import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Calendar,
  Loader2,
  UserCog,
  Clock,
  CheckCircle2,
  ArrowRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useClients } from "../../context/ClientsContext.jsx";
import { useUsers } from "../../context/UsersContext.jsx";
import { isStaffRole, getRoleLabel, getRoleBadgeStyle } from "../../config/roles.js";
import { timeToMinutes, DEFAULT_DURATION_MINUTES } from "../../features/agendamentos/utils/agendaConflicts.js";

// Dashboard reduzido ao essencial do dia-a-dia: agendamentos de hoje +
// estado da equipa. De propósito — nada aqui lê coleções inteiras
// (ordens/orçamentos/etc.); só uma query "data == hoje" (equality simples,
// barata) e a coleção "users" (pequena, poucos membros de equipa).

const todayStr = () => new Date().toISOString().split("T")[0];

// Cache curta em sessionStorage: evita repetir as mesmas 2 leituras sempre
// que se salta entre páginas e se volta ao Dashboard pouco depois. TTL
// curto porque "Estado da Equipa" depende da hora atual.
const CACHE_KEY = "dashboard_cache_v2";
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutos

const TECH_STATUS_META = {
  livre: { label: "Livre", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  em_servico: { label: "Em Serviço", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  proximo: { label: "A seguir", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

const DashboardPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [techBoard, setTechBoard] = useState([]);

  const navigate = useNavigate();
  const { ensureClients } = useClients();
  const { ensureUsers } = useUsers();

  const fetchDashboardData = useCallback(
    async (force = false) => {
      if (!force) {
        try {
          const raw = sessionStorage.getItem(CACHE_KEY);
          if (raw) {
            const cached = JSON.parse(raw);
            if (Date.now() - cached.ts < CACHE_TTL_MS) {
              setAppointments(cached.appointments);
              setTechBoard(cached.techBoard);
              setIsLoading(false);
              return;
            }
          }
        } catch {
          // Cache corrompida/indisponível — ignora e vai à Firestore.
        }
      }

      try {
        setIsLoading(true);
        const todayISO = todayStr();
        const now = new Date();

        const [allClients, appointmentsSnap, allUsers] = await Promise.all([
          ensureClients(),
          getDocs(
            query(collection(db, "agendamentos"), where("data", "==", todayISO))
          ),
          ensureUsers(),
        ]);

        const todaysAppointments = appointmentsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((a) => a.status !== "cancelado");

        const clientsMap = {};
        allClients.forEach((c) => {
          clientsMap[c.id] = c;
        });

        const staff = allUsers.filter((u) => isStaffRole(u.role));

        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const board = staff.map((user) => {
          const userAppointments = todaysAppointments
            .filter((a) => a.tecnicoId === user.id)
            .sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));

          let status = "livre";
          let statusDetail = null;

          for (const appt of userAppointments) {
            const start = timeToMinutes(appt.hora);
            if (start === null) continue;
            const end =
              start + (parseInt(appt.duracaoMinutos, 10) || DEFAULT_DURATION_MINUTES);
            if (nowMinutes >= start && nowMinutes < end) {
              status = "em_servico";
              statusDetail = {
                clientName:
                  clientsMap[appt.clientId]?.name || appt.newClientName || "Cliente",
                hora: appt.hora,
              };
              break;
            }
          }

          if (status === "livre") {
            const next = userAppointments.find((appt) => {
              const start = timeToMinutes(appt.hora);
              return start !== null && start > nowMinutes;
            });
            if (next) {
              status = "proximo";
              statusDetail = {
                clientName:
                  clientsMap[next.clientId]?.name || next.newClientName || "Cliente",
                hora: next.hora,
              };
            }
          }

          return { user, status, statusDetail, todayCount: userAppointments.length };
        });

        setAppointments(todaysAppointments);
        setTechBoard(board);

        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              ts: Date.now(),
              appointments: todaysAppointments,
              techBoard: board,
            })
          );
        } catch {
          // sessionStorage indisponível/cheio — não é crítico, ignora.
        }
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [ensureClients]
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleManualRefresh = useCallback(() => {
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  const sortedAppointments = appointments
    .slice()
    .sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-zinc-400">Aqui está o que está a acontecer hoje.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleManualRefresh}
            disabled={isLoading}
            title="Atualizar dados agora"
            className="border-zinc-700 text-white hover:bg-zinc-700 bg-zinc-900"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            onClick={() => navigate("/app/add-agendamento")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Agendar
          </Button>
          <Button
            onClick={() => navigate("/app/add-order")}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Ordem
          </Button>
        </div>
      </div>

      {/* AGENDAMENTOS DE HOJE */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center text-base">
            <Calendar className="h-4 w-4 mr-2 text-blue-400" />
            Agendamentos de Hoje
            <Badge variant="outline" className="ml-auto border-zinc-600 text-zinc-300">
              {appointments.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedAppointments.length === 0 ? (
            <p className="text-sm text-zinc-500">Sem agendamentos para hoje.</p>
          ) : (
            <div className="space-y-2">
              {sortedAppointments.map((appt) => (
                <div
                  key={appt.id}
                  onClick={() => navigate("/app/manage-agenda")}
                  className="flex items-center justify-between text-sm bg-zinc-900/50 rounded-lg px-3 py-2 cursor-pointer hover:bg-zinc-900"
                >
                  <span className="text-zinc-300 truncate">
                    {appt.newClientName || "Cliente"}
                  </span>
                  <span className="text-zinc-500 font-mono shrink-0 ml-2">
                    {appt.hora || "--:--"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ESTADO DA EQUIPA */}
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center text-base">
            <UserCog className="h-4 w-4 mr-2 text-green-400" />
            Estado da Equipa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {techBoard.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Nenhum membro de equipa configurado ainda.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {techBoard.map(({ user, status, statusDetail, todayCount }) => {
                const meta = TECH_STATUS_META[status];
                return (
                  <div
                    key={user.id}
                    className="bg-zinc-900/50 rounded-lg p-3 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white font-medium truncate">
                        {user.displayName || "Sem nome"}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${getRoleBadgeStyle(user.role)}`}
                      >
                        {getRoleLabel(user.role)}
                      </Badge>
                    </div>
                    <Badge className={`${meta.className} border w-full justify-center py-1 text-xs`}>
                      {status === "em_servico" && <Clock className="h-3 w-3 mr-1" />}
                      {status === "livre" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {status === "proximo" && <Calendar className="h-3 w-3 mr-1" />}
                      {meta.label}
                      {statusDetail ? ` · ${statusDetail.hora}` : ""}
                    </Badge>
                    <span className="text-[11px] text-zinc-500 text-center">
                      {todayCount} agendamento(s) hoje
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <Button
            variant="link"
            onClick={() => navigate("/app/technician-status")}
            className="text-green-400 hover:text-green-300 px-0 mt-2"
          >
            Ver quadro completo <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
