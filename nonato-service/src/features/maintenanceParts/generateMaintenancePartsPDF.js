// src/features/maintenanceParts/generateMaintenancePartsPDF.js
// PDF "Peças para Manutenção": cliente/equipamento e a lista de peças com
// imagem, nome, código, quantidade e nota — sem preços. Mesmo design dos
// outros PDFs (utils/pdf/pdfKit.js); as imagens vêm de
// utils/pdf/partImage.js, como nos orçamentos de peças.

import { PDFDocument } from "pdf-lib";
import { createPdfKit, PDF_MARGIN, PDF_PAGE_WIDTH } from "../../utils/pdf/pdfKit.js";
import { loadPartImageForPdf } from "../../utils/pdf/partImage.js";
import { deliverPdfToDevice } from "../../utils/reportStorage.js";

const CONTENT_WIDTH = PDF_PAGE_WIDTH - 2 * PDF_MARGIN;
const orDash = (v) => (v && String(v).trim() ? String(v).trim() : "—");
const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : new Date());

const COLUMNS = [
  { header: "Imagem", width: 70 },
  { header: "Peça", width: 190 },
  { header: "Código", width: 100, align: "center" },
  { header: "Qtd.", width: 40, align: "center" },
  { header: "Nota", width: CONTENT_WIDTH - 400 },
];

/**
 * @param {Object} record  documento de "pecasManutencao" (ver maintenancePartsStore.js)
 * @param {Object} [opts]
 * @param {Object} [opts.client]  { name, phone, address } do cliente registado
 */
