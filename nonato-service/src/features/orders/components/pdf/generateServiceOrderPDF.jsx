import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

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
  const margin = 50;
  let yPos = 0;
  const minBottomMargin = 50;

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

    // Calcular dimensões da imagem mantendo proporção
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

  // Função para verificar espaço e criar nova página se necessário
  const checkAndCreateNewPage = (requiredSpace) => {
    if (yPos - requiredSpace < minBottomMargin) {
      createNewPage();
      return true;
    }
    return false;
  };

  // Funções auxiliares
  const safeText = (text, defaultValue = "N/A") => String(text ?? defaultValue);
  const formatDate = (date) => {
    const options = { year: "2-digit", month: "2-digit", day: "2-digit" };
    return new Date(date).toLocaleDateString("pt-BR", options);
  };

  // Criar primeira página
  createNewPage();

  // Função para desenhar cabeçalho da página
  const drawPageHeader = () => {
    const topOffset = 50;

    // Título
    currentPage.drawText("Relatório de Serviço", {
      x: 170,
      y: pageHeight - 50,
      size: 16,
      color: rgb(0, 0, 0),
      font: boldFont,
    });

    // Número do serviço
    currentPage.drawText(`Nº: ${orderIdForPDF}`, {
      x: 508,
      y: pageHeight - 50,
      size: 12,
      font: boldFont,
    });

    // Retângulo ao redor do número
    currentPage.drawRectangle({
      x: 495,
      y: pageHeight - 53.5,
      width: 60,
      height: 16,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // Subtítulo
    currentPage.drawText("ASSISTÊNCIA TÉCNICA", {
      x: 170,
      y: pageHeight - 70,
      size: 12,
      color: rgb(0.0667, 0.4902, 0.2863),
    });

    // Informações de contato
    currentPage.drawText(
      "Tel (SERVIÇO): 911115479 - EMAIL: service.nonato@gmail.com",
      {
        x: 303,
        y: pageHeight - 850,
        size: 8,
        font: font,
      }
    );

    // Desenhar o retângulo ao redor das informações básicas
    currentPage.drawRectangle({
      x: 40,
      y: 62,
      width: 515,
      height: 638,
      borderColor: rgb(0, 0, 0), // Cor preta para a borda
      borderWidth: 1, // Largura da borda
    });

    yPos = pageHeight - (topOffset + 100);
  };

  // Adiciona número de página em todas as páginas
  const addPageNumbers = () => {
    const totalPages = pdfDoc.getPageCount(); // Total de páginas no documento

    for (let i = 0; i < totalPages; i++) {
      const page = pdfDoc.getPage(i); // Obtém a página atual

      // Desenha o número da página no rodapé
      page.drawText(`Página ${i + 1} / ${totalPages}`, {
        x: page.getWidth() - margin - 50, // Ajusta a posição para a direita
        y: margin - 20, // Posição no rodapé
        size: 10,
        font: font, // Usa a fonte carregada
        color: rgb(0, 0, 0), // Cor preta
      });
    }
  };

  // Desenhar cabeçalho na primeira página
  drawPageHeader();

  // ... continuação do código anterior ...

  // Função para desenhar texto com retângulo ao redor
  const drawTextWithBox = (text, x, y, width, textOptions = {}) => {
    const { size = fontSize, useFont = font } = textOptions;
    const maxWidth = width - 10; // Margem para o texto dentro do retângulo

    // Quebrar o texto em linhas
    const words = text.split(" ");
    let lines = [""];
    let currentLine = 0;

    for (const word of words) {
      const testLine =
        lines[currentLine] + (lines[currentLine] ? " " : "") + word;
      const testWidth = useFont.widthOfTextAtSize(testLine, size);

      if (testWidth <= maxWidth) {
        lines[currentLine] = testLine;
      } else {
        currentLine++;
        lines[currentLine] = word;
      }
    }

    const lineHeight = size + 4;
    const boxHeight = lines.length * lineHeight + 6;

    // Desenhar retângulo
    currentPage.drawRectangle({
      x: x - 2,
      y: y - boxHeight + lineHeight,
      width: width,
      height: boxHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      opacity: 0.3,
    });

    // Desenhar cada linha do texto
    lines.forEach((line, index) => {
      currentPage.drawText(line, {
        x,
        y: y - index * lineHeight,
        size,
        font: useFont,
      });
    });

    return y - (boxHeight + 2); // Retorna a próxima posição Y
  };

  // Desenhar informações básicas
  const drawBasicInfo = () => {
    let localYPos = yPos - 40;
    let startingY = localYPos + 30; // Posição inicial do retângulo exterior

    const countLines = (text, maxWidth) => {
      const words = text.split(" ");
      let lines = 1;
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);

        if (width <= maxWidth) {
          currentLine = testLine;
        } else {
          lines++;
          currentLine = word;
        }
      }
      return lines;
    };

    // Arrays para armazenar os textos
    const leftColumn = [
      { text: `Técnico: Nonato` },
      { text: `Cliente: ${safeText(client.name)}` },
      { text: `Cidade: ${safeText(client.address)}` },
      { text: `Telefone: ${safeText(client.phone)}` },
    ];

    const rightColumn = [
      { text: `Data: ${safeText(order.date)}` },
      {
        text: `Máquina/Modelo: ${safeText(equipment.brand)} ${safeText(
          equipment.model
        )}`,
      },
      { text: `Número da Máquina: ${safeText(equipment.serialNumber)}` },
      { text: `Tipo de Serviço: ${safeText(order.serviceType)}` },
    ];

    // Desenhar coluna esquerda
    leftColumn.forEach((item, index) => {
      localYPos = drawTextWithBox(item.text, 58, localYPos, 230);
      if (index < leftColumn.length - 1) {
        localYPos -= 5; // Espaçamento entre boxes
      }
    });

    // Resetar posição Y para a coluna direita
    let rightYPos = yPos - 40;

    // Desenhar coluna direita
    rightColumn.forEach((item, index) => {
      rightYPos = drawTextWithBox(item.text, 307, rightYPos, 230);
      if (index < rightColumn.length - 1) {
        rightYPos -= 5; // Espaçamento entre boxes
      }
    });

    // Usar a posição Y mais baixa entre as duas colunas
    const lowestY = Math.min(localYPos, rightYPos);

    const addressLines = countLines(safeText(client.address), 210); // 230 - margem
    const rectangleOffset = addressLines > 1 ? 140 : 127;

    // Desenhar o retângulo ao redor de todas as informações básicas
    currentPage.drawRectangle({
      x: 50,
      y: startingY - rectangleOffset,
      width: 496,
      height: startingY - lowestY - 15, // +20 para margem inferior
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    return lowestY - 10;
  };

  // Função para desenhar cabeçalho da tabela
  const drawTableHeader = () => {
    const headers = ["DATA", "IDA", "RETORNO", "KM", "HORAS", "PAUSA"];
    const headerWidths = [44, 105, 105, 101, 101, 40];

    let xPos = 50;
    headers.forEach((header, index) => {
      // Desenhar retângulo do cabeçalho
      currentPage.drawRectangle({
        x: xPos,
        y: yPos - 20,
        width: headerWidths[index],
        height: 20,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      // Desenhar texto do cabeçalho
      const textWidth = boldFont.widthOfTextAtSize(header, tableFontSize);
      currentPage.drawText(header, {
        x: xPos + (headerWidths[index] - textWidth) / 2,
        y: yPos - 15,
        size: tableFontSize,
        font: boldFont,
      });

      xPos += headerWidths[index];
    });

    return yPos - 20;
  };

  // Função para desenhar uma linha da tabela
  const drawTableRow = (workday) => {
    const cellHeight = 20;
    const columnWidths = [
      44, 40, 40, 25, 40, 40, 25, 38, 38, 25, 38, 38, 25, 40,
    ];

    // Calcular valores
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
      workday.returnDepartureTime,
      workday.returnArrivalTime,
      hoursRetorno,
      workday.kmDeparture,
      workday.kmReturn,
      kmTotal.toString(),
      workday.startHour,
      workday.endHour,
      hoursWork,
      workday.pauseHours,
    ];

    let xPos = 50;
    rowData.forEach((data, index) => {
      // Verificar se precisa de fundo cinza
      const isGrayColumn =
        index === 3 || index === 6 || index === 9 || index === 12;
      if (isGrayColumn) {
        currentPage.drawRectangle({
          x: xPos,
          y: yPos - cellHeight,
          width: columnWidths[index],
          height: cellHeight,
          color: rgb(0.8, 0.8, 0.8),
        });
      }

      // Desenhar borda e texto
      currentPage.drawRectangle({
        x: xPos,
        y: yPos - cellHeight,
        width: columnWidths[index],
        height: cellHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      const textWidth = font.widthOfTextAtSize(data, tableFontSize);
      currentPage.drawText(safeText(data), {
        x: xPos + (columnWidths[index] - textWidth) / 2,
        y: yPos - cellHeight + 6,
        size: tableFontSize,
        font: font,
      });

      xPos += columnWidths[index];
    });

    return yPos - cellHeight; // Retorna próxima posição Y
  };

  // Desenhar informações básicas
  yPos = drawBasicInfo();

  // Verificar espaço e criar nova página se necessário
  if (checkAndCreateNewPage(150)) {
    drawPageHeader();
  }

  // Desenhar cabeçalho da tabela
  yPos = drawTableHeader();

  const sortedWorkdays = [...workdays].sort((a, b) => a.workDate - b.workDate);

  // Desenhar linhas da tabela
  sortedWorkdays.forEach((workday) => {
    if (checkAndCreateNewPage(40)) {
      drawPageHeader();
      yPos = drawTableHeader();
    }
    yPos = drawTableRow(workday);
  });

  // Função para desenhar as descrições
  const drawDescriptions = () => {
    // Verificar se existem descrições válidas
    const hasValidDescriptions = workdays.some((day) => {
      const description = safeText(day.description);
      return (
        description.trim() !== "" && description.trim().toUpperCase() !== "N/A"
      );
    });

    if (!hasValidDescriptions) return yPos;

    // Título da seção
    yPos -= 30;
    currentPage.drawText("Descrição do Trabalho:", {
      x: 50,
      y: yPos,
      size: fontSize,
      font: boldFont,
    });

    // Desenhar cada descrição
    sortedWorkdays.forEach((day) => {
      const description = sanitizeText(safeText(day.description));
      if (
        description.trim() !== "" &&
        description.trim().toUpperCase() !== "N/A"
      ) {
        // Verificar espaço para nova descrição
        if (checkAndCreateNewPage(80)) {
          drawPageHeader();
        }

        yPos -= 10;

        // Data do dia - Ajustado para ter mais espaçamento
        currentPage.drawText(`Dia: ${formatDate(day.workDate)}`, {
          x: 55,
          y: yPos - 18, // Aumentado o espaçamento aqui
          size: fontSize,
          font: font,
        });

        // Calcular altura necessária para a descrição
        const maxWidth = 376; // 396 - 20 (margem)
        const words = description
          .split(" ")
          .filter((word) => word.trim() !== "");
        let lines = [""];
        let currentLine = 0;

        for (const word of words) {
          const testLine =
            lines[currentLine] + (lines[currentLine] ? " " : "") + word;
          const testWidth = font.widthOfTextAtSize(testLine, 8);

          if (testWidth <= maxWidth) {
            lines[currentLine] = testLine;
          } else {
            currentLine++;
            lines[currentLine] = word;
          }
        }

        const lineHeight = 12;
        const minHeight = Math.max(
          fontSize + 20,
          lines.length * lineHeight + 16
        );
        const boxHeight = Math.max(minHeight, fontSize + 20);

        // Ajustando a posição dos retângulos para dar mais espaço para a data
        const boxTopY = yPos - 5; // Reduzido para criar mais espaço entre a data e a caixa

        // Retângulo cinza (fundo)
        currentPage.drawRectangle({
          x: 150,
          y: boxTopY - boxHeight,
          width: 396,
          height: boxHeight,
          borderColor: rgb(0, 0, 0),
          color: rgb(0.9, 0.9, 0.9),
        });

        // Retângulo exterior
        currentPage.drawRectangle({
          x: 50,
          y: boxTopY - boxHeight,
          width: 496,
          height: boxHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        // Desenhar cada linha do texto com posicionamento correto
        lines.forEach((line, index) => {
          if (line.trim()) {
            currentPage.drawText(line.trim(), {
              x: 160,
              y: boxTopY - index * lineHeight - 15,
              size: 8,
              font: font,
            });
          }
        });

        yPos -= boxHeight + 20;
      }
    });

    return yPos;
  };

  // Função para desenhar checkbox
  const drawCheckbox = (x, y, checked, label) => {
    // Desenhar caixa
    currentPage.drawRectangle({
      x,
      y,
      width: 12,
      height: 12,
      color: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });

    // Desenhar X se estiver marcado
    if (checked) {
      currentPage.drawText("X", {
        x: x + 2.5,
        y: y + 2,
        size: fontSize,
        font: font,
      });
    }

    // Desenhar label
    currentPage.drawText(label, {
      x: x + 20,
      y: y + 2,
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
      // Calcular tempo de ida apenas se todos os campos estiverem preenchidos
      if (day.departureTime && day.arrivalTime) {
        const goingHours = calculateHours(day.departureTime, day.arrivalTime);
        if (goingHours !== "0") {
          const [goingH, goingM] = goingHours.split(":").map(Number);
          totalMinutes += goingH * 60 + goingM;
        }
      }

      // Calcular tempo de volta apenas se todos os campos estiverem preenchidos
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

  // Função auxiliar para tratar o texto antes de renderizar
  const sanitizeText = (text) => {
    if (!text) return "";
    return text
      .replace(/\n/g, " ") // Substitui quebras de linha por espaços
      .replace(/\r/g, " ") // Substitui retornos de carro por espaços
      .replace(/\t/g, " ") // Substitui tabulações por espaços
      .replace(/\s+/g, " ") // Substitui múltiplos espaços por um único espaço
      .replace(/[^\x20-\x7E]/g, "") // Remove caracteres não-ASCII
      .trim(); // Remove espaços no início e fim
  };

  // Função auxiliar para calcular a altura necessária do texto
  const calculateTextHeight = (text, maxWidth, fontSize, font) => {
    const sanitizedText = sanitizeText(text);
    const words = sanitizedText.split(" ");
    let currentLine = "";
    let lines = 1;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        currentLine = word;
        lines++;
      }
    }

    return lines * (fontSize + 2);
  };

  // Função para desenhar texto com quebra de linha
  const drawWrappedText = (page, text, x, y, maxWidth, fontSize, font) => {
    const sanitizedText = sanitizeText(text);
    const words = sanitizedText.split(" ");
    let currentLine = "";
    let currentY = y;
    const lineHeight = fontSize + 2;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          page.drawText(currentLine, {
            x,
            y: currentY,
            size: fontSize,
            font: font,
          });
          currentY -= lineHeight;
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      page.drawText(currentLine, {
        x,
        y: currentY,
        size: fontSize,
        font: font,
      });
    }

    return currentY;
  };

  // Função principal para desenhar a caixa de texto ajustável
  const drawAdjustableTextBox = (page, label, text, x, y, options = {}) => {
    const {
      fontSize = 10,
      boxWidth = 396,
      labelWidth = 100,
      font,
      minHeight = 30,
      padding = 10,
      labelOffset = 6,
    } = options;

    // Data do dia - Ajustado para ter mais espaçamento
    currentPage.drawText(label, {
      x: x + 5,
      y: y - 12 - labelOffset/2,
      size: fontSize,
      font: boldFont,
    });

    // Calcular altura necessária para a descrição
    const maxWidth = boxWidth - padding * 2;
    const words = sanitizeText(safeText(text))
      .split(" ")
      .filter((word) => word.trim() !== "");
    let lines = [""];
    let currentLine = 0;

    for (const word of words) {
      const testLine =
        lines[currentLine] + (lines[currentLine] ? " " : "") + word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize - 2);

      if (testWidth <= maxWidth) {
        lines[currentLine] = testLine;
      } else {
        currentLine++;
        lines[currentLine] = word;
      }
    }

    const lineHeight = fontSize + 2;
    const boxHeight = Math.max(
      minHeight,
      lines.length * lineHeight + padding * 2
    );

    // Retângulo cinza (fundo)
    page.drawRectangle({
      x: x + labelWidth,
      y: y - boxHeight,
      width: boxWidth,
      height: boxHeight,
      borderColor: rgb(0, 0, 0),
      color: rgb(0.9, 0.9, 0.9),
    });

    // Retângulo exterior
    page.drawRectangle({
      x: x,
      y: y - boxHeight,
      width: boxWidth + labelWidth,
      height: boxHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // Desenhar cada linha do texto
    lines.forEach((line, index) => {
      if (line.trim()) {
        page.drawText(line.trim(), {
          x: x + labelWidth + padding,
          y: y - index * lineHeight - padding - 2,
          size: fontSize - 2,
          font: font,
        });
      }
    });

    return y - boxHeight - 10; // Ajustado o espaçamento para próximo elemento
  };

  // Função para desenhar resultados com os checkboxes originais
  const drawResults = () => {
    if (checkAndCreateNewPage(300)) {
      drawPageHeader();
    }

    yPos -= 40;
    // Seção de totais
    currentPage.drawText("Total de Horas de Trabalho:", {
      x: 50,
      y: yPos,
      size: fontSize,
      font: boldFont,
    });
    currentPage.drawText(calculateTotalWorkHours(workdays) + "h", {
      x: 50,
      y: yPos - 20,
      size: fontSize,
      font: font,
    });

    currentPage.drawText("Total de Km's Percorridos:", {
      x: 200,
      y: yPos,
      size: fontSize,
      font: boldFont,
    });
    currentPage.drawText(calculateTotalKm(workdays) + " km", {
      x: 200,
      y: yPos - 20,
      size: fontSize,
      font: font,
    });

    currentPage.drawText("Total de Horas de Viagem:", {
      x: 350,
      y: yPos,
      size: fontSize,
      font: boldFont,
    });
    currentPage.drawText(calculateTotalTravelHours(workdays) + "h", {
      x: 350,
      y: yPos - 20,
      size: fontSize,
      font: font,
    });

    // Resultados do trabalho
    yPos -= 60;
    currentPage.drawText("Resultados do Trabalho:", {
      x: 50,
      y: yPos,
      size: fontSize,
      font: boldFont,
    });

    // Primeira coluna de checkboxes
    yPos -= 30;
    drawCheckbox(50, yPos, order.checklist.concluido, "Serviço Concluído");
    yPos -= 20;
    drawCheckbox(50, yPos, order.checklist.retorno, "Retorno Necessário");

    // Segunda coluna
    yPos += 20;
    drawCheckbox(
      170,
      yPos,
      order.checklist.funcionarios,
      "Instrução dos Funcionários"
    );
    yPos -= 20;
    drawCheckbox(
      170,
      yPos,
      order.checklist.documentacao,
      "Entrega da Documentação"
    );

    // Terceira coluna
    yPos += 20;
    drawCheckbox(
      340,
      yPos,
      order.checklist.producao,
      "Liberação para Produção"
    );
    yPos -= 20;
    drawCheckbox(
      340,
      yPos,
      order.checklist.pecas,
      "Envio do Orçamento de Peças"
    );

    yPos -= 40;

    // Notas com altura ajustável
    yPos = drawAdjustableTextBox(
      currentPage,
      "Notas:",
      order.resultDescription,
      50,
      yPos,
      {
        font,
        fontSize,
        boxWidth: 396,
        minHeight: 10,
        labelOffset: 10,
      }
    );

    // Pontos em aberto com altura ajustável
    yPos = drawAdjustableTextBox(
      currentPage,
      "Pontos em Aberto:",
      order.pontosEmAberto,
      50,
      yPos,
      {
        font,
        fontSize,
        boxWidth: 396,
        minHeight: 10,
      }
    );
  };

  // Função para desenhar área de assinaturas
  const drawSignatures = () => {
    if (checkAndCreateNewPage(100)) {
      drawPageHeader();
    }

    yPos -= 30;
    currentPage.drawText("Assinatura Cliente e Técnico:", {
      x: 50,
      y: yPos,
      size: fontSize,
      font: boldFont,
    });

    const lineWidth = 150;
    const gap = 50;
    const clienteX = (pageWidth - 2 * lineWidth - gap) / 2;
    const tecnicoX = clienteX + lineWidth + gap;

    yPos -= 40;

    // Linhas de assinatura
    currentPage.drawLine({
      start: { x: clienteX, y: yPos },
      end: { x: clienteX + lineWidth, y: yPos },
      thickness: 2,
      color: rgb(0, 0, 0),
    });

    currentPage.drawLine({
      start: { x: tecnicoX, y: yPos },
      end: { x: tecnicoX + lineWidth, y: yPos },
      thickness: 2,
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

    currentPage.drawText("(Técnico)", {
      x: tecnicoX + lineWidth / 2 - fontSize * 2,
      y: yPos,
      size: fontSize,
      font: font,
    });
  };

  // Desenhar todas as seções
  yPos = drawDescriptions();
  drawResults();
  drawSignatures();
  addPageNumbers();

  // Salvar e fazer download do PDF
  const pdfBytes = await pdfDoc.save();
  return { blob: new Blob([pdfBytes], { type: "application/pdf" }), fileName };
  // const pdfBytes = await pdfDoc.save();
  // const blob = new Blob([pdfBytes], { type: "application/pdf" });
  // const link = document.createElement("a");
  // link.href = URL.createObjectURL(blob);
  // link.download = `Ordem_Servico_${client.name}_${orderIdForPDF}.pdf`;
  // link.click();
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
