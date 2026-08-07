import { rgb, StandardFonts } from "pdf-lib";

// ─────────────────────────────────────────────────────────────────────────
// Kit de design partilhado para todos os PDFs da Nonato Service.
//
// Estilo "ficha técnica": banda escura no topo (em vez de cartões pastel),
// verde da marca usado como destaque pontual (números, linhas, badges) em
// vez de preencher secções inteiras, tabelas com linhas finas e cabeçalhos
// reais alinhados às colunas. Pensado para ficar reconhecível como "Nonato"
// em qualquer um dos relatórios, sem copiar o layout que o cliente enviou.
//
// Cada gerador de PDF chama `createPdfKit(pdfDoc, opções)` uma vez, e usa os
// métodos devolvidos para desenhar. O kit trata da paginação (nova página +
// cabeçalho automáticos) — cada ficheiro só precisa de chamar `kit.checkSpace(altura)`
// antes de desenhar um bloco que não pode ser cortado a meio.
// ─────────────────────────────────────────────────────────────────────────

export const PDF_PAGE_WIDTH = 595.28;
export const PDF_PAGE_HEIGHT = 841.89;
export const PDF_MARGIN = 50;

export const pdfColors = {
  ink: rgb(0.1, 0.1, 0.11),
  paper: rgb(1, 1, 1),
  dark: rgb(0.09, 0.1, 0.11),
  accent: rgb(0.0667, 0.4902, 0.2863),
  accentSoft: rgb(0.9, 0.95, 0.92),
  line: rgb(0.72, 0.72, 0.73),
  lineSoft: rgb(0.88, 0.88, 0.89),
  headerFill: rgb(0.93, 0.93, 0.94),
  rowAlt: rgb(0.97, 0.97, 0.975),
  muted: rgb(0.45, 0.45, 0.46),
  white: rgb(1, 1, 1),
  danger: rgb(0.7, 0.15, 0.15),
};

