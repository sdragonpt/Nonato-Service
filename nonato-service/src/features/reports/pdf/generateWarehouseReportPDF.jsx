// src/features/reports/pdf/generateWarehouseReportPDF.jsx
// Relatório Especial: resumo automático de um equipamento do armazém —
// dados básicos, histórico manual e itens inclusos (sequência de volumes).
// Não pede nada de novo ao utilizador: usa só o que já está na ficha do
// equipamento (WarehouseEquipmentDetail.jsx).
import { PDFDocument } from "pdf-lib";
import { createPdfKit } from "../../../utils/pdf/pdfKit.js";

const pad2 = (n) => String(n).padStart(2, "0");

const formatDate = (value) => {
  if (!value) return "-";
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-PT");
};

const generateWarehouseReportPDF = async (equipment) => {
  const pdfDoc = await PDFDocument.create();
  const docNumber = equipment.equipmentCode || equipment.id;

  const kit = await createPdfKit(pdfDoc, {
    title: "Relatório Especial de Equipamento",
    subtitle: "Armazém · Nonato Service",
    docNumber,
    docLabel: "ID",
    footerNote: `NONATO SERVICE · ${docNumber}`,
  });

  const itensInclusos = equipment.itensInclusos || [];
  const historico = [...(equipment.historico || [])].sort((a, b) => {
    const da = a.criadoEm?.toDate ? a.criadoEm.toDate() : new Date(a.criadoEm || 0);
    const dbb = b.criadoEm?.toDate ? b.criadoEm.toDate() : new Date(b.criadoEm || 0);
    return dbb - da;
  });
  const totalVolumes = 1 + itensInclusos.length;
  const equipmentCode = equipment.equipmentCode || "";
  const volumeLabel = (seq) =>
    equipmentCode ? `${equipmentCode}-${pad2(seq)}` : `?-${pad2(seq)}`;

  kit.newPage();

  kit.sectionTitle("Informações Básicas");
  kit.infoPanel(
    [
      ["ID do Equipamento", equipment.equipmentCode || "-"],
      ["Nome / Designação", equipment.nome || "-"],
      ["Marca", equipment.marca || "-"],
      ["Modelo", equipment.modelo || "-"],
      ["Nº de Série", equipment.numeroSerie || "-"],
      ["Localização", equipment.localizacao || "-"],
      ["Família / Grupo", [equipment.familyName, equipment.groupName].filter(Boolean).join(" / ") || "-"],
      ["Estado", equipment.estado || "-"],
    ],
    { cols: 2 }
  );

  kit.statRow([
    { label: "Total de Volumes", value: String(totalVolumes) },
    { label: "Eventos no Histórico", value: String(historico.length) },
    { label: "Documentos Anexados", value: String((equipment.documentos || []).length) },
  ]);

  // ── Itens Inclusos (sequência de volumes) ────────────────────────────
  kit.checkSpace(60);
  kit.sectionTitle("Itens Inclusos (Sequência de Volumes)");
  const itemColumns = [
    { header: "Volume", key: "volume", width: 70, align: "center" },
    { header: "Etiqueta", key: "etiqueta", width: 120, align: "left" },
    { header: "Descrição", key: "descricao", width: 305, align: "left" },
  ];
  kit.checkSpace(22);
  kit.tableHeader(itemColumns);
  const allVolumes = [
    { seq: 1, titulo: `Equipamento (máquina principal) — ${equipment.nome || ""}` },
    ...itensInclusos.map((item, idx) => ({ seq: idx + 2, titulo: item.nome })),
  ];
  allVolumes.forEach((vol, idx) => {
    kit.checkSpace(20);
    kit.tableRow(
      itemColumns,
      {
        volume: `${pad2(vol.seq)}/${pad2(totalVolumes)}`,
        etiqueta: volumeLabel(vol.seq),
        descricao: vol.titulo,
      },
      idx
    );
  });
  kit.y -= 16;

  // ── Histórico ─────────────────────────────────────────────────────────
  kit.checkSpace(60);
  kit.sectionTitle("Histórico do Equipamento");
  if (historico.length === 0) {
    kit.text("Sem eventos registados.", 50, kit.y, { size: 9, color: kit.colors.muted });
    kit.y -= 20;
  } else {
    const histColumns = [
      { header: "Data", key: "data", width: 70, align: "left" },
      { header: "Tipo", key: "tipo", width: 100, align: "left" },
      { header: "Descrição", key: "descricao", width: 220, align: "left" },
      { header: "Responsável", key: "responsavel", width: 105, align: "left" },
    ];
    kit.checkSpace(22);
    kit.tableHeader(histColumns);
    historico.forEach((h, idx) => {
      kit.checkSpace(20);
      kit.tableRow(
        histColumns,
        {
          data: formatDate(h.criadoEm),
          tipo: h.tipo || "-",
          descricao: h.descricao || "-",
          responsavel: h.responsavel || "-",
        },
        idx
      );
    });
  }

  kit.finish();

  const pdfBytes = await pdfDoc.save();
  const fileName = `Relatorio-Especial-${docNumber}.pdf`;
  return { blob: new Blob([pdfBytes], { type: "application/pdf" }), fileName };
};

export default generateWarehouseReportPDF;
