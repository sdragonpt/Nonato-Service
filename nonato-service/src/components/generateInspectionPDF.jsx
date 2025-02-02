import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase.jsx";
import { translations } from "../hooks/translations";

const generateInspectionPDF = async (
  inspection,
  client,
  equipment,
  checklistType,
  language = "pt"
) => {
  const pdfDoc = await PDFDocument.create();
  let currentPage = pdfDoc.addPage([595.28, 841.89]); // A4
  let pageNumber = 1;
  let totalPages = 1;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Traduções
  const t = translations[language];

  // Configurações
  const fontSize = 10;
  const titleSize = 16;
  const headerSize = 12;
  const margin = 50;
  let y = currentPage.getHeight() - margin;
  const initialX = margin;
  const pageWidth = currentPage.getWidth() - 2 * margin;
  const minBottomMargin = 70;

  const translateValue = (value, type, language) => {
    const t = translations[language];

    switch (type) {
      case "condition":
        switch (value) {
          case "Excelente condição":
            return t.conditions.excellent;
          case "Boa condição":
            return t.conditions.good;
          case "Condição regular":
            return t.conditions.regular;
          case "Condição ruim":
            return t.conditions.bad;
          default:
            return value;
        }

      case "yesNo":
        switch (value) {
          case "Sim":
            return t.yesNo.yes;
          case "Não":
            return t.yesNo.no;
          default:
            return value;
        }

      case "status":
        switch (value) {
          case "Operacional":
            return t.assetStatuses.operational;
          case "Manutenção requerida":
            return t.assetStatuses.maintenanceRequired;
          case "Em manutenção":
            return t.assetStatuses.inMaintenance;
          case "Inoperante":
            return t.assetStatuses.inoperative;
          default:
            return value;
        }

      case "priority":
        switch (value) {
          case "Baixo":
            return t.priorities.low;
          case "Médio":
            return t.priorities.medium;
          case "Alto":
            return t.priorities.high;
          case "Crítico":
            return t.priorities.critical;
          default:
            return value;
        }

      case "state":
        switch (value) {
          case "Bom":
            return t.states.good;
          case "Reparar":
            return t.states.repair;
          case "Substituir":
            return t.states.replace;
          case "N/D":
            return t.states.na;
          default:
            return value;
        }

      default:
        return value;
    }
  };

  const STATE_COLORS = {
    // Good states (green)
    Bom: { color: rgb(0, 0.5, 0), opacity: 0.8 },
    Good: { color: rgb(0, 0.5, 0), opacity: 0.8 },
    Bueno: { color: rgb(0, 0.5, 0), opacity: 0.8 },
    Bon: { color: rgb(0, 0.5, 0), opacity: 0.8 },
    Buono: { color: rgb(0, 0.5, 0), opacity: 0.8 },

    // Repair states (yellow)
    Reparar: { color: rgb(0.9, 0.7, 0), opacity: 0.8 },
    Repair: { color: rgb(0.9, 0.7, 0), opacity: 0.8 },
    Réparer: { color: rgb(0.9, 0.7, 0), opacity: 0.8 },
    Riparare: { color: rgb(0.9, 0.7, 0), opacity: 0.8 },

    // Replace states (purple)
    Substituir: { color: rgb(0.5, 0, 0.5), opacity: 0.8 },
    Replace: { color: rgb(0.5, 0, 0.5), opacity: 0.8 },
    Sustituir: { color: rgb(0.5, 0, 0.5), opacity: 0.8 },
    Remplacer: { color: rgb(0.5, 0, 0.5), opacity: 0.8 },
    Sostituire: { color: rgb(0.5, 0, 0.5), opacity: 0.8 },

    // N/A states (gray)
    "N/D": { color: rgb(0.7, 0.7, 0.7), opacity: 0.6 },
    "N/A": { color: rgb(0.7, 0.7, 0.7), opacity: 0.6 },
  };

  const getStateColor = (state, language = "pt") => {
    // First try to get color for the original state
    if (STATE_COLORS[state]) {
      return STATE_COLORS[state];
    }

    // If not found, try to get color for the translated state
    const translatedState = translateValue(state, "state", language);
    if (STATE_COLORS[translatedState]) {
      return STATE_COLORS[translatedState];
    }

    // Default color if neither is found
    return { color: rgb(0.7, 0.7, 0.7), opacity: 0.6 };
  };

  const getStateInfo = (state, language) => {
    const translatedState = translateValue(state, "state", language);
    const stateWidth = font.widthOfTextAtSize(translatedState, fontSize);
    const { color } = getStateColor(state, language);

    return {
      color,
      width: stateWidth,
      text: translatedState,
    };
  };

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

  const writeWrappedText = (text, options = {}) => {
    const {
      x = initialX,
      y: startY = y,
      maxWidth = 200,
      lineHeight = 12,
      size = fontSize,
      useFont = font,
      color = rgb(0, 0, 0),
    } = options;

    const words = text.split(" ");
    let line = "";
    let currentY = startY;
    let firstLine = true;

    for (const word of words) {
      const testLine = line + (line ? " " : "") + word;
      const testWidth = useFont.widthOfTextAtSize(testLine, size);

      if (testWidth > maxWidth && line !== "") {
        writeText(line, {
          x: firstLine ? x : x + 10, // Indenta as linhas subsequentes
          y: currentY,
          size,
          useFont,
          color,
        });
        line = word;
        currentY -= lineHeight;
        firstLine = false;
      } else {
        line = testLine;
      }
    }

    if (line) {
      writeText(line, {
        x: firstLine ? x : x,
        y: currentY,
        size,
        useFont,
        color,
      });
    }

    return firstLine ? startY - lineHeight : currentY - lineHeight;
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

  writeText(
    inspection.type === "training" ? t.trainingDetails : t.inspectionDetails,
    {
      x: 60,
      y: y - 20,
      useFont: boldFont,
    }
  );
  y -= 40;

  writeText(`${t.location}: ${client.address || "N/A"}`, { y, x: 60 });
  y -= 20;
  writeText(`${t.inspector}: Nonato`, { y, x: 60 });
  y -= 20;
  writeText(`${t.report}: Check_${inspection.id}`, { y, x: 60 });
  y -= -60;

  writeText(t.assetDetails, { useFont: boldFont, x: 320 });
  y -= 20;

  writeText(`${t.clientName}: ${client.name || "N/A"}`, { y, x: 320 });
  y -= 20;
  writeText(`${t.equipment}: ${equipment.type || "N/A"}`, { y, x: 320 });
  y -= 20;
  const ativoText = `${t.asset}: ${(checklistType.type || "N/A").replace(
    ":",
    ""
  )}`;
  y =
    writeWrappedText(ativoText, {
      x: 320,
      y,
      maxWidth: 220,
      lineHeight: 15,
    }) - 5;
  writeText(`${t.model}: ${equipment.model || "N/A"}`, { y, x: 320 });
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

      // Imagem do grupo
      const groupImageUrl = inspection.groupImages?.[group.name];
      if (groupImageUrl) {
        try {
          const storageRef = ref(storage, groupImageUrl);
          const preSignedUrl = await getDownloadURL(storageRef);
          const imgResponse = await fetch(preSignedUrl);

          if (!imgResponse.ok) {
            throw new Error(
              `Falha ao buscar imagem do grupo: ${imgResponse.status} ${imgResponse.statusText}`
            );
          }

          const imgArrayBuffer = await imgResponse.arrayBuffer();
          const pdfImage = await pdfDoc.embedJpg(imgArrayBuffer);

          const maxWidth = 200;
          const maxHeight = 150;
          const scale = Math.min(
            maxWidth / pdfImage.width,
            maxHeight / pdfImage.height
          );
          const imgDims = pdfImage.scale(scale);

          if (checkAndCreateNewPage(imgDims.height + 20)) {
            y -= 30;
          }

          currentPage.drawImage(pdfImage, {
            x: initialX,
            y: y - imgDims.height,
            width: imgDims.width,
            height: imgDims.height,
          });

          y -= imgDims.height + 20;
        } catch (error) {
          console.error("Erro ao carregar imagem do grupo:", error);
        }
      }

      // Características do grupo
      for (const char of group.selectedCharacteristics || []) {
        if (checkAndCreateNewPage(150)) {
          y -= 30;
        }

        const state = translateValue(
          inspection.states?.[group.name]?.[char]?.state,
          "state",
          language
        );
        const description =
          inspection.states?.[group.name]?.[char]?.description || "";
        const imageUrl = inspection.states?.[group.name]?.[char]?.imageUrl;
        const stateColor = getStateColor(state);

        // Característica e estado
        writeText(char, { y: y - 5, x: 55 });

        if (inspection.type !== "training") {
          // Texto "Estado:" em preto
          const stateLabel = `${t.state}: `;
          writeText(stateLabel, {
            y: y - 5,
            x: initialX + 400,
            color: rgb(0, 0, 0),
          });

          // Calcula posição após "Estado: "
          const labelWidth = font.widthOfTextAtSize(stateLabel, fontSize);
          const stateInfo = getStateInfo(state, language);
          const boxPadding = 4;

          // Desenha retângulo colorido apenas para o valor do estado
          drawRect(
            initialX + 400 + labelWidth - 2,
            y - fontSize - boxPadding + 3,
            stateInfo.width + boxPadding * 2,
            fontSize + boxPadding * 2,
            stateInfo.color
          );

          // Texto do valor do estado em branco
          writeText(stateInfo.text, {
            y: y - 5,
            x: initialX + 400 + labelWidth + 2,
            color: rgb(1, 1, 1),
          });
          y -= 25;
        }

        y -= 25;
        // Descrição
        if (description) {
          writeText(`${t.observation}:`, { y, useFont: boldFont, x: 55 });
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

  // Avaliação Geral ou Participantes do Treinamento
  if (y < margin + 350) {
    currentPage = pdfDoc.addPage([595.28, 841.89]);
    pageNumber++;
    totalPages++;
    y = currentPage.getHeight() - margin;
  }

  y -= 30;
  drawRect(initialX, y - 30, pageWidth, 30, rgb(0, 0, 0));
  writeText(
    inspection.type === "training"
      ? t.trainingParticipants
      : t.generalEvaluation,
    {
      x: 60,
      y: y - 20,
      useFont: boldFont,
      color: rgb(1, 1, 1),
    }
  );
  y -= 50;

  if (inspection.type === "training") {
    // Add more vertical space before participants section
    y -= 10;

    // Lista de participantes
    if (
      inspection.trainingParticipants &&
      inspection.trainingParticipants.length > 0
    ) {
      for (const participant of inspection.trainingParticipants) {
        // Add participant name
        writeText(`• ${participant}`, { y, x: 60 });

        // Add signature line after participant name
        const participantTextWidth = font.widthOfTextAtSize(
          `• ${participant}`,
          fontSize
        );
        const signatureText = "Assinatura: ";
        const signatureLineStart = 60 + participantTextWidth + 20; // 20px spacing after name
        const signatureLineWidth = 200; // Width of signature line

        // Add "Assinatura:" text
        writeText(`${t.signature}: `, {
          x: signatureLineStart,
          y,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });

        // Adjust line start position to account for "Assinatura:" text
        const signatureTextWidth = font.widthOfTextAtSize(
          signatureText,
          fontSize
        );
        const lineStart = signatureLineStart + signatureTextWidth + 5; // 5px gap after text

        currentPage.drawLine({
          start: { x: lineStart, y: y - 2 }, // Slightly above text baseline
          end: { x: lineStart + signatureLineWidth, y: y - 2 },
          thickness: 0.5,
          color: rgb(0, 0, 0),
        });

        // Increase vertical spacing between participants
        y -= 35; // Increased from 20 to 35 for more space between signatures
      }
    } else {
      writeText(t.noParticipants, {
        y,
        x: 60,
        color: rgb(0.5, 0.5, 0.5),
      });
      y -= 20;
    }
  } else {
    writeText(
      `${t.overallCondition}: ${translateValue(
        inspection.overallCondition,
        "condition",
        language
      )}`,
      { y, x: 60 }
    );
    y -= 20;

    // Status de segurança com indicador visual
    const translatedSafeToUse = translateValue(
      inspection.safeToUse,
      "yesNo",
      language
    );
    const labelText = `${t.safeToUse}: `;

    const baseTextWidth = boldFont.widthOfTextAtSize(labelText, fontSize);
    const translatedStatusWidth = boldFont.widthOfTextAtSize(
      translatedSafeToUse,
      fontSize
    );
    const boxPadding = 5;
    const leftPadding = 8;

    writeText(labelText, {
      y,
      x: 60,
      useFont: boldFont,
    });

    if (inspection.safeToUse === "Sim" || inspection.safeToUse === "Não") {
      // Desenha o retângulo colorido
      drawRect(
        60 + baseTextWidth - 2,
        y - boxPadding,
        translatedStatusWidth + boxPadding * 2 + leftPadding,
        fontSize + boxPadding * 2,
        inspection.safeToUse === "Sim" ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0)
      );

      // Escreve o texto traduzido
      writeText(translatedSafeToUse, {
        y,
        x: 60 + baseTextWidth + leftPadding,
        color: rgb(1, 1, 1),
        useFont: boldFont,
      });
    } else {
      // Caso não seja Sim ou Não
      writeText(translatedSafeToUse, {
        y,
        x: 60 + baseTextWidth,
        useFont: boldFont,
      });
    }
    y -= 20;
    writeText(
      `${t.maintenanceRequired}: ${translateValue(
        inspection.maintenanceRequired,
        "yesNo",
        language
      )}`,
      { y, x: 60 }
    );
    y -= 20;
    writeText(
      `${t.assetStatus}: ${translateValue(
        inspection.assetStatus,
        "status",
        language
      )}`,
      { y, x: 60 }
    );
    y -= 20;
    writeText(
      `${t.maintenancePriority}: ${translateValue(
        inspection.maintenancePriority,
        "priority",
        language
      )}`,
      { y, x: 60 }
    );
    y -= 30;

    if (inspection.additionalNotes) {
      writeText(`${t.additionalNotes}:`, { y, useFont: boldFont, x: 60 });
      y -= 15;
      writeText(inspection.additionalNotes, { y, x: 60 });
      y -= 50;
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

  writeText(`(${t.client})`, {
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

  writeText(`(${t.technician})`, {
    y: y - 15,
    x: startXTecnico,
    width: lineWidth,
    align: "center",
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
};

export default generateInspectionPDF;
