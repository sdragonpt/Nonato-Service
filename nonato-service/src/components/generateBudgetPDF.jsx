import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const generateBudgetPDF = async (
  order,
  client,
  selectedServices,
  orderNumber
) => {
  // Criar um novo documento PDF
  const pdfDoc = await PDFDocument.create();

  // Adicionar uma nova página
  const page = pdfDoc.addPage([595.28, 841.89]); // Tamanho A4

  // Carregar a fonte
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Configurações
  const fontSize = 10;
  const titleSize = 14;
  const headerSize = 12;

  // Margens e posicionamento
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
  writeText(`FECHAMENTO Nº ${orderNumber}`, {
    y,
    align: "right",
    useFont: boldFont,
  });

  // Dados do cliente
  y -= 40;
  writeText("Dados do Cliente", { useFont: boldFont, size: headerSize });
  y -= 20;
  writeText(`Nome: ${client.name}`);
  y -= 15;
  writeText(`Telefone: ${client.phone || "N/A"}`);
  y -= 15;
  writeText(`Endereço: ${client.address || "N/A"}`);

  // Seção de serviços
  y -= 40;
  writeText("Serviços", { useFont: boldFont, size: headerSize });
  y -= 20;

  // Cabeçalho da tabela
  let x = initialX;
  const headers = ["Nome", "Quantidade", "Unidade", "Valor Unit.", "Total"];

  // Linha superior da tabela
  drawLine(initialX, page.getWidth() - margin);
  y -= 15;

  // Texto do cabeçalho
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
  selectedServices.forEach((service) => {
    x = initialX;

    // Nome do serviço
    writeText(service.name, { x, width: colWidths[0] });
    x += colWidths[0];

    // Quantidade
    writeText(service.quantity.toFixed(3), {
      x,
      align: "right",
      width: colWidths[1],
    });
    x += colWidths[1];

    // Unidade
    writeText(service.type, { x, align: "right", width: colWidths[2] });
    x += colWidths[2];

    // Valor unitário
    writeText(`${service.value.toFixed(2)} €`, {
      x,
      align: "right",
      width: colWidths[3],
    });
    x += colWidths[3];

    // Total
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
  const total = selectedServices.reduce((acc, curr) => acc + curr.total, 0);
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
  link.download = `Orçamento_${client.name}_${orderNumber}.pdf`;
  link.click();
  URL.revokeObjectURL(link.href);
};

export default generateBudgetPDF;
