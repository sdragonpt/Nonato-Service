// src/features/clients/pdf/solicitacaoFaturaPDF.js
// "Solicitação de Fatura" — pedido para emitir uma fatura a um cliente, com
// o texto do pedido, os dados do cliente, o valor e uma nota. Gerado a partir
// dos Detalhes do Cliente. Usa o mesmo kit de design dos outros PDFs
// (utils/pdf/pdfKit.js).

import { PDFDocument } from "pdf-lib";
import { createPdfKit, PDF_MARGIN, PDF_PAGE_WIDTH } from "../../../utils/pdf/pdfKit.js";
import { deliverPdfToDevice } from "../../../utils/reportStorage.js";

const CONTENT_WIDTH = PDF_PAGE_WIDTH - 2 * PDF_MARGIN;

// Mesmo formato dos outros PDFs (utils/formatters/formatEuroNumber): 1.775,00 €
export const formatEuro = (n) =>
  `${(Number(n) || 0).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")} €`;

const orDash = (v) => (v && String(v).trim() ? String(v).trim() : "—");

/** Valores a faturar: com IVA acrescentado ou valor único. */
export function invoiceAmounts({ valor, comIva, taxaIva }) {
  const base = Number(valor) || 0;
  if (!comIva) return { base, iva: 0, total: base };
  const iva = Math.round(base * (Number(taxaIva) || 0)) / 100;
  return { base, iva, total: Math.round((base + iva) * 100) / 100 };
}

/** Parágrafo com quebra de linha (respeita as mudanças de linha do texto). */
function paragraph(kit, text, { size = 10, gapAfter = 18 } = {}) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .flatMap((l) => kit.wrapText(l, CONTENT_WIDTH - 32, kit.font, size));
  const boxH = lines.length * (size + 5) + 22;
  kit.checkSpace(boxH + gapAfter);
  kit.rect(PDF_MARGIN, kit.y - boxH, CONTENT_WIDTH, boxH, kit.colors.rowAlt, kit.colors.lineSoft, 0.75);
  kit.rect(PDF_MARGIN, kit.y - boxH, 3, boxH, kit.colors.accent);
  lines.forEach((line, i) => {
    kit.text(line, PDF_MARGIN + 18, kit.y - 18 - i * (size + 5), { size, color: kit.colors.ink });
  });
  kit.y -= boxH + gapAfter;
}

/**
 * @param {Object} params
 * @param {Object} params.client   { name, company, nif, address, postalCode, email, phone }
 * @param {string} params.data     data do pedido (AAAA-MM-DD)
 * @param {string} params.texto    texto da solicitação
 * @param {number} params.valor
 * @param {boolean} params.comIva  acrescentar IVA ao valor
 * @param {number} params.taxaIva  % de IVA
 * @param {string} params.nota
 */
export async function generateSolicitacaoFaturaPDF({ client, data, texto, valor, comIva, taxaIva, nota }) {
  const pdfDoc = await PDFDocument.create();
  const dateLabel = new Date(`${data}T12:00:00`).toLocaleDateString("pt-PT");
  const kit = await createPdfKit(pdfDoc, {
    title: "Solicitação de Fatura",
    subtitle: "Nonato Service · Assistência Técnica",
    docLabel: "Data",
    docNumber: dateLabel,
    footerNote: "NONATO SERVICE · SOLICITAÇÃO DE FATURA",
  });

  kit.newPage();

  kit.sectionTitle("Pedido");
  paragraph(kit, texto);

  kit.sectionTitle("Dados do cliente");
  kit.infoPanel([
    ["Cliente", orDash(client.name)],
    ["NIF", orDash(client.nif)],
    ["Telefone", orDash(client.phone)],
    ["E-mail", orDash(client.email)],
  ]);
  const morada = [client.address, client.postalCode].map((p) => (p || "").trim()).filter(Boolean).join(" · ");
  kit.infoPanel(
    [
      ["Morada", orDash(morada)],
      ...(client.company && client.company !== client.name ? [["Empresa", client.company]] : []),
    ],
    { cols: 1 }
  );

  // Valor: caixa discreta alinhada à direita (com IVA, duas linhas por cima
  // do total), em vez de uma faixa a toda a largura.
  const { base, iva, total } = invoiceAmounts({ valor, comIva, taxaIva });
  const boxW = 230;
  const boxX = PDF_PAGE_WIDTH - PDF_MARGIN - boxW;
  const lineRow = (label, value) => {
    kit.text(label, boxX + 12, kit.y - 12, { size: 9, color: kit.colors.muted });
    kit.text(value, boxX + boxW - 12, kit.y - 12, { size: 9, color: kit.colors.ink, align: "right" });
    kit.hLine(boxX, boxX + boxW, kit.y - 18, 0.5, kit.colors.lineSoft);
    kit.y -= 20;
  };
  kit.checkSpace(comIva ? 80 : 40);
  if (comIva) {
    lineRow("Valor sem IVA", formatEuro(base));
    lineRow(`IVA (${Number(taxaIva) || 0}%)`, formatEuro(iva));
    kit.y -= 4;
  }
  const totalH = 28;
  kit.rect(boxX, kit.y - totalH, boxW, totalH, kit.colors.dark);
  kit.text(comIva ? "Total (IVA incluído)" : "Valor", boxX + 12, kit.y - 18, {
    size: 9.5,
    useFont: kit.boldFont,
    color: kit.colors.white,
  });
  kit.text(formatEuro(total), boxX + boxW - 12, kit.y - 19, {
    size: 12,
    useFont: kit.boldFont,
    color: kit.colors.accent,
    align: "right",
  });
  kit.y -= totalH + 22;

  if (nota && nota.trim()) {
    kit.sectionTitle("Nota");
    paragraph(kit, nota);
  }

  const generatedAt = new Date().toLocaleString("pt-PT");
  kit.checkSpace(20);
  kit.text(`Documento gerado em ${generatedAt}.`, PDF_PAGE_WIDTH / 2, kit.y, {
    size: 7.5,
    color: kit.colors.muted,
    align: "center",
  });

  kit.finish();
  const bytes = await pdfDoc.save();
  const safeName = (client.name || "Cliente").replace(/[\\/:*?"<>|]/g, "").trim();
  await deliverPdfToDevice(
    new Blob([bytes], { type: "application/pdf" }),
    `Solicitação de fatura - ${safeName}.pdf`
  );
}
