// src/features/reports/pdf/generateSpecialReportPDF.js
// PDF do Relatório Especial: um relatório para um cliente principal com
// trabalho em vários clientes/equipamentos (e equipamentos do Armazém) ao
// longo de um período. Design comum dos PDFs (utils/pdf/pdfKit.js).
//
// O que sai depende do "modo de impressão" (PRINT_MODES em specialReportData):
//   horas        — dados, totais, tabela de horas, assinatura
//   horas_equip  — + lista de equipamentos, secção por equipamento, total de tudo
//   separados    — como horas_equip mas sem a tabela geral de horas
//   tudo         — tudo, incluindo resultados do trabalho e peças

import { PDFDocument } from "pdf-lib";
import { createPdfKit, PDF_MARGIN, PDF_PAGE_WIDTH } from "../../../utils/pdf/pdfKit.js";
import {
  buildSpecialReport,
  equipmentLabel,
  equipmentOwner,
  fmtMinutes,
} from "./specialReportData.js";

const CONTENT_WIDTH = PDF_PAGE_WIDTH - 2 * PDF_MARGIN;
const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

const CHECKLIST_LABELS = {
  concluido: "Serviço concluído",
  retorno: "Retorno necessário",
  funcionarios: "Funcionários presentes / instruídos",
  documentacao: "Documentação entregue",
  producao: "Produção testada / liberada",
  pecas: "Peças utilizadas",
};

