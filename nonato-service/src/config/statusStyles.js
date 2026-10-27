// src/config/statusStyles.js
// Mapa ÚNICO de estados → texto + tom de cor, por domínio. Usado pelo
// <StatusBadge> (src/components/app/StatusBadge.jsx). Antes cada página
// tinha o seu próprio mapa de cores.
//
// Tons disponíveis (variantes do Badge): success, warning, danger, info, muted.

import { STATUS_LABELS as AGENDA_LABELS } from "../features/agendamentos/utils/workConfirmation.js";

export const STATUS_STYLES = {
  // Agendamentos (estado da marcação)
  agenda: {
    agendado: { label: AGENDA_LABELS.agendado, tone: "info" },
    confirmado: { label: AGENDA_LABELS.confirmado, tone: "warning" },
    terminado: { label: AGENDA_LABELS.terminado, tone: "success" },
    nao_realizado: { label: AGENDA_LABELS.nao_realizado, tone: "success" },
    cancelado: { label: AGENDA_LABELS.cancelado, tone: "danger" },
  },
  // Ordens de serviço
  order: {
    Aberto: { label: "Aberto", tone: "warning" },
    "Em Andamento": { label: "Em Andamento", tone: "info" },
    Fechado: { label: "Fechado", tone: "success" },
  },
  // Prioridades
  priority: {
    high: { label: "Alta", tone: "danger" },
    alta: { label: "Alta", tone: "danger" },
    normal: { label: "Normal", tone: "info" },
    low: { label: "Baixa", tone: "success" },
    baixa: { label: "Baixa", tone: "success" },
  },
  // Situação financeira do cliente
  financial: {
    overdue: { label: "Devedor", tone: "danger" },
    pending: { label: "Pendente", tone: "warning" },
    good: { label: "Em dia", tone: "success" },
  },
};

/** { label, tone } de um estado; estados desconhecidos ficam neutros. */
export function getStatusStyle(domain, status) {
  return STATUS_STYLES[domain]?.[status] || { label: status ?? "—", tone: "muted" };
}
