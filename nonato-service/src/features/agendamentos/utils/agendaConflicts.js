// agendaConflicts.js - Deteção de sobreposição de horários na Agenda
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../firebase.jsx";

export const DEFAULT_DURATION_MINUTES = 60;

export const timeToMinutes = (hora) => {
  if (!hora) return null;
  const [h, m] = hora.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

export const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/**
 * Verifica se um novo agendamento (data + hora + duração + técnico) colide
 * com agendamentos já existentes na mesma data.
 *
 * Regra: só compara agendamentos com o MESMO técnico atribuído (ou, se
 * nenhum técnico for indicado, com outros agendamentos também sem técnico) —
 * dois técnicos diferentes podem estar no mesmo cliente/hora sem problema.
 *
 * Devolve a lista de agendamentos em conflito (vazia se não houver nenhum).
 */
export async function checkAgendaConflict({
  date,
  hora,
  duracaoMinutos = DEFAULT_DURATION_MINUTES,
  tecnicoId = "",
  excludeId = null,
}) {
  if (!date || !hora) return [];

  const start = timeToMinutes(hora);
  const end = start + (parseInt(duracaoMinutos, 10) || DEFAULT_DURATION_MINUTES);

  const q = query(collection(db, "agendamentos"), where("data", "==", date));
  const snap = await getDocs(q);

  const conflicts = [];
  snap.docs.forEach((docSnap) => {
    if (docSnap.id === excludeId) return;
    const data = docSnap.data();
    if (data.status === "cancelado") return;
    if ((data.tecnicoId || "") !== (tecnicoId || "")) return;

    const existStart = timeToMinutes(data.hora);
    if (existStart === null) return;
    const existEnd =
      existStart + (parseInt(data.duracaoMinutos, 10) || DEFAULT_DURATION_MINUTES);

    const overlaps = start < existEnd && existStart < end;
    if (overlaps) {
      conflicts.push({ id: docSnap.id, ...data });
    }
  });

  return conflicts;
}