const dayLabel = (key) => {
  if (!key) return "—";
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${WEEKDAYS[date.getDay()]} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${String(y).slice(-2)}`;
};
const dateLong = (key) => {
  if (!key) return "—";
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
};
const diariasTxt = (n) => `${n} ${n === 1 ? "diária" : "diárias"}`;
const range = (a, b, dur) => (a || b ? `${a || "—"}–${b || "—"} (${fmtMinutes(dur)})` : "—");
const clean = (t) =>
  String(t || "")
    .replace(/[\r\n\t]+/g, " ")
    // só caracteres que a fonte do PDF (WinAnsi) consegue desenhar
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2026\u20AC]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * @param {Object} p
 * @param {string} p.label        nº do relatório (cabeçalho)
 * @param {Object} p.clientData   cliente principal { name, phone, address }
 * @param {string} p.technician
 * @param {Object} p.order        { date, serviceType, checklist, resultDescription, pontosEmAberto, partsQuoteItems }
 * @param {Array}  p.equipments   equipamentos do relatório (ver ReportOrderForm)
 * @param {Array}  p.workdays     dias (com equipoId, startHour, endHour, …)
 * @param {string} p.printMode    horas | horas_equip | separados | tudo
 * @returns {Promise<{ blob: Blob }>}
 */
export async function generateSpecialReportPDF({
  label,
  clientData,
  technician,
  order,
  equipments,
  workdays,
  printMode = "tudo",
}) {
  const pdfDoc = await PDFDocument.create();
  const modeTitle = {
    horas: "Relatório de horas",
    horas_equip: "Horas, clientes e equipamentos",
    separados: "Clientes e equipamentos",
    tudo: "Relatório completo",
  }[printMode];
  const kit = await createPdfKit(pdfDoc, {
    title: "Relatório de Serviço",
    subtitle: `Assistência Técnica · ${modeTitle}`,
    docNumber: label,
    footerNote: `NONATO SERVICE · RELATÓRIO ${label}`,
  });

  const data = buildSpecialReport(equipments, workdays);
  const show = {
    equipList: printMode !== "horas",
    hoursTable: printMode !== "separados",
    perEquipment: printMode !== "horas",
    totalAll: printMode !== "horas",
    results: printMode === "tudo",
  };
  const equipIndex = new Map(equipments.map((e, i) => [e.id, i + 1]));

  // Desenha linhas de tabela com quebra de página e cabeçalho repetido.
  const table = (columns, rows, { rowHeight = 19, onRow } = {}) => {
    kit.checkSpace(22 + rowHeight);
    kit.tableHeader(columns);
    rows.forEach((row, i) => {
      const page = kit.page;
      kit.checkSpace(rowHeight + (row.__extra ? 16 : 0));
      if (kit.page !== page) kit.tableHeader(columns);
      kit.tableRow(columns, row, i, { rowHeight });
      if (onRow) onRow(row);
    });
    kit.y -= 14;
  };

  // Linha fina por baixo de um dia com a descrição do trabalho.
  const descriptionLine = (text) => {
    const lines = kit.wrapText(`Descrição: ${clean(text)}`, CONTENT_WIDTH - 20, kit.font, 7.5);
    const h = lines.length * 10 + 6;
    kit.checkSpace(h);
    kit.rect(PDF_MARGIN, kit.y - h, CONTENT_WIDTH, h, kit.colors.accentSoft);
    lines.forEach((l, i) => kit.text(l, PDF_MARGIN + 10, kit.y - 11 - i * 10, { size: 7.5, color: kit.colors.ink }));
    kit.y -= h;
  };

  // ── 1. Dados ───────────────────────────────────────────────────────
  kit.newPage();
  kit.sectionTitle("Dados do relatório");
  const periodo = data.periodo
    ? data.periodo.inicio === data.periodo.fim
      ? dateLong(data.periodo.inicio)
      : `${dateLong(data.periodo.inicio)} a ${dateLong(data.periodo.fim)}`
    : "—";
  kit.infoPanel([
    ["Cliente", clean(clientData?.name) || "—"],
    ["Técnico", clean(technician) || "—"],
    ["Telefone", clean(clientData?.phone) || "—"],
    ["Data do relatório", dateLong(order?.date)],
    ["Morada", clean(clientData?.address) || "—"],
    ["Período", periodo],
    ["Tipo de serviço", clean(order?.serviceType) || "—"],
    ["Clientes / equipamentos", String(equipments.length)],
  ]);

  // ── 2. Totais ──────────────────────────────────────────────────────
  const t = data.totals;
  kit.statRow([
    { label: "Horas de trabalho", value: `${fmtMinutes(t.trabalho)} h` },
    { label: "Horas de viagem", value: `${fmtMinutes(t.viagem)} h` },
    { label: "Diárias", value: String(t.diarias) },
  ]);
  kit.statRow([
    { label: "Viagem de ida", value: `${fmtMinutes(t.ida)} h` },
    { label: "Viagem de retorno", value: `${fmtMinutes(t.retorno)} h` },
    { label: "Km percorridos", value: `${t.km} km` },
  ]);

  // ── 3. Equipamentos ───────────────────────────────────────────────
  if (show.equipList && equipments.length) {
    kit.sectionTitle("Clientes e equipamentos");
    table(
      [
        { header: "Nº", width: 28, align: "center", key: "n" },
        { header: "Equipamento", width: 165, key: "equip" },
        { header: "Nº de série", width: 90, key: "serie" },
        { header: "Cliente", width: CONTENT_WIDTH - 283, key: "cliente", size: 8 },
      ],
      equipments.map((e, i) => ({
        n: i + 1,
        equip: clean([e.brand, e.model].filter(Boolean).join(" ")) || "—",
        serie: clean(e.serialNumber) || "—",
        cliente: clean(equipmentOwner(e)),
      }))
    );
  }

  // ── 4. Tabela geral de horas ──────────────────────────────────────
  if (show.hoursTable) {
    kit.sectionTitle("Controlo de horas e deslocações");
    const cols = [
      { header: "Data", width: 72, key: "data", size: 7.5, bold: true },
      { header: "Equip.", width: 34, align: "center", key: "eq", size: 7.5 },
      { header: "Ida", width: 90, align: "center", key: "ida", size: 7.5 },
      { header: "Trabalho", width: 98, align: "center", key: "trab", size: 7.5 },
      { header: "Retorno", width: 90, align: "center", key: "ret", size: 7.5 },
      { header: "Km", width: 40, align: "center", key: "km", size: 7.5 },
      { header: "Pausa", width: CONTENT_WIDTH - 424, align: "center", key: "pausa", size: 7.5 },
    ];
    const rows = data.days.map((d) => ({
      data: dayLabel(d.workDate),
      eq: d.equipment ? `#${equipIndex.get(d.equipment.id)}` : "—",
      ida: range(d.departureTime, d.arrivalTime, d.calc.ida),
      trab: range(d.startHour, d.endHour, d.calc.trabalho),
      ret: range(d.returnDepartureTime, d.returnArrivalTime, d.calc.retorno),
      km: d.calc.km ? String(d.calc.km) : "0",
      pausa: d.calc.pausa ? fmtMinutes(d.calc.pausa) : "—",
      __desc: d.description,
      __extra: !!clean(d.description),
    }));
    table(cols, rows, { onRow: (r) => r.__extra && descriptionLine(r.__desc) });
    kit.y += 6;
    kit.tableTotalRow(
      "Total",
      `${fmtMinutes(t.trabalho)} h trabalho · ${fmtMinutes(t.viagem)} h viagem · ${t.km} km · ${diariasTxt(t.diarias)}`
    );
    kit.y -= 18;
    if (equipments.length) {
      const legend = equipments.map((e, i) => `#${i + 1} ${clean(equipmentOwner(e))} — ${clean(equipmentLabel(e))}`);
      legend.forEach((l) => {
        kit.checkSpace(11);
        kit.text(l, PDF_MARGIN, kit.y, { size: 7, color: kit.colors.muted, maxWidth: CONTENT_WIDTH });
        kit.y -= 10;
      });
      kit.y -= 10;
    }
  }

  // ── 5. Resultados do trabalho ─────────────────────────────────────
  if (show.results) {
    kit.sectionTitle("Resultados do trabalho");
    const cl = order?.checklist || {};
    const items = Object.entries(CHECKLIST_LABELS);
    const colW = CONTENT_WIDTH / 2;
    kit.checkSpace(Math.ceil(items.length / 2) * 18 + 10);
    items.forEach(([key, text], i) => {
      const x = PDF_MARGIN + (i % 2) * colW;
      const y = kit.y - Math.floor(i / 2) * 18;
      kit.rect(x, y - 3, 9, 9, cl[key] ? kit.colors.accent : kit.colors.paper, kit.colors.line, 0.75);
      if (cl[key]) kit.text("X", x + 2.2, y - 1, { size: 7, useFont: kit.boldFont, color: kit.colors.white });
      kit.text(text, x + 16, y - 1, { size: 9 });
    });
    kit.y -= Math.ceil(items.length / 2) * 18 + 8;

    for (const [title, text] of [
      ["Descrição do resultado", order?.resultDescription],
      ["Pontos em aberto", order?.pontosEmAberto],
    ]) {
      if (!clean(text)) continue;
      const lines = kit.wrapText(clean(text), CONTENT_WIDTH - 24, kit.font, 9);
      const h = lines.length * 13 + 30;
      kit.checkSpace(h);
      kit.rect(PDF_MARGIN, kit.y - h, CONTENT_WIDTH, h, kit.colors.rowAlt, kit.colors.lineSoft, 0.75);
      kit.rect(PDF_MARGIN, kit.y - h, 3, h, kit.colors.accent);
      kit.text(title.toUpperCase(), PDF_MARGIN + 14, kit.y - 14, { size: 7, useFont: kit.boldFont, color: kit.colors.muted });
      lines.forEach((l, i) => kit.text(l, PDF_MARGIN + 14, kit.y - 28 - i * 13, { size: 9 }));
      kit.y -= h + 12;
    }
  }

  // ── 6. Uma secção por cliente / equipamento ───────────────────────
  if (show.perEquipment) {
    data.groups.forEach((g) => {
      const n = g.equipment ? equipIndex.get(g.equipment.id) : null;
      kit.checkSpace(120);
      kit.sectionTitle(n ? `${String(n).padStart(2, "0")} · ${clean(equipmentOwner(g.equipment))}` : "Dias sem equipamento");
      if (g.equipment) {
        kit.text(clean(equipmentLabel(g.equipment)), PDF_MARGIN, kit.y, { size: 10, useFont: kit.boldFont });
        kit.y -= 16;
      }
      table(
        [
          { header: "Dia / data", width: 70, key: "data", size: 8, bold: true },
          { header: "Ida", width: 52, align: "center", key: "ida", size: 8 },
          { header: "Horas de trabalho", width: 170, align: "center", key: "trab", size: 8 },
          { header: "Retorno", width: 60, align: "center", key: "ret", size: 8 },
          { header: "Km", width: 50, align: "center", key: "km", size: 8 },
          { header: "Pausa", width: CONTENT_WIDTH - 402, align: "center", key: "pausa", size: 8 },
        ],
        g.days.map((d) => ({
          data: dayLabel(d.workDate),
          ida: fmtMinutes(d.calc.ida),
          trab: d.startHour || d.endHour ? `${d.startHour || "—"}–${d.endHour || "—"} (${fmtMinutes(d.calc.trabalho)})` : "—",
          ret: fmtMinutes(d.calc.retorno),
          km: String(d.calc.km || 0),
          pausa: d.calc.pausa ? fmtMinutes(d.calc.pausa) : "—",
        }))
      );
      kit.y += 6;
      kit.tableTotalRow(
        "Total deste equipamento",
        `${fmtMinutes(g.totals.trabalho)} h · ida ${fmtMinutes(g.totals.ida)} · retorno ${fmtMinutes(g.totals.retorno)} · ${g.totals.km} km · ${diariasTxt(g.totals.diarias)}`
      );
      kit.y -= 22;
    });
  }

  // ── 7. Total de tudo ──────────────────────────────────────────────
  if (show.totalAll && data.groups.length) {
    kit.sectionTitle("Total de tudo");
    const cols = [
      { header: "Cliente / equipamento", width: CONTENT_WIDTH - 222, key: "nome", size: 7.5 },
      { header: "Horas", width: 48, align: "center", key: "h", bold: true },
      { header: "Ida", width: 42, align: "center", key: "ida" },
      { header: "Retorno", width: 50, align: "center", key: "ret" },
      { header: "Km", width: 36, align: "center", key: "km" },
      { header: "Diárias", width: 46, align: "center", key: "dia" },
    ];
    const rows = data.groups.map((g) => ({
      nome: g.equipment
        ? `#${equipIndex.get(g.equipment.id)} ${clean(equipmentOwner(g.equipment))} — ${clean([g.equipment.brand, g.equipment.model].filter(Boolean).join(" "))}`
        : "Sem equipamento",
      h: fmtMinutes(g.totals.trabalho),
      ida: fmtMinutes(g.totals.ida),
      ret: fmtMinutes(g.totals.retorno),
      km: String(g.totals.km),
      dia: String(g.totals.diarias),
    }));
    table(cols, rows);
    kit.y += 6;
    kit.checkSpace(24);
    kit.tableTotalRow(
      "Horas de todos os clientes",
      `${fmtMinutes(t.trabalho)} h · ida ${fmtMinutes(t.ida)} · retorno ${fmtMinutes(t.retorno)} · ${t.km} km · ${diariasTxt(t.diarias)}`
    );
    kit.y -= 10;
    kit.wrapText(
      "Diárias: 1 por data registada (inclui sábados, domingos e dias só com viagem). Vários registos no mesmo dia não duplicam a diária; no total geral cada data conta uma vez.",
      CONTENT_WIDTH,
      kit.font,
      6.8
    ).forEach((l) => {
      kit.text(l, PDF_MARGIN, kit.y, { size: 6.8, color: kit.colors.muted });
      kit.y -= 9;
    });
    kit.y -= 14;
  }

  // ── 8. Peças ──────────────────────────────────────────────────────
  const parts = (order?.partsQuoteItems || []).filter((p) => clean(p.name));
  if (show.results && parts.length) {
    kit.sectionTitle("Peças utilizadas");
    table(
      [
        { header: "Peça", width: CONTENT_WIDTH - 80, key: "name" },
        { header: "Qtd.", width: 80, align: "center", key: "q" },
      ],
      parts.map((p) => ({ name: clean(p.name), q: String(p.quantity || 1) }))
    );
  }

  // ── 9. Assinaturas ────────────────────────────────────────────────
  kit.checkSpace(90);
  kit.sectionTitle("Assinaturas");
  kit.y -= 40;
  const lineW = 180;
  const gap = 60;
  const xc = (PDF_PAGE_WIDTH - 2 * lineW - gap) / 2;
  const xt = xc + lineW + gap;
  kit.hLine(xc, xc + lineW, kit.y, 1, kit.colors.ink);
  kit.hLine(xt, xt + lineW, kit.y, 1, kit.colors.ink);
  kit.text("CLIENTE", xc + lineW / 2, kit.y - 16, { size: 9.5, useFont: kit.boldFont, align: "center" });
  kit.text("TÉCNICO", xt + lineW / 2, kit.y - 16, { size: 9.5, useFont: kit.boldFont, align: "center" });

  kit.finish();
  const bytes = await pdfDoc.save();
  return { blob: new Blob([bytes], { type: "application/pdf" }) };
}

export default generateSpecialReportPDF;
