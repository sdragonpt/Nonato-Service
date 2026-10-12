// workConfirmation.js - O serviço de um agendamento foi realizado?
//
// São DUAS coisas diferentes, guardadas em campos diferentes:
// - `status` — o estado da MARCAÇÃO: agendado, confirmado, cancelado
//   (e "terminado", que a Agenda põe sozinha nos dias que já passaram).
// - `servicoRealizado` — se o SERVIÇO foi mesmo feito: true / false, ou
//   por responder. Não mexe no estado da marcação.
//
// A partir do dia seguinte ao agendamento, se ainda ninguém respondeu, a
// Agenda e a Dashboard perguntam (ver PendingWorkConfirmation.jsx) e a
// resposta fica registada no agendamento, com um ícone próprio na Agenda.

import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../../../firebase.jsx";
import { toDateKey } from "../../../utils/formatDate.js";

export const STATUS_LABELS = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  terminado: "Terminado",
  cancelado: "Cancelado",
  // Valor antigo: durante uns dias a resposta "não realizado" era gravada no
  // estado da marcação. Ver getServiceOutcome().
  nao_realizado: "Terminado",
};

export const STATUS_COLORS = {
  agendado: "text-blue-400 bg-blue-500/10",
  confirmado: "text-yellow-400 bg-yellow-500/10",
  cancelado: "text-red-400 bg-red-500/10",
  terminado: "text-green-400 bg-green-500/10",
  nao_realizado: "text-green-400 bg-green-500/10",
};

/** Só se pergunta pelos agendamentos dos últimos N dias (limita as leituras). */
const WINDOW_DAYS = 21;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * O serviço foi realizado? true / false / null (ainda sem resposta).
 * Aceita também o formato antigo, em que a resposta ficava em `status`.
 */
export function getServiceOutcome(appointment) {
  if (typeof appointment?.servicoRealizado === "boolean") return appointment.servicoRealizado;
  if (appointment?.status === "nao_realizado") return false;
  if (appointment?.status === "terminado" && appointment?.confirmadoEm) return true;
  return null;
}

/** O dia do agendamento já passou, não foi cancelado e ninguém respondeu ainda? */
export function isAwaitingServiceConfirmation(appointment, today = toDateKey()) {
  if (!appointment?.data || appointment.status === "cancelado") return false;
  return appointment.data < today && getServiceOutcome(appointment) === null;
}

/** Regista se o serviço foi realizado. Não altera o estado da marcação. */
export async function confirmService(appointmentId, realizado) {
  await updateDoc(doc(db, "agendamentos", appointmentId), {
    servicoRealizado: realizado,
    servicoConfirmadoEm: new Date(),
    servicoConfirmadoPor: getAuth().currentUser?.email || "",
    updatedAt: new Date(),
  });
  // A resposta já não está por dar: sai da lista em cache.
  if (cache) cache.items = cache.items.filter((a) => a.id !== appointmentId);
  listeners.forEach((notify) => notify());
}

// Cache partilhada entre a Agenda e a Dashboard: os agendamentos dos últimos
// dias leem-se uma vez de 5 em 5 minutos, não a cada mudança de página.
let cache = null; // { at, items }
let inFlight = null;
const listeners = new Set();

async function loadPending() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.items;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const today = toDateKey();
    const from = new Date();
    from.setDate(from.getDate() - WINDOW_DAYS);
    const snap = await getDocs(
      query(
        collection(db, "agendamentos"),
        where("data", ">=", toDateKey(from)),
        where("data", "<", today)
      )
    );
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((a) => isAwaitingServiceConfirmation(a, today))
      .sort((a, b) => `${a.data} ${a.hora || ""}`.localeCompare(`${b.data} ${b.hora || ""}`));
    cache = { at: Date.now(), items };
    return items;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** Obriga a reler na próxima vez (ex.: depois de editar um agendamento). */
export function invalidatePendingServiceConfirmations() {
  cache = null;
  listeners.forEach((notify) => notify());
}

/** Serviços por confirmar (agendamentos de dias passados sem resposta). */
export function usePendingServiceConfirmations() {
  const [pending, setPending] = useState(cache?.items || []);
  const [loading, setLoading] = useState(!cache);

  const refresh = useCallback(() => {
    loadPending()
      .then((items) => setPending([...items]))
      .catch((err) => console.error("Erro ao ler serviços por confirmar:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    listeners.add(refresh);
    return () => listeners.delete(refresh);
  }, [refresh]);

  return { pending, loading };
}
