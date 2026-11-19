// src/features/quoteRequests/generateQuoteRequestPDF.js
// PDF "Pedido de Orçamento Avulso": cliente e dados, a lista de peças com
// imagem, nome, marca, referência, quantidade e nota — sem preços — e as
// observações.
// Mesmo design dos outros PDFs (utils/pdf/pdfKit.js).

import { PDFDocument } from "pdf-lib";
import { createPdfKit, PDF_MARGIN, PDF_PAGE_WIDTH } from "../../utils/pdf/pdfKit.js";
import { loadPartImageForPdf } from "../../utils/pdf/partImage.js";
import { deliverPdfToDevice } from "../../utils/reportStorage.js";

const CONTENT_WIDTH = PDF_PAGE_WIDTH - 2 * PDF_MARGIN;
const orDash = (v) => (v && String(v).trim() ? String(v).trim() : "—");
const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : new Date());

const COLUMNS = [
  { header: "Imagem", width: 70 },
  { header: "Peça", width: 185 },
  { header: "Referência", width: 105, align: "center" },
  { header: "Qtd.", width: 40, align: "center" },
  { header: "Nota", width: CONTENT_WIDTH - 400 },
];

/** Caixa de texto com quebra de linha (respeita as mudanças de linha). */
function textBox(kit, text, size = 9.5) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .flatMap((l) => kit.wrapText(l, CONTENT_WIDTH - 32, kit.font, size));
  const h = lines.length * (size + 4.5) + 22;
  kit.checkSpace(h + 10);
  kit.rect(PDF_MARGIN, kit.y - h, CONTENT_WIDTH, h, kit.colors.rowAlt, kit.colors.lineSoft, 0.75);
  kit.rect(PDF_MARGIN, kit.y - h, 3, h, kit.colors.accent);
  lines.forEach((l, i) => kit.text(l, PDF_MARGIN + 18, kit.y - 18 - i * (size + 4.5), { size }));
  kit.y -= h + 18;
}

export async function generateQuoteRequestPDF(record) {
  const pdfDoc = await PDFDocument.create();
  const kit = await createPdfKit(pdfDoc, {
    title: "Pedido de Orçamento Avulso",
    subtitle: "Nonato Service · Assistência Técnica",
    docLabel: "Nº",
    docNumber: record.number || "—",
    footerNote: `NONATO SERVICE · PEDIDO DE ORÇAMENTO ${record.number || ""}`.trim(),
  });

  kit.newPage();

  // ── Cliente ───────────────────────────────────────────────────────
  const c = record.cliente || {};
  kit.sectionTitle("Cliente");
  kit.infoPanel([
    ["Cliente", orDash(c.name)],
    ["Data", toDate(record.createdAt).toLocaleDateString("pt-PT")],
    ["NIF", orDash(c.nif)],
    ["Telefone", orDash(c.phone)],
    ["E-mail", orDash(c.email)],
    ["Morada", orDash(c.address)],
  ]);

  // ── Peças ─────────────────────────────────────────────────────────
  const itens = record.itens || [];
  const totalQtd = itens.reduce((t, i) => t + (Number(i.quantidade) || 0), 0);
  kit.sectionTitle(`Peças a orçamentar (${itens.length})`);

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
    const nameLines = kit.wrapText(item.nome || "—", COLUMNS[1].width - 14, kit.font, 9).slice(0, 3);
    const noteLines = kit.wrapText(item.nota || "", COLUMNS[4].width - 14, kit.font, 8).slice(0, 5);
    const rowH = Math.max(
      item.imagem ? 62 : 40,
      nameLines.length * 12 + (item.marca ? 26 : 14),
      noteLines.length * 10 + 18
    );

    if (kit.checkSpace(rowH + 8)) {
      kit.sectionTitle("Peças a orçamentar (cont.)");
      drawHeader();
    }
    const bg = idx % 2 === 0 ? kit.colors.paper : kit.colors.rowAlt;
    const top = kit.y;
    let x = PDF_MARGIN;

    // imagem
    kit.rect(x, top - rowH, COLUMNS[0].width, rowH, kit.colors.white, kit.colors.lineSoft, 0.5);
    if (item.imagem) {
      try {
        const img = await loadPartImageForPdf({ image: item.imagem, code: "" });
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
        }
      } catch (err) {
        console.error("Erro na imagem da peça:", err);
      }
    } else {
      kit.text("—", x + COLUMNS[0].width / 2, top - rowH / 2 - 3, { size: 8, color: kit.colors.muted, align: "center" });
    }
    x += COLUMNS[0].width;

    // peça (+ marca)
    kit.rect(x, top - rowH, COLUMNS[1].width, rowH, bg, kit.colors.lineSoft, 0.5);
    nameLines.forEach((l, i) => kit.text(l, x + 7, top - 15 - i * 12, { size: 9, useFont: i === 0 ? kit.boldFont : kit.font }));
    if (item.marca) {
      kit.text(item.marca, x + 7, top - 15 - nameLines.length * 12, { size: 8, color: kit.colors.muted });
    }
    x += COLUMNS[1].width;

    // referência
    kit.rect(x, top - rowH, COLUMNS[2].width, rowH, bg, kit.colors.lineSoft, 0.5);
    kit.text(item.referencia || "—", x + COLUMNS[2].width / 2, top - rowH / 2 - 3, {
      size: 9,
      align: "center",
      maxWidth: COLUMNS[2].width - 8,
    });
    x += COLUMNS[2].width;

    // quantidade
    kit.rect(x, top - rowH, COLUMNS[3].width, rowH, bg, kit.colors.lineSoft, 0.5);
    kit.text(String(item.quantidade || 1), x + COLUMNS[3].width / 2, top - rowH / 2 - 4, {
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
  kit.tableTotalRow("Total", `${itens.length} referências · ${totalQtd} unidades`);
  kit.y -= 20;

  if (record.observacoes && record.observacoes.trim()) {
    kit.sectionTitle("Observações");
    textBox(kit, record.observacoes);
  }

  kit.checkSpace(20);
  kit.text(`Documento gerado em ${new Date().toLocaleString("pt-PT")}.`, PDF_PAGE_WIDTH / 2, kit.y, {
    size: 7.5,
    color: kit.colors.muted,
    align: "center",
  });

  kit.finish();
  const bytes = await pdfDoc.save();
  const safe = (c.name || "").replace(/[\\/:*?"<>|]/g, "").trim();
  await deliverPdfToDevice(
    new Blob([bytes], { type: "application/pdf" }),
    `Pedido de Orçamento Avulso - ${record.number || "novo"}${safe ? ` - ${safe}` : ""}.pdf`
  );
}

export default generateQuoteRequestPDF;