export async function createPdfKit(
  pdfDoc,
  { title, subtitle, docLabel, docNumber, footerNote = "" }
) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let logoImage = null;
  try {
    const logoBytes = await fetch("/nonato2.png").then((res) => res.arrayBuffer());
    logoImage = await pdfDoc.embedPng(logoBytes);
  } catch {
    logoImage = null;
  }

  let currentPage = null;
  let yPos = 0;
  const minBottomMargin = 66;

  const safeText = (val, fallback = "-") => String(val ?? fallback);

  const rectangle = (x, y, w, h, color, borderColor, borderWidth = 0) => {
    currentPage.drawRectangle({ x, y, width: w, height: h, color, borderColor, borderWidth });
  };

  const hLine = (x1, x2, y, thickness = 0.75, color = pdfColors.line) => {
    currentPage.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color });
  };

  const truncateToWidth = (str, maxWidth, useFont, size) => {
    let result = safeText(str, "");
    if (useFont.widthOfTextAtSize(result, size) <= maxWidth) return result;
    while (result.length > 1 && useFont.widthOfTextAtSize(result + "…", size) > maxWidth) {
      result = result.slice(0, -1);
    }
    return result + "…";
  };

  const wrapText = (str, maxWidth, useFont, size) => {
    if (!str) return [""];
    const words = String(str).split(" ");
    const lines = [];
    let curr = "";
    for (const word of words) {
      const testLine = curr ? `${curr} ${word}` : word;
      if (useFont.widthOfTextAtSize(testLine, size) <= maxWidth) {
        curr = testLine;
      } else {
        if (curr) lines.push(curr);
        curr = word;
      }
    }
    if (curr) lines.push(curr);
    return lines.length ? lines : [""];
  };

  const drawText = (str, x, y, options = {}) => {
    const { size = 9, useFont = font, color = pdfColors.ink, align = "left", maxWidth } = options;
    let content = safeText(str, "");
    if (maxWidth) content = truncateToWidth(content, maxWidth, useFont, size);
    const w = useFont.widthOfTextAtSize(content, size);
    let tx = x;
    if (align === "center") tx = x - w / 2;
    if (align === "right") tx = x - w;
    currentPage.drawText(content, { x: tx, y, size, font: useFont, color });
    return w;
  };

  const drawHeaderBand = () => {
    const bandHeight = 76;
    rectangle(0, PDF_PAGE_HEIGHT - bandHeight, PDF_PAGE_WIDTH, bandHeight, pdfColors.dark);

    let textX = PDF_MARGIN;
    if (logoImage) {
      const logoW = 32;
      const logoH = (logoW * logoImage.height) / logoImage.width;
      currentPage.drawImage(logoImage, {
        x: PDF_MARGIN,
        y: PDF_PAGE_HEIGHT - bandHeight / 2 - logoH / 2,
        width: logoW,
        height: logoH,
      });
      textX = PDF_MARGIN + logoW + 14;
    }

    drawText(safeText(title).toUpperCase(), textX, PDF_PAGE_HEIGHT - 33, {
      size: 15,
      useFont: boldFont,
      color: pdfColors.white,
    });
    if (subtitle) {
      drawText(safeText(subtitle).toUpperCase(), textX, PDF_PAGE_HEIGHT - 49, {
        size: 8,
        useFont: font,
        color: pdfColors.accent,
      });
    }

    if (docNumber) {
      const label = `${docLabel || "Nº"} ${docNumber}`;
      const labelW = boldFont.widthOfTextAtSize(label, 11);
      const boxW = labelW + 24;
      const boxH = 24;
      const boxX = PDF_PAGE_WIDTH - PDF_MARGIN - boxW;
      const boxY = PDF_PAGE_HEIGHT - bandHeight / 2 - boxH / 2;
      rectangle(boxX, boxY, boxW, boxH, pdfColors.accent);
      drawText(label, boxX + boxW / 2, boxY + boxH / 2 - 4, {
        size: 11,
        useFont: boldFont,
        color: pdfColors.white,
        align: "center",
      });
    }

    yPos = PDF_PAGE_HEIGHT - bandHeight - 28;
  };

  const newPage = () => {
    currentPage = pdfDoc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]);
    drawHeaderBand();
    return currentPage;
  };

  const checkSpace = (needed) => {
    if (yPos - needed < minBottomMargin) {
      newPage();
      return true;
    }
    return false;
  };

  const sectionTitle = (label) => {
    const upper = safeText(label).toUpperCase();
    drawText(upper, PDF_MARGIN, yPos, { size: 10, useFont: boldFont, color: pdfColors.ink });
    const labelW = boldFont.widthOfTextAtSize(upper, 10);
    hLine(PDF_MARGIN + labelW + 10, PDF_PAGE_WIDTH - PDF_MARGIN, yPos + 3.5, 0.75, pdfColors.accent);
    yPos -= 20;
  };

  // Painel de informação em grelha 2 colunas: [[label, valor], ...]
  const infoPanel = (rows, { cols = 2 } = {}) => {
    const rowGap = 22;
    const numRows = Math.ceil(rows.length / cols);
    const panelHeight = numRows * rowGap + 14;

    rectangle(PDF_MARGIN, yPos - panelHeight, PDF_PAGE_WIDTH - 2 * PDF_MARGIN, panelHeight, pdfColors.rowAlt, pdfColors.lineSoft, 0.75);
    rectangle(PDF_MARGIN, yPos - panelHeight, 3, panelHeight, pdfColors.accent);

    const colWidth = (PDF_PAGE_WIDTH - 2 * PDF_MARGIN - 24) / cols;
    const top = yPos - 14;

    rows.forEach(([label, value], index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = PDF_MARGIN + 18 + col * colWidth;
      const y = top - row * rowGap;
      drawText(safeText(label).toUpperCase(), x, y, { size: 7, useFont: boldFont, color: pdfColors.muted });
      drawText(safeText(value), x, y - 12, {
        size: 9.5,
        useFont: font,
        color: pdfColors.ink,
        maxWidth: colWidth - 22,
      });
    });

    yPos -= panelHeight + 22;
  };

  // Faixa escura de destaque com um número grande (ex.: total de horas/valor)
  const statBand = (label, bigValue, note) => {
    checkSpace(80);
    const bandHeight = 64;
    rectangle(PDF_MARGIN, yPos - bandHeight, PDF_PAGE_WIDTH - 2 * PDF_MARGIN, bandHeight, pdfColors.dark);

    const upperLabel = safeText(label).toUpperCase();
    drawText(upperLabel, PDF_PAGE_WIDTH / 2, yPos - 18, {
      size: 8.5,
      useFont: boldFont,
      color: pdfColors.white,
      align: "center",
    });
    drawText(safeText(bigValue), PDF_PAGE_WIDTH / 2, yPos - 42, {
      size: 22,
      useFont: boldFont,
      color: pdfColors.accent,
      align: "center",
    });
    if (note) {
      drawText(safeText(note), PDF_PAGE_WIDTH / 2, yPos - 56, {
        size: 8,
        useFont: font,
        color: rgb(0.75, 0.75, 0.76),
        align: "center",
      });
    }

    yPos -= bandHeight + 22;
  };

  // Fileira de mini-cartões estatísticos (ex.: Km total, horas de viagem…)
  const statRow = (stats) => {
    checkSpace(64);
    const gap = 12;
    const boxW = (PDF_PAGE_WIDTH - 2 * PDF_MARGIN - gap * (stats.length - 1)) / stats.length;
    const boxH = 46;
    let x = PDF_MARGIN;

    stats.forEach((stat) => {
      rectangle(x, yPos - boxH, boxW, boxH, pdfColors.paper, pdfColors.lineSoft, 0.75);
      rectangle(x, yPos - boxH, boxW, 2.5, pdfColors.accent);
      drawText(safeText(stat.label).toUpperCase(), x + 10, yPos - 18, {
        size: 7,
        useFont: boldFont,
        color: pdfColors.muted,
      });
      drawText(safeText(stat.value), x + 10, yPos - 34, {
        size: 13,
        useFont: boldFont,
        color: pdfColors.ink,
      });
      x += boxW + gap;
    });

    yPos -= boxH + 20;
  };

  // Badge numerado (quadrado escuro + número verde) — usado em listas de
  // equipamento/itens numerados.
  const numberBadge = (x, y, size, num) => {
    rectangle(x, y, size, size, pdfColors.dark);
    const label = String(num);
    const labelW = boldFont.widthOfTextAtSize(label, size * 0.5);
    drawText(label, x + (size - labelW) / 2, y + size * 0.32, {
      size: size * 0.5,
      useFont: boldFont,
      color: pdfColors.accent,
    });
  };

  // Tabela genérica com cabeçalho e zebra striping fino.
  // columns: [{ header, width, align: 'left'|'center'|'right', key, render? }]
  const tableHeader = (columns) => {
    const headerHeight = 22;
    rectangle(PDF_MARGIN, yPos - headerHeight, PDF_PAGE_WIDTH - 2 * PDF_MARGIN, headerHeight, pdfColors.headerFill);
    let x = PDF_MARGIN;
    columns.forEach((col) => {
      const label = safeText(col.header).toUpperCase();
      const tw = boldFont.widthOfTextAtSize(label, 7.5);
      let tx = x + 8;
      if (col.align === "center") tx = x + (col.width - tw) / 2;
      if (col.align === "right") tx = x + col.width - tw - 8;
      drawText(label, tx, yPos - headerHeight + 8, { size: 7.5, useFont: boldFont, color: pdfColors.ink });
      x += col.width;
    });
    hLine(PDF_MARGIN, PDF_PAGE_WIDTH - PDF_MARGIN, yPos - headerHeight, 1, pdfColors.ink);
    yPos -= headerHeight;
  };

  const tableRow = (columns, rowData, rowIndex, { rowHeight = 20 } = {}) => {
    const bg = rowIndex % 2 === 0 ? pdfColors.paper : pdfColors.rowAlt;
    rectangle(PDF_MARGIN, yPos - rowHeight, PDF_PAGE_WIDTH - 2 * PDF_MARGIN, rowHeight, bg);

    let x = PDF_MARGIN;
    columns.forEach((col) => {
      const raw = col.render ? col.render(rowData) : rowData[col.key];
      const value = safeText(raw, "-");
      const size = col.size || 8.5;
      const useFont = col.bold ? boldFont : font;
      const tw = useFont.widthOfTextAtSize(value, size);
      let tx = x + 8;
      if (col.align === "center") tx = x + (col.width - tw) / 2;
      if (col.align === "right") tx = x + col.width - tw - 8;
      drawText(value, tx, yPos - rowHeight + 6, {
        size,
        useFont,
        color: col.color || pdfColors.ink,
        maxWidth: col.width - 14,
      });
      x += col.width;
    });

    hLine(PDF_MARGIN, PDF_PAGE_WIDTH - PDF_MARGIN, yPos - rowHeight, 0.5, pdfColors.lineSoft);
    yPos -= rowHeight;
  };

  const tableTotalRow = (label, value, { rowHeight = 22 } = {}) => {
    const totalWidth = PDF_PAGE_WIDTH - 2 * PDF_MARGIN;
    rectangle(PDF_MARGIN, yPos - rowHeight, totalWidth, rowHeight, pdfColors.accentSoft, pdfColors.accent, 0.75);
    drawText(safeText(label).toUpperCase(), PDF_MARGIN + 10, yPos - rowHeight + 7, {
      size: 8,
      useFont: boldFont,
      color: pdfColors.accent,
    });
    const valueW = boldFont.widthOfTextAtSize(safeText(value), 11);
    drawText(safeText(value), PDF_PAGE_WIDTH - PDF_MARGIN - 10 - valueW, yPos - rowHeight + 6, {
      size: 11,
      useFont: boldFont,
      color: pdfColors.accent,
    });
    yPos -= rowHeight;
  };

  const finish = () => {
    const totalPages = pdfDoc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const page = pdfDoc.getPage(i);
      page.drawText(`Página ${i + 1} / ${totalPages}`, {
        x: page.getWidth() - PDF_MARGIN - 68,
        y: 22,
        size: 7.5,
        font,
        color: pdfColors.muted,
      });
      page.drawText(footerNote || "NONATO SERVICE", {
        x: PDF_MARGIN,
        y: 22,
        size: 7.5,
        font,
        color: pdfColors.muted,
      });
      page.drawLine({
        start: { x: PDF_MARGIN, y: 36 },
        end: { x: PDF_PAGE_WIDTH - PDF_MARGIN, y: 36 },
        thickness: 0.5,
        color: pdfColors.lineSoft,
      });
    }
  };

  return {
    font,
    boldFont,
    colors: pdfColors,
    safeText,
    rect: rectangle,
    hLine,
    text: drawText,
    wrapText,
    truncateToWidth,
    newPage,
    checkSpace,
    sectionTitle,
    infoPanel,
    statBand,
    statRow,
    numberBadge,
    tableHeader,
    tableRow,
    tableTotalRow,
    finish,
    get page() {
      return currentPage;
    },
    get y() {
      return yPos;
    },
    set y(value) {
      yPos = value;
    },
  };
}
