import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.jsx";

async function generateServiceOrderPDFPlus(
  orderIdForPDF,
  order,
  client,
  equipment,
  workdays
) {
  console.log("workdays no início da função:", workdays);
  console.log("É um array:", Array.isArray(workdays));
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

  const getCurrentorderId = async () => {
    const counterRef = doc(db, "counters", "ordersCounter");
    const counterSnapshot = await getDoc(counterRef);
    if (counterSnapshot.exists()) {
      return counterSnapshot.data().count || 0; // Retorna o contador ou 0 se não existir
    } else {
      console.error("Contador não encontrado!");
      return 0;
    }
  };

  // Load background images
  const backgroundImageBytes = await fetch("/nonato3.png").then((res) =>
    res.arrayBuffer()
  );
  const backgroundImage = await pdfDoc.embedPng(backgroundImageBytes);

  const topImageBytes = await fetch("/nonato2.png").then((res) =>
    res.arrayBuffer()
  );
  const topImage = await pdfDoc.embedPng(topImageBytes);

  // Function to create a new page with background and top images
  const createNewPage = () => {
    const newPage = pdfDoc.addPage([pageWidth, pageHeight]);
    const { height } = newPage.getSize();

    // Draw background and top images
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
  const yPosi = height - 50;
  page.drawText("Relatório de Serviço", {
    x: 220, // Adjust position to the right
    y: height - 50,
    size: 16,
    color: rgb(0.0667, 0.4902, 0.2863),
    font: helveticaBoldFont,
  });

  const orderId = await getCurrentorderId(); // Busca o ID do contador
  // Adicionando "Ordem Nº: [id]" ao lado do título
  // Calculando a largura do retângulo com base no comprimento do número
  const orderIdLength = `${orderId}`.length; // Número de caracteres do orderId
  const charWidth = 7; // Largura média de cada caractere em unidades (ajustável conforme necessário)

  // A largura do retângulo é a largura média de cada caractere multiplicada pelo número de caracteres
  const rectWidth = orderIdLength * charWidth + 20;

  // Desenhar o texto com o número do serviço
  page.drawText(`Nº: ${orderId}`, {
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

  // Add "ASSISTÊNCIA TÉCNICA" below "Protocolo de Serviço"
  page.drawText("ASSISTÊNCIA TÉCNICA", {
    x: 228, // Maintain same horizontal position
    y: height - 70, // Move down 20 units
    size: 12,
    color: rgb(0.0667, 0.4902, 0.2863),
    font: helveticaBoldFont,
  });
  // page.drawText("Tel (SERVIÇO): 911115479 - EMAIL: service.nonato@gmail.com", {
  //   x: 303,
  //   y: height - 860,
  //   size: 8,
  //   font: helveticaFont,
  // });

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

  // Ordena os dias de trabalho por data, se workdays for um array
  if (Array.isArray(workdays)) {
    workdays.sort((a, b) => new Date(a.workDate) - new Date(b.workDate));
  }

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

  // Novo cabeçalho adicional
  const extraHeaders = ["DATA", "IDA", "RETORNO", "KM", "HORAS", "PAUSA"];
  const extraHeaderWidths = [44, 105, 105, 101, 101, 40]; // Larguras aproximadas para acomodar o texto

  // Função para desenhar cabeçalhos da tabela
  const drawTableHeaders = (currentPage) => {
    let xPos = 50;
    const extraHeaderYPosition = tableYStart - 10; // Posição vertical para os novos cabeçalhos

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
    const headerYPosition = extraHeaderYPosition - 17; // Aumentei o espaçamento para evitar sobreposição
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

  // Função para desenhar cabeçalhos da tabela
  const drawTableHeaders2 = (currentPage) => {
    let xPos = 50;
    const extraHeaderYPosition = infoYStart - 5; // Posição vertical para os novos cabeçalhos

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
    const headerYPosition = extraHeaderYPosition - 17; // Aumentei o espaçamento para evitar sobreposição
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

    // Verificar se a descrição é vazia ou igual a "N/A"
    if (
      descriptionText.trim() === "" ||
      descriptionText.trim().toUpperCase() === "N/A"
    ) {
      return yPosition; // Se não houver descrição, retorna o yPosition atual sem desenhar nada
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
      yPosition = drawTableHeaders2(page);
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

  yPosition -= 50;
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
  yPos -= 500;
  page.drawText("Assinatura Cliente e Técnico:", {
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
