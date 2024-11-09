import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

async function generateServiceOrderPDF(order, client, equipment, workdays) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 900]);
  const { width, height } = page.getSize();
  const fontSize = 10;
  const tableFontSize = 8;

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
  const backgroundImageBytes = await fetch("/background3.png").then((res) =>
    res.arrayBuffer()
  );
  const backgroundImage = await pdfDoc.embedPng(backgroundImageBytes);

  // Desenhar a imagem de fundo
  const backgroundImageWidth = 700; // Ajuste o tamanho da imagem conforme necessário
  const backgroundImageHeight = 1000; // Ajuste o tamanho da imagem conforme necessário
  page.drawImage(backgroundImage, {
    x: -40,
    y: height - backgroundImageHeight + 50, // Empurra a imagem para baixo
    width: backgroundImageWidth,
    height: backgroundImageHeight,
  });

  // Carregar a imagem do fundo
  const topImageBytes = await fetch("/nonato.png").then((res) =>
    res.arrayBuffer()
  );
  const topImage = await pdfDoc.embedPng(topImageBytes);

  // Desenhar a imagem de fundo
  const topImageWidth = 50; // Ajuste o tamanho da imagem conforme necessário
  const topImageHeight = 50; // Ajuste o tamanho da imagem conforme necessário
  page.drawImage(topImage, {
    x: 190,
    y: height - topImageHeight - 30, // Empurra a imagem para baixo
    width: topImageWidth,
    height: topImageHeight,
  });

  const yPosi = height - 50;
  // Adicionando "Protocolo de Serviço"
  page.drawText("Protocolo de Serviço", {
    x: 250, // Ajuste a posição para a direita
    y: yPosi,
    size: 16,
    color: rgb(0, 0, 0.8),
    font: helveticaBoldFont,
  });

  // Adicionando "ASSISTÊNCIA TÉCNICA" abaixo de "Protocolo de Serviço"
  page.drawText("ASSISTÊNCIA TÉCNICA", {
    x: 260, // Mantém a mesma posição horizontal
    y: yPosi - 20, // Desloca 20 unidades para baixo (ajuste conforme necessário)
    size: 12,
    color: rgb(0, 0, 0.8),
    font: helveticaBoldFont,
  });
  page.drawText("Tel (SERVIÇO): 911115479 - EMAIL: service.nonato@gmail.com", {
    x: 150,
    y: height - 90,
    size: fontSize,
    font: helveticaFont,
  });

  // Informações Básicas
  const infoYStart = height - 110;
  page.drawText(`Técnico: ${safeText(order.technician)}`, {
    x: 50,
    y: infoYStart,
    size: fontSize,
    font: helveticaFont,
  });
  page.drawText(`Data: ${safeText(order.date)}`, {
    x: 300,
    y: infoYStart,
    size: fontSize,
    font: helveticaFont,
  });
  page.drawText(`Cliente: ${safeText(client.name)}`, {
    x: 50,
    y: infoYStart - 20,
    size: fontSize,
    font: helveticaFont,
  });
  page.drawText(`Telefone: ${safeText(client.phone)}`, {
    x: 50,
    y: infoYStart - 60,
    size: fontSize,
    font: helveticaFont,
  });
  page.drawText(
    `Máquina/Modelo: ${safeText(equipment.brand)} ${safeText(equipment.model)}`,
    { x: 300, y: infoYStart - 20, size: fontSize, font: helveticaFont }
  );
  page.drawText(`Número da Máquina: ${safeText(equipment.serialNumber)}`, {
    x: 300,
    y: infoYStart - 40,
    size: fontSize,
    font: helveticaFont,
  });
  page.drawText(`Cidade: ${safeText(client.address)}`, {
    x: 50,
    y: infoYStart - 40,
    size: fontSize,
    font: helveticaFont,
  });
  page.drawText(`Tipo de Serviço: ${safeText(order.serviceType)}`, {
    x: 50,
    y: infoYStart - 80,
    size: fontSize,
    font: helveticaFont,
  });

  // Ordena os dias de trabalho por data
  workdays.sort((a, b) => new Date(a.workDate) - new Date(b.workDate));

  // Configuração da tabela
  let tableYStart = infoYStart - 100;
  const cellHeight = 20;
  const columnWidths = [48, 30, 44, 25, 30, 44, 25, 25, 44, 30, 32, 42, 25, 40];
  const headers = [
    "dd/mm/aa",
    "Saída",
    "Chegada",
    "hs",
    "Saída",
    "Chegada",
    "hs",
    "ida",
    "Retorno",
    "Total",
    "Início",
    "Término",
    "hs",
    "Horas",
  ];

  // Novo cabeçalho adicional
  const extraHeaders = ["DATA", "IDA", "RETORNO", "KM", "HORAS", "PAUSA"];
  const extraHeaderWidths = [48, 99, 99, 99, 99, 40]; // Larguras aproximadas para acomodar o texto

  let xPos = 50; // Declara `xPos` apenas uma vez no escopo da função
  const extraHeaderYPosition = tableYStart - 5; // Posição vertical para os novos cabeçalhos
  extraHeaders.forEach((header, index) => {
    page.drawText(header, {
      x: xPos + 5,
      y: extraHeaderYPosition - 10,
      size: tableFontSize,
      font: helveticaBoldFont,
    });
    xPos += extraHeaderWidths[index];
  });

  // Ajuste a posição vertical para os cabeçalhos principais
  xPos = 50; // Redefine `xPos` antes de usá-lo para os cabeçalhos originais
  const headerYPosition = extraHeaderYPosition - 20; // Aumentei o espaçamento para evitar sobreposição
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

    page.drawText(header, {
      x: xPos + 5,
      y: headerYPosition - 15,
      size: tableFontSize,
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

  // Desenha as bordas para o cabeçalho adicional
  xPos = 50; // Redefine `xPos` antes de usá-lo para as bordas dos cabeçalhos adicionais
  extraHeaders.forEach((_, index) => {
    page.drawRectangle({
      x: xPos,
      y: extraHeaderYPosition - cellHeight,
      width: extraHeaderWidths[index],
      height: cellHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    xPos += extraHeaderWidths[index];
  });

  // Preenche as linhas de dados
  workdays.forEach((day) => {
    const kmTotal = Number(day.kmDeparture) + Number(day.kmReturn);
    const hoursIda = calculateHours(day.departureTime, day.arrivalTime);
    const hoursRetorno = calculateHours(
      day.returnDepartureTime,
      day.returnArrivalTime
    );
    const hoursWork = calculateHours(day.arrivalTime, day.returnDepartureTime);

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
      safeText(day.arrivalTime),
      safeText(day.returnDepartureTime),
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

      page.drawText(data, {
        x: xPos + 5,
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

  // Função para calcular horas
  function calculateHours(start, end) {
    const startTime = new Date(`1970-01-01T${start}:00`);
    let endTime = new Date(`1970-01-01T${end}:00`);

    // Se a hora de chegada for anterior à hora de saída, significa que a chegada é no dia seguinte
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1); // Adiciona 1 dia à data de chegada
    }

    const diff = (endTime - startTime) / 1000 / 3600;
    return diff >= 0 ? diff.toFixed(1) : "N/A";
  }

  // Seções de Observações e Conclusão
  let totalWorkHours = 0; // Inicializa a variável para armazenar a soma das horas de trabalho

  workdays.forEach((day) => {
    const hoursWork = calculateHours(day.arrivalTime, day.returnDepartureTime);
    totalWorkHours += parseFloat(hoursWork); // Acumulando as horas de trabalho
  });

  yPosition -= 0;
  page.drawText("Total de Horas de Trabalho:", {
    x: 50,
    y: yPosition,
    size: fontSize,
    font: helveticaBoldFont,
  });
  page.drawText(safeText(totalWorkHours), {
    x: 50,
    y: yPosition - 20,
    size: fontSize,
    font: helveticaFont,
  });
  yPosition -= 50;
  page.drawText("Descrição do Trabalho:", {
    x: 50,
    y: yPosition,
    size: fontSize,
    font: helveticaBoldFont,
  });
  page.drawText(safeText(order.workDescription), {
    x: 50,
    y: yPosition - 20,
    size: fontSize,
    font: helveticaFont,
  });

  yPosition -= 60;
  page.drawText("Resultados do Trabalho:", {
    x: 50,
    y: yPosition,
    size: fontSize,
    font: helveticaBoldFont,
  });
  page.drawText(safeText(order.workResult), {
    x: 50,
    y: yPosition - 20,
    size: fontSize,
    font: helveticaFont,
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

  // Assinatura
  yPosition -= 80;
  page.drawText("Assinatura Cliente e Técnico", {
    x: 50,
    y: yPosition,
    size: fontSize,
    font: helveticaBoldFont,
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