export async function generateMaintenancePartsPDF(record, { client } = {}) {
  const pdfDoc = await PDFDocument.create();
  const kit = await createPdfKit(pdfDoc, {
    title: "Peças para Manutenção",
    subtitle: "Nonato Service · Assistência Técnica",
    docLabel: "Nº",
    docNumber: record.number || "—",
    footerNote: `NONATO SERVICE · PEÇAS PARA MANUTENÇÃO ${record.number || ""}`.trim(),
  });

  kit.newPage();

  // ── Dados ─────────────────────────────────────────────────────────
  const eq = record.equipment || {};
  const eqName = [eq.brand, eq.model].filter(Boolean).join(" ");
  kit.sectionTitle("Dados");
  kit.infoPanel([
    ["Cliente", orDash(record.clientName || client?.name)],
    ["Data", toDate(record.createdAt).toLocaleDateString("pt-PT")],
    ["Equipamento", orDash(eqName)],
    ["Nº do equipamento", orDash(eq.serialNumber)],
    ...(client?.phone ? [["Telefone", client.phone]] : []),
    ...(record.titulo ? [["Assunto", record.titulo]] : []),
  ]);

  if (record.observacoes && record.observacoes.trim()) {
    const lines = record.observacoes
      .split(/\r?\n/)
      .flatMap((l) => kit.wrapText(l, CONTENT_WIDTH - 32, kit.font, 9.5));
    const h = lines.length * 14 + 22;
    kit.checkSpace(h + 30);
    kit.sectionTitle("Observações");
    kit.rect(PDF_MARGIN, kit.y - h, CONTENT_WIDTH, h, kit.colors.rowAlt, kit.colors.lineSoft, 0.75);
    kit.rect(PDF_MARGIN, kit.y - h, 3, h, kit.colors.accent);
    lines.forEach((l, i) => kit.text(l, PDF_MARGIN + 18, kit.y - 18 - i * 14, { size: 9.5 }));
    kit.y -= h + 18;
  }

  // ── Peças ─────────────────────────────────────────────────────────
  const itens = record.itens || [];
  const totalQtd = itens.reduce((t, i) => t + (Number(i.quantity) || 0), 0);
  kit.sectionTitle(`Peças necessárias (${itens.length})`);

  const drawHeader = () => {
    const h = 22;
    kit.rect(PDF_MARGIN, kit.y - h, CONTENT_WIDTH, h, kit.colors.headerFill);
    let x = PDF_MARGIN;
    COLUMNS.forEach((col) => {
      const label = col.header.toUpperCase();
      const tw = kit.boldFont.widthOfTextAtSize(label, 7.5);
      const tx = col.align === "center" ? x + (col.width - tw) / 2 : x + 8;
      kit.text(label, tx, kit.y - h + 8, { size: 7.5, useFont: kit.boldFont });
      x += col.width;
    });
    kit.hLine(PDF_MARGIN, PDF_MARGIN + CONTENT_WIDTH, kit.y - h, 1, kit.colors.ink);
    kit.y -= h;
  };
  drawHeader();

  for (let idx = 0; idx < itens.length; idx++) {
    const item = itens[idx];
    const nameLines = kit.wrapText(item.name || "—", COLUMNS[1].width - 14, kit.font, 9).slice(0, 4);
    const noteLines = kit.wrapText(item.nota || "", COLUMNS[4].width - 14, kit.font, 8).slice(0, 5);
    const rowH = Math.max(62, nameLines.length * 12 + 18, noteLines.length * 10 + 18);

    if (kit.checkSpace(rowH + 8)) {
      kit.sectionTitle("Peças necessárias (cont.)");
      drawHeader();
    }
    const bg = idx % 2 === 0 ? kit.colors.paper : kit.colors.rowAlt;
    const top = kit.y;
    let x = PDF_MARGIN;

    // imagem
    kit.rect(x, top - rowH, COLUMNS[0].width, rowH, kit.colors.white, kit.colors.lineSoft, 0.5);
    try {
      const img = await loadPartImageForPdf(item);
      if (img) {
        const embedded = img.isJpeg ? await pdfDoc.embedJpg(img.data) : await pdfDoc.embedPng(img.data);
        const maxW = COLUMNS[0].width - 8;
        const maxH = rowH - 8;
        let w = maxW;
        let h = (w * embedded.height) / embedded.width;
        if (h > maxH) {
          h = maxH;
          w = (h * embedded.width) / embedded.height;
        }
        kit.page.drawImage(embedded, {
          x: x + (COLUMNS[0].width - w) / 2,
          y: top - rowH + (rowH - h) / 2,
          width: w,
          height: h,
        });
      } else {
        kit.text("Sem imagem", x + COLUMNS[0].width / 2, top - rowH / 2 - 3, {
          size: 7,
          color: kit.colors.muted,
          align: "center",
        });
      }
    } catch (err) {
      console.error(`Erro na imagem da peça ${item.code}:`, err);
    }
    x += COLUMNS[0].width;

    // peça
    kit.rect(x, top - rowH, COLUMNS[1].width, rowH, bg, kit.colors.lineSoft, 0.5);
    nameLines.forEach((l, i) => kit.text(l, x + 7, top - 15 - i * 12, { size: 9, useFont: i === 0 ? kit.boldFont : kit.font }));
    x += COLUMNS[1].width;

    // código
    kit.rect(x, top - rowH, COLUMNS[2].width, rowH, bg, kit.colors.lineSoft, 0.5);
    kit.text(item.code || "—", x + COLUMNS[2].width / 2, top - rowH / 2 - 3, {
      size: 9,
      align: "center",
      maxWidth: COLUMNS[2].width - 8,
    });
    x += COLUMNS[2].width;

    // quantidade
    kit.rect(x, top - rowH, COLUMNS[3].width, rowH, bg, kit.colors.lineSoft, 0.5);
    kit.text(String(item.quantity || 1), x + COLUMNS[3].width / 2, top - rowH / 2 - 4, {
      size: 11,
      useFont: kit.boldFont,
      align: "center",
    });
    x += COLUMNS[3].width;

    // nota
    kit.rect(x, top - rowH, COLUMNS[4].width, rowH, bg, kit.colors.lineSoft, 0.5);
    noteLines.forEach((l, i) => kit.text(l, x + 7, top - 14 - i * 10, { size: 8, color: kit.colors.muted }));

    kit.y -= rowH;
  }

  kit.y -= 10;
  kit.checkSpace(30);
  kit.tableTotalRow("Total de peças", `${itens.length} referências · ${totalQtd} unidades`);
  kit.y -= 20;

  kit.checkSpace(20);
  kit.text(`Documento gerado em ${new Date().toLocaleString("pt-PT")}.`, PDF_PAGE_WIDTH / 2, kit.y, {
    size: 7.5,
    color: kit.colors.muted,
    align: "center",
  });

  kit.finish();
  const bytes = await pdfDoc.save();
  const safe = (record.clientName || client?.name || "").replace(/[\\/:*?"<>|]/g, "").trim();
  await deliverPdfToDevice(
    new Blob([bytes], { type: "application/pdf" }),
    `Peças para manutenção - ${record.number || "novo"}${safe ? ` - ${safe}` : ""}.pdf`
  );
}

export default generateMaintenancePartsPDF;
