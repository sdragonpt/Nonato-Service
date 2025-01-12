import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const generateServiceOrderPDF = async (
  orderIdForPDF,
  order,
  client,
  equipment,
  workdays
) => {
  const pdfDoc = await PDFDocument.create();
  let currentPage = null;

  // Configurações gerais
  const pageWidth = 600;
  const pageHeight = 900;
  const fontSize = 10;
  const tableFontSize = 8;
  const margin = 50;
  let yPos = 0;
  const minBottomMargin = 50;

  // Carregar fontes
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Função para criar nova página
  const createNewPage = () => {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    yPos = pageHeight - margin;

    // Carregar imagens na nova página
    try {
      // Background image
      const drawBackgroundImage = async () => {
        const response = await fetch("/nonato3.png");
        const imageBytes = await response.arrayBuffer();
        const image = await pdfDoc.embedPng(imageBytes);
        currentPage.drawImage(image, {
          x: -60,
          y: pageHeight - 1000 + 50,
          width: 700,
          height: 1000,
        });
      };

      // Logo
      const drawLogo = async () => {
        const response = await fetch("/nonato2.png");
        const imageBytes = await response.arrayBuffer();
        const image = await pdfDoc.embedPng(imageBytes);
        currentPage.drawImage(image, {
          x: 40,
          y: pageHeight - 65 - 40,
          width: 65,
          height: 85,
        });
      };

      drawBackgroundImage();
      drawLogo();
    } catch (error) {
      console.error("Erro ao carregar imagens:", error);
    }

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
    // Título
    currentPage.drawText("Relatório de Serviço", {
      x: 220,
      y: pageHeight - 50,
      size: 16,
      color: rgb(0.0667, 0.4902, 0.2863),
      font: boldFont,
    });

    // Número do serviço
    currentPage.drawText(`Nº: ${orderIdForPDF}`, {
      x: 500,
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
      x: 228,
      y: pageHeight - 70,
      size: 12,
      color: rgb(0.0667, 0.4902, 0.2863),
      font: boldFont,
    });

    // Informações de contato
    currentPage.drawText(
      "Tel (SERVIÇO): 911115479 - EMAIL: service.nonato@gmail.com",
      {
        x: 303,
        y: pageHeight - 860,
        size: 8,
        font: font,
      }
    );

    yPos = pageHeight - 90;
  };

  // Desenhar cabeçalho na primeira página
  drawPageHeader();

  // ... continuação do código anterior ...

  // Função para desenhar texto com retângulo ao redor
  const drawTextWithBox = (text, x, y, width, textOptions = {}) => {
    const { size = fontSize, useFont = font } = textOptions;

    // Desenhar retângulo
    currentPage.drawRectangle({
      x: x - 2,
      y: y - fontSize + 6,
      width: width,
      height: fontSize + 6,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
      opacity: 0.3,
    });

    // Desenhar texto
    currentPage.drawText(text, {
      x,
      y,
      size,
      font: useFont,
    });

    return y - 20; // Retorna a próxima posição Y
  };

  // Desenhar informações básicas
  const drawBasicInfo = () => {
    let localYPos = yPos;

    // Técnico e Data
    localYPos = drawTextWithBox(`Técnico: Nonato`, 58, localYPos, 120);
    drawTextWithBox(`Data: ${safeText(order.date)}`, 307, localYPos + 20, 120);

    // Cliente e Máquina
    localYPos = drawTextWithBox(
      `Cliente: ${safeText(client.name)}`,
      58,
      localYPos,
      230
    );
    drawTextWithBox(
      `Máquina/Modelo: ${safeText(equipment.brand)} ${safeText(
        equipment.model
      )}`,
      307,
      localYPos + 20,
      230
    );

    // Cidade e Número da Máquina
    localYPos = drawTextWithBox(
      `Cidade: ${safeText(client.address)}`,
      58,
      localYPos,
      230
    );
    drawTextWithBox(
      `Número da Máquina: ${safeText(equipment.serialNumber)}`,
      307,
      localYPos + 20,
      230
    );

    // Telefone e Tipo de Serviço
    localYPos = drawTextWithBox(
      `Telefone: ${safeText(client.phone)}`,
      58,
      localYPos,
      230
    );
    drawTextWithBox(
      `Tipo de Serviço: ${safeText(order.serviceType)}`,
      58,
      localYPos - 20,
      230
    );

    // Retângulo ao redor de todas as informações básicas
    currentPage.drawRectangle({
      x: 50,
      y: yPos - 110,
      width: 496,
      height: yPos - localYPos + 50,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    return localYPos - 40; // Retorna a posição final
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

    return yPos - 40;
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

  // Desenhar linhas da tabela
  workdays.forEach((workday) => {
    if (checkAndCreateNewPage(40)) {
      drawPageHeader();
      yPos = drawTableHeader();
    }
    yPos = drawTableRow(workday);
  });

  // ... continuação do código anterior ...

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
    workdays.forEach((day) => {
      const description = safeText(day.description);
      if (
        description.trim() !== "" &&
        description.trim().toUpperCase() !== "N/A"
      ) {
        // Verificar espaço para nova descrição
        if (checkAndCreateNewPage(80)) {
          drawPageHeader();
        }

        yPos -= 30;
        // Data do dia
        currentPage.drawText(`Dia: ${formatDate(day.workDate)}`, {
          x: 50,
          y: yPos,
          size: fontSize,
          font: font,
        });

        // Caixa de descrição
        const boxHeight = fontSize + 20;
        currentPage.drawRectangle({
          x: 150,
          y: yPos - 30,
          width: 396,
          height: boxHeight,
          borderColor: rgb(0, 0, 0),
          color: rgb(0.9, 0.9, 0.9),
        });

        // Texto da descrição
        currentPage.drawText(description, {
          x: 160,
          y: yPos - 20,
          size: 8,
          font: font,
        });

        yPos -= 50;
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
      // Calcular tempo de ida
      const goingHours = calculateHours(day.departureTime, day.arrivalTime);
      const [goingH, goingM] = goingHours.split(":").map(Number);
      totalMinutes += goingH * 60 + goingM;

      // Calcular tempo de volta
      const returnHours = calculateHours(
        day.returnDepartureTime,
        day.returnArrivalTime
      );
      const [returnH, returnM] = returnHours.split(":").map(Number);
      totalMinutes += returnH * 60 + returnM;
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  // Desenhar resultados e checkboxes
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
    drawCheckbox(50, yPos, order.concluido, "Serviço Concluído");
    yPos -= 20;
    drawCheckbox(50, yPos, order.retorno, "Retorno Necessário");

    // Segunda coluna
    yPos += 20;
    drawCheckbox(170, yPos, order.funcionarios, "Instrução dos Funcionários");
    yPos -= 20;
    drawCheckbox(170, yPos, order.documentacao, "Entrega da Documentação");

    // Terceira coluna
    yPos += 20;
    drawCheckbox(340, yPos, order.producao, "Liberação para Produção");
    yPos -= 20;
    drawCheckbox(340, yPos, order.pecas, "Envio do Orçamento de Peças");

    // Notas
    yPos -= 40;
    currentPage.drawText("Notas:", {
      x: 100,
      y: yPos,
      size: fontSize,
      font: font,
    });

    const boxHeight = fontSize + 20;
    currentPage.drawRectangle({
      x: 150,
      y: yPos - 10,
      width: 396,
      height: boxHeight,
      borderColor: rgb(0, 0, 0),
      color: rgb(0.9, 0.9, 0.9),
    });

    currentPage.drawText(safeText(order.resultDescription), {
      x: 160,
      y: yPos + 8,
      size: 8,
      font: font,
    });

    // Pontos em aberto
    yPos -= 60;
    currentPage.drawText("Pontos em Aberto:", {
      x: 50,
      y: yPos,
      size: fontSize,
      font: boldFont,
    });
    currentPage.drawText(safeText(order.openPoints), {
      x: 50,
      y: yPos - 20,
      size: fontSize,
      font: font,
    });
  };

  // Função para desenhar área de assinaturas
  const drawSignatures = () => {
    if (checkAndCreateNewPage(100)) {
      drawPageHeader();
    }

    yPos -= 40;
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

  // Desenhar o retângulo ao redor das informações básicas
  currentPage.drawRectangle({
    x: 40,
    y: 100,
    width: 300,
    height: 300,
    borderColor: rgb(0, 0, 0), // Cor preta para a borda
    borderWidth: 1, // Largura da borda
  });

  // Desenhar todas as seções
  yPos = drawDescriptions();
  drawResults();
  drawSignatures();

  // Salvar e fazer download do PDF
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Ordem_Servico_${client.name}.pdf`;
  link.click();
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
