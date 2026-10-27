import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Calendar,
  UserCog,
  Clock,
  CheckCircle2,
  ArrowRight,
  Plus,
  RefreshCw,
  LayoutDashboard,
  CalendarX,
  Users,
} from "lucide-react";
import {
  PageHeader,
  StatCard,
  StatGrid,
  PageLoader,
  StatusBadge,
} from "../../components/app";
import { useClients } from "../../context/ClientsContext.jsx";
import { useUsers } from "../../context/UsersContext.jsx";
import { isStaffRole, getRoleLabel, getRoleBadgeStyle } from "../../config/roles.js";
import { timeToMinutes, DEFAULT_DURATION_MINUTES } from "../../features/agendamentos/utils/agendaConflicts.js";
import PendingWorkConfirmation from "../../features/agendamentos/components/PendingWorkConfirmation.jsx";
import { toDateKey } from "../../utils/formatDate.js";

// Dashboard reduzido ao essencial do dia-a-dia: agendamentos de hoje +
// estado da equipa. De propósito — nada aqui lê coleções inteiras
// (ordens/orçamentos/etc.); só uma query "data == hoje" (equality simples,
// barata) e a coleção "users" (pequena, poucos membros de equipa).

const todayStr = () => toDateKey();

// Cache curta em sessionStorage: evita repetir as mesmas 2 leituras sempre
// que se salta entre páginas e se volta ao Dashboard pouco depois. TTL
// curto porque "Estado da Equipa" depende da hora atual.
const CACHE_KEY = "dashboard_cache_v3";
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutos

const TECH_STATUS_META = {
  livre: { label: "Livre", tone: "success", icon: CheckCircle2 },
  em_servico: { label: "Em serviço", tone: "warning", icon: Clock },
  proximo: { label: "A seguir", tone: "info", icon: Calendar },
};

const todayLabel = () =>
  new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });

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

        const clientsMap = {};
        allClients.forEach((c) => {
          clientsMap[c.id] = c;
        });

        const todaysAppointments = appointmentsSnap.docs
          .map((d) => {
            const data = { id: d.id, ...d.data() };
            // Nome do cliente já resolvido (antes os clientes registados
            // apareciam todos como "Cliente").
            return {
              ...data,
              clientName: clientsMap[data.clientId]?.name || data.newClientName || "Cliente",
            };
          })
          .filter((a) => a.status !== "cancelado");

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
    return <PageLoader />;
  }

  const sortedAppointments = appointments
    .slice()
    .sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));

  const inService = techBoard.filter((t) => t.status === "em_servico").length;
  const free = techBoard.filter((t) => t.status === "livre").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={<span className="capitalize">{todayLabel()}</span>}
        icon={LayoutDashboard}
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={handleManualRefresh}
              disabled={isLoading}
              title="Atualizar dados agora"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="soft" onClick={() => navigate("/app/add-agendamento")}>
              <Calendar className="h-4 w-4" />
              Agendar
            </Button>
            <Button onClick={() => navigate("/app/add-order")}>
              <Plus className="h-4 w-4" />
              Nova Ordem
            </Button>
          </>
        }
      />

      <StatGrid cols={4}>
        <StatCard label="Agendamentos hoje" value={appointments.length} icon={Calendar} tone="info" />
        <StatCard label="Em serviço agora" value={inService} icon={Clock} tone="warning" />
        <StatCard label="Técnicos livres" value={free} icon={CheckCircle2} tone="success" />
        <StatCard label="Equipa" value={techBoard.length} icon={Users} tone="muted" />
      </StatGrid>

      {/* Serviços por confirmar (cartão + pop-up) */}
      <PendingWorkConfirmation />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* AGENDAMENTOS DE HOJE */}
        <section className="glass rounded-2xl p-4 sm:p-5 xl:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Calendar className="h-4 w-4 text-info" />
              Agendamentos de hoje
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/app/manage-agenda")} className="text-muted-foreground">
              Abrir agenda <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {sortedAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl bg-white/[0.03] py-10 text-center">
              <CalendarX className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Sem agendamentos para hoje.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {sortedAppointments.map((appt) => (
                <li key={appt.id}>
                  <button
                    type="button"
                    onClick={() => navigate("/app/manage-agenda")}
                    className="flex w-full items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.07]"
                  >
                    <span className="w-14 shrink-0 rounded-lg bg-black/30 py-1 text-center font-mono text-sm tabular-nums">
                      {appt.hora || "--:--"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{appt.clientName || appt.newClientName || "Cliente"}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[appt.tipoServico, appt.tecnicoNome].filter(Boolean).join(" · ") || "Sem descrição"}
                      </span>
                    </span>
                    <StatusBadge domain="agenda" status={appt.status} className="hidden shrink-0 sm:inline-flex" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ESTADO DA EQUIPA */}
        <section className="surface p-4 shadow-elev sm:p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <UserCog className="h-4 w-4 text-primary" />
              Estado da equipa
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/app/technician-status")} className="text-muted-foreground">
              Quadro <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {techBoard.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum membro de equipa configurado ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {techBoard.map(({ user, status, statusDetail, todayCount }) => {
                const meta = TECH_STATUS_META[status];
                const StatusIcon = meta.icon;
                return (
                  <li key={user.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                      {(user.displayName || "?")[0]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{user.displayName || "Sem nome"}</span>
                        <Badge variant="outline" className={`shrink-0 px-1.5 py-0 text-[10px] ${getRoleBadgeStyle(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {statusDetail ? `${statusDetail.clientName} · ${statusDetail.hora}` : `${todayCount} agendamento(s) hoje`}
                      </span>
                    </span>
                    <Badge variant={meta.tone} className="shrink-0">
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {meta.label}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
