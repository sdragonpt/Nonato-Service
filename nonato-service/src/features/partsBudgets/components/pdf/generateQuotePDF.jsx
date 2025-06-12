// generateQuotePDF.jsx - VERSÃO SIMPLIFICADA PARA PART BUDGETS

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../firebase.jsx";

const generateQuotePDF = async (quoteId, quote, client, fileName) => {
  const pdfDoc = await PDFDocument.create();
  let currentPage = null;

  // Configurações gerais
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const fontSize = 9;
  const smallFontSize = 8;
  const margin = 50;
  let yPos = 0;

  // Função para buscar dados completos das peças
  const fetchCompletePartData = async (partId) => {
    try {
      const partRef = doc(db, "pecas", partId);
      const partDoc = await getDoc(partRef);

      if (partDoc.exists()) {
        const partData = partDoc.data();
        return { id: partId, ...partData };
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Erro ao buscar peça ${partId}:`, error);
      return null;
    }
  };

  // Enriquecer items com dados completos das peças
  const enrichItemsWithPartData = async (items) => {
    if (!items || items.length === 0) return [];

    const enrichedItems = [];

    for (const item of items) {
      if (item.id) {
        const completePartData = await fetchCompletePartData(item.id);

        if (completePartData) {
          const enrichedItem = {
            ...completePartData,
            ...item,
            name: completePartData.name || item.name,
            code: completePartData.code || item.code,
          };
          enrichedItems.push(enrichedItem);
        } else {
          enrichedItems.push(item);
        }
      } else {
        enrichedItems.push(item);
      }
    }

    return enrichedItems;
  };

  // Função para buscar imagem da biblioteca
  const loadImageFromLibrary = async (imageHash) => {
    try {
      if (!imageHash) return null;

      const imageRef = doc(db, "image_library", imageHash);
      const imageDoc = await getDoc(imageRef);

      if (imageDoc.exists()) {
        const data = imageDoc.data();
        return data.data;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Erro ao carregar imagem da biblioteca:", error);
      return null;
    }
  };

  // Função para carregar imagem (BASE64 ou URL)
  const loadImageData = async (imageSrc) => {
    try {
      if (!imageSrc) return null;

      if (imageSrc.startsWith("data:image/")) {
        const base64Data = imageSrc.split(",")[1];
        const isJpeg = imageSrc.includes("jpeg") || imageSrc.includes("jpg");
        return {
          data: Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0)),
          isJpeg,
        };
      }

      const response = await fetch(imageSrc);
      if (!response.ok) {
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const isJpeg =
        imageSrc.toLowerCase().includes("jpg") ||
        imageSrc.toLowerCase().includes("jpeg");

      return {
        data: new Uint8Array(arrayBuffer),
        isJpeg,
      };
    } catch (error) {
      console.error("Erro ao carregar dados da imagem:", error);
      return null;
    }
  };

  // Função para quebrar texto longo
  const wrapText = (text, maxWidth, font, fontSize) => {
    const words = text.split(" ");
    const lines = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines.push(
            word.substring(0, Math.floor(maxWidth / (fontSize * 0.6))) + "..."
          );
          currentLine = "";
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  };

  // Função para encurtar ID do orçamento
  const getShortQuoteId = (fullId) => {
    if (!fullId) return "ORÇ-0001";

    if (fullId.length > 10) {
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, "0");
      const day = now.getDate().toString().padStart(2, "0");
      const uniquePart = fullId.substring(0, 4).toUpperCase();
      return `ORÇ-${year}${month}${day}-${uniquePart}`;
    }

    return `ORÇ-${fullId}`;
  };

  // Verificar se precisa de nova página
  const checkPageSpace = (requiredSpace) => {
    if (yPos < margin + requiredSpace) {
      createNewPage();
      yPos = pageHeight - 140;
      return true;
    }
    return false;
  };

  // Carregar fontes
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Carregar a imagem do topo
  const topImageBytes = await fetch("/nonato2.png").then((res) =>
    res.arrayBuffer()
  );
  const topImage = await pdfDoc.embedPng(topImageBytes);

  // Criar nova página com controle de espaço
  const createNewPage = () => {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    yPos = pageHeight - margin;

    // Desenhar imagem do cabeçalho
    const imgWidth = 100;
    const imgHeight = (imgWidth * topImage.height) / topImage.width;

    currentPage.drawImage(topImage, {
      x: margin,
      y: currentPage.getHeight() - margin - 90,
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

  // Calcular totais com IVA e envio
  const calculateTotals = (items = enrichedItems) => {
    const subtotal =
      items?.reduce(
        (sum, item) => sum + item.quantity * (item.price || 0),
        0
      ) || 0;

    const shipping = parseFloat(quote.shippingPrice) || 0;
    const totalBeforeVat = subtotal + shipping;

    const vatAmount =
      quote.includeVat && quote.vatRate
        ? (totalBeforeVat * quote.vatRate) / 100
        : 0;

    const totalWithVat = totalBeforeVat + vatAmount;

    return {
      subtotal,
      shipping,
      totalBeforeVat,
      vatAmount,
      totalWithVat,
    };
  };

  // Criar primeira página
  createNewPage();

  // Enriquecer items com dados completos das peças
  const originalItems = quote.items || [];
  const enrichedItems = await enrichItemsWithPartData(originalItems);

  const shortQuoteId = getShortQuoteId(quoteId);
  const totals = calculateTotals(enrichedItems);

  // Cabeçalho do documento
  currentPage.drawText("ORÇAMENTO DE PEÇAS", {
    x: 200,
    y: pageHeight - 50,
    size: 20,
    color: rgb(0, 0, 0),
    font: boldFont,
  });

  currentPage.drawText(`Nº: ${shortQuoteId}`, {
    x: 415,
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

  // Dados do Cliente
  currentPage.drawText("DADOS DO CLIENTE", {
    x: margin,
    y: yPos,
    size: fontSize,
    font: boldFont,
  });

  yPos -= 25;

  // Cliente Info
  const clientData = quote.clientInfo || {};

  currentPage.drawText(`Nome: ${clientData.name || "N/A"}`, {
    x: margin,
    y: yPos,
    size: fontSize,
    font: font,
  });

  yPos -= 15;

  currentPage.drawText(`Email: ${clientData.email || "N/A"}`, {
    x: margin,
    y: yPos,
    size: fontSize,
    font: font,
  });

  yPos -= 15;

  currentPage.drawText(`Telefone: ${clientData.phone || "N/A"}`, {
    x: margin,
    y: yPos,
    size: fontSize,
    font: font,
  });

  if (clientData.company) {
    yPos -= 15;
    currentPage.drawText(`Empresa: ${clientData.company}`, {
      x: margin,
      y: yPos,
      size: fontSize,
      font: font,
    });
  }

  yPos -= 30;

  // Tabela de Itens
  checkPageSpace(150);

  currentPage.drawText("ITENS SOLICITADOS", {
    x: margin,
    y: yPos,
    size: fontSize,
    font: boldFont,
  });

  yPos -= 20;

  // Cabeçalho da tabela
  const tableHeaders = ["Item", "Código", "Qtd", "Preço Un.", "Subtotal"];
  const columnWidths = [200, 100, 50, 80, 85];
  let xPos = margin;

  // Desenhar cabeçalho
  tableHeaders.forEach((header, index) => {
    currentPage.drawRectangle({
      x: xPos,
      y: yPos - 25,
      width: columnWidths[index],
      height: 25,
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

  yPos -= 25;

  // Processar itens
  if (enrichedItems?.length > 0) {
    for (let idx = 0; idx < enrichedItems.length; idx++) {
      const item = enrichedItems[idx];
      const price = item.price || 0;
      const subtotal = item.quantity * price;
      const hasPrice = price > 0;

      const itemHeight = 30;
      checkPageSpace(itemHeight + 10);

      // Cores intercaladas
      const bgColor = hasPrice
        ? idx % 2 === 0
          ? rgb(0.9, 1, 0.9)
          : rgb(1, 1, 1)
        : idx % 2 === 0
        ? rgb(1, 0.95, 0.8)
        : rgb(1, 1, 1);

      xPos = margin;

      // Desenhar células
      const values = [
        item.name,
        item.code,
        item.quantity.toString(),
        price > 0 ? formatPrice(price) : "A definir",
        price > 0 ? formatPrice(subtotal) : "A definir",
      ];

      values.forEach((value, index) => {
        currentPage.drawRectangle({
          x: xPos,
          y: yPos - itemHeight,
          width: columnWidths[index],
          height: itemHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
          color: bgColor,
        });

        const textWidth = font.widthOfTextAtSize(value, fontSize);
        const textColor = hasPrice ? rgb(0, 0, 0) : rgb(0.8, 0.4, 0);

        currentPage.drawText(value, {
          x: xPos + (columnWidths[index] - textWidth) / 2,
          y: yPos - itemHeight / 2 - 4,
          size: fontSize,
          font: font,
          color: textColor,
        });

        xPos += columnWidths[index];
      });

      yPos -= itemHeight;
    }
  }

  yPos -= 20;

  // Seção de envio (se configurado)
  if (quote.shippingType && quote.shippingPrice > 0) {
    yPos -= 15;
    checkPageSpace(60);

    currentPage.drawText("INFORMAÇÕES DE ENVIO", {
      x: margin,
      y: yPos,
      size: fontSize,
      font: boldFont,
    });

    yPos -= 15;

    const shippingBox = {
      x: margin,
      y: yPos - 30,
      width: pageWidth - 2 * margin,
      height: 30,
    };

    currentPage.drawRectangle({
      x: shippingBox.x,
      y: shippingBox.y,
      width: shippingBox.width,
      height: shippingBox.height,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(0.95, 0.95, 1),
    });

    currentPage.drawText(`Tipo: ${quote.shippingType}`, {
      x: shippingBox.x + 10,
      y: shippingBox.y + 15,
      size: fontSize,
      font: font,
    });

    currentPage.drawText(`Preço: ${formatPrice(quote.shippingPrice)}`, {
      x: shippingBox.x + shippingBox.width - 120,
      y: shippingBox.y + 15,
      size: fontSize,
      font: boldFont,
    });

    yPos -= 40;
  }

  // Totais
  yPos -= 20;
  checkPageSpace(120);

  const totalWidth = 240;
  const totalX = pageWidth - margin - totalWidth;

  // Subtotal
  currentPage.drawRectangle({
    x: totalX,
    y: yPos - 25,
    width: totalWidth,
    height: 25,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
    color: rgb(0.95, 0.95, 0.95),
  });

  currentPage.drawText("SUBTOTAL ITENS:", {
    x: totalX + 10,
    y: yPos - 15,
    size: fontSize,
    font: boldFont,
  });

  currentPage.drawText(formatPrice(totals.subtotal), {
    x: totalX + totalWidth - 80,
    y: yPos - 15,
    size: fontSize,
    font: boldFont,
  });

  yPos -= 25;

  // Envio (se existir)
  if (totals.shipping > 0) {
    currentPage.drawRectangle({
      x: totalX,
      y: yPos - 25,
      width: totalWidth,
      height: 25,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(0.95, 0.95, 0.95),
    });

    currentPage.drawText("ENVIO:", {
      x: totalX + 10,
      y: yPos - 15,
      size: fontSize,
      font: font,
    });

    currentPage.drawText(formatPrice(totals.shipping), {
      x: totalX + totalWidth - 80,
      y: yPos - 15,
      size: fontSize,
      font: font,
    });

    yPos -= 25;
  }

  // IVA (se aplicável)
  if (quote.includeVat && totals.vatAmount > 0) {
    // Total sem IVA
    currentPage.drawRectangle({
      x: totalX,
      y: yPos - 25,
      width: totalWidth,
      height: 25,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(0.95, 0.95, 0.95),
    });

    currentPage.drawText("TOTAL S/ IVA:", {
      x: totalX + 10,
      y: yPos - 15,
      size: fontSize,
      font: font,
    });

    currentPage.drawText(formatPrice(totals.totalBeforeVat), {
      x: totalX + totalWidth - 80,
      y: yPos - 15,
      size: fontSize,
      font: font,
    });

    yPos -= 25;

    // IVA
    currentPage.drawRectangle({
      x: totalX,
      y: yPos - 25,
      width: totalWidth,
      height: 25,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      color: rgb(0.9, 0.9, 1),
    });

    currentPage.drawText(`IVA (${quote.vatRate}%):`, {
      x: totalX + 10,
      y: yPos - 15,
      size: fontSize,
      font: font,
    });

    currentPage.drawText(formatPrice(totals.vatAmount), {
      x: totalX + totalWidth - 80,
      y: yPos - 15,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0.8),
    });

    yPos -= 25;
  }

  // Total Final
  currentPage.drawRectangle({
    x: totalX,
    y: yPos - 30,
    width: totalWidth,
    height: 30,
    borderColor: rgb(0, 0, 0),
    borderWidth: 2,
    color: rgb(0.9, 1, 0.9),
  });

  currentPage.drawText("TOTAL FINAL:", {
    x: totalX + 10,
    y: yPos - 20,
    size: fontSize + 1,
    font: boldFont,
  });

  const finalTotal = quote.includeVat
    ? totals.totalWithVat
    : totals.totalBeforeVat;

  currentPage.drawText(formatPrice(finalTotal), {
    x: totalX + totalWidth - 90,
    y: yPos - 20,
    size: fontSize + 1,
    font: boldFont,
    color: rgb(0, 0.6, 0),
  });

  yPos -= 40;

  // Observações
  if (quote.resultDescription || quote.pontosEmAberto) {
    yPos -= 20;
    checkPageSpace(80);

    currentPage.drawText("OBSERVAÇÕES:", {
      x: margin,
      y: yPos,
      size: fontSize,
      font: boldFont,
    });

    yPos -= 20;

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

    const observationsText = [quote.resultDescription, quote.pontosEmAberto]
      .filter(Boolean)
      .join(" | ");

    const messageLines = wrapText(
      observationsText,
      messageBox.width - 20,
      font,
      fontSize
    );
    let messageY = messageBox.y + messageBox.height - 15;

    messageLines.slice(0, 4).forEach((line) => {
      currentPage.drawText(line, {
        x: messageBox.x + 10,
        y: messageY,
        size: fontSize,
        font: font,
      });
      messageY -= 12;
    });

    yPos -= 70;
  }

  // Aviso sobre troca de peças
  yPos -= 20;
  checkPageSpace(80);

  const warningBox = {
    x: margin,
    y: yPos - 60,
    width: pageWidth - 2 * margin,
    height: 60,
  };

  currentPage.drawRectangle({
    x: warningBox.x,
    y: warningBox.y,
    width: warningBox.width,
    height: warningBox.height,
    borderColor: rgb(0.8, 0, 0),
    borderWidth: 2,
    color: rgb(1, 0.95, 0.95),
  });

  currentPage.drawText("AVISO IMPORTANTE", {
    x: warningBox.x + 10,
    y: warningBox.y + 45,
    size: fontSize,
    font: boldFont,
    color: rgb(0.8, 0, 0),
  });

  const warningText =
    "NÃO SERÁ ACEITE A TROCA DE PEÇAS POR EQUÍVOCO OU ENGANO DE QUEM SOLICITOU.";
  const warningLines = wrapText(
    warningText,
    warningBox.width - 20,
    font,
    fontSize
  );

  let warningY = warningBox.y + 25;
  warningLines.forEach((line) => {
    currentPage.drawText(line, {
      x: warningBox.x + 10,
      y: warningY,
      size: fontSize,
      font: font,
      color: rgb(0.6, 0, 0),
    });
    warningY -= 12;
  });

  currentPage.drawText(
    "Todas as peças devem ser verificadas antes da confirmação do pedido.",
    {
      x: warningBox.x + 10,
      y: warningBox.y + 8,
      size: smallFontSize,
      font: font,
      color: rgb(0.6, 0, 0),
    }
  );

  yPos -= 80;

  // Assinaturas
  yPos -= 30;
  checkPageSpace(100);

  currentPage.drawText("ASSINATURAS:", {
    x: margin,
    y: yPos,
    size: fontSize,
    font: boldFont,
  });

  const lineWidth = 150;
  const gap = 50;
  const clienteX = (pageWidth - 2 * lineWidth - gap) / 2;
  const elaboradoX = clienteX + lineWidth + gap;

  yPos -= 40;

  // Linhas de assinatura
  currentPage.drawLine({
    start: { x: clienteX, y: yPos },
    end: { x: clienteX + lineWidth, y: yPos },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  currentPage.drawLine({
    start: { x: elaboradoX, y: yPos },
    end: { x: elaboradoX + lineWidth, y: yPos },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Labels das assinaturas
  yPos -= 15;
  currentPage.drawText("(Cliente)", {
    x: clienteX + lineWidth / 2 - fontSize * 2,
    y: yPos,
    size: fontSize,
    font: font,
  });

  currentPage.drawText("(Elaborado por)", {
    x: elaboradoX + lineWidth / 2 - fontSize * 3,
    y: yPos,
    size: fontSize,
    font: font,
  });

  // Data
  yPos -= 30;
  currentPage.drawText("Data: ___/___/______", {
    x:
      (pageWidth - font.widthOfTextAtSize("Data: ___/___/______", fontSize)) /
      2,
    y: yPos,
    size: fontSize,
    font: font,
  });

  // Rodapé
  const footerY = 40;
  const footerText =
    "NONATO - Assistência Técnica - Tel: 911115479 - Email: service.nonato@gmail.com";
  const footerWidth = font.widthOfTextAtSize(footerText, smallFontSize);

  currentPage.drawText(footerText, {
    x: (pageWidth - footerWidth) / 2,
    y: footerY,
    size: smallFontSize,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });

  currentPage.drawLine({
    start: { x: margin, y: footerY + 15 },
    end: { x: pageWidth - margin, y: footerY + 15 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });

  // Numeração de páginas
  if (pdfDoc.getPageCount() > 1) {
    const pages = pdfDoc.getPages();
    pages.forEach((page, index) => {
      page.drawText(`Página ${index + 1} de ${pages.length}`, {
        x: pageWidth - 100,
        y: 25,
        size: smallFontSize,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
    });
  }

  // Salvar PDF
  const pdfBytes = await pdfDoc.save();
  return {
    blob: new Blob([pdfBytes], { type: "application/pdf" }),
    fileName: fileName,
  };
};

export default generateQuotePDF;
