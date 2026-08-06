// generateProtocolPDF.jsx - Gera o PDF do Protocolo de Serviço (antes/depois + peças)
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const A4 = [595.28, 841.89];
const MARGIN = 50;

/** Quebra um texto em várias linhas para caber na largura disponível. */
function wrapText(text, font, size, maxWidth) {
  const words = (text || "").split(/\s+/);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

async function embedImageFromUrl(pdfDoc, url) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("png")) {
      return await pdfDoc.embedPng(arrayBuffer);
    }
    try {
      return await pdfDoc.embedJpg(arrayBuffer);
    } catch {
      return await pdfDoc.embedPng(arrayBuffer);
    }
  } catch (err) {
    console.error("Erro ao incorporar imagem no PDF:", err);
    return null;
  }
}

const generateProtocolPDF = async (protocol, companyProfile = {}) => {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage(A4);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = A4[0] - 2 * MARGIN;
  let y = A4[1] - MARGIN;

  const newPage = () => {
    page = pdfDoc.addPage(A4);
    y = A4[1] - MARGIN;
  };

  const ensureSpace = (needed) => {
    if (y - needed < MARGIN + 30) newPage();
  };

  const writeText = (text, options = {}) => {
    const {
      x = MARGIN,
      size = 10,
      useFont = font,
      color = rgb(0.1, 0.1, 0.1),
      align = "left",
      width = pageWidth,
    } = options;

    let xPos = x;
    const textWidth = useFont.widthOfTextAtSize(text, size);
    if (align === "right") xPos = x + width - textWidth;
    else if (align === "center") xPos = x + (width - textWidth) / 2;

    page.drawText(text, { x: xPos, y, size, font: useFont, color });
  };

  // Cabeçalho — logo estático + dados da empresa
  try {
    const response = await fetch("/nonato2.png");
    const arrayBuffer = await response.arrayBuffer();
    const image = await pdfDoc.embedPng(arrayBuffer);
    const imgWidth = 90;
    const imgHeight = (imgWidth * image.height) / image.width;
    page.drawImage(image, {
      x: MARGIN,
      y: y - imgHeight,
      width: imgWidth,
      height: imgHeight,
    });
  } catch {
    // logo opcional
  }

  const headerTextX = MARGIN + 100;
  writeText(companyProfile.nomeEmpresa || "Nonato Service", {
    x: headerTextX,
    size: 16,
    useFont: boldFont,
  });
  y -= 18;
  writeText(companyProfile.email || "nonato.service@gmail.com", {
    x: headerTextX,
    size: 9,
  });
  y -= 13;
  writeText(companyProfile.telefone || "", { x: headerTextX, size: 9 });

  y -= 5;
  writeText(new Date().toLocaleDateString("pt-PT"), { align: "right" });

  y -= 45;
  page.drawRectangle({
    x: MARGIN,
    y: y - 2,
    width: pageWidth,
    height: 1,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 25;

  // Título do protocolo
  writeText("PROTOCOLO DE SERVIÇO", { size: 18, useFont: boldFont });
  y -= 26;
  writeText(protocol.title || "Sem título", { size: 13, useFont: boldFont });
  y -= 22;

  writeText(`Cliente: ${protocol.clientName || "N/A"}`, { size: 10 });
  y -= 15;
  if (protocol.equipmentName) {
    writeText(`Equipamento: ${protocol.equipmentName}`, { size: 10 });
    y -= 15;
  }
  writeText(
    `Estado: ${protocol.status === "concluido" ? "Concluído" : "Rascunho"}`,
    { size: 10 }
  );
  y -= 30;

  // Secção de blocos (Antes / Depois)
  const renderSection = async (label, blocks) => {
    if (!blocks || blocks.length === 0) return;

    ensureSpace(40);
    writeText(label.toUpperCase(), { size: 13, useFont: boldFont });
    y -= 20;

    for (const block of blocks) {
      if (block.tipo === "texto" && block.texto) {
        const lines = wrapText(block.texto, font, 10, pageWidth);
        ensureSpace(lines.length * 14 + 10);
        lines.forEach((line) => {
          writeText(line, { size: 10 });
          y -= 14;
        });
        y -= 8;
      } else if (block.tipo === "imagem" && block.imageUrl) {
        const image = await embedImageFromUrl(pdfDoc, block.imageUrl);
        if (image) {
          const maxImgWidth = 220;
          const scale = Math.min(1, maxImgWidth / image.width);
          const imgWidth = image.width * scale;
          const imgHeight = image.height * scale;
          ensureSpace(imgHeight + 15);
          page.drawImage(image, { x: MARGIN, y: y - imgHeight, width: imgWidth, height: imgHeight });
          y -= imgHeight + 15;
        }
      }
    }
    y -= 10;
  };

  await renderSection("Antes", protocol.blocosAntes);
  await renderSection("Depois", protocol.blocosDepois);

  // Peças Trocadas
  if (protocol.pecasTrocadas && protocol.pecasTrocadas.length > 0) {
    ensureSpace(40);
    writeText("PEÇAS TROCADAS", { size: 13, useFont: boldFont });
    y -= 20;

    const cols = [
      { label: "Peça", width: pageWidth * 0.5 },
      { label: "Código", width: pageWidth * 0.3 },
      { label: "Qtd.", width: pageWidth * 0.2 },
    ];
    let x = MARGIN;
    cols.forEach((col) => {
      writeText(col.label, { x, size: 9, useFont: boldFont, width: col.width });
      x += col.width;
    });
    y -= 15;
    page.drawRectangle({ x: MARGIN, y: y + 5, width: pageWidth, height: 0.5, color: rgb(0.5, 0.5, 0.5) });

    protocol.pecasTrocadas.forEach((peca) => {
      ensureSpace(16);
      x = MARGIN;
      writeText(peca.name || "", { x, size: 9, width: cols[0].width });
      x += cols[0].width;
      writeText(peca.code || "", { x, size: 9, width: cols[1].width });
      x += cols[1].width;
      writeText(String(peca.quantity || 1), { x, size: 9, width: cols[2].width });
      y -= 16;
    });
    y -= 15;
  }

  // Assinatura
  ensureSpace(70);
  y -= 20;
  page.drawRectangle({ x: MARGIN, y, width: 200, height: 0.5, color: rgb(0.5, 0.5, 0.5) });
  writeText("Assinatura do Cliente", { size: 8, color: rgb(0.5, 0.5, 0.5) });
  y -= 4;

  // Rodapé com numeração
  const pages = pdfDoc.getPages();
  pages.forEach((p, idx) => {
    p.drawText(`Página ${idx + 1} de ${pages.length}`, {
      x: A4[0] - MARGIN - 80,
      y: 30,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  });

  return await pdfDoc.save();
};

export default generateProtocolPDF;
