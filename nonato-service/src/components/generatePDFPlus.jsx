import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

async function generateServiceOrderPDFPlus(order, client, equipment, workdays) {
  const pdfDoc = await PDFDocument.create();
  const pageWidth = 600;
  const pageHeight = 900;
  const fontSize = 10;
  const tableFontSize = 8;
  const minY = 50; // Minimum bottom margin for drawing
  const maxDaysPerPage = 6; // Limit of 6 workdays per page
  const form = pdfDoc.getForm();

  const boxPadding = 10; // Internal padding of the description box
  const boxWidth = 396; // Width of the description box

  // Load standard Helvetica fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  // Function to convert text to a string with a default value
  const safeText = (text, defaultValue = "N/A") => String(text ?? defaultValue);

  // Function to format date in dd/MM/yy format
  function formatDate(date) {
    const options = { year: "2-digit", month: "2-digit", day: "2-digit" };
    return new Date(date).toLocaleDateString("pt-BR", options);
  }

  // Load background images
  const backgroundImageBytes = await fetch("/background5.png").then((res) =>
    res.arrayBuffer()
  );
  const backgroundImage = await pdfDoc.embedPng(backgroundImageBytes);

  const topImageBytes = await fetch("/nonato.png").then((res) =>
    res.arrayBuffer()
  );
  const topImage = await pdfDoc.embedPng(topImageBytes);

  // Function to create a new page with background and top images
  const createNewPage = () => {
    const newPage = pdfDoc.addPage([pageWidth, pageHeight]);
    const { height } = newPage.getSize();

    // Draw background and top images
    newPage.drawImage(backgroundImage, {
      x: -50,
      y: height - 1000 + 50,
      width: 700,
      height: 1000,
    });
    newPage.drawImage(topImage, {
      x: 50,
      y: height - 65 - 30,
      width: 65,
      height: 65,
    });
    newPage.drawText(
      "Tel (SERVIÇO): 911115479 - EMAIL: service.nonato@gmail.com",
      {
        x: 303,
        y: height - 860,
        size: 8,
        font: helveticaFont,
      }
    );

    return newPage;
  };

  // Create the first page
  let page = createNewPage();
  const { width, height } = page.getSize();
  let yPos = height - 110; // Initial position for content

  // Add "Protocolo de Serviço"
  page.drawText("Relatório de Serviço", {
    x: 220, // Adjust position to the right
    y: height - 50,
    size: 16,
    color: rgb(0, 0, 0.8),
    font: helveticaBoldFont,
  });

  // Add "ASSISTÊNCIA TÉCNICA" below "Protocolo de Serviço"
  page.drawText("ASSISTÊNCIA TÉCNICA", {
    x: 228, // Maintain same horizontal position
    y: height - 70, // Move down 20 units
    size: 12,
    color: rgb(0, 0, 0.8),
    font: helveticaBoldFont,
  });
  // page.drawText("Tel (SERVIÇO): 911115479 - EMAIL: service.nonato@gmail.com", {
  //   x: 303,
  //   y: height - 860,
  //   size: 8,
  //   font: helveticaFont,
  // });

  // Informações Básicas
  const infoYStart = height - 110;
  page.drawText(`Técnico: Nonato`, {
    x: 50,
    y: infoYStart - 3,
    size: fontSize,
    font: helveticaFont,
  });
  page.drawText(`Data: ${safeText(order.date)}`, {
    x: 300,
    y: infoYStart - 3,
    size: fontSize,
    font: helveticaFont,
  });
  page.drawText(`Cliente: ${safeText(client.name)}`, {
    x: 50,
    y: infoYStart - 23,
    size: fontSize,
    font: helveticaFont,
  });
  page.drawText(`${safeText(client.postalCode)}`, {
    x: 185,
    y: infoYStart - 23,
    size: fontSize,
    font: helveticaFont,
  });
  page.drawText(`Telefone: ${safeText(client.phone)}`, {
    x: 50,
    y: infoYStart - 63,
    size: fontSize,
    font: helveticaFont,
  });
  page.drawText(
    `Máquina/Modelo: ${safeText(equipment.brand)} ${safeText(equipment.model)}`,
    { x: 300, y: infoYStart - 23, size: fontSize, font: helveticaFont }
  );
  page.drawText(`Número da Máquina: ${safeText(equipment.serialNumber)}`, {
    x: 300,
    y: infoYStart - 43,
    size: fontSize,
    font: helveticaFont,
  });
  page.drawText(`Cidade: ${safeText(client.address)}`, {
    x: 50,
    y: infoYStart - 43,
    size: fontSize,
    font: helveticaFont,
  });
  page.drawText(`Tipo de Serviço: ${safeText(order.serviceType)}`, {
    x: 50,
    y: infoYStart - 83,
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

  // Função para desenhar cabeçalhos da tabela
  const drawTableHeaders = (currentPage) => {
    let xPos = 50;
    const extraHeaderYPosition = tableYStart - 5; // Posição vertical para os novos cabeçalhos

    // Desenhar cabeçalhos adicionais
    extraHeaders.forEach((header, index) => {
      const textWidth = helveticaBoldFont.widthOfTextAtSize(
        header,
        tableFontSize
      );
      const textXPos = xPos + (extraHeaderWidths[index] - textWidth) / 2;

      currentPage.drawText(header, {
        x: textXPos,
        y: extraHeaderYPosition - 10,
        size: tableFontSize,
        font: helveticaBoldFont,
      });

      xPos += extraHeaderWidths[index];
    });

    // Desenha as bordas para o cabeçalho adicional
    xPos = 50;
    extraHeaders.forEach((_, index) => {
      currentPage.drawRectangle({
        x: xPos,
        y: extraHeaderYPosition - cellHeight + 3,
        width: extraHeaderWidths[index],
        height: cellHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      xPos += extraHeaderWidths[index];
    });

    // Desenhar cabeçalhos principais
    xPos = 50;
    const headerYPosition = extraHeaderYPosition - 20; // Aumentei o espaçamento para evitar sobreposição
    headers.forEach((header, index) => {
      const isGrayColumn = ["hs", "Total"].includes(header);

      if (isGrayColumn) {
        currentPage.drawRectangle({
          x: xPos,
          y: headerYPosition - cellHeight,
          width: columnWidths[index],
          height: cellHeight,
          color: rgb(0.8, 0.8, 0.8), // Cor cinza
        });
      }

      const textWidth = helveticaBoldFont.widthOfTextAtSize(header, 7);
      const textXPos = xPos + (columnWidths[index] - textWidth) / 2;

      currentPage.drawText(header, {
        x: textXPos,
        y: headerYPosition - 15,
        size: 7,
        font: helveticaBoldFont,
      });

      xPos += columnWidths[index];
    });

    // Desenhar bordas ao redor do cabeçalho principal
    xPos = 50;
    headers.forEach((_, index) => {
      currentPage.drawRectangle({
        x: xPos,
        y: headerYPosition - cellHeight,
        width: columnWidths[index],
        height: cellHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
      xPos += columnWidths[index];
    });

    return headerYPosition - cellHeight - 20; // Retorna a nova posição Y após os cabeçalhos
  };

  // Inicializar yPosition após cabeçalhos
  let yPosition = drawTableHeaders(page);

  // Função para dividir workdays em grupos de 5
  const chunkArray = (arr, size) => {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  };

  const workdayChunks = chunkArray(workdays, maxDaysPerPage);

  // Função para desenhar uma linha de dados da tabela
  const drawWorkdayRow = (currentPage, rowData, yPos) => {
    let xPos = 50;
    rowData.forEach((data, index) => {
      const isGrayColumn =
        index === 3 || index === 6 || index === 9 || index === 12;

      if (isGrayColumn) {
        currentPage.drawRectangle({
          x: xPos,
          y: yPos + 20 - cellHeight,
          width: columnWidths[index],
          height: cellHeight,
          color: rgb(0.8, 0.8, 0.8), // Cor cinza
        });
      }

      const textWidth = helveticaFont.widthOfTextAtSize(data, tableFontSize);
      const textXPos = xPos + (columnWidths[index] - textWidth) / 2;

      currentPage.drawText(data, {
        x: textXPos,
        y: yPos + 20 - 15,
        size: tableFontSize,
        font: helveticaFont,
      });

      // Desenho das bordas para as colunas
      currentPage.drawRectangle({
        x: xPos,
        y: yPos + 20 - cellHeight,
        width: columnWidths[index],
        height: cellHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      xPos += columnWidths[index];
    });

    return yPos - cellHeight;
  };

  const maxWorkdaysPerPage = 6;

  // Função para desenhar a descrição de um workday, com "N/A" se não houver descrição
  function drawDescription(page, day, yPosition) {
    let descriptionText = cleanText(safeText(day.description)); // Limpa o texto removendo quebras de linha

    // Usar "N/A" se a descrição estiver vazia ou for igual a "N/A"
    if (
      descriptionText.trim() === "" ||
      descriptionText.trim().toUpperCase() === "N/A"
    ) {
      descriptionText = "N/A";
    }

    // Atualizar a posição Y para o texto "Dia:"
    yPosition -= 30; // Ajuste inicial para o texto "Dia:"

    // Desenhar o texto "Dia: {data}"
    page.drawText(`Dia: ${safeText(formatDate(day.workDate))}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
      font: helveticaFont,
    });

    // Ajustar a posição y após o texto "Dia:"
    yPosition -= boxPadding;

    // Calcular altura do box
    const boxHeight = fontSize + 2 * boxPadding * 2;

    // Desenhar o retângulo para a descrição
    page.drawRectangle({
      x: 150,
      y: yPosition - 30,
      width: boxWidth,
      height: boxHeight,
      borderColor: rgb(0, 0, 0),
      color: rgb(0.9, 0.9, 0.9),
    });

    // Quebrar a descrição em várias linhas
    const lines = splitTextIntoLines(
      descriptionText,
      boxWidth - (150 + boxPadding * 2),
      helveticaFont,
      8
    );

    // Desenhar cada linha da descrição
    let lineYPosition = yPosition - boxPadding + (boxHeight - fontSize) / 2;
    lines.forEach((line) => {
      page.drawText(line, {
        x: 150 + boxPadding,
        y: lineYPosition,
        size: 8,
        font: helveticaFont,
      });
      lineYPosition -= fontSize + 2; // Ajusta a distância entre as linhas
    });

    // Atualizar o yPosition após desenhar todas as linhas da descrição
    yPosition -= boxHeight - 30;

    return yPosition; // Retornar o novo yPosition
  }

  function cleanText(text) {
    // Substituir as quebras de linha (\n) por espaços, ou removê-las
    return text.replace(/\n/g, " ").trim();
  }

  // Função auxiliar para dividir o texto em várias linhas
  function splitTextIntoLines(text, maxWidth, font, fontSize) {
    const lines = [];
    const words = text.split(" "); // Divide o texto em palavras

    let currentLine = ""; // Inicia uma linha vazia
    for (let word of words) {
      const testLine = currentLine ? currentLine + " " + word : word; // Adiciona a palavra à linha atual
      const testWidth = font.widthOfTextAtSize(testLine, fontSize); // Verifica a largura da linha

      if (testWidth > 350) {
        // Se a linha exceder a largura máxima, adiciona a linha ao array e começa uma nova
        lines.push(currentLine);
        currentLine = word; // Começa a nova linha com a palavra atual
      } else {
        // Se a linha não exceder a largura, continua adicionando a palavra à linha atual
        currentLine = testLine;
      }
    }

    // Adiciona a última linha (caso haja texto restante)
    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  // Loop para cada grupo de workdays
  for (let i = 0; i < workdayChunks.length; i++) {
    const chunk = workdayChunks[i];

    // Se não for a primeira página, criar uma nova página e desenhar cabeçalhos
    if (i > 0) {
      page = createNewPage();
      yPosition = drawTableHeaders(page);
    }

    // Desenhar cada workday no grupo atual
    chunk.forEach((workday, index) => {
      const kmTotal = Number(workday.kmDeparture) + Number(workday.kmReturn);
      const hoursIda = calculateHours(
        workday.departureTime,
        workday.arrivalTime
      );
      const hoursRetorno = calculateHours(
        workday.returnDepartureTime,
        workday.returnArrivalTime
      );
      const hoursWork = calculateHoursWithPause(
        workday.startHour,
        workday.endHour,
        workday.pauseHours
      );

      const rowData = [
        safeText(formatDate(workday.workDate)),
        safeText(workday.departureTime),
        safeText(workday.arrivalTime),
        safeText(hoursIda),
        safeText(workday.returnDepartureTime),
        safeText(workday.returnArrivalTime),
        safeText(hoursRetorno),
        safeText(workday.kmDeparture),
        safeText(workday.kmReturn),
        safeText(kmTotal),
        safeText(workday.startHour),
        safeText(workday.endHour),
        safeText(hoursWork),
        safeText(workday.pauseHours),
      ];

      yPosition = drawWorkdayRow(page, rowData, yPosition);
    });

    let totalHours = 0; // Inicializa a variável para armazenar a soma das horas

    workdays.forEach((workday) => {
      const hoursIda = calculateHours(
        workday.departureTime,
        workday.arrivalTime
      ); // Horas de ida
      const hoursRetorno = calculateHours(
        workday.returnDepartureTime,
        workday.returnArrivalTime
      ); // Horas de retorno

      // Verifica se as horas de ida e retorno são válidas e maiores que zero
      if (parseFloat(hoursIda) > 0) {
        totalHours += parseFloat(hoursIda); // Somando as horas de ida
      }

      if (parseFloat(hoursRetorno) > 0) {
        totalHours += parseFloat(hoursRetorno); // Somando as horas de retorno
      }
    });

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
    let totalWorkHours = 0; // Inicializa a variável para armazenar a soma das horas de trabalho

    workdays.forEach((day) => {
      const hoursWork = calculateHoursWithPause(
        day.startHour,
        day.endHour,
        day.pauseHours
      );
      totalWorkHours += parseFloat(hoursWork); // Acumulando as horas de trabalho
    });

    yPosition -= 0;
    page.drawText("Total de Horas de Trabalho:", {
      x: 50,
      y: yPosition,
      size: fontSize,
      font: helveticaBoldFont,
    });
    page.drawText(safeText(totalWorkHours) + " h", {
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
    page.drawText(safeText(totalHours)  + " h", {
      x: 350,
      y: yPosition - 20,
      size: fontSize,
      font: helveticaFont,
    });

    // Adicionar offset inicial para deslocar todas as descrições
    const offsetY = 40; // Valor do deslocamento

    yPos -= 30;
    page.drawText("Descrição do Trabalho:", {
      x: 50,
      y: yPosition - 40,
      size: fontSize,
      font: helveticaBoldFont,
    });

    // Ajustar yPosition para incluir o offset
    yPosition -= offsetY;

    // Desenhar descrições para os workdays no chunk atual
    chunk.forEach((day) => {
      yPosition = drawDescription(page, day, yPosition); // Atualiza yPosition
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
  }

  // Agora, adicionar a seção "Resultados do Trabalho" em uma nova página
  page = createNewPage();
  yPos = height - 110; // Reiniciar yPos para a nova página

  // Adicionar a seção "Resultados do Trabalho"
  yPos -= 10;
  page.drawText("Resultados do Trabalho:", {
    x: 50,
    y: yPos,
    size: fontSize,
    font: helveticaBoldFont,
  });

  // Adicionar os campos de checkbox e textos relacionados
  const drawCheckbox = (x, y, isChecked, currentPage, fontSize, font) => {
    const checkboxSize = 12; // Tamanho da caixa
    const checkboxSymbol = isChecked ? "X" : ""; // Define o símbolo baseado no valor de 'isChecked'

    // Desenhando a caixa vazia
    currentPage.drawRectangle({
      x,
      y,
      width: checkboxSize,
      height: checkboxSize,
      color: rgb(0.8, 0.8, 0.8), // Cor cinza
      borderWidth: 1,
    });

    // Desenhando o símbolo dentro da caixa
    currentPage.drawText(checkboxSymbol, {
      x: x + 2.5, // Ajuste a posição do texto para dentro da caixa
      y: y + 2, // Ajuste a posição para centralizar o texto na caixa
      size: fontSize,
      font,
    });
  };

  // Desenhar as caixas de "Serviço Concluído", "Retorno Necessário" e outras
  yPos -= 30;
  drawCheckbox(50, yPos, order.concluido, page, fontSize, helveticaFont); // Serviço Concluído
  page.drawText("Serviço Concluído", {
    x: 50 + 20, // Deslocamento após a caixa
    y: yPos + 2,
    size: fontSize,
    font: helveticaFont,
  });

  yPos -= 20; // Ajuste a posição para a próxima caixa
  drawCheckbox(50, yPos, order.retorno, page, fontSize, helveticaFont); // Retorno Necessário
  page.drawText("Retorno Necessário", {
    x: 50 + 20, // Deslocamento após a caixa
    y: yPos + 2,
    size: fontSize,
    font: helveticaFont,
  });

  yPos -= -20; // Ajuste a posição para as outras opções
  drawCheckbox(170, yPos, order.funcionarios, page, fontSize, helveticaFont); // Funcionários
  page.drawText("Instrução dos Funcionários", {
    x: 170 + 20, // Deslocamento após a caixa
    y: yPos + 2,
    size: fontSize,
    font: helveticaFont,
  });

  yPos -= 20;
  drawCheckbox(170, yPos, order.documentacao, page, fontSize, helveticaFont); // Documentação
  page.drawText("Entrega da Documentação", {
    x: 170 + 20, // Deslocamento após a caixa
    y: yPos + 2,
    size: fontSize,
    font: helveticaFont,
  });

  yPos -= -20;
  drawCheckbox(340, yPos, order.producao, page, fontSize, helveticaFont); // Produção
  page.drawText("Liberação para Produção", {
    x: 340 + 20, // Deslocamento após a caixa
    y: yPos + 2,
    size: fontSize,
    font: helveticaFont,
  });

  yPos -= 20;
  drawCheckbox(340, yPos, order.pecas, page, fontSize, helveticaFont); // Peças
  page.drawText("Envio do Orçamento de Peças", {
    x: 340 + 20, // Deslocamento após a caixa
    y: yPos + 2,
    size: fontSize,
    font: helveticaFont,
  });

  yPos -= 20; // Posição para as notas
  page.drawText("Notas:", {
    x: 100,
    y: yPos,
    size: fontSize,
    font: helveticaFont,
  });

  yPos -= 10; // Posição para as notas
  page.drawRectangle({
    x: 150,
    y: yPos - 10, // Alinhamento da caixa
    width: boxWidth,
    height: fontSize + 2 * boxPadding, // Altura da caixa
    borderColor: rgb(0, 0, 0), // Cor da borda
    color: rgb(0.9, 0.9, 0.9), // Cor de fundo da caixa
  });

  // Desenha a descrição dentro da caixa
  page.drawText(safeText(order.resultDescription), {
    x: 150 + boxPadding,
    y: yPos + 8, // Ajuste para centralizar verticalmente
    size: 8,
    font: helveticaFont,
    lineHeight: 10,
  });

  yPos -= 60;
  page.drawText("Pontos em Aberto:", {
    x: 50,
    y: yPos,
    size: fontSize,
    font: helveticaBoldFont,
  });
  page.drawText(safeText(order.openPoints), {
    x: 50,
    y: yPos - 20,
    size: fontSize,
    font: helveticaFont,
  });

  // Assinatura
  yPos -= 80;
  page.drawText("Assinatura Cliente e Técnico", {
    x: 50,
    y: yPos,
    size: fontSize,
    font: helveticaBoldFont,
  });

  // Configurações para linhas e textos
  const lineWidth = 150; // Largura de cada linha
  const gapBetweenLines = 50; // Espaço entre as duas linhas
  const lineHeight = 2; // Espessura da linha

  // Coordenadas X para centralizar as linhas
  const clienteX = (pageWidth - 2 * lineWidth - gapBetweenLines) / 2;
  const tecnicoX = clienteX + lineWidth + gapBetweenLines;

  // Atualiza a posição Y para as linhas (abaixo da assinatura)
  yPos -= 40; // Ajusta a distância abaixo do texto da assinatura

  // Desenhar a linha "Cliente"
  page.drawLine({
    start: { x: clienteX, y: yPos },
    end: { x: clienteX + lineWidth, y: yPos },
    thickness: lineHeight,
    color: rgb(0, 0, 0),
  });

  // Texto "(Cliente)" abaixo da linha
  page.drawText("(Cliente)", {
    x: clienteX + lineWidth / 2 - fontSize * 2, // Centraliza o texto no meio da linha
    y: yPos - 15,
    size: fontSize,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });

  // Criar um campo de texto para assinatura (cliente)
  const clienteField = form.createTextField("clienteSignature");
  clienteField.addToPage(page, {
    x: 145,
    y: yPos + 4, // Ajuste a posição Y conforme necessário
    width: 110,
    height: 20,
  });
  clienteField.setText("");

  // Desenhar a linha "Técnico"
  page.drawLine({
    start: { x: tecnicoX, y: yPos },
    end: { x: tecnicoX + lineWidth, y: yPos },
    thickness: lineHeight,
    color: rgb(0, 0, 0),
  });

  // Texto "(Técnico)" abaixo da linha
  page.drawText("(Técnico)", {
    x: tecnicoX + lineWidth / 2 - fontSize * 2, // Centraliza o texto no meio da linha
    y: yPos - 15,
    size: fontSize,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });

  // Criar um campo de texto para assinatura (técnico)
  const tecnicoField = form.createTextField("tecnicoSignature");
  tecnicoField.addToPage(page, {
    x: 345,
    y: yPos + 4, // Ajuste a posição Y conforme necessário
    width: 110,
    height: 20,
  });
  tecnicoField.setText("");

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

export default generateServiceOrderPDFPlus;

function calculateHours(start, end) {
  const startTime = new Date(`1970-01-01T${start}:00`);
  let endTime = new Date(`1970-01-01T${end}:00`);

  // Se a hora de chegada for anterior à hora de saída, significa que a chegada é no dia seguinte
  if (endTime < startTime) {
    endTime.setDate(endTime.getDate() + 1); // Adiciona 1 dia à data de chegada
  }

  const diff = (endTime - startTime) / 1000 / 3600;

  return diff >= 0 ? diff.toFixed(1) : "0"; // Retorna 0 em vez de "N/A"
}

function calculateHoursWithPause(start, end, pauseHours) {
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

  return diff >= 0 ? diff.toFixed(1) : "0"; // Retorna 0 em vez de um valor negativo
}
