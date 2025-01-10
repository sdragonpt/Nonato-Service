import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

async function generateServiceOrderPDF(
  orderIdForPDF,
  order,
  client,
  equipment,
  workdays
) {
  const pdfDoc = await PDFDocument.create();
  const pageWidth = 600;
  const pageHeight = 900;
  const fontSize = 10;
  const tableFontSize = 8;
  const minY = 50; // Margem inferior mínima para desenhar
  const maxDaysPerPage = 5;
  const form = pdfDoc.getForm();

  // Carregar a fonte padrão Helvetica
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Função auxiliar para converter texto em string com valor padrão
  const safeText = (text, defaultValue = "N/A") => String(text ?? defaultValue);

  // Função para formatar a data no formato dd/MM/yy
  function formatDate(date) {
    const options = { year: "2-digit", month: "2-digit", day: "2-digit" };
    return new Date(date).toLocaleDateString("pt-BR", options);
  }

  // Carregar a imagem do fundo
  const backgroundImageBytes = await fetch("/nonato3.png").then((res) =>
    res.arrayBuffer()
  );
  const backgroundImage = await pdfDoc.embedPng(backgroundImageBytes);

  // Carregar a imagem do topo
  const topImageBytes = await fetch("/nonato2.png").then((res) =>
    res.arrayBuffer()
  );
  const topImage = await pdfDoc.embedPng(topImageBytes);

  // Função auxiliar para criar uma nova página
  const createNewPage = () => {
    const newPage = pdfDoc.addPage([pageWidth, pageHeight]);
    const { height } = newPage.getSize();

    // Desenhar as imagens na nova página
    newPage.drawImage(backgroundImage, {
      x: -60,
      y: height - 1000 + 50,
      width: 700,
      height: 1000,
    });
    newPage.drawImage(topImage, {
      x: 40,
      y: height - 65 - 40,
      width: 65,
      height: 85,
    });

    return newPage;
  };

  // Criar a primeira página
  let page = createNewPage();
  const { width, height } = page.getSize();
  let yPos = pageHeight - 110; // Posição inicial para o conteúdo

  // Função para verificar e criar nova página quando `yPos` está próximo de `minY`
  const checkAndAddPage = () => {
    if (yPos < minY) {
      page = createNewPage();
      yPos = pageHeight - 110; // Resetar posição no topo da nova página
    }
  };

  const yPosi = height - 50;
  // Adicionando "Protocolo de Serviço"
  page.drawText("Relatório de Serviço", {
    x: 220, // Ajuste a posição para a direita
    y: yPosi,
    size: 16,
    color: rgb(0.0667, 0.4902, 0.2863),
    font: helveticaBoldFont,
  });

  // Adicionando "Ordem Nº: [id]" ao lado do título
  // Calculando a largura do retângulo com base no comprimento do número
  const orderIdLength = `${orderIdForPDF}`.length; // Número de caracteres do orderId
  const charWidth = 7; // Largura média de cada caractere em unidades (ajustável conforme necessário)

  // A largura do retângulo é a largura média de cada caractere multiplicada pelo número de caracteres
  const rectWidth = orderIdLength * charWidth + 20;

  // Desenhar o texto com o número do serviço
  page.drawText(`Nº: ${orderIdForPDF}`, {
    x: 500, // Posição à direita do "Relatório de Serviço"
    y: yPosi,
    size: 12,
    color: rgb(0, 0, 0),
    font: helveticaBoldFont,
  });

  // Medidas do retângulo
  const rectX = 495; // Ajuste para a posição inicial do retângulo (margem esquerda do texto)
  const rectY = yPosi - 3.5; // Ajuste vertical para o topo do retângulo
  const rectHeight = 16; // Altura do retângulo (ajuste conforme o tamanho do texto)

  // Desenhar o retângulo com a largura ajustada
  page.drawRectangle({
    x: rectX,
    y: rectY,
    width: rectWidth + 10, // Ajuste para a margem
    height: rectHeight,
    borderColor: rgb(0, 0, 0), // Cor da borda
    borderWidth: 1, // Largura da borda
  });

  // Adicionando "ASSISTÊNCIA TÉCNICA" abaixo de "Protocolo de Serviço"
  page.drawText("ASSISTÊNCIA TÉCNICA", {
    x: 228, // Mantém a mesma posição horizontal
    y: yPosi - 20, // Desloca 20 unidades para baixo (ajuste conforme necessário)
    size: 12,
    color: rgb(0.0667, 0.4902, 0.2863),
    font: helveticaBoldFont,
  });
  page.drawText("Tel (SERVIÇO): 911115479 - EMAIL: service.nonato@gmail.com", {
    x: 303,
    y: height - 860,
    size: 8,
    font: helveticaFont,
  });

  // Função para desenhar os retângulos ao redor dos textos
  function drawRectangleAroundText(page, x, y, width, height) {
    page.drawRectangle({
      x: x - 2, // Ajuste para deixar o retângulo um pouco maior que o texto
      y: y - height + 6, // Ajuste para deixar o retângulo um pouco maior que o texto
      width: width, // Ajuste para adicionar espaçamento ao redor
      height: height + 6, // Ajuste para adicionar espaçamento ao redor
      borderColor: rgb(0, 0, 0), // Cor da borda
      borderWidth: 1, // Espessura da borda
      opacity: 0.3, // Opacidade do retângulo
    });
  }

  // Informações Básicas
  const infoYStart = height - 110;
  const techText = `Técnico: Nonato`;
  const techTextWidth = techText.length * fontSize * 0.5; // Aproximação do tamanho do texto
  drawRectangleAroundText(
    page,
    57,
    infoYStart - 13,
    techTextWidth + 4,
    fontSize
  );
  page.drawText(techText, {
    x: 58,
    y: infoYStart - 13,
    size: fontSize,
    font: helveticaFont,
  });

  const dateText = `Data: ${safeText(order.date)}`;
  const dateTextWidth = dateText.length * fontSize * 0.5; // Aproximação do tamanho do texto
  drawRectangleAroundText(
    page,
    305,
    infoYStart - 13,
    dateTextWidth + 6,
    fontSize
  );
  page.drawText(dateText, {
    x: 307,
    y: infoYStart - 13,
    size: fontSize,
    font: helveticaFont,
  });

  const clientNameText = `Cliente: ${safeText(client.name)}`;
  const clientNameTextWidth = fontSize * 0.5;
  drawRectangleAroundText(
    page,
    57,
    infoYStart - 33,
    clientNameTextWidth + 230,
    fontSize
  );
  page.drawText(clientNameText, {
    x: 58,
    y: infoYStart - 33,
    size: fontSize,
    font: helveticaFont,
  });

  const postalCodeText = `${safeText(client.postalCode)}`;
  page.drawText(postalCodeText, {
    x: 190,
    y: infoYStart - 33,
    size: fontSize,
    font: helveticaFont,
  });

  const phoneText = `Telefone: ${safeText(client.phone)}`;
  const phoneTextWidth = fontSize * 0.5;
  drawRectangleAroundText(
    page,
    57,
    infoYStart - 73,
    phoneTextWidth + 230,
    fontSize
  );
  page.drawText(phoneText, {
    x: 58,
    y: infoYStart - 73,
    size: fontSize,
    font: helveticaFont,
  });

  const machineModelText = `Máquina/Modelo: ${safeText(
    equipment.brand
  )} ${safeText(equipment.model)}`;
  const machineModelTextWidth = fontSize * 0.5;
  drawRectangleAroundText(
    page,
    305,
    infoYStart - 33,
    machineModelTextWidth + 230,
    fontSize
  );
  page.drawText(machineModelText, {
    x: 307,
    y: infoYStart - 33,
    size: fontSize,
    font: helveticaFont,
  });

  const serialNumberText = `Número da Máquina: ${safeText(
    equipment.serialNumber
  )}`;
  const serialNumberTextWidth = fontSize * 0.5;
  drawRectangleAroundText(
    page,
    305,
    infoYStart - 53,
    serialNumberTextWidth + 230,
    fontSize
  );
  page.drawText(serialNumberText, {
    x: 307,
    y: infoYStart - 53,
    size: fontSize,
    font: helveticaFont,
  });

  const cityText = `Cidade: ${safeText(client.address)}`;
  const cityTextWidth = fontSize * 0.5;
  drawRectangleAroundText(
    page,
    57,
    infoYStart - 53,
    cityTextWidth + 230,
    fontSize
  );
  page.drawText(cityText, {
    x: 58,
    y: infoYStart - 53,
    size: fontSize,
    font: helveticaFont,
  });

  const serviceTypeText = `Tipo de Serviço: ${safeText(order.serviceType)}`;
  const serviceTypeTextWidth = fontSize * 0.5;
  drawRectangleAroundText(
    page,
    57,
    infoYStart - 93,
    serviceTypeTextWidth + 230,
    fontSize
  );
  page.drawText(serviceTypeText, {
    x: 58,
    y: infoYStart - 93,
    size: fontSize,
    font: helveticaFont,
  });

  // Ordena os dias de trabalho por data
  workdays.sort((a, b) => new Date(a.workDate) - new Date(b.workDate));

  // Configuração da tabela
  let tableYStart = infoYStart - 100;
  const cellHeight = 20;
  const columnWidths = [44, 40, 40, 25, 40, 40, 25, 38, 38, 25, 38, 38, 25, 40];
  const headers = [
    "dd/mm/aa",
    "Saída",
    "Chegada",
    "hs",
    "Saída",
    "Chegada",
    "hs",
    "Ida",
    "Retorno",
    "Total",
    "Início",
    "Término",
    "hs",
    "Horas",
  ];

  // Novo cabeçalho adicional
  const extraHeaders = ["DATA", "IDA", "RETORNO", "KM", "HORAS", "PAUSA"];
  const extraHeaderWidths = [44, 105, 105, 101, 101, 40]; // Larguras aproximadas para acomodar o texto

  let xPos = 50; // Declara `xPos` apenas uma vez no escopo da função
  const extraHeaderYPosition = tableYStart - 10; // Posição vertical para os novos cabeçalhos
  extraHeaders.forEach((header, index) => {
    // Calcula a largura do texto
    const textWidth = helveticaBoldFont.widthOfTextAtSize(
      header,
      tableFontSize
    );

    // Calcula a posição x para centralizar o texto no retângulo
    const textXPos = xPos + (extraHeaderWidths[index] - textWidth) / 2;

    page.drawText(header, {
      x: textXPos, // Posição x centralizada
      y: extraHeaderYPosition - 10,
      size: tableFontSize,
      font: helveticaBoldFont,
    });

    xPos += extraHeaderWidths[index];
  });

  // Desenha as bordas para o cabeçalho adicional
  xPos = 50; // Redefine `xPos` antes de usá-lo para as bordas dos cabeçalhos adicionais
  extraHeaders.forEach((_, index) => {
    page.drawRectangle({
      x: xPos,
      y: extraHeaderYPosition - cellHeight + 3,
      width: extraHeaderWidths[index],
      height: cellHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    xPos += extraHeaderWidths[index];
  });

  const infoBoxX2 = 40; // Posição x inicial da borda
  const infoBoxY2 = infoYStart + 12; // Posição y inicial da borda
  const infoBox2Width = 496;
  const infoBox2Height = infoYStart - (infoYStart - 104);

  page.drawRectangle({
    x: infoBoxX2 + 10,
    y: infoBoxY2 - infoBox2Height - 9,
    width: infoBox2Width,
    height: infoBox2Height,
    borderColor: rgb(0, 0, 0), // Cor preta para a borda
    borderWidth: 1, // Largura da borda
  });

  // Ajuste a posição vertical para os cabeçalhos principais
  xPos = 50; // Redefine `xPos` antes de usá-lo para os cabeçalhos originais
  const headerYPosition = extraHeaderYPosition - 17; // Aumentei o espaçamento para evitar sobreposição
  headers.forEach((header, index) => {
    // Verifica se a coluna é uma das que deve ter fundo cinza
    const isGrayColumn = ["hs", "Total"].includes(header);

    // Se for uma dessas colunas, desenha o fundo cinza
    if (isGrayColumn) {
      page.drawRectangle({
        x: xPos,
        y: headerYPosition - cellHeight,
        width: columnWidths[index],
        height: cellHeight,
        color: rgb(0.8, 0.8, 0.8), // Cor cinza
      });
    }

    // Calcula a largura do texto
    const textWidth = helveticaBoldFont.widthOfTextAtSize(header, 7);

    // Centraliza o texto no retângulo
    const textXPos = xPos + (columnWidths[index] - textWidth) / 2;

    page.drawText(header, {
      x: textXPos, // Posição x centralizada
      y: headerYPosition - 15,
      size: 7,
      font: helveticaBoldFont,
    });

    xPos += columnWidths[index];
  });

  // Desenhar bordas ao redor do cabeçalho original
  xPos = 50; // Redefine `xPos` antes de usá-lo para as bordas dos cabeçalhos
  headers.forEach((_, index) => {
    page.drawRectangle({
      x: xPos,
      y: headerYPosition - cellHeight,
      width: columnWidths[index],
      height: cellHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    xPos += columnWidths[index];
  });

  // Posição inicial da primeira linha de dados (ajustada para evitar sobreposição)
  let yPosition = headerYPosition - cellHeight - 20; // Aumente o valor para garantir que a primeira linha não sobreponha o cabeçalho

  // Preenche as linhas de dados
  workdays.forEach((day) => {
    const kmTotal = Number(day.kmDeparture) + Number(day.kmReturn);
    const hoursIda = calculateHours(day.departureTime, day.arrivalTime);
    const hoursRetorno = calculateHours(
      day.returnDepartureTime,
      day.returnArrivalTime
    );
    const hoursWork = calculateHoursWithPause(
      day.startHour,
      day.endHour,
      day.pauseHours
    );

    const rowData = [
      safeText(formatDate(day.workDate)),
      safeText(day.departureTime),
      safeText(day.arrivalTime),
      safeText(hoursIda),
      safeText(day.returnDepartureTime),
      safeText(day.returnArrivalTime),
      safeText(hoursRetorno),
      safeText(day.kmDeparture),
      safeText(day.kmReturn),
      safeText(kmTotal),
      safeText(day.startHour),
      safeText(day.endHour),
      safeText(hoursWork),
      safeText(day.pauseHours),
    ];

    xPos = 50;
    rowData.forEach((data, index) => {
      const isGrayColumn =
        index === 3 || index === 6 || index === 9 || index === 12;

      if (isGrayColumn) {
        page.drawRectangle({
          x: xPos,
          y: yPosition + 20 - cellHeight,
          width: columnWidths[index],
          height: cellHeight,
          color: rgb(0.8, 0.8, 0.8), // Cor cinza
        });
      }

      // Calcula a largura do texto
      const textWidth = helveticaFont.widthOfTextAtSize(data, tableFontSize);

      // Calcula a posição x para centralizar o texto no retângulo
      const textXPos = xPos + (columnWidths[index] - textWidth) / 2;

      page.drawText(data, {
        x: textXPos, // Posição x centralizada
        y: yPosition + 20 - 15,
        size: tableFontSize,
        font: helveticaFont,
      });

      // Desenho das bordas para as colunas
      page.drawRectangle({
        x: xPos,
        y: yPosition + 20 - cellHeight,
        width: columnWidths[index], // Usando somente as larguras de columnWidths
        height: cellHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      // Atualiza a posição horizontal (xPos) de acordo com a largura da coluna
      xPos += columnWidths[index];
    });

    yPosition -= cellHeight;
  });

  function calculateHours(start, end) {
    // Valida se o start ou end são inválidos
    if (!start || !end) return "0";

    const startTime = new Date(`1970-01-01T${start}:00`);
    let endTime = new Date(`1970-01-01T${end}:00`);

    // Se a hora de chegada for anterior à hora de saída, significa que a chegada é no dia seguinte
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1); // Adiciona 1 dia à data de chegada
    }

    const diff = (endTime - startTime) / 1000 / 3600;

    // Converte a diferença para horas e minutos
    const hours = Math.floor(diff);
    const minutes = Math.round((diff - hours) * 60);

    return diff >= 0 ? `${hours}:${minutes.toString().padStart(2, "0")}` : "0";
  }

  function calculateHoursWithPause(start, end, pauseHours) {
    // Valida se o start ou end são inválidos
    if (!start || !end) return "0";

    const startTime = new Date(`1970-01-01T${start}:00`);
    let endTime = new Date(`1970-01-01T${end}:00`);

    // Se a hora de chegada for anterior à hora de saída, significa que a chegada é no dia seguinte
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1); // Adiciona 1 dia à data de chegada
    }

    // Calcula a diferença em horas
    let diff = (endTime - startTime) / 1000 / 3600;

    // Valida o valor de pauseHours
    let pauseInDecimal = 0;
    if (pauseHours.includes(":")) {
      // Se for no formato HH:MM
      const [pauseHoursPart, pauseMinutesPart] = pauseHours
        .split(":")
        .map(Number);
      pauseInDecimal = pauseHoursPart + pauseMinutesPart / 60;
    } else {
      // Caso seja apenas um número, interpreta como horas
      pauseInDecimal = parseFloat(pauseHours) || 0; // Garante que é um número válido
    }

    // Subtrai o tempo de pausa do total
    diff -= pauseInDecimal;

    // Converte a diferença para horas e minutos
    const hours = Math.floor(diff);
    const minutes = Math.round((diff - hours) * 60);

    return diff >= 0 ? `${hours}:${minutes.toString().padStart(2, "0")}` : "0";
  }

  function formatDecimalHoursToHHMM(totalHours) {
    if (isNaN(totalHours)) return "0h00"; // Verifica se o valor é NaN e retorna um valor padrão
    const hours = Math.floor(totalHours); // Parte inteira das horas
    const minutes = Math.round((totalHours - hours) * 60); // Parte decimal convertida em minutos
    return `${hours}h${minutes.toString().padStart(2, "0")}`; // Formata como HH:MM
  }

  let totalMinutes = 0;

  workdays.forEach((workday) => {
    const hoursIda = calculateHours(workday.departureTime, workday.arrivalTime); // Horas de ida
    const hoursRetorno = calculateHours(
      workday.returnDepartureTime,
      workday.returnArrivalTime
    ); // Horas de retorno

    // Verifica se as horas de ida e retorno são válidas
    if (hoursIda && hoursRetorno) {
      const [hoursIdaInt, minutesIdaInt] = hoursIda.split(":").map(Number);
      const [hoursRetornoInt, minutesRetornoInt] = hoursRetorno
        .split(":")
        .map(Number);

      // Verifica se a divisão deu um número válido
      if (
        !isNaN(hoursIdaInt) &&
        !isNaN(minutesIdaInt) &&
        !isNaN(hoursRetornoInt) &&
        !isNaN(minutesRetornoInt)
      ) {
        // Soma as horas e minutos
        totalMinutes += hoursIdaInt * 60 + minutesIdaInt; // Soma as horas de ida em minutos
        totalMinutes += hoursRetornoInt * 60 + minutesRetornoInt; // Soma as horas de retorno em minutos
      }
    }
  });

  // Converte o total de minutos para horas e minutos
  const totalHoursFinal = Math.floor(totalMinutes / 60);
  const totalMinutesFinal = totalMinutes % 60;

  // Formata a string final no formato HH:MM
  const formattedTotalHours = `${totalHoursFinal}h${totalMinutesFinal
    .toString()
    .padStart(2, "0")}`;

  let totalKm = 0; // Inicializa a variável para armazenar a soma dos quilômetros

  workdays.forEach((workday) => {
    const kmDeparture = parseFloat(workday.kmDeparture);
    const kmReturn = parseFloat(workday.kmReturn);

    // Se kmDeparture e kmReturn forem válidos (não NaN) e a soma não for zero, acumula
    if ((kmDeparture || kmReturn) > 0) {
      const kmTotal = kmDeparture + kmReturn; // Somando os quilômetros de ida e volta
      totalKm += kmTotal; // Acumulando o total de quilômetros
    }
  });

  // Seções de Observações e Conclusão
  let totalWorkHoursInMinutes = 0; // Total em minutos

  workdays.forEach((day) => {
    const hoursWork = calculateHoursWithPause(
      day.startHour,
      day.endHour,
      day.pauseHours
    );

    // Extrai horas e minutos do formato HH:MM
    const [hours, minutes] = hoursWork.split(":").map(Number);

    // Converte tudo para minutos e acumula
    totalWorkHoursInMinutes += hours * 60 + minutes;
  });

  // Converte o total em minutos para HH:MM
  const totalWorkHoursFormatted = formatMinutesToHours(totalWorkHoursInMinutes);

  // Função para converter minutos para HH:MM
  function formatMinutesToHours(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h${minutes.toString().padStart(2, "0")}`;
  }

  yPosition -= 0;
  page.drawText("Total de Horas de Trabalho:", {
    x: 50,
    y: yPosition,
    size: fontSize,
    font: helveticaBoldFont,
  });
  page.drawText(safeText(totalWorkHoursFormatted) + "m", {
    // Corrigido de "m" para "h"
    x: 50,
    y: yPosition - 20,
    size: fontSize,
    font: helveticaFont,
  });

  yPosition -= 0;
  page.drawText("Total de Km's Percorridos:", {
    x: 200,
    y: yPosition,
    size: fontSize,
    font: helveticaBoldFont,
  });
  page.drawText(safeText(totalKm) + " km", {
    x: 200,
    y: yPosition - 20,
    size: fontSize,
    font: helveticaFont,
  });

  yPosition -= 0;
  page.drawText("Total de Horas de Viagem:", {
    x: 350,
    y: yPosition,
    size: fontSize,
    font: helveticaBoldFont,
  });
  page.drawText(safeText(formattedTotalHours) + "m", {
    // Corrigido de "m" para "h"
    x: 350,
    y: yPosition - 20,
    size: fontSize,
    font: helveticaFont,
  });

  const boxPadding = 10; // Espaçamento interno da caixa
  const boxWidth = 396; // Largura da caixa de descrição

  // Verificar se existe pelo menos uma descrição válida nos dias de trabalho
  const hasValidDescriptions = workdays.some((day) => {
    const descriptionText = safeText(day.description);
    return (
      descriptionText.trim() !== "" &&
      descriptionText.trim().toUpperCase() !== "N/A"
    );
  });

  // Somente desenhar o texto "Descrição do Trabalho:" se houver descrições válidas
  if (hasValidDescriptions) {
    yPosition -= 40;
    page.drawText("Descrição do Trabalho:", {
      x: 50,
      y: yPosition,
      size: fontSize,
      font: helveticaBoldFont,
    });

    // Loop para cada dia de trabalho
    workdays.forEach((day) => {
      // Verifica se a descrição do dia não está vazia nem "N/A"
      const descriptionText = safeText(day.description);
      if (
        descriptionText.trim() !== "" &&
        descriptionText.trim().toUpperCase() !== "N/A"
      ) {
        // Reduz a posição Y para mostrar a data do dia
        yPosition -= 30;

        // Desenha a data do dia
        page.drawText(`Dia: ${safeText(formatDate(day.workDate))}`, {
          x: 50,
          y: yPosition,
          size: fontSize,
          font: helveticaFont,
        });

        // Reduz a posição Y para desenhar a caixa da descrição
        yPosition -= boxPadding;

        // Desenha o retângulo da caixa da descrição
        const boxHeight = fontSize + 2 * boxPadding * 2; // Definindo a altura da caixa

        page.drawRectangle({
          x: 150,
          y: yPosition - 30, // Alinhamento da caixa
          width: boxWidth,
          height: boxHeight, // Usando a altura definida
          borderColor: rgb(0, 0, 0), // Cor da borda
          color: rgb(0.9, 0.9, 0.9), // Cor de fundo da caixa
        });

        // Calculando a posição para centralizar o texto verticalmente
        const lineHeight = 10;
        const textHeight = fontSize; // Altura do texto
        const textYPosition =
          yPosition - boxPadding + (boxHeight - textHeight) / 2;

        // Desenha a descrição dentro da caixa, centralizada verticalmente
        page.drawText(descriptionText, {
          x: 150 + boxPadding,
          y: textYPosition - 2,
          size: 8,
          font: helveticaFont,
          lineHeight: lineHeight,
        });

        // Atualiza a posição Y para o próximo item
        yPosition -= boxHeight - 30; // Ajuste para o próximo dia
      }
    });
  }

  yPosition -= 60;
  page.drawText("Resultados do Trabalho:", {
    x: 50,
    y: yPosition,
    size: fontSize,
    font: helveticaBoldFont,
  });

  const drawCheckbox = (x, y, isChecked, page, fontSize, font) => {
    const checkboxSize = 12; // Tamanho da caixa
    const boxTextOffset = checkboxSize + 5; // Distância entre a caixa e o texto
    const checkboxSymbol = isChecked ? "X" : ""; // Define o símbolo baseado no valor de 'isChecked'

    // Desenhando a caixa vazia
    page.drawRectangle({
      x,
      y,
      width: checkboxSize,
      height: checkboxSize,
      color: rgb(0.8, 0.8, 0.8), // Cor da borda da caixa (preto)
      borderWidth: 1,
    });

    // Desenhando o símbolo dentro da caixa
    page.drawText(checkboxSymbol, {
      x: x + 2.5, // Ajuste a posição do texto para dentro da caixa
      y: y + 2, // Ajuste a posição para centralizar o texto na caixa
      size: fontSize,
      font,
    });
  };

  // Desenhar as caixas de "Serviço Concluído", "Retorno Necessário" e outras
  yPosition -= 30;
  drawCheckbox(50, yPosition, order.concluido, page, fontSize, helveticaFont); // Serviço Concluído
  page.drawText("Serviço Concluído", {
    x: 50 + 20, // Deslocamento após a caixa
    y: yPosition + 2,
    size: fontSize,
    font: helveticaFont,
  });

  yPosition -= 20; // Ajuste a posição para a próxima caixa
  drawCheckbox(50, yPosition, order.retorno, page, fontSize, helveticaFont); // Retorno Necessário
  page.drawText("Retorno Necessário", {
    x: 50 + 20, // Deslocamento após a caixa
    y: yPosition + 2,
    size: fontSize,
    font: helveticaFont,
  });

  yPosition -= -20; // Ajuste a posição para as outras opções
  drawCheckbox(
    170,
    yPosition,
    order.funcionarios,
    page,
    fontSize,
    helveticaFont
  ); // Funcionários
  page.drawText("Instrução dos Funcionários", {
    x: 170 + 20, // Deslocamento após a caixa
    y: yPosition + 2,
    size: fontSize,
    font: helveticaFont,
  });

  yPosition -= 20;
  drawCheckbox(
    170,
    yPosition,
    order.documentacao,
    page,
    fontSize,
    helveticaFont
  ); // Documentação
  page.drawText("Entrega da Documentação", {
    x: 170 + 20, // Deslocamento após a caixa
    y: yPosition + 2,
    size: fontSize,
    font: helveticaFont,
  });

  yPosition -= -20;
  drawCheckbox(340, yPosition, order.producao, page, fontSize, helveticaFont); // Produção
  page.drawText("Liberação para Produção", {
    x: 340 + 20, // Deslocamento após a caixa
    y: yPosition + 2,
    size: fontSize,
    font: helveticaFont,
  });

  yPosition -= 20;
  drawCheckbox(340, yPosition, order.pecas, page, fontSize, helveticaFont); // Peças
  page.drawText("Envio do Orçamento de Peças", {
    x: 340 + 20, // Deslocamento após a caixa
    y: yPosition + 2,
    size: fontSize,
    font: helveticaFont,
  });

  yPosition -= 20; // Posição para as notas
  page.drawText("Notas:", {
    x: 100,
    y: yPosition,
    size: fontSize,
    font: helveticaFont,
  });

  const boxHeight = fontSize + 2 * boxPadding;

  yPosition -= 10; // Posição para as notas
  page.drawRectangle({
    x: 150,
    y: yPosition - 10, // Alinhamento da caixa
    width: boxWidth,
    height: boxHeight, // Usando a altura definida
    borderColor: rgb(0, 0, 0), // Cor da borda
    color: rgb(0.9, 0.9, 0.9), // Cor de fundo da caixa
  });

  // Calculando a posição para centralizar o texto verticalmente
  const lineHeight = 10;
  const textHeight = fontSize; // Altura do texto
  const textYPosition = yPosition - boxPadding + (boxHeight - textHeight) / 2;

  // Desenha a descrição dentro da caixa, centralizada verticalmente
  page.drawText(safeText(order.resultDescription), {
    x: 150 + boxPadding,
    y: textYPosition + 8,
    size: 8,
    font: helveticaFont,
    lineHeight: lineHeight,
  });

  yPosition -= 60;
  page.drawText("Pontos em Aberto:", {
    x: 50,
    y: yPosition,
    size: fontSize,
    font: helveticaBoldFont,
  });
  page.drawText(safeText(order.openPoints), {
    x: 50,
    y: yPosition - 20,
    size: fontSize,
    font: helveticaFont,
  });

  // Altura fixa para assinaturas no fundo
  const bottomMargin = 110; // Margem inferior fixa
  const signatureYPosition = bottomMargin + 40; // Ajuste para posição inicial do texto acima das assinaturas

  // Texto "Assinatura Cliente e Técnico" acima das linhas
  page.drawText("Assinatura Cliente e Técnico:", {
    x: 50,
    y: signatureYPosition,
    size: fontSize,
    font: helveticaBoldFont,
  });

  // Coordenadas e dimensões para centralizar
  const lineWidth = 150; // Largura de cada linha
  const gapBetweenLines = 50; // Espaço entre as duas linhas
  const BotlineHeight = 2; // Espessura da linha

  // Coordenadas X para centralizar as linhas horizontalmente
  const clienteX = (pageWidth - 2 * lineWidth - gapBetweenLines) / 2;
  const tecnicoX = clienteX + lineWidth + gapBetweenLines;

  // Desenhar a linha "Cliente"
  page.drawLine({
    start: { x: clienteX, y: bottomMargin },
    end: { x: clienteX + lineWidth, y: bottomMargin },
    thickness: BotlineHeight,
    color: rgb(0, 0, 0),
  });

  // Texto "(Cliente)" abaixo da linha
  page.drawText("(Cliente)", {
    x: clienteX + lineWidth / 2 - fontSize * 2, // Centraliza o texto no meio da linha
    y: bottomMargin - 15, // Ajuste para ficar abaixo da linha
    size: fontSize,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });

  // Desenhar a linha "Técnico"
  page.drawLine({
    start: { x: tecnicoX, y: bottomMargin },
    end: { x: tecnicoX + lineWidth, y: bottomMargin },
    thickness: BotlineHeight,
    color: rgb(0, 0, 0),
  });

  // Texto "(Técnico)" abaixo da linha
  page.drawText("(Técnico)", {
    x: tecnicoX + lineWidth / 2 - fontSize * 2, // Centraliza o texto no meio da linha
    y: bottomMargin - 15, // Ajuste para ficar abaixo da linha
    size: fontSize,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });

  // Determinar o início e o final das informações básicas
  const infoBoxX = 40; // Posição x inicial da borda
  const infoBoxY = infoYStart + 10; // Posição y inicial da borda
  const infoBoxWidth = 520; // Largura do retângulo (ajuste conforme necessário)
  const infoBoxHeight = infoYStart - (infoYStart - 750); // Altura baseada no conteúdo

  // Desenhar o retângulo ao redor das informações básicas
  page.drawRectangle({
    x: infoBoxX,
    y: infoBoxY - infoBoxHeight,
    width: infoBoxWidth,
    height: infoBoxHeight,
    borderColor: rgb(0, 0, 0), // Cor preta para a borda
    borderWidth: 1, // Largura da borda
  });

  // Salvar PDF
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Ordem_Servico_${client.name}.pdf`;
  link.click();
}

export default generateServiceOrderPDF;
