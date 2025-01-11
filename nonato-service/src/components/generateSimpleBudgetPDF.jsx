import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const generateSimpleBudgetPDF = async (budget) => {
  // Criar um novo documento PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // Tamanho A4

  // Carregar a fonte
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Configurações
  const fontSize = 10;
  const titleSize = 14;
  const headerSize = 12;
  const margin = 50;
  let y = page.getHeight() - margin;
  const initialX = margin;
  const pageWidth = page.getWidth() - 2 * margin;

  // Configurações da tabela
  const colWidths = [
    pageWidth * 0.4, // Nome (40%)
    pageWidth * 0.15, // Quantidade (15%)
    pageWidth * 0.15, // Unidade (15%)
    pageWidth * 0.15, // Valor Unit (15%)
    pageWidth * 0.15, // Total (15%)
  ];

  // Funções auxiliares
  const writeText = (text, options = {}) => {
    const {
      x = initialX,
      size = fontSize,
      useFont = font,
      color = rgb(0, 0, 0),
      align = "left",
      width,
    } = options;

    let xPos = x;
    const textWidth = useFont.widthOfTextAtSize(text, size);

    if (align === "right") {
      xPos = width
        ? x + width - textWidth
        : page.getWidth() - margin - textWidth;
    } else if (align === "center") {
      xPos = width
        ? x + (width - textWidth) / 2
        : (page.getWidth() - textWidth) / 2;
    }

    page.drawText(text, {
      x: xPos,
      y,
      size,
      font: useFont,
      color,
    });
  };

  const drawLine = (startX, endX) => {
    page.drawLine({
      start: { x: startX, y },
      end: { x: endX, y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
  };

  // Cabeçalho
  writeText("Assistência Técnica", { size: titleSize, useFont: boldFont });
  y -= 20;

  // Informações de contato à esquerda
  writeText("service.nonato@gmail.com");
  y -= 15;
  writeText("Contato: NONATO");

  // Data e número do orçamento à direita
  let topY = page.getHeight() - margin;
  const currentDate = new Date().toLocaleDateString();
  writeText(`Data: ${currentDate}`, { y: topY, align: "right" });
  y = topY - 15;
  writeText(`ORÇAMENTO Nº ${budget.budgetNumber}`, {
    y,
    align: "right",
    useFont: boldFont,
  });

  // Dados do cliente
  y -= 40;
  writeText("Dados do Cliente", { useFont: boldFont, size: headerSize });
  y -= 20;
  writeText(`Nome: ${budget.clientData.name}`);
  y -= 15;
  writeText(`Telefone: ${budget.clientData.phone || "N/A"}`);
  y -= 15;
  writeText(`Endereço: ${budget.clientData.address || "N/A"}`);

  // Seção de serviços
  y -= 40;
  writeText("Serviços", { useFont: boldFont, size: headerSize });
  y -= 20;

  // Cabeçalho da tabela
  let x = initialX;
  const headers = ["Nome", "Quantidade", "Unidade", "Valor Unit.", "Total"];
  drawLine(initialX, page.getWidth() - margin);
  y -= 15;

  headers.forEach((header, index) => {
    const align = index === 0 ? "left" : "right";
    writeText(header, {
      x,
      useFont: boldFont,
      align,
      width: colWidths[index],
    });
    x += colWidths[index];
  });

  y -= 10;
  drawLine(initialX, page.getWidth() - margin);
  y -= 15;

  // Dados da tabela
  budget.services.forEach((service) => {
    x = initialX;

    writeText(service.name, { x, width: colWidths[0] });
    x += colWidths[0];

    writeText(service.quantity.toFixed(3), {
      x,
      align: "right",
      width: colWidths[1],
    });
    x += colWidths[1];

    writeText(service.type, { x, align: "right", width: colWidths[2] });
    x += colWidths[2];

    writeText(`${service.value.toFixed(2)} €`, {
      x,
      align: "right",
      width: colWidths[3],
    });
    x += colWidths[3];

    writeText(`${service.total.toFixed(2)} €`, {
      x,
      align: "right",
      width: colWidths[4],
    });

    y -= 7;
    drawLine(initialX, page.getWidth() - margin);
    y -= 15;
  });

  // Totais
  y -= 20;
  const total = budget.services.reduce((acc, curr) => acc + curr.total, 0);
  const totalWidth = colWidths[3] + colWidths[4];
  const totalX = page.getWidth() - margin - totalWidth;

  writeText("Total Serviços:", { x: totalX, useFont: boldFont });
  writeText(`${total.toFixed(2)} €`, {
    x: totalX + totalWidth,
    align: "right",
    useFont: boldFont,
  });
  y -= 15;

  writeText("Subtotal:", { x: totalX, useFont: boldFont });
  writeText(`${total.toFixed(2)} €`, {
    x: totalX + totalWidth,
    align: "right",
    useFont: boldFont,
  });
  y -= 15;

  writeText("Total Orçamento:", { x: totalX, useFont: boldFont });
  writeText(`${total.toFixed(2)} €`, {
    x: totalX + totalWidth,
    align: "right",
    useFont: boldFont,
  });

  // Assinatura
  y -= 100;
  writeText("Assistência Técnica", { align: "center" });
  y -= 30;
  writeText("NONATO", { align: "center", useFont: boldFont });

  // Gerar o PDF
  const pdfBytes = await pdfDoc.save();

  // Download do arquivo
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Orçamento_${budget.clientData.name}_${budget.budgetNumber}.pdf`;
  link.click();
  URL.revokeObjectURL(link.href);
};

export default generateSimpleBudgetPDF;
