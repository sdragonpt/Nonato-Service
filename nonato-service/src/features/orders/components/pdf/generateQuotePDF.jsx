// Novo arquivo: generateQuotePDF.jsx

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const generateQuotePDF = async (orderId, order, client, fileName) => {
  const pdfDoc = await PDFDocument.create();
  let currentPage = null;

  // Configurações gerais
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const fontSize = 10;
  const margin = 50;
  let yPos = 0;

  // Carregar fontes
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Carregar a imagem do topo
  const topImageBytes = await fetch("/nonato2.png").then((res) =>
    res.arrayBuffer()
  );
  const topImage = await pdfDoc.embedPng(topImageBytes);

  // Criar nova página
  const createNewPage = () => {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    yPos = pageHeight - margin;

    // Desenhar imagem
    const imgWidth = 100;
    const imgHeight = (imgWidth * topImage.height) / topImage.width;

    currentPage.drawImage(topImage, {
      x: margin,
      y: currentPage.getHeight() - margin - 100,
      width: imgWidth,
      height: imgHeight,
    });

    return currentPage;
  };

  // Função para formatar data
  const formatDate = (date) => {
    const options = { year: "2-digit", month: "2-digit", day: "2-digit" };
    return new Date(date).toLocaleDateString("pt-BR", options);
  };

  // Função para formatar preço
  const formatPrice = (price) => {
    return `€ ${parseFloat(price).toFixed(2)}`;
  };

  // Criar primeira página
  createNewPage();

  // Cabeçalho do documento
  currentPage.drawText("ORÇAMENTO", {
    x: 250,
    y: pageHeight - 50,
    size: 20,
    color: rgb(0, 0, 0),
    font: boldFont,
  });

  // Número do orçamento
  currentPage.drawText(`Nº: ${orderId}`, {
    x: 500,
    y: pageHeight - 50,
    size: 12,
    font: boldFont,
  });

  // Data
  const dateBox = {
    x: 440,
    y: pageHeight - 100,
    width: 100,
    height: 24,
  };

  // Retângulo da data
  currentPage.drawRectangle({
    x: dateBox.x - 5,
    y: dateBox.y - 20,
    width: dateBox.width,
    height: dateBox.height,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  currentPage.drawText("DATA:", {
    x: dateBox.x - 40,
    y: dateBox.y - 10,
    size: fontSize,
    font: boldFont,
  });

  const currentDate = formatDate(new Date());
  currentPage.drawText(currentDate, {
    x: dateBox.x,
    y: dateBox.y - 10,
    size: fontSize,
    font: font,
  });

  yPos = pageHeight - 140;

  // Informações do cliente
  currentPage.drawText("DADOS DO CLIENTE", {
    x: margin,
    y: yPos,
    size: fontSize,
    font: boldFont,
  });

  yPos -= 20;

  // Nome
  currentPage.drawText(
    `Nome: ${order.clientInfo?.name || client?.name || "N/A"}`,
    {
      x: margin,
      y: yPos,
      size: fontSize,
      font: font,
    }
  );

  yPos -= 15;

  // Email
  currentPage.drawText(
    `Email: ${order.clientInfo?.email || client?.email || "N/A"}`,
    {
      x: margin,
      y: yPos,
      size: fontSize,
      font: font,
    }
  );

  yPos -= 15;

  // Telefone
  currentPage.drawText(
    `Telefone: ${order.clientInfo?.phone || client?.phone || "N/A"}`,
    {
      x: margin,
      y: yPos,
      size: fontSize,
      font: font,
    }
  );

  yPos -= 15;

  // Empresa
  if (order.clientInfo?.company) {
    currentPage.drawText(`Empresa: ${order.clientInfo.company}`, {
      x: margin,
      y: yPos,
      size: fontSize,
      font: font,
    });
    yPos -= 15;
  }

  yPos -= 20;

  // Tabela de itens
  currentPage.drawText("ITENS DO ORÇAMENTO", {
    x: margin,
    y: yPos,
    size: fontSize,
    font: boldFont,
  });

  yPos -= 30;

  // Cabeçalho da tabela
  const tableHeaders = [
    "Item",
    "Código",
    "Quantidade",
    "Preço Un.",
    "Subtotal",
  ];
  const columnWidths = [180, 100, 80, 80, 100];
  let xPos = margin;

  tableHeaders.forEach((header, index) => {
    currentPage.drawRectangle({
      x: xPos,
      y: yPos - 20,
      width: columnWidths[index],
      height: 20,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(0.9, 0.9, 0.9),
    });

    const textWidth = boldFont.widthOfTextAtSize(header, fontSize);
    currentPage.drawText(header, {
      x: xPos + (columnWidths[index] - textWidth) / 2,
      y: yPos - 15,
      size: fontSize,
      font: boldFont,
    });

    xPos += columnWidths[index];
  });

  yPos -= 20;

  // Lista de itens
  order.items?.forEach((item, idx) => {
    const rowValues = [
      item.name,
      item.code,
      item.quantity.toString(),
      formatPrice(item.price),
      formatPrice(item.quantity * item.price),
    ];

    xPos = margin;

    rowValues.forEach((value, index) => {
      currentPage.drawRectangle({
        x: xPos,
        y: yPos - 20,
        width: columnWidths[index],
        height: 20,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      const textWidth = font.widthOfTextAtSize(value, fontSize);
      currentPage.drawText(value, {
        x: xPos + (columnWidths[index] - textWidth) / 2,
        y: yPos - 15,
        size: fontSize,
        font: font,
      });

      xPos += columnWidths[index];
    });

    yPos -= 20;
  });

  // Total
  yPos -= 20;
  const totalWidth = 200;
  const totalX = pageWidth - margin - totalWidth;

  currentPage.drawRectangle({
    x: totalX,
    y: yPos - 30,
    width: totalWidth,
    height: 30,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
    color: rgb(0.9, 0.9, 0.9),
  });

  currentPage.drawText("TOTAL:", {
    x: totalX + 20,
    y: yPos - 20,
    size: fontSize,
    font: boldFont,
  });

  // Calcular total
  const total =
    order.items?.reduce((sum, item) => sum + item.quantity * item.price, 0) ||
    0;
  const totalText = formatPrice(total);

  currentPage.drawText(totalText, {
    x: totalX + totalWidth - 80,
    y: yPos - 20,
    size: fontSize,
    font: boldFont,
  });

  // Observações
  yPos -= 60;
  if (order.clientInfo?.message) {
    currentPage.drawText("OBSERVAÇÕES:", {
      x: margin,
      y: yPos,
      size: fontSize,
      font: boldFont,
    });

    yPos -= 20;

    // Caixa para observações
    const messageBox = {
      x: margin,
      y: yPos - 60,
      width: pageWidth - 2 * margin,
      height: 60,
    };

    currentPage.drawRectangle({
      x: messageBox.x,
      y: messageBox.y,
      width: messageBox.width,
      height: messageBox.height,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // Texto das observações (com quebra de linha)
    const message = order.clientInfo.message;
    const maxWidth = messageBox.width - 20;
    let messageY = messageBox.y + messageBox.height - 15;

    message.split("\n").forEach((line) => {
      currentPage.drawText(line.substring(0, 100), {
        x: messageBox.x + 10,
        y: messageY,
        size: fontSize,
        font: font,
      });
      messageY -= 15;
    });
  }

  // Assinaturas
  yPos -= 120;

  currentPage.drawText("Elaborado por: ________________", {
    x: margin,
    y: yPos,
    size: fontSize,
    font: font,
  });

  currentPage.drawText("Data: __/__/__", {
    x: margin + 250,
    y: yPos,
    size: fontSize,
    font: font,
  });

  // Rodapé com informações da empresa
  const footerY = 40;
  currentPage.drawText(
    "NONATO - Assistência Técnica - Tel: 911115479 - Email: service.nonato@gmail.com",
    {
      x: 100,
      y: footerY,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    }
  );

  // Salvar PDF
  const pdfBytes = await pdfDoc.save();
  return { blob: new Blob([pdfBytes], { type: "application/pdf" }), fileName };
};

export default generateQuotePDF;
