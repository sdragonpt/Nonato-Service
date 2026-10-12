// src/utils/diarias.js
// Diárias vs. dias trabalhados de uma Ordem de Serviço.
//
// - Dias trabalhados: dias com registo de trabalho (workdays) na OS.
// - Diárias: todos os dias em que o técnico esteve no cliente, do primeiro
//   ao último dia registado, INCLUINDO sábados, domingos e outros dias sem
//   trabalho. Ex.: 15 dias no cliente sem trabalhar ao fim de semana =
//   11 dias trabalhados, 15 diárias — o cliente paga as 15, porque o
//   técnico esteve lá.
//
// Usado na OS (detalhe + PDF) e no Fechamento (opção "cobrar diárias").

import { toDateKey } from "./formatDate.js";

const toJsDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d); // meia-noite local, não UTC
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @param workdays lista de dias de trabalho da OS (com `workDate`: Timestamp,
 *   Date ou "AAAA-MM-DD").
 * @returns { diasTrabalhados, diarias, inicio, fim } — inicio/fim são Date
 *   (ou null se não houver dias).
 */
export function computeStay(workdays = []) {
  const keys = new Set();
  for (const day of workdays) {
    const date = toJsDate(day?.workDate);
    if (date) keys.add(toDateKey(date));
  }
  if (keys.size === 0) return { diasTrabalhados: 0, diarias: 0, inicio: null, fim: null };

  const sorted = [...keys].sort();
  const inicio = toJsDate(sorted[0]);
  const fim = toJsDate(sorted[sorted.length - 1]);
  // Math.round absorve a hora a mais/a menos da mudança de hora.
  const diarias = Math.round((fim - inicio) / DAY_MS) + 1;

  return { diasTrabalhados: keys.size, diarias, inicio, fim };
}

/**
 * Junta a configuração de diárias gravada na OS (`order.diarias`:
 * { cobrar, valor, quantidade, mostrarNoPdf }) com a conta automática.
 * `quantidade` null/vazia = usar a conta automática.
 * @returns { cobrar, mostrarNoPdf, valor, quantidade, automatica, manual, total }
 */
export function resolveDiarias(orderDiarias, stay) {
  const cfg = orderDiarias || {};
  const automatica = stay?.diarias || 0;
  const manual = cfg.quantidade !== null && cfg.quantidade !== undefined && cfg.quantidade !== "";
  const quantidade = manual ? Number(cfg.quantidade) || 0 : automatica;
  const valor = Number(cfg.valor) || 0;
  return {
    cobrar: Boolean(cfg.cobrar),
    // Por omissão as diárias são só registo interno: não saem no PDF da OS.
    mostrarNoPdf: Boolean(cfg.mostrarNoPdf),
    valor,
    quantidade,
    automatica,
    manual,
    total: Math.round(valor * quantidade * 100) / 100,
  };
}

/** "20/09 a 04/10" (ou só "20/09" se for um único dia). */
export function formatStayPeriod({ inicio, fim }) {
  if (!inicio) return "";
  const fmt = (d) => d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
  return toDateKey(inicio) === toDateKey(fim) ? fmt(inicio) : `${fmt(inicio)} a ${fmt(fim)}`;
}
