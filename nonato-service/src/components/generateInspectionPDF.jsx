import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase.jsx";

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

  // Header logo
  try {
    const response = await fetch("/nonato2.png");
    const arrayBuffer = await response.arrayBuffer();
    const image = await pdfDoc.embedPng(arrayBuffer);
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

  writeText("Detalhes dos ativos", { useFont: boldFont });
  y -= 20;

  writeText(`Categoria de ativos: ${equipment.type || "N/A"}`, { y });
  y -= 20;
  writeText(`Nome do ativo: ${client.name || "N/A"}`, { y });
  y -= 20;
  writeText(`Ativo #: ${equipment.serialNumber || "N/A"}`, { y });
  y -= 20;
  writeText(`Ano modelo: ${equipment.model || "N/A"}`, { y });
  y -= 40;

  // Grupos e características
  if (inspection.selectedGroups) {
    for (const group of inspection.selectedGroups) {
      if (checkAndCreateNewPage(80)) {
        y -= 30;
      }

      // Título do grupo
      drawRect(initialX, y - 30, pageWidth, 30, rgb(0.95, 0.95, 0.95));
      writeText(group.name, {
        y: y - 20,
        useFont: boldFont,
      });
      y -= 40;

      // Características do grupo
      for (const char of group.characteristics) {
        if (checkAndCreateNewPage(150)) {
          y -= 30;
        }

        const state = inspection.states?.[group.name]?.[char]?.state || "N/D";
        const description =
          inspection.states?.[group.name]?.[char]?.description || "";
        const imageUrl = inspection.states?.[group.name]?.[char]?.imageUrl;

        // Característica e estado
        writeText(char, { y });
        writeText(`Estado: ${state}`, { y, x: initialX + 300 });
        y -= 20;

        // Descrição
        if (description) {
          writeText("Descrição:", { y, useFont: boldFont });
          y -= 15;
          writeText(description, { y });
          y -= 20;
        }

        // Imagem
        if (imageUrl) {
          try {
            // Gere um URL pré-assinado com Firebase Storage
            const storageRef = ref(storage, imageUrl); // `imageUrl` deve ser o caminho relativo no bucket, como "inspections/5/image.jpg"
            const preSignedUrl = await getDownloadURL(storageRef);

            // Faça o fetch da imagem usando o URL pré-assinado
            const imgResponse = await fetch(preSignedUrl);
            if (!imgResponse.ok) {
              throw new Error(
                `Falha ao buscar imagem: ${imgResponse.status} ${imgResponse.statusText}`
              );
            }

            // Converta a imagem para um ArrayBuffer
            const imgArrayBuffer = await imgResponse.arrayBuffer();

            // Embeda a imagem no PDF
            const pdfImage = await pdfDoc.embedJpg(imgArrayBuffer); // ou embedPng se for PNG

            // Dimensione a imagem para caber no PDF
            const maxWidth = 200;
            const maxHeight = 150;
            const imgDims = pdfImage.scale(maxWidth / pdfImage.width);

            // Verifique se há espaço suficiente na página
            if (checkAndCreateNewPage(imgDims.height + 20)) {
              y -= 30;
            }

            // Desenhe a imagem na página
            currentPage.drawImage(pdfImage, {
              x: initialX,
              y: y - imgDims.height,
              width: imgDims.width,
              height: imgDims.height,
            });

            y -= imgDims.height + 20; // Ajuste o cursor para evitar sobreposição
          } catch (error) {
            console.error("Erro ao carregar imagem da característica:", error);
          }
        }

        y -= 20;
      }
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
  currentPage = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
  y = margin + 100;
  const lineWidth = 200;
  const spacing = 50;
  const startXClient = (pageWidth - lineWidth * 2 - spacing) / 2 + margin;

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

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
};

export default generateInspectionPDF;
