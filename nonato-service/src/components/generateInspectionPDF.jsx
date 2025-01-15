import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const generateInspectionPDF = async (
  inspection,
  client,
  equipment,
  checklistType
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
    const imgWidth = 100;
    const imgHeight = (imgWidth * image.height) / image.width;

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
  writeText("Check List Nonato Service", {
    x: margin + 120,
    size: titleSize,
    useFont: boldFont,
  });
  y -= 20;

  writeText("ASSISTÊNCIA TÉCNICA", {
    x: margin + 120,
    size: headerSize,
    color: rgb(0.0667, 0.4902, 0.2863),
  });
  y -= 35;

  // Data e número do relatório
  const currentDate = new Date().toLocaleDateString();
  writeText(`Data da inspeção: ${currentDate}`, {
    y: currentPage.getHeight() - margin,
    align: "right",
  });

  writeText(`Relatório #: Check_${inspection.id}`, {
    y: currentPage.getHeight() - margin - 20,
    align: "right",
  });

  // Informações básicas
  y -= 30;
  drawRect(initialX, y - 130, pageWidth, 130, rgb(0.95, 0.95, 0.95));

  writeText("Detalhes da inspeção", {
    y: y - 20,
    useFont: boldFont,
  });
  y -= 40;

  writeText(`Localização: ${client.address || "N/A"}`, { y });
  y -= 20;
  writeText(`Nome do inspetor: Nonato`, { y });
  y -= 40;

  writeText("Detalhes dos ativos", {
    useFont: boldFont,
  });
  y -= 20;

  writeText(`Categoria de ativos: ${equipment.type || "N/A"}`, { y });
  y -= 20;
  writeText(`Nome do ativo: ${client.name || "N/A"}`, { y });
  y -= 20;
  writeText(`Ativo #: ${equipment.serialNumber || "N/A"}`, { y });
  y -= 20;
  writeText(`Ano modelo: ${equipment.model || "N/A"}`, { y });
  y -= 40;

  // Características
  if (checklistType && checklistType.characteristics) {
    const characteristics = checklistType.characteristics;

    for (let i = 0; i < characteristics.length; i++) {
      if (checkAndCreateNewPage(100)) {
        y -= 30;
      }

      const characteristic = characteristics[i];
      const isChecked = inspection.characteristics.includes(characteristic);

      // Desenhar caixa de verificação
      drawRect(initialX, y - 20, pageWidth, 30, rgb(0.95, 0.95, 0.95));

      // Checkbox
      currentPage.drawRectangle({
        x: initialX + 10,
        y: y - 15,
        width: 12,
        height: 12,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });

      if (isChecked) {
        // Usando 'X' em vez de checkmark unicode
        writeText("X", {
          x: initialX + 12,
          y: y - 13,
          size: 10,
          useFont: boldFont, // Usando fonte bold para maior destaque
        });
      }

      // Texto da característica
      writeText(characteristic, {
        x: initialX + 30,
        y: y - 12,
      });

      y -= 40;
    }
  }

  // Adiciona número de página em todas as páginas
  for (let i = 0; i < pdfDoc.getPageCount(); i++) {
    currentPage = pdfDoc.getPage(i);
    writeText(`Página ${i + 1}/${totalPages}`, {
      y: margin,
      align: "right",
    });
  }

  // Assinaturas
  y -= 60;
  const lineWidth = 200;
  const spacing = 50;
  const startXClient = (pageWidth - lineWidth * 2 - spacing) / 2 + margin;

  // Linha do Cliente
  currentPage.drawLine({
    start: { x: startXClient, y },
    end: { x: startXClient + lineWidth, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  writeText("(Cliente)", {
    y: y - 15,
    x: startXClient,
    width: lineWidth,
    align: "center",
  });

  // Linha do Técnico
  const startXTecnico = startXClient + lineWidth + spacing;
  currentPage.drawLine({
    start: { x: startXTecnico, y },
    end: { x: startXTecnico + lineWidth, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  writeText("(Técnico)", {
    y: y - 15,
    x: startXTecnico,
    width: lineWidth,
    align: "center",
  });

  // Gerar o PDF
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
};

export default generateInspectionPDF;
