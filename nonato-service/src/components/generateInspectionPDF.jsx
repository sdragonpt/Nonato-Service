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

  const getStateColor = (state) => {
    switch (state) {
      case "Bom":
        return { color: rgb(0, 0.5, 0), opacity: 0.8 };
      case "Reparar":
        return { color: rgb(0.9, 0.7, 0), opacity: 0.8 };
      case "Substituir":
        return { color: rgb(0.5, 0, 0.5), opacity: 0.8 };
      default:
        return { color: rgb(0.7, 0.7, 0.7), opacity: 0.6 };
    }
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
  writeText(`${currentDate}`, {
    y: currentPage.getHeight() - margin,
    align: "right",
  });

  // Informações básicas
  y -= 30;
  drawRect(initialX, y - 130, pageWidth, 130, rgb(0.95, 0.95, 0.95));

  writeText("Detalhes da inspeção", {
    x: 60,
    y: y - 20,
    useFont: boldFont,
  });
  y -= 40;

  writeText(`Localização: ${client.address || "N/A"}`, { y, x: 60 });
  y -= 20;
  writeText(`Nome do inspetor: Nonato`, { y, x: 60 });
  y -= 20;
  writeText(`Relatório: Check_${inspection.id}`, {
    y,
    x: 60,
  });
  y -= -60;

  writeText("Detalhes dos ativos", { useFont: boldFont, x: 320 });
  y -= 20;

  writeText(`Nome do Cliente: ${client.name || "N/A"}`, { y, x: 320 });
  y -= 20;
  writeText(`Equipamento: ${equipment.type || "N/A"}`, { y, x: 320 });
  y -= 20;
  writeText(`Ativo: ${(checklistType.type || "N/A").replace(":", "")}`, {
    y,
    x: 320,
  });
  y -= 20;
  writeText(`Modelo: ${equipment.model || "N/A"}`, { y, x: 320 });
  y -= 40;

  // Grupos e características
  if (inspection.selectedGroups) {
    for (const group of inspection.selectedGroups) {
      if (checkAndCreateNewPage(80)) {
        y -= 30;
      }

      // Título do grupo
      drawRect(initialX, y - 30, pageWidth, 30, rgb(0.95, 0.95, 0.95));
      writeText(group.name.replace(":", ""), {
        x: 60,
        y: y - 20,
        useFont: boldFont,
      });
      y -= 40;

      // Características do grupo
      for (const char of group.selectedCharacteristics || []) {
        if (checkAndCreateNewPage(150)) {
          y -= 30;
        }

        const state = inspection.states?.[group.name]?.[char]?.state || "N/D";
        const description =
          inspection.states?.[group.name]?.[char]?.description || "";
        const imageUrl = inspection.states?.[group.name]?.[char]?.imageUrl;
        const stateColor = getStateColor(state);

        // Característica e estado
        writeText(char, { y: y - 5, x: 55 });

        // Texto "Estado:" em preto
        writeText("Estado: ", {
          y: y - 5,
          x: initialX + 400,
          color: rgb(0, 0, 0),
        });

        // Calcula posição após "Estado: "
        const labelWidth = font.widthOfTextAtSize("Estado: ", fontSize);
        const stateWidth = font.widthOfTextAtSize(state, fontSize);
        const boxPadding = 4;

        // Desenha retângulo colorido apenas para o valor do estado
        drawRect(
          initialX + 400 + labelWidth - 2,
          y - fontSize - boxPadding + 3,
          stateWidth + 8,
          fontSize + boxPadding * 2,
          stateColor.color
        );

        // Texto do valor do estado em branco
        writeText(state, {
          y: y - 5,
          x: initialX + 400 + labelWidth + 2,
          color: rgb(1, 1, 1),
        });
        y -= 25;

        // Descrição
        if (description) {
          writeText("Observação:", { y, useFont: boldFont, x: 55 });
          y -= 15;
          writeText(description, { y, x: 55 });
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
            const maxWidth = 150;
            const maxHeight = 100;
            // Dimensione a imagem mantendo a proporção
            const scale = Math.min(
              maxWidth / pdfImage.width,
              maxHeight / pdfImage.height
            );
            const imgDims = pdfImage.scale(scale);

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

        // Desenha uma linha horizontal entre as características
        currentPage.drawLine({
          start: { x: 50, y },
          end: { x: 595.28 - 50, y },
          thickness: 0.5,
          color: rgb(0.8, 0.8, 0.8), // Cor cinza claro
        });

        y -= 20;
      }
    }
  }

  // Avaliação Geral
  if (y < margin + 350) {
    // Se não houver espaço suficiente para avaliação + assinaturas
    currentPage = pdfDoc.addPage([595.28, 841.89]);
    pageNumber++;
    totalPages++;
    y = currentPage.getHeight() - margin;
  }

  y -= 30;
  drawRect(initialX, y - 30, pageWidth, 30, rgb(0, 0, 0));
  writeText("Avaliação Geral", {
    x: 60,
    y: y - 20,
    useFont: boldFont,
    color: rgb(1, 1, 1), // Branco
  });
  y -= 50;

  writeText(`Condição Geral: ${inspection.overallCondition || "N/A"}`, {
    y,
    x: 60,
  });
  y -= 20;
  // Status de segurança com indicador visual
  writeText("Ativo seguro para usar: ", { y, x: 60, useFont: boldFont });
  const baseTextWidth = boldFont.widthOfTextAtSize(
    "Ativo seguro para usar: ",
    fontSize
  );
  const statusText = inspection.safeToUse || "N/A";
  const statusWidth = boldFont.widthOfTextAtSize(statusText, fontSize);
  const boxPadding = 5;
  const leftPadding = 8;

  if (inspection.safeToUse === "Sim") {
    drawRect(
      60 + baseTextWidth - 2,
      y - boxPadding,
      statusWidth + boxPadding * 2 + leftPadding,
      fontSize + boxPadding * 2,
      rgb(0, 0.5, 0)
    );
    writeText(statusText, {
      y,
      x: 60 + baseTextWidth + leftPadding,
      color: rgb(1, 1, 1),
      useFont: boldFont,
    });
  } else if (inspection.safeToUse === "Não") {
    drawRect(
      60 + baseTextWidth - 2,
      y - boxPadding,
      statusWidth + boxPadding * 2 + leftPadding,
      fontSize + boxPadding * 2,
      rgb(0.8, 0, 0)
    );
    writeText(statusText, {
      y,
      x: 60 + baseTextWidth + leftPadding,
      color: rgb(1, 1, 1),
      useFont: boldFont,
    });
  } else {
    writeText(statusText, { y, x: 60 + baseTextWidth, useFont: boldFont });
  }
  y -= 20;
  writeText(
    `Manutenção requerida: ${inspection.maintenanceRequired || "N/A"}`,
    { y, x: 60 }
  );
  y -= 20;
  writeText(`Status do ativo: ${inspection.assetStatus || "N/A"}`, {
    y,
    x: 60,
  });
  y -= 20;
  writeText(
    `Prioridade de manutenção: ${inspection.maintenancePriority || "N/A"}`,
    { y, x: 60 }
  );
  y -= 30;

  if (inspection.additionalNotes) {
    writeText("Notas Adicionais:", { y, useFont: boldFont, x: 60 });
    y -= 15;
    writeText(inspection.additionalNotes, { y, x: 60 });
    y -= 50;
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
  // Garantir espaço para assinaturas
  if (y < margin + 150) {
    currentPage = pdfDoc.addPage([595.28, 841.89]);
    pageNumber++;
    totalPages++;
    y = currentPage.getHeight() - margin;
  }

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
