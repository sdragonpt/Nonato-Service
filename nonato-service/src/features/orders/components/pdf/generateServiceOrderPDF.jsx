import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../firebase.jsx";

const generateServiceOrderPDF = async (
  orderIdForPDF,
  order,
  client,
  equipment,
  workdays,
  fileName
) => {
  const pdfDoc = await PDFDocument.create();
  let currentPage = null;

  // Configurações gerais
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const fontSize = 10;
  const tableFontSize = 8;
  const smallFontSize = 8;
  const headerSize = 12;
  const titleSize = 16;
  const margin = 50;
  let yPos = 0;
  const minBottomMargin = 70;

  // 🎨 CORES SIMPLES E FUNCIONAIS
  const colors = {
    primary: rgb(0.0667, 0.4902, 0.2863), // Verde da marca
    lightGray: rgb(0.95, 0.95, 0.95),
    mediumGray: rgb(0.9, 0.9, 0.9),
    darkGray: rgb(0.7, 0.7, 0.7),
    white: rgb(1, 1, 1),
    black: rgb(0, 0, 0),
  };

  // ✅ FUNÇÃO AUXILIAR PARA DESENHAR RETÂNGULOS
  const drawRect = (
    x,
    y,
    width,
    height,
    color = colors.lightGray,
    borderColor = colors.black,
    borderWidth = 1
  ) => {
    currentPage.drawRectangle({
      x,
      y,
      width,
      height,
      color,
      borderColor,
      borderWidth,
    });
  };

  // ✅ FUNÇÃO AUXILIAR PARA ESCREVER TEXTO
  const writeText = (text, options = {}) => {
    const {
      x = margin,
      y: yPos = yPos,
      size = fontSize,
      useFont = font,
      color = colors.black,
      align = "left",
      width = pageWidth - 2 * margin,
    } = options;

    let xPos = x;
    const actualText = String(text || "");
    const textWidth = useFont.widthOfTextAtSize(actualText, size);

    if (align === "right") {
      xPos = x + width - textWidth;
    } else if (align === "center") {
      xPos = x + (width - textWidth) / 2;
    }

    currentPage.drawText(actualText, {
      x: xPos,
      y: yPos,
      size,
      font: useFont,
      color,
    });
  };

  // ✅ FUNÇÃO PARA QUEBRAR TEXTO LONGO
  const wrapText = (text, maxWidth, font, fontSize) => {
    if (!text) return [""];

    const words = String(text).split(" ");
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
          const avgCharWidth = font.widthOfTextAtSize("A", fontSize);
          const maxChars = Math.floor(maxWidth / avgCharWidth) - 3;
          lines.push(word.substring(0, Math.max(0, maxChars)) + "...");
          currentLine = "";
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [""];
  };

  // ✅ FUNÇÃO PARA VERIFICAR ESPAÇO E CRIAR NOVA PÁGINA
  const checkAndCreateNewPage = (requiredSpace) => {
    if (yPos - requiredSpace < minBottomMargin) {
      createNewPage();
      return true;
    }
    return false;
  };

  // ✅ FUNÇÃO PARA BUSCAR DADOS COMPLETOS DAS PEÇAS
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

  // ✅ ENRIQUECER PEÇAS COM DADOS COMPLETOS
  const enrichPartsWithData = async (parts) => {
    if (!parts || parts.length === 0) return [];

    const enrichedParts = [];

    for (const part of parts) {
      if (part.id) {
        const completePartData = await fetchCompletePartData(part.id);

        if (completePartData) {
          const enrichedPart = {
            ...completePartData,
            ...part,
            name: completePartData.name || part.name,
            code: completePartData.code || part.code,
          };
          enrichedParts.push(enrichedPart);
        } else {
          enrichedParts.push(part);
        }
      } else {
        enrichedParts.push(part);
      }
    }

    return enrichedParts;
  };

  // ✅ FUNÇÃO PARA BUSCAR IMAGEM DA BIBLIOTECA
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

  // ✅ FUNÇÃO PARA CARREGAR IMAGEM (BASE64 OU URL)
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

  const formatPrice = (price) => {
    return `${parseFloat(price).toFixed(2)} €`;
  };

  // Carregar fontes
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Carregar a imagem do topo
  const topImageBytes = await fetch("/nonato2.png").then((res) =>
    res.arrayBuffer()
  );
  const topImage = await pdfDoc.embedPng(topImageBytes);

  const response = await fetch("/nonato2.png");
  const arrayBuffer = await response.arrayBuffer();
  const image = await pdfDoc.embedPng(arrayBuffer);

  // Função para criar nova página
  const createNewPage = () => {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    yPos = pageHeight - margin;

    const imgWidth = 100;
    const imgHeight = (imgWidth * image.height) / image.width;

    currentPage.drawImage(topImage, {
      x: margin,
      y: currentPage.getHeight() - margin - 100,
      width: imgWidth,
      height: imgHeight,
    });

    return currentPage;
  };

  // Funções auxiliares
  const safeText = (text, defaultValue = "N/A") => String(text ?? defaultValue);
  const formatDate = (date) => {
    const options = { year: "2-digit", month: "2-digit", day: "2-digit" };
    return new Date(date).toLocaleDateString("pt-BR", options);
  };

  // Criar primeira página
  createNewPage();

  // FUNÇÃO PARA DESENHAR CABEÇALHO DA PÁGINA
  const drawPageHeader = () => {
    // Título principal
    currentPage.drawText("RELATÓRIO DE SERVIÇO", {
      x: 180,
      y: pageHeight - 50,
      size: titleSize,
      color: colors.black,
      font: boldFont,
    });

    // Subtítulo
    currentPage.drawText("ASSISTÊNCIA TÉCNICA", {
      x: 200,
      y: pageHeight - 70,
      size: 12,
      color: colors.primary,
      font: font,
    });

    // ✅ NÚMERO DO SERVIÇO MELHOR CENTRALIZADO
    const serviceNumberText = `Nº: ${orderIdForPDF}`;
    const boxWidth = 80;
    const boxHeight = 20;
    const boxX = 440;
    const boxY = pageHeight - 60;

    // Retângulo ao redor do número
    currentPage.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
      borderColor: colors.black,
      borderWidth: 1,
    });

    // Texto centralizado na caixa
    const textWidth = boldFont.widthOfTextAtSize(serviceNumberText, headerSize);
    currentPage.drawText(serviceNumberText, {
      x: boxX + (boxWidth - textWidth) / 2,
      y: boxY + (boxHeight - headerSize) / 2 + 2,
      size: headerSize,
      font: boldFont,
      color: colors.black,
    });

    // Informações de contato no rodapé
    currentPage.drawText(
      "Tel (SERVIÇO): 911115479 - EMAIL: service.nonato@gmail.com",
      {
        x:
          (pageWidth -
            font.widthOfTextAtSize(
              "Tel (SERVIÇO): 911115479 - EMAIL: service.nonato@gmail.com",
              8
            )) /
          2,
        y: 30,
        size: 8,
        font: font,
        color: colors.darkGray,
      }
    );

    // Linha decorativa
    currentPage.drawLine({
      start: { x: margin, y: 45 },
      end: { x: pageWidth - margin, y: 45 },
      thickness: 0.5,
      color: colors.darkGray,
    });

    yPos = pageHeight - 130; // ✅ MAIS ESPAÇO APÓS O CABEÇALHO
  };

  // Adiciona número de página em todas as páginas
  const addPageNumbers = () => {
    const totalPages = pdfDoc.getPageCount();

    for (let i = 0; i < totalPages; i++) {
      const page = pdfDoc.getPage(i);

      page.drawText(`Página ${i + 1} / ${totalPages}`, {
        x: page.getWidth() - margin - 60,
        y: 20,
        size: 8,
        font: font,
        color: colors.darkGray,
      });
    }
  };

  // Desenhar cabeçalho na primeira página
  drawPageHeader();

  // FUNÇÃO PARA DESENHAR INFORMAÇÕES BÁSICAS
  const drawBasicInfo = () => {
    yPos -= 40; // ✅ MAIS ESPAÇO APÓS A IMAGEM

    // Título da seção
    drawRect(margin, yPos - 25, pageWidth - 2 * margin, 25, colors.lightGray);

    currentPage.drawText("DADOS DO CLIENTE E EQUIPAMENTO", {
      x: margin + 10,
      y: yPos - 18,
      size: fontSize + 1,
      font: boldFont,
      color: colors.black,
    });

    yPos -= 40; // ✅ MAIS ESPAÇO APÓS O TÍTULO

    // COLUNA ESQUERDA - DADOS DO CLIENTE
    let leftYPos = yPos;
    const leftColumnX = margin;
    const rightColumnX = margin + 250;

    // ✅ REMOVIDO O CABEÇALHO "CLIENTE:"

    const leftColumn = [
      { label: "Técnico", value: "Nonato" },
      { label: "Cliente", value: safeText(client.name) },
      { label: "Cidade", value: safeText(client.address) },
      { label: "Telefone", value: safeText(client.phone) },
    ];

    leftColumn.forEach((item, index) => {
      const maxWidth = 220; // ✅ LARGURA MÁXIMA PARA O TEXTO
      const lines = wrapText(
        `${item.label}: ${item.value}`,
        maxWidth - 20,
        font,
        fontSize
      );
      const lineHeight = fontSize + 3;
      const boxHeight = Math.max(lines.length * lineHeight + 10, 30); // ✅ ALTURA MÍNIMA MAIOR

      const bgColor = index % 2 === 0 ? colors.white : colors.mediumGray;
      drawRect(
        leftColumnX,
        leftYPos - boxHeight,
        240,
        boxHeight,
        bgColor,
        colors.black,
        1
      ); // ✅ BORDA MAIS FINA

      lines.forEach((line, lineIndex) => {
        if (line.trim()) {
          currentPage.drawText(line.trim(), {
            x: leftColumnX + 8,
            y: leftYPos - lineIndex * lineHeight - 18, // ✅ MELHOR POSICIONAMENTO VERTICAL
            size: fontSize,
            font: font,
            color: colors.black,
          });
        }
      });

      leftYPos -= boxHeight + 8; // ✅ MAIS ESPAÇO ENTRE CAIXAS
    });

    // COLUNA DIREITA - DADOS DO EQUIPAMENTO
    let rightYPos = yPos;

    // ✅ REMOVIDO O CABEÇALHO "EQUIPAMENTO:"

    const rightColumn = [
      { label: "Data", value: safeText(order.date) },
      {
        label: "Máquina/Modelo",
        value: `${safeText(equipment.brand)} ${safeText(equipment.model)}`,
      },
      { label: "Número da Máquina", value: safeText(equipment.serialNumber) },
      { label: "Tipo de Serviço", value: safeText(order.serviceType) },
    ];

    rightColumn.forEach((item, index) => {
      const maxWidth = 220; // ✅ LARGURA MÁXIMA PARA O TEXTO
      const lines = wrapText(
        `${item.label}: ${item.value}`,
        maxWidth - 20,
        font,
        fontSize
      );
      const lineHeight = fontSize + 3;
      const boxHeight = Math.max(lines.length * lineHeight + 10, 30); // ✅ ALTURA MÍNIMA MAIOR

      const bgColor = index % 2 === 0 ? colors.white : colors.mediumGray;
      drawRect(
        rightColumnX,
        rightYPos - boxHeight,
        240,
        boxHeight,
        bgColor,
        colors.black,
        1
      ); // ✅ BORDA MAIS FINA

      lines.forEach((line, lineIndex) => {
        if (line.trim()) {
          currentPage.drawText(line.trim(), {
            x: rightColumnX + 8,
            y: rightYPos - lineIndex * lineHeight - 18, // ✅ MELHOR POSICIONAMENTO VERTICAL
            size: fontSize,
            font: font,
          });
        }
      });

      rightYPos -= boxHeight + 8; // ✅ MAIS ESPAÇO ENTRE CAIXAS
    });

    const lowestY = Math.min(leftYPos, rightYPos);
    return lowestY - 30; // ✅ MAIS ESPAÇO NO FINAL
  };

  // FUNÇÃO PARA DESENHAR CABEÇALHO DA TABELA
  const drawTableHeader = () => {
    yPos -= 30;

    // Título da seção de horas
    drawRect(margin, yPos - 25, pageWidth - 2 * margin, 25, colors.lightGray);

    currentPage.drawText("CONTROLE DE HORAS E DESLOCAMENTOS", {
      x: margin + 10,
      y: yPos - 18,
      size: fontSize + 1,
      font: boldFont,
      color: colors.black,
    });

    yPos -= 40; // ✅ MAIS ESPAÇO APÓS O TÍTULO

    const headers = ["DATA", "IDA", "HORAS", "RETORNO", "KM", "PAUSA"];
    const headerWidths = [44, 105, 101, 105, 101, 40];

    let xPos = 50;
    headers.forEach((header, index) => {
      drawRect(
        xPos,
        yPos - 25,
        headerWidths[index],
        25,
        colors.mediumGray,
        colors.black,
        1
      );

      const textWidth = boldFont.widthOfTextAtSize(header, tableFontSize + 1);
      currentPage.drawText(header, {
        x: xPos + (headerWidths[index] - textWidth) / 2,
        y: yPos - 15,
        size: tableFontSize + 1,
        font: boldFont,
        color: colors.black,
      });

      xPos += headerWidths[index];
    });

    return yPos - 25;
  };

  // FUNÇÃO PARA DESENHAR LINHA DA TABELA
  const drawTableRow = (workday, index) => {
    const cellHeight = 22;
    const columnWidths = [
      44, 40, 40, 25, 38, 38, 25, 40, 40, 25, 38, 38, 25, 40,
    ];

    const hoursIda = calculateHours(workday.departureTime, workday.arrivalTime);
    const hoursRetorno = calculateHours(
      workday.returnDepartureTime,
      workday.returnArrivalTime
    );
    const hoursWork = calculateHoursWithPause(
      workday.startHour,
      workday.endHour,
      workday.pauseHours
    );
    const kmTotal = Number(workday.kmDeparture) + Number(workday.kmReturn);

    const rowData = [
      formatDate(workday.workDate),
      workday.departureTime,
      workday.arrivalTime,
      hoursIda,
      workday.startHour,
      workday.endHour,
      hoursWork,
      workday.returnDepartureTime,
      workday.returnArrivalTime,
      hoursRetorno,
      workday.kmDeparture,
      workday.kmReturn,
      kmTotal.toString(),
      workday.pauseHours,
    ];

    let xPos = 50;
    const rowBgColor = index % 2 === 0 ? colors.white : colors.lightGray;

    rowData.forEach((data, colIndex) => {
      // Destaque para colunas calculadas
      let bgColor = rowBgColor;

      if (
        colIndex === 3 ||
        colIndex === 6 ||
        colIndex === 9 ||
        colIndex === 12
      ) {
        bgColor = colors.mediumGray;
      }

      drawRect(
        xPos,
        yPos - cellHeight,
        columnWidths[colIndex],
        cellHeight,
        bgColor,
        colors.darkGray,
        0.5
      );

      const textWidth = font.widthOfTextAtSize(safeText(data), tableFontSize);
      currentPage.drawText(safeText(data), {
        x: xPos + (columnWidths[colIndex] - textWidth) / 2,
        y: yPos - cellHeight + 8,
        size: tableFontSize,
        font: font,
        color: colors.black,
      });

      xPos += columnWidths[colIndex];
    });

    return yPos - cellHeight;
  };

  // FUNÇÃO PARA DESENHAR DESCRIÇÕES
  const drawDescriptions = () => {
    const hasValidDescriptions = workdays.some((day) => {
      const description = safeText(day.description);
      return (
        description.trim() !== "" && description.trim().toUpperCase() !== "N/A"
      );
    });

    if (!hasValidDescriptions) return yPos;

    yPos -= 30;
    if (checkAndCreateNewPage(50)) {
      drawPageHeader();
      yPos -= 40; // ✅ MAIS ESPAÇO APÓS A IMAGEM EM NOVA PÁGINA
    }

    // Título da seção
    drawRect(margin, yPos - 25, pageWidth - 2 * margin, 25, colors.lightGray);

    currentPage.drawText("DESCRIÇÃO DO TRABALHO REALIZADO", {
      x: margin + 10,
      y: yPos - 18,
      size: fontSize + 1,
      font: boldFont,
      color: colors.black,
    });

    yPos -= 40; // ✅ MAIS ESPAÇO APÓS O TÍTULO

    const sortedWorkdays = [...workdays].sort(
      (a, b) => a.workDate - b.workDate
    );

    sortedWorkdays.forEach((day) => {
      const description = sanitizeText(safeText(day.description));
      if (
        description.trim() !== "" &&
        description.trim().toUpperCase() !== "N/A"
      ) {
        const maxWidth = 370; // ✅ LARGURA REDUZIDA PARA NÃO ULTRAPASSAR
        const lines = wrapText(description, maxWidth, font, 9);
        const lineHeight = 12;
        const boxHeight = Math.max(lines.length * lineHeight + 20, 50); // ✅ ALTURA MÍNIMA MAIOR

        if (checkAndCreateNewPage(boxHeight + 60)) {
          drawPageHeader();
          yPos -= 40; // ✅ MAIS ESPAÇO APÓS A IMAGEM EM NOVA PÁGINA
          // Redesenhar título
          drawRect(
            margin,
            yPos - 25,
            pageWidth - 2 * margin,
            25,
            colors.lightGray
          );
          currentPage.drawText("DESCRIÇÃO DO TRABALHO REALIZADO", {
            x: margin + 10,
            y: yPos - 18,
            size: fontSize + 1,
            font: boldFont,
            color: colors.black,
          });
          yPos -= 40;
        }

        yPos -= 20;

        // ✅ CAIXA DA DATA COM POSICIONAMENTO MELHORADO
        drawRect(50, yPos - 25, 120, 25, colors.mediumGray, colors.black, 1);
        currentPage.drawText(`${formatDate(day.workDate)}`, {
          x: 55,
          y: yPos - 15,
          size: fontSize,
          font: boldFont,
          color: colors.black,
        });

        yPos -= 35; // ✅ ESPAÇO ENTRE DATA E CAIXA DE TEXTO
        const boxTopY = yPos;

        // ✅ CAIXA DE TEXTO COM DIMENSÕES CORRIGIDAS
        const textBoxWidth = 395;
        drawRect(
          150,
          boxTopY - boxHeight,
          textBoxWidth,
          boxHeight,
          colors.white,
          colors.black,
          1
        );
        drawRect(
          50,
          boxTopY - boxHeight,
          textBoxWidth + 100,
          boxHeight,
          colors.white,
          colors.black,
          1
        ); // ✅ BORDA FINA

        lines.forEach((line, index) => {
          if (line.trim()) {
            currentPage.drawText(line.trim(), {
              x: 160,
              y: boxTopY - index * lineHeight - 25, // ✅ POSICIONAMENTO VERTICAL CORRIGIDO
              size: 9,
              font: font,
              color: colors.black,
            });
          }
        });

        yPos -= boxHeight + 25; // ✅ MAIS ESPAÇO ENTRE DESCRIÇÕES
      }
    });

    return yPos;
  };

  // FUNÇÃO PARA DESENHAR ORÇAMENTO DE PEÇAS
  const drawPartsQuote = async () => {
    if (!order.checklist?.pecas || !order.partsQuoteItems?.length) {
      return yPos;
    }

    if (checkAndCreateNewPage(200)) {
      drawPageHeader();
      yPos -= 40; // ✅ MAIS ESPAÇO APÓS A IMAGEM EM NOVA PÁGINA
    }

    yPos -= 30;

    // Título da seção
    drawRect(margin, yPos - 25, pageWidth - 2 * margin, 25, colors.lightGray);

    currentPage.drawText("ORÇAMENTO DE PEÇAS SOLICITADAS", {
      x: margin + 10,
      y: yPos - 18,
      size: fontSize + 1,
      font: boldFont,
      color: colors.black,
    });

    yPos -= 40;

    const enrichedParts = await enrichPartsWithData(order.partsQuoteItems);

    const tableHeaders = ["Imagem", "Descrição do Item", "Código", "Qtd"];
    const columnWidths = [60, 275, 105, 55];
    let xPos = margin;

    // Cabeçalho da tabela
    tableHeaders.forEach((header, index) => {
      drawRect(
        xPos,
        yPos - 25,
        columnWidths[index],
        25,
        colors.mediumGray,
        colors.black,
        1
      );

      const textWidth = boldFont.widthOfTextAtSize(header, fontSize);
      currentPage.drawText(header, {
        x: xPos + (columnWidths[index] - textWidth) / 2,
        y: yPos - 15,
        size: fontSize,
        font: boldFont,
        color: colors.black,
      });

      xPos += columnWidths[index];
    });

    yPos -= 25;

    for (let idx = 0; idx < enrichedParts.length; idx++) {
      const part = enrichedParts[idx];

      const nameLines = wrapText(
        part.name || "Nome não disponível",
        columnWidths[1] - 15,
        font,
        fontSize
      );
      const maxLines = Math.min(nameLines.length, 3);
      const actualItemHeight = Math.max(45, maxLines * 12 + 15);

      if (checkAndCreateNewPage(actualItemHeight + 10)) {
        drawPageHeader();
        yPos -= 40; // ✅ MAIS ESPAÇO APÓS A IMAGEM EM NOVA PÁGINA
        // Redesenhar cabeçalho
        xPos = margin;
        tableHeaders.forEach((header, index) => {
          drawRect(
            xPos,
            yPos - 25,
            columnWidths[index],
            25,
            colors.mediumGray,
            colors.black,
            1
          );

          const textWidth = boldFont.widthOfTextAtSize(header, fontSize);
          currentPage.drawText(header, {
            x: xPos + (columnWidths[index] - textWidth) / 2,
            y: yPos - 15,
            size: fontSize,
            font: boldFont,
            color: colors.black,
          });

          xPos += columnWidths[index];
        });
        yPos -= 25;
      }

      const bgColor = idx % 2 === 0 ? colors.white : colors.lightGray;
      xPos = margin;

      // Coluna Imagem
      drawRect(
        xPos,
        yPos - actualItemHeight,
        columnWidths[0],
        actualItemHeight,
        bgColor,
        colors.darkGray,
        1
      );

      try {
        let imageData = null;

        if (part.imageHash) {
          const libraryImageData = await loadImageFromLibrary(part.imageHash);
          if (libraryImageData) {
            imageData = await loadImageData(libraryImageData);
          }
        } else if (part.image) {
          imageData = await loadImageData(part.image);
        }

        if (imageData) {
          const partImage = imageData.isJpeg
            ? await pdfDoc.embedJpg(imageData.data)
            : await pdfDoc.embedPng(imageData.data);

          const maxImgWidth = columnWidths[0] - 8;
          const maxImgHeight = actualItemHeight - 8;

          let imgWidth = maxImgWidth;
          let imgHeight = (imgWidth * partImage.height) / partImage.width;

          if (imgHeight > maxImgHeight) {
            imgHeight = maxImgHeight;
            imgWidth = (imgHeight * partImage.width) / partImage.height;
          }

          currentPage.drawImage(partImage, {
            x: xPos + (columnWidths[0] - imgWidth) / 2,
            y: yPos - actualItemHeight + (actualItemHeight - imgHeight) / 2,
            width: imgWidth,
            height: imgHeight,
          });
        } else {
          currentPage.drawText("N/A", {
            x: xPos + columnWidths[0] / 2 - 8,
            y: yPos - actualItemHeight / 2 - 4,
            size: smallFontSize,
            font: font,
            color: colors.darkGray,
          });
        }
      } catch (error) {
        console.error("Erro ao processar imagem:", error);
      }

      xPos += columnWidths[0];

      // Coluna Nome
      drawRect(
        xPos,
        yPos - actualItemHeight,
        columnWidths[1],
        actualItemHeight,
        bgColor,
        colors.darkGray,
        1
      );

      nameLines.slice(0, maxLines).forEach((line, lineIndex) => {
        currentPage.drawText(line, {
          x: xPos + 5,
          y: yPos - 15 - lineIndex * 12,
          size: fontSize,
          font: font,
        });
      });

      xPos += columnWidths[1];

      // Coluna Código
      drawRect(
        xPos,
        yPos - actualItemHeight,
        columnWidths[2],
        actualItemHeight,
        bgColor,
        colors.darkGray,
        1
      );

      const codeText = part.code || "N/A";
      const codeTextWidth = font.widthOfTextAtSize(codeText, fontSize);

      currentPage.drawText(codeText, {
        x: xPos + (columnWidths[2] - codeTextWidth) / 2,
        y: yPos - actualItemHeight / 2 - 4,
        size: fontSize,
        font: font,
      });

      xPos += columnWidths[2];

      // Coluna Quantidade
      drawRect(
        xPos,
        yPos - actualItemHeight,
        columnWidths[3],
        actualItemHeight,
        colors.mediumGray,
        colors.darkGray,
        1
      );

      const qtyText = part.quantity.toString();
      const qtyTextWidth = boldFont.widthOfTextAtSize(qtyText, fontSize + 1);

      currentPage.drawText(qtyText, {
        x: xPos + (columnWidths[3] - qtyTextWidth) / 2,
        y: yPos - actualItemHeight / 2 - 4,
        size: fontSize + 1,
        font: boldFont,
        color: colors.black,
      });

      yPos -= actualItemHeight;
    }

    yPos -= 20;
    return yPos;
  };

  // FUNÇÃO PARA DESENHAR CHECKBOX
  const drawCheckbox = (x, y, checked, label) => {
    if (checked) {
      // Caixa preenchida quando marcado
      drawRect(x, y, 14, 14, colors.black, colors.black, 2);

      // X branco dentro da caixa preenchida
      currentPage.drawText("X", {
        x: x + 4,
        y: y + 3,
        size: fontSize - 1,
        font: boldFont,
        color: colors.white,
      });
    } else {
      // Caixa vazia quando não marcado
      drawRect(x, y, 14, 14, colors.white, colors.black, 2);
    }

    currentPage.drawText(label, {
      x: x + 22,
      y: y + 3,
      size: fontSize,
      font: font,
    });
  };

  const calculateTotalWorkHours = (workdays) => {
    let totalMinutes = 0;
    workdays.forEach((day) => {
      if (day.startHour && day.endHour) {
        const workHours = calculateHoursWithPause(
          day.startHour,
          day.endHour,
          day.pauseHours || "0:00"
        );
        const [hours, minutes] = workHours.split(":").map(Number);
        totalMinutes += hours * 60 + minutes;
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  const calculateTotalKm = (workdays) => {
    return workdays
      .reduce((total, day) => {
        const departure = parseFloat(day.kmDeparture) || 0;
        const returnKm = parseFloat(day.kmReturn) || 0;
        return total + departure + returnKm;
      }, 0)
      .toFixed(2);
  };

  const calculateTotalTravelHours = (workdays) => {
    let totalMinutes = 0;
    workdays.forEach((day) => {
      if (day.departureTime && day.arrivalTime) {
        const goingHours = calculateHours(day.departureTime, day.arrivalTime);
        if (goingHours !== "0") {
          const [goingH, goingM] = goingHours.split(":").map(Number);
          totalMinutes += goingH * 60 + goingM;
        }
      }

      if (day.returnDepartureTime && day.returnArrivalTime) {
        const returnHours = calculateHours(
          day.returnDepartureTime,
          day.returnArrivalTime
        );
        if (returnHours !== "0") {
          const [returnH, returnM] = returnHours.split(":").map(Number);
          totalMinutes += returnH * 60 + returnM;
        }
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  const sanitizeText = (text) => {
    if (!text) return "";
    return text
      .replace(/\n/g, " ")
      .replace(/\r/g, " ")
      .replace(/\t/g, " ")
      .replace(/\s+/g, " ")
      .replace(/[^\x20-\x7E]/g, "")
      .trim();
  };

  // ✅ FUNÇÃO CORRIGIDA PARA DESENHAR CAIXA DE TEXTO AJUSTÁVEL
  const drawAdjustableTextBox = (page, label, text, x, y, options = {}) => {
    const {
      fontSize = 10,
      boxWidth = 396,
      labelWidth = 120, // ✅ LARGURA MAIOR PARA O LABEL
      font,
      minHeight = 30,
      padding = 10,
      labelOffset = 15, // ✅ OFFSET MAIOR PARA MELHOR VISIBILIDADE
    } = options;

    // ✅ LABEL COM POSICIONAMENTO MELHORADO
    currentPage.drawText(label, {
      x: x + 5,
      y: y - labelOffset, // ✅ POSICIONAMENTO AJUSTADO
      size: fontSize + 1, // ✅ FONTE LIGEIRAMENTE MAIOR
      font: boldFont,
      color: colors.black, // ✅ COR PRETA PARA MELHOR VISIBILIDADE
    });

    const maxWidth = boxWidth - padding * 2;
    const lines = wrapText(
      sanitizeText(safeText(text)),
      maxWidth,
      font,
      fontSize - 1
    );
    const lineHeight = fontSize + 2;
    const boxHeight = Math.max(
      minHeight,
      lines.length * lineHeight + padding * 2
    );

    // ✅ POSICIONAMENTO CORRIGIDO DAS CAIXAS
    const boxY = y - labelOffset - 10; // ✅ ESPAÇO ADEQUADO APÓS O LABEL

    // Caixa de fundo
    drawRect(
      x + labelWidth,
      boxY - boxHeight,
      boxWidth,
      boxHeight,
      colors.white,
      colors.black,
      1
    );

    // Caixa exterior
    drawRect(
      x,
      boxY - boxHeight,
      boxWidth + labelWidth,
      boxHeight,
      colors.white,
      colors.black,
      1 // ✅ BORDA MAIS FINA
    );

    lines.forEach((line, index) => {
      if (line.trim()) {
        page.drawText(line.trim(), {
          x: x + labelWidth + padding,
          y: boxY - index * lineHeight - padding - 8, // ✅ POSICIONAMENTO AJUSTADO
          size: fontSize - 1,
          font: font,
        });
      }
    });

    return boxY - boxHeight - 20; // ✅ MAIS ESPAÇO APÓS A CAIXA
  };

  // FUNÇÃO PARA DESENHAR RESULTADOS
  const drawResults = () => {
    if (checkAndCreateNewPage(350)) {
      drawPageHeader();
      yPos -= 40; // ✅ MAIS ESPAÇO APÓS A IMAGEM EM NOVA PÁGINA
    }

    yPos -= 40; // ✅ MAIS ESPAÇO ANTES DA SEÇÃO

    // Título da seção de totais
    drawRect(margin, yPos - 25, pageWidth - 2 * margin, 25, colors.lightGray);

    currentPage.drawText("RESUMO DE HORAS E DESLOCAMENTOS", {
      x: margin + 10,
      y: yPos - 18,
      size: fontSize + 1,
      font: boldFont,
      color: colors.black,
    });

    yPos -= 45;

    // Totais em três colunas
    const totalData = [
      {
        label: "Horas de Trabalho",
        value: calculateTotalWorkHours(workdays) + "h",
      },
      { label: "Km's Percorridos", value: calculateTotalKm(workdays) + " km" },
      {
        label: "Horas de Viagem",
        value: calculateTotalTravelHours(workdays) + "h",
      },
    ];

    const boxWidth = 150;
    const boxHeight = 50;
    const spacing = 20;
    let startX =
      (pageWidth -
        (totalData.length * boxWidth + (totalData.length - 1) * spacing)) /
      2;

    totalData.forEach((item) => {
      drawRect(
        startX,
        yPos - boxHeight,
        boxWidth,
        boxHeight,
        colors.mediumGray
      );

      currentPage.drawText(item.label, {
        x: startX + 10,
        y: yPos - 20,
        size: fontSize - 1,
        font: font,
        color: colors.black,
      });

      currentPage.drawText(item.value, {
        x: startX + 10,
        y: yPos - 35,
        size: fontSize + 2,
        font: boldFont,
        color: colors.black,
      });

      startX += boxWidth + spacing;
    });

    yPos -= 80; // ✅ MAIS ESPAÇO APÓS OS TOTAIS

    // Título da seção de resultados
    drawRect(margin, yPos - 25, pageWidth - 2 * margin, 25, colors.lightGray);

    currentPage.drawText("RESULTADOS DO TRABALHO", {
      x: margin + 10,
      y: yPos - 18,
      size: fontSize + 1,
      font: boldFont,
      color: colors.black,
    });

    yPos -= 45;

    // Checkboxes organizados em grid
    const checkboxes = [
      { key: "concluido", label: "Serviço Concluído" },
      { key: "producao", label: "Liberação para Produção" },
      { key: "retorno", label: "Retorno Necessário" },
      { key: "funcionarios", label: "Instrução dos Funcionários" },
      { key: "documentacao", label: "Entrega da Documentação" },
      { key: "pecas", label: "Envio do Orçamento de Peças" },
    ];

    const cols = 2;
    const colWidth = (pageWidth - 2 * margin) / cols;

    checkboxes.forEach((checkbox, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = margin + col * colWidth;
      const y = yPos - row * 25;

      drawCheckbox(x, y, order.checklist[checkbox.key], checkbox.label);
    });

    yPos -= Math.ceil(checkboxes.length / cols) * 25 + 30; // ✅ MAIS ESPAÇO APÓS CHECKBOXES

    if (checkAndCreateNewPage(180)) {
      drawPageHeader();
      yPos -= 40; // ✅ MAIS ESPAÇO APÓS A IMAGEM EM NOVA PÁGINA
    }

    // ✅ SEÇÕES DE TEXTO COM POSICIONAMENTO MELHORADO
    yPos = drawAdjustableTextBox(
      currentPage,
      "Observações:",
      order.resultDescription,
      50,
      yPos,
      {
        font,
        fontSize,
        boxWidth: 376,
        minHeight: 25, // ✅ ALTURA MÍNIMA MAIOR
        labelOffset: 15, // ✅ MAIS ESPAÇO PARA O LABEL
      }
    );

    if (checkAndCreateNewPage(120)) {
      drawPageHeader();
      yPos -= 40; // ✅ MAIS ESPAÇO APÓS A IMAGEM EM NOVA PÁGINA
    }

    yPos = drawAdjustableTextBox(
      currentPage,
      "Pontos em Aberto:",
      order.pontosEmAberto,
      50,
      yPos,
      {
        font,
        fontSize,
        boxWidth: 376,
        minHeight: 25, // ✅ ALTURA MÍNIMA MAIOR
        labelOffset: 15, // ✅ MAIS ESPAÇO PARA O LABEL
      }
    );

    return yPos;
  };

  // ✅ FUNÇÃO CORRIGIDA PARA DESENHAR ASSINATURAS
  const drawSignatures = () => {
    if (checkAndCreateNewPage(120)) {
      drawPageHeader();
      yPos -= 40; // ✅ MAIS ESPAÇO APÓS A IMAGEM EM NOVA PÁGINA
    }

    yPos -= 40; // ✅ MAIS ESPAÇO ANTES DA SEÇÃO

    // Título da seção
    drawRect(margin, yPos - 25, pageWidth - 2 * margin, 25, colors.lightGray);

    currentPage.drawText("ASSINATURAS", {
      x: margin + 10,
      y: yPos - 18,
      size: fontSize + 1,
      font: boldFont,
      color: colors.black,
    });

    yPos -= 60; // ✅ MAIS ESPAÇO APÓS O TÍTULO

    const lineWidth = 180;
    const gap = 60;
    const clienteX = (pageWidth - 2 * lineWidth - gap) / 2;
    const tecnicoX = clienteX + lineWidth + gap;

    // ✅ REMOVIDAS AS CAIXAS DE ASSINATURA

    // ✅ LINHAS DE ASSINATURA MAIS FINAS
    currentPage.drawLine({
      start: { x: clienteX, y: yPos },
      end: { x: clienteX + lineWidth, y: yPos },
      thickness: 1, // ✅ LINHA MAIS FINA
      color: colors.black,
    });

    currentPage.drawLine({
      start: { x: tecnicoX, y: yPos },
      end: { x: tecnicoX + lineWidth, y: yPos },
      thickness: 1, // ✅ LINHA MAIS FINA
      color: colors.black,
    });

    // ✅ LABELS DAS ASSINATURAS POSICIONADOS ABAIXO DAS LINHAS
    currentPage.drawText("CLIENTE", {
      x:
        clienteX +
        (lineWidth - boldFont.widthOfTextAtSize("CLIENTE", fontSize)) / 2,
      y: yPos - 20, // ✅ POSICIONADO ABAIXO DA LINHA
      size: fontSize,
      font: boldFont,
      color: colors.black,
    });

    currentPage.drawText("TÉCNICO", {
      x:
        tecnicoX +
        (lineWidth - boldFont.widthOfTextAtSize("TÉCNICO", fontSize)) / 2,
      y: yPos - 20, // ✅ POSICIONADO ABAIXO DA LINHA
      size: fontSize,
      font: boldFont,
      color: colors.black,
    });
  };

  // ✅ EXECUTAR TODAS AS SEÇÕES
  yPos = drawBasicInfo();

  if (checkAndCreateNewPage(150)) {
    drawPageHeader();
    yPos -= 20; // ✅ ESPAÇO ADICIONAL APÓS QUEBRA DE PÁGINA
  }

  yPos = drawTableHeader();

  const sortedWorkdays = [...workdays].sort((a, b) => a.workDate - b.workDate);

  sortedWorkdays.forEach((workday, index) => {
    if (checkAndCreateNewPage(40)) {
      drawPageHeader();
      yPos -= 20; // ✅ ESPAÇO ADICIONAL APÓS QUEBRA DE PÁGINA
      yPos = drawTableHeader();
    }
    yPos = drawTableRow(workday, index);
  });

  yPos = drawDescriptions();
  yPos = drawResults();
  yPos = await drawPartsQuote();
  drawSignatures();
  addPageNumbers();

  const pdfBytes = await pdfDoc.save();
  return { blob: new Blob([pdfBytes], { type: "application/pdf" }), fileName };
};

// Funções auxiliares de cálculo
function calculateHours(start, end) {
  if (!start || !end) return "0";
  const startTime = new Date(`1970-01-01T${start}:00`);
  let endTime = new Date(`1970-01-01T${end}:00`);
  if (endTime < startTime) endTime.setDate(endTime.getDate() + 1);
  const diff = (endTime - startTime) / 1000 / 3600;
  const hours = Math.floor(diff);
  const minutes = Math.round((diff - hours) * 60);
  return diff >= 0 ? `${hours}:${minutes.toString().padStart(2, "0")}` : "0";
}

function calculateHoursWithPause(start, end, pauseHours) {
  if (!start || !end) return "0";
  const startTime = new Date(`1970-01-01T${start}:00`);
  let endTime = new Date(`1970-01-01T${end}:00`);
  if (endTime < startTime) endTime.setDate(endTime.getDate() + 1);
  let diff = (endTime - startTime) / 1000 / 3600;
  const [hours, minutes] = (pauseHours || "0:00").split(":").map(Number);
  diff -= hours + minutes / 60;
  const resultHours = Math.floor(diff);
  const resultMinutes = Math.round((diff - resultHours) * 60);
  return diff >= 0
    ? `${resultHours}:${resultMinutes.toString().padStart(2, "0")}`
    : "0";
}

export default generateServiceOrderPDF;
