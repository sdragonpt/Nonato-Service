import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

async function generateServiceOrderPDF(order, client, equipment, workdays) {
  const pdfDoc = await PDFDocument.create();
  const pageWidth = 600;
  const pageHeight = 900;
  const fontSize = 10;
  const tableFontSize = 8;
  const minY = 50; // Margem inferior mínima para desenhar
  const maxDaysPerPage = 5;

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
  const backgroundImageBytes = await fetch("/background5.png").then((res) =>
    res.arrayBuffer()
  );
  const backgroundImage = await pdfDoc.embedPng(backgroundImageBytes);

  // Carregar a imagem do topo
  const topImageBytes = await fetch("/nonato.png").then((res) =>
    res.arrayBuffer()
  );
  const topImage = await pdfDoc.embedPng(topImageBytes);

  // Função auxiliar para criar uma nova página
  const createNewPage = () => {
    const newPage = pdfDoc.addPage([pageWidth, pageHeight]);
    const { height } = newPage.getSize();

    // Desenhar as imagens na nova página
    newPage.drawImage(backgroundImage, {
      x: -40,
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
    color: rgb(0, 0, 0.8),
    font: helveticaBoldFont,
  });

  // Adicionando "ASSISTÊNCIA TÉCNICA" abaixo de "Protocolo de Serviço"
  page.drawText("ASSISTÊNCIA TÉCNICA", {
    x: 228, // Mantém a mesma posição horizontal
    y: yPosi - 20, // Desloca 20 unidades para baixo (ajuste conforme necessário)
    size: 12,
    color: rgb(0, 0, 0.8),
    font: helveticaBoldFont,
  });
  page.drawText("Tel (SERVIÇO): 911115479 - EMAIL: service.nonato@gmail.com", {
    x: 303,
    y: height - 860,
    size: 8,
    font: helveticaFont,
  });

  // Informações Básicas
  const infoYStart = height - 110;
  page.drawText(`Técnico: Nonato`, {
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
  page.drawText(`${safeText(client.postalCode)}`, {
    x: 185,
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
  const extraHeaderYPosition = tableYStart - 5; // Posição vertical para os novos cabeçalhos
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
    const startTime = new Date(`1970-01-01T${start}:00`);
    let endTime = new Date(`1970-01-01T${end}:00`);

    // Se a hora de chegada for anterior à hora de saída, significa que a chegada é no dia seguinte
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1); // Adiciona 1 dia à data de chegada
    }

    const diff = (endTime - startTime) / 1000 / 3600;

    return diff >= 0 ? diff.toFixed(1) : "0"; // Retorna 0 em vez de "N/A"
  }

  // Função para calcular horas, subtraindo o tempo de pausa
  function calculateHoursWithPause(start, end, pauseHours) {
    const startTime = new Date(`1970-01-01T${start}:00`);
    let endTime = new Date(`1970-01-01T${end}:00`);

    // Se a hora de chegada for anterior à hora de saída, significa que a chegada é no dia seguinte
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1); // Adiciona 1 dia à data de chegada
    }

    // Calcula a diferença em horas
    let diff = (endTime - startTime) / 1000 / 3600;

    // Subtrai o tempo de pausa (pauseHours) do total
    diff -= pauseHours;

    return diff >= 0 ? diff.toFixed(1) : "0"; // Retorna 0 em vez de "N/A"
  }

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
  page.drawText(safeText(totalWorkHours), {
    x: 50,
    y: yPosition - 20,
    size: fontSize,
    font: helveticaFont,
  });

  const boxPadding = 10; // Espaçamento interno da caixa
  const boxWidth = 396; // Largura da caixa de descrição

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
    // Se a descrição estiver vazia ou for "N/A", não desenha nada e apenas move para o próximo item
    else {
      yPosition -= 0; // Ajuste para o próximo item sem adicionar a caixa de descrição
    }
  });

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
