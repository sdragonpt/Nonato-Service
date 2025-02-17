import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import formatEuroNumber from "../../../../utils/formatters/formatEuroNumber";
import {
  calculateTotalsWithIVA,
  formatCurrency,
} from "@/utils/formatters/budgetCalculations";

const generateBudgetPDF = async (
  order,
  client,
  selectedServices,
  orderNumber
) => {
  const pdfDoc = await PDFDocument.create();
  let currentPage = pdfDoc.addPage([595.28, 841.89]); // A4
  let pageNumber = 1;
  let totalPages = 1;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Configurações
  const fontSize = 10;
  const titleSize = 16;
  const headerSize = 12;
  const margin = 50;
  let y = currentPage.getHeight() - margin;
  const initialX = margin;
  const pageWidth = currentPage.getWidth() - 2 * margin;
  const minBottomMargin = 70;

  function getTotalWidth(columns) {
    return columns.reduce((total, col) => total + col.width, 0);
  }

  // Configurações do logo
  const imgWidth = 100;
  const textStartX = margin + imgWidth + 20; // Texto começa 20 pontos após a imagem

  // Funções auxiliares
  const writeText = (text, options = {}) => {
    const {
      x = initialX,
      y: yPos = y,
      size = fontSize,
      useFont = font,
      color = rgb(0, 0, 0),
      align = "left",
      width = pageWidth,
    } = options;

    let xPos = x;
    const textWidth = useFont.widthOfTextAtSize(text, size);

    if (align === "right") {
      xPos = x + width - textWidth;
    } else if (align === "center") {
      xPos = x + (width - textWidth) / 2;
    }

    currentPage.drawText(text, {
      x: xPos,
      y: yPos,
      size,
      font: useFont,
      color,
    });
  };

  const drawRect = (x, y, width, height, color = rgb(0, 0, 0)) => {
    currentPage.drawRectangle({
      x,
      y,
      width,
      height,
      color,
    });
  };

  const checkAndCreateNewPage = (requiredSpace) => {
    if (y - requiredSpace < minBottomMargin) {
      currentPage = pdfDoc.addPage([595.28, 841.89]);
      pageNumber++;
      totalPages++;
      y = currentPage.getHeight() - margin;
      return true;
    }
    return false;
  };

  // Tente carregar a imagem usando fetch
  try {
    const response = await fetch("/nonato2.png");
    const arrayBuffer = await response.arrayBuffer();
    const image = await pdfDoc.embedPng(arrayBuffer);

    // Calcular dimensões da imagem mantendo proporção
    const imgHeight = (imgWidth * image.height) / image.width;

    // Desenhar logo apenas na primeira página (no lado esquerdo)
    currentPage.drawImage(image, {
      x: margin,
      y: currentPage.getHeight() - margin - 100,
      width: imgWidth,
      height: imgHeight,
    });
  } catch (error) {
    console.error("Erro ao carregar o logo:", error);
  }

  // Cabeçalho
  writeText("Nonato Service", {
    x: textStartX,
    size: titleSize,
    useFont: boldFont,
  });
  y -= 20;

  writeText("nonato.service@gmail.com", {
    x: textStartX,
  });
  y -= 15;

  writeText("+351 911 115 479", {
    x: textStartX,
  });
  y -= 35;

  // Data à direita
  const currentDate = new Date().toLocaleDateString();
  writeText(currentDate, {
    y: currentPage.getHeight() - margin,
    align: "right",
  });

  y -= 30;
  writeText("Procuramos fazer o melhor para a sua Empresa", {
    useFont: boldFont,
  });

  // Caixa preta com número do orçamento
  y -= 10;
  const orderBoxHeight = 40;
  drawRect(
    initialX,
    y - orderBoxHeight,
    pageWidth,
    orderBoxHeight,
    rgb(0, 0, 0)
  );
  writeText("FECHAMENTO DA ORDEM DE SERVIÇO Nº" + orderNumber, {
    x: 58,
    y: y - 25,
    useFont: boldFont,
    color: rgb(1, 1, 1),
  });
  writeText("Assistência Técnica", {
    x: 40,
    y: y - 25,
    color: rgb(1, 1, 1),
    align: "right",
  });

  // Cliente
  y -= orderBoxHeight + 20;
  writeText(`Cliente: ${client.name}`, { useFont: boldFont });

  // Informações básicas
  // y -= 40;
  // drawRect(initialX, y - 30, pageWidth, 30, rgb(0.95, 0.95, 0.95));
  // writeText("Informações básicas", {
  //   y: y - 20,
  //   useFont: boldFont,
  //   size: headerSize,
  // });

  // Serviços
  y -= 14;
  drawRect(initialX, y - 30, pageWidth, 30, rgb(0.95, 0.95, 0.95));
  writeText("Serviços", {
    x: 55,
    y: y - 20,
    useFont: boldFont,
    size: headerSize,
  });

  // Cabeçalhos da tabela
  y -= 50;
  const columns = [
    { header: "Descrição", width: pageWidth * 0.4, align: "left" },
    { header: "Unidade", width: pageWidth * 0.15, align: "left" },
    { header: "Preço unitário", width: pageWidth * 0.15, align: "right" },
    { header: "Qtd.", width: pageWidth * 0.15, align: "right" },
    { header: "Preço", width: pageWidth * 0.15, align: "right" },
  ];

  let xPos = initialX;
  columns.forEach((col) => {
    writeText(col.header, {
      x: xPos,
      useFont: boldFont,
      width: col.width,
      align: col.align,
    });
    xPos += col.width;
  });

  // Linhas de serviços
  y -= 30;
  selectedServices.forEach((service) => {
    // Verifica se precisa de nova página para o serviço
    if (checkAndCreateNewPage(60)) {
      // Se criou nova página, reescreve os cabeçalhos
      xPos = initialX;
      columns.forEach((col) => {
        writeText(col.header, {
          x: xPos,
          useFont: boldFont,
          width: col.width,
          align: col.align,
        });
        xPos += col.width;
      });
      y -= 30;
    }

    xPos = initialX;

    writeText(service.name, {
      x: xPos,
      width: columns[0].width,
      align: "left",
    });

    writeText(service.type, {
      x: xPos + columns[0].width,
      width: columns[1].width,
      align: "left",
    });

    writeText(`${formatEuroNumber(service.value || 0)} €`, {
      x: xPos + columns[0].width + columns[1].width,
      width: columns[2].width,
      align: "right",
    });

    writeText(service.quantity.toString(), {
      x: xPos + columns[0].width + columns[1].width + columns[2].width,
      width: columns[3].width,
      align: "right",
    });

    writeText(`${formatEuroNumber(service.total || 0)} €`, {
      x:
        xPos +
        columns[0].width +
        columns[1].width +
        columns[2].width +
        columns[3].width,
      width: columns[4].width,
      align: "right",
    });

    // Desenha a linha abaixo do serviço
    currentPage.drawLine({
      start: { x: initialX, y: y - 10 },
      end: { x: initialX + getTotalWidth(columns), y: y - 10 },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8), // Cinza claro
    });

    y -= 30;
  });

  // Total
  if (checkAndCreateNewPage(70)) {
    y -= 30; // Espaço adicional se estiver em nova página
  }

  y -= 10;
  const totalsData = calculateTotalsWithIVA(
    selectedServices,
    order.ivaRate || 0
  );
  drawRect(295, y - 10, 250, 30, rgb(0.95, 0.95, 0.95));
  writeText("Subtotal", {
    x: 300,
    y: y,
    color: rgb(0, 0, 0),
    useFont: boldFont,
  });
  writeText(`${formatEuroNumber(totalsData.subtotal)} €`, {
    x: 40,
    y: y,
    align: "right",
    color: rgb(0, 0, 0),
    useFont: boldFont,
  });

  // Add IVA if rate is greater than 0
  if (order.ivaRate > 0 && order.showIVA) {
    y -= 40;
    drawRect(295, y - 10, 250, 30, rgb(0.95, 0.95, 0.95));
    writeText(`IVA (${order.ivaRate}%)`, {
      x: 300,
      y: y,
      color: rgb(0, 0, 0),
      useFont: boldFont,
    });
    writeText(`${formatEuroNumber(totalsData.ivaAmount)} €`, {
      x: 40,
      y: y,
      align: "right",
      color: rgb(0, 0, 0),
      useFont: boldFont,
    });
  }

  // Add final total
  y -= 40;
  drawRect(295, y - 10, 250, 30, rgb(0, 0, 0));
  writeText("Total", {
    x: 300,
    y: y,
    color: rgb(1, 1, 1),
    useFont: boldFont,
  });
  writeText(
    `${formatEuroNumber(
      order.showIVA ? totalsData.total : totalsData.subtotal
    )} €`,
    {
      x: 40,
      y: y,
      align: "right",
      color: rgb(1, 1, 1),
      useFont: boldFont,
    }
  );

  // Verifica se precisa de nova página para as seções finais
  if (checkAndCreateNewPage(300)) {
    // Espaço estimado para as seções finais
    y -= 30;
  }

  // Pagamento
  y -= 20;
  drawRect(initialX, y - 30, pageWidth, 30, rgb(0.95, 0.95, 0.95));
  writeText("Pagamento", {
    x: 55,
    y: y - 20,
    useFont: boldFont,
    size: headerSize,
  });

  y -= 50;
  writeText("Meios de pagamento", { useFont: boldFont });
  y -= 20;
  writeText("Transferência bancária ou dinheiro.");

  y -= -20;
  writeText("Dados bancários", { useFont: boldFont, x: 300 });
  y -= 20;
  writeText("Número da conta: PT50003600569910021386913", { x: 300 });

  y -= 30;
  writeText("Condições de pagamento", { useFont: boldFont });
  y -= 20;
  writeText("À vista.");

  // Verifica se precisa de nova página para as informações adicionais
  if (checkAndCreateNewPage(200)) {
    y -= 30;
  }

  // Informações adicionais
  y -= 20;
  drawRect(initialX, y - 30, pageWidth, 30, rgb(0.95, 0.95, 0.95));
  writeText("Informações adicionais", {
    x: 55,
    y: y - 20,
    useFont: boldFont,
    size: headerSize,
  });

  y -= 50;
  writeText(
    "A Nonato Service agradece e fará o melhor por você e pela sua Empresa"
  );

  y -= 40;
  writeText("A Nonato Service agradece pela sua preferência.", {
    align: "center",
    useFont: boldFont,
  });

  y -= 30;
  writeText(currentDate, { align: "center" });

  // Linhas de assinatura
  y -= 60;

  // Linha do Cliente
  const lineWidth = 200;
  const spacing = 50;
  const startXClient = (pageWidth - lineWidth * 2 - spacing) / 2 + margin;

  // Desenha linha do cliente
  currentPage.drawLine({
    start: { x: startXClient, y },
    end: { x: startXClient + lineWidth, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Texto "Cliente" abaixo da linha
  writeText("(Cliente)", {
    y: y - 15,
    x: startXClient,
    width: lineWidth,
    align: "center",
  });

  // Linha do Técnico
  const startXTecnico = startXClient + lineWidth + spacing;

  // Desenha linha do técnico
  currentPage.drawLine({
    start: { x: startXTecnico, y },
    end: { x: startXTecnico + lineWidth, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // Texto "Técnico" abaixo da linha
  writeText("(Técnico)", {
    y: y - 15,
    x: startXTecnico,
    width: lineWidth,
    align: "center",
  });

  y -= 30;

  // Adiciona número de página em todas as páginas
  for (let i = 0; i < pdfDoc.getPageCount(); i++) {
    currentPage = pdfDoc.getPage(i);
    writeText(`Página ${i + 1}/${totalPages}`, {
      y: margin,
      align: "right",
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });

  // Verifica se estamos no ambiente mobile
  const isMobile = window?.Capacitor?.isNative;

  if (isMobile) {
    // Se for mobile, retorna o blob para ser processado pelo handleViewPDF
    return blob;
  } else {
    // Se for web, faz o download direto como estava antes
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Fechamento_${client.name}_${orderNumber}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
};

export default generateBudgetPDF;
