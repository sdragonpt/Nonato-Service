// ServiceOutcome.jsx
// Ícone/etiqueta de "o serviço foi realizado?" de um agendamento — à parte
// do estado da marcação (ver utils/workConfirmation.js).
//   realizado      → selo verde
//   não realizado  → proibido laranja
//   por confirmar  → interrogação âmbar (só em dias que já passaram)

import { BadgeCheck, Ban, HelpCircle } from "lucide-react";
import { getServiceOutcome, isAwaitingServiceConfirmation } from "../utils/workConfirmation.js";

const META = {
  done: { Icon: BadgeCheck, label: "Serviço realizado", color: "text-emerald-400", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  notDone: { Icon: Ban, label: "Serviço não realizado", color: "text-orange-400", badge: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
  pending: { Icon: HelpCircle, label: "Serviço por confirmar", color: "text-amber-400", badge: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
};

const metaFor = (appointment) => {
  const outcome = getServiceOutcome(appointment);
  if (outcome === true) return META.done;
  if (outcome === false) return META.notDone;
  return isAwaitingServiceConfirmation(appointment) ? META.pending : null;
};

/** Só o ícone (para o calendário). Não mostra nada se não houver o que dizer. */
export const ServiceOutcomeIcon = ({ appointment, className = "h-3 w-3" }) => {
  const meta = metaFor(appointment);
  if (!meta) return null;
  const { Icon } = meta;
  return (
    <span title={meta.label} className="inline-flex">
      <Icon className={`${className} ${meta.color}`} aria-label={meta.label} />
    </span>
  );
};

/** Ícone + texto (para a lista). */
export const ServiceOutcomeBadge = ({ appointment }) => {
  const meta = metaFor(appointment);
  if (!meta) return null;
  const { Icon } = meta;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${meta.badge}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
};
