// src/features/reports/pdf/specialReportData.js
// Contas do Relatório Especial (vários clientes/equipamentos no mesmo
// relatório): duração de ida, trabalho e retorno por dia, totais por
// equipamento e totais gerais. Usado pelo PDF e pelo resumo no formulário.
//
// Regras (iguais às do relatório que o Sr. Nonato usa):
// - Horas de trabalho do dia = fim − início − pausa;
// - Ida = chegada − saída; Retorno = chegada − saída do regresso;
// - Diárias = 1 por data civil registada (inclui sáb./dom. e dias só com
//   viagem). Vários registos no mesmo dia não duplicam a diária.

export const PRINT_MODES = [
  ["horas", "Só o relatório de horas"],
  ["horas_equip", "Horas + clientes e equipamentos"],
  ["separados", "Clientes e equipamentos separados"],
  ["tudo", "Tudo num só"],
];

const toMinutes = (hhmm) => {
  if (!hhmm || typeof hhmm !== "string") return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

/** Minutos entre duas horas "HH:MM" (passa a meia-noite se o fim for antes). */
export const span = (start, end) => {
  const a = toMinutes(start);
  const b = toMinutes(end);
  if (a === null || b === null) return null;
  return b >= a ? b - a : b + 24 * 60 - a;
};

/** 125 → "2:05" */
export const fmtMinutes = (min) => {
  if (min === null || min === undefined) return "—";
  const total = Math.max(0, Math.round(min));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

const num = (v) => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
};

/** Etiqueta de um equipamento: "HOMAG EDGETEQ S-380 — 0-261-73-2862" */
export const equipmentLabel = (eq) => {
  if (!eq) return "Sem equipamento";
  const name = [eq.brand, eq.model].filter(Boolean).join(" ").trim() || eq.name || "Equipamento";
  return eq.serialNumber ? `${name} — ${eq.serialNumber}` : name;
};

/** Cliente/origem de um equipamento ("Equipamentos da própria empresa" no Armazém). */
export const equipmentOwner = (eq) =>
  !eq ? "—" : eq.source === "armazem" ? "Equipamentos da própria empresa" : eq.clientName || "—";

/** Um dia do formulário → números do relatório. */
export function computeDay(day) {
  const ida = span(day.departureTime, day.arrivalTime);
  const bruto = span(day.startHour, day.endHour);
  const pausa = day.pause ? toMinutes(day.pauseHours) || 0 : 0;
  const trabalho = bruto === null ? null : Math.max(0, bruto - pausa);
  const retorno = span(day.returnDepartureTime, day.returnArrivalTime);
  const kmIda = num(day.kmDeparture);
  const kmRetorno = num(day.kmReturn);
  return { ida, trabalho, retorno, pausa, kmIda, kmRetorno, km: kmIda + kmRetorno };
}

const emptyTotals = () => ({ trabalho: 0, ida: 0, retorno: 0, km: 0, datas: new Set() });
const addTo = (t, day, c) => {
  t.trabalho += c.trabalho || 0;
  t.ida += c.ida || 0;
  t.retorno += c.retorno || 0;
  t.km += c.km || 0;
  if (day.workDate) t.datas.add(day.workDate);
};
const finishTotals = (t) => ({
  trabalho: t.trabalho,
  ida: t.ida,
  retorno: t.retorno,
  viagem: t.ida + t.retorno,
  km: t.km,
  diarias: t.datas.size,
});

/**
 * @param equipments  [{ id, source, brand, model, serialNumber, clientName, … }]
 * @param workdays    dias do formulário (com equipoId = id local do equipamento)
 * @returns { days, groups, totals, periodo }
 *   days   — dias ordenados por data, com `calc` e `equipment`;
 *   groups — um por equipamento (pela ordem da lista) + "sem equipamento"
 *            se houver dias por atribuir, cada um com os seus dias e totais;
 *   totals — totais gerais (diárias = datas diferentes no relatório todo).
 */
export function buildSpecialReport(equipments = [], workdays = []) {
  const byId = new Map(equipments.map((e) => [e.id, e]));
  const days = [...workdays]
    .sort((a, b) =>
      (a.workDate || "").localeCompare(b.workDate || "") ||
      (a.departureTime || a.startHour || "").localeCompare(b.departureTime || b.startHour || "")
    )
    .map((d) => ({ ...d, calc: computeDay(d), equipment: byId.get(d.equipoId) || null }));

  const all = emptyTotals();
  const perGroup = new Map();
  for (const d of days) {
    addTo(all, d, d.calc);
    const key = d.equipment ? d.equipment.id : "__sem__";
    if (!perGroup.has(key)) perGroup.set(key, { days: [], totals: emptyTotals() });
    const g = perGroup.get(key);
    g.days.push(d);
    addTo(g.totals, d, d.calc);
  }

  const groups = equipments
    .filter((e) => perGroup.has(e.id))
    .map((e) => ({ equipment: e, days: perGroup.get(e.id).days, totals: finishTotals(perGroup.get(e.id).totals) }));
  if (perGroup.has("__sem__")) {
    const g = perGroup.get("__sem__");
    groups.push({ equipment: null, days: g.days, totals: finishTotals(g.totals) });
  }

  const dates = [...all.datas].sort();
  return {
    days,
    groups,
    totals: finishTotals(all),
    periodo: dates.length ? { inicio: dates[0], fim: dates[dates.length - 1] } : null,
  };
}
