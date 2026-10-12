// workConfirmation.js - Confirmar se o trabalho de um agendamento foi realizado
//
// Depois de passar a hora de fim de um agendamento ("agendado" ou
// "confirmado"), ele fica "por confirmar": alguém tem de dizer se o trabalho
// foi realizado ("terminado") ou não ("nao_realizado"). Antes, a Agenda
// marcava sozinha como "terminado" tudo o que fosse de dias passados, sem
// ninguém confirmar.
//
// "Por confirmar" não é um estado gravado: é calculado (estado em aberto +
// hora já passou), por isso não há nada para manter sincronizado.

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../../../firebase.jsx";
import { toDateKey } from "../../../utils/formatDate.js";
import { timeToMinutes, DEFAULT_DURATION_MINUTES } from "./agendaConflicts.js";

export const STATUS_LABELS = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  terminado: "Realizado",
  nao_realizado: "Não realizado",
  cancelado: "Cancelado",
};

export const STATUS_COLORS = {
  agendado: "text-blue-400 bg-blue-500/10",
  confirmado: "text-yellow-400 bg-yellow-500/10",
  cancelado: "text-red-400 bg-red-500/10",
  terminado: "text-green-400 bg-green-500/10",
  nao_realizado: "text-orange-400 bg-orange-500/10",
};

const OPEN_STATUSES = ["agendado", "confirmado"];

/** O agendamento já acabou (dia passado, ou hoje com a hora de fim passada) e ainda está em aberto? */
export function isAwaitingConfirmation(appointment, now = new Date()) {
  if (!appointment?.data || !OPEN_STATUSES.includes(appointment.status)) return false;
  const today = toDateKey(now);
  if (appointment.data < today) return true;
  if (appointment.data > today) return false;
  const start = timeToMinutes(appointment.hora);
  if (start === null) return false; // sem hora: só no dia seguinte
  const end = start + (parseInt(appointment.duracaoMinutos, 10) || DEFAULT_DURATION_MINUTES);
  return now.getHours() * 60 + now.getMinutes() >= end;
}

/** Grava a confirmação: trabalho realizado ou não. */
export async function confirmWork(appointmentId, realizado) {
  await updateDoc(doc(db, "agendamentos", appointmentId), {
    status: realizado ? "terminado" : "nao_realizado",
    concluido: realizado,
    confirmadoEm: new Date(),
    confirmadoPor: getAuth().currentUser?.email || "",
    updatedAt: new Date(),
  });
}

/**
 * Agendamentos por confirmar, em tempo real, do mais antigo para o mais
 * recente. Lê só os agendamentos em aberto (agendado/confirmado) — os já
 * resolvidos não contam para as leituras.
 */
export function usePendingWorkConfirmations() {
  const [open, setOpen] = useState([]);
  const [loading, setLoading] = useState(true);
  // Reavalia de minuto a minuto, para um agendamento de hoje passar a
  // "por confirmar" quando a hora de fim chega.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "agendamentos"), where("status", "in", OPEN_STATUSES)),
      (snap) => {
        setOpen(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao ler agendamentos por confirmar:", err);
        setLoading(false);
      }
    );
    const timer = setInterval(() => setTick((t) => t + 1), 60 * 1000);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  const pending = useMemo(() => {
    const now = new Date();
    return open
      .filter((a) => isAwaitingConfirmation(a, now))
      .sort((a, b) => `${a.data} ${a.hora || ""}`.localeCompare(`${b.data} ${b.hora || ""}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tick]);

  return { pending, loading };
}
