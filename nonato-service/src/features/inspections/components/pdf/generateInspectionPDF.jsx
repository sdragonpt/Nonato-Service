import { PDFDocument, rgb } from "pdf-lib";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../../../../firebase.jsx";
import { translations } from "../../../../utils/translations.js";
import { createPdfKit } from "../../../../utils/pdf/pdfKit.js";

const generateInspectionPDF = async (
  inspection,
  client,
  equipment,
  checklistType,
  language = "pt"
) => {
  const pdfDoc = await PDFDocument.create();

  const t = translations[language];
  const isTraining = inspection.type === "training";

  const translateValue = (value, type, lang) => {
    const tr = translations[lang];
    switch (type) {
      case "condition":
        switch (value) {
          case "Excelente condição":
            return tr.conditions.excellent;
          case "Boa condição":
            return tr.conditions.good;
          case "Condição regular":
            return tr.conditions.regular;
          case "Condição ruim":
            return tr.conditions.bad;
          default:
            return value;
        }
      case "yesNo":
        switch (value) {
          case "Sim":
            return tr.yesNo.yes;
          case "Não":
            return tr.yesNo.no;
          default:
            return value;
        }
      case "status":
        switch (value) {
          case "Operacional":
            return tr.assetStatuses.operational;
          case "Manutenção requerida":
            return tr.assetStatuses.maintenanceRequired;
          case "Em manutenção":
            return tr.assetStatuses.inMaintenance;
          case "Inoperante":
            return tr.assetStatuses.inoperative;
          default:
            return value;
        }
      case "priority":
        switch (value) {
          case "Baixo":
            return tr.priorities.low;
          case "Médio":
            return tr.priorities.medium;
          case "Alto":
            return tr.priorities.high;
          case "Crítico":
            return tr.priorities.critical;
          default:
            return value;
        }
      case "state":
        switch (value) {
          case "Bom":
            return tr.states.good;
          case "Reparar":
            return tr.states.repair;
          case "Substituir":
            return tr.states.replace;
          case "N/D":
            return tr.states.na;
          default:
            return value;
        }
      default:
        return value;
    }
  };

  const processGroupImage = async (kit, groupImageUrl) => {
    if (!groupImageUrl) return null;
    try {
      const storageRef = ref(storage, groupImageUrl);
      const preSignedUrl = await getDownloadURL(storageRef);
      const imgResponse = await fetch(preSignedUrl);
      if (!imgResponse.ok) throw new Error(`Failed to fetch group image: ${imgResponse.status}`);
      const imgArrayBuffer = await imgResponse.arrayBuffer();
      const pdfImage = await pdfDoc.embedJpg(imgArrayBuffer);
      const maxWidth = 495.28 * 0.6;
      const maxHeight = 150;
      const scale = Math.min(maxWidth / pdfImage.width, maxHeight / pdfImage.height);
      return { image: pdfImage, width: pdfImage.width * scale, height: pdfImage.height * scale };
    } catch (error) {
      console.error("Error processing group image:", error);
      return null;
    }
  };

  // Desenha os 4 estados possíveis (Bom/Reparar/Substituir/N-D) como
  // círculos alinhados à direita da característica — o preenchido é o
  // estado selecionado.
  const stateStartX = 375;
  const stateSpacing = 45;
  const stateCircleRadius = 4;

  const drawStateOptions = (kit, yPos, selectedState, lang) => {
    const states = [
      { key: "Bom", color: rgb(0, 0.5, 0) },
      { key: "Reparar", color: rgb(0.85, 0.62, 0) },
      { key: "Substituir", color: rgb(0.82, 0.15, 0.15) },
      { key: "N/D", color: rgb(0.6, 0.6, 0.61) },
    ];

    states.forEach((state, index) => {
      const x = stateStartX + index * stateSpacing;
      const circleOffset = 10;
      const translatedText = translateValue(state.key, "state", lang);
      const textWidth = kit.font.widthOfTextAtSize(translatedText, 8);
      const circleX = x + stateCircleRadius;

      kit.page.drawCircle({
        x: circleX,
        y: yPos - stateCircleRadius - circleOffset,
        size: stateCircleRadius * 2,
        borderWidth: 1,
        borderColor: kit.colors.ink,
        color: selectedState === state.key ? state.color : kit.colors.paper,
      });

      kit.text(translatedText, circleX - textWidth / 2, yPos - 1, { size: 8, useFont: kit.font });
    });
  };

  const inspectionNumber =
    inspection.inspectionNumber || `INSP-${inspection.id || ""}`;

  const kit = await createPdfKit(pdfDoc, {
    title: "Checklist",
    subtitle: isTraining ? "Nonato Service · Formação" : "Nonato Service · Assistência Técnica",
    docLabel: "Nº",
    docNumber: inspectionNumber,
    footerNote: `NONATO SERVICE · ${inspectionNumber}`,
  });

  kit.newPage();

  // ── Dados gerais ──────────────────────────────────────────────────
  kit.sectionTitle(isTraining ? t.trainingDetails : t.inspectionDetails);
  const inspectionDate = inspection.createdAt?.toDate
    ? inspection.createdAt.toDate()
    : inspection.createdAt
    ? new Date(inspection.createdAt)
    : new Date();

  kit.infoPanel(
    [
      [t.location, client.address || "N/A"],
      [t.clientName, client.name || "N/A"],
      [t.inspector, "Nonato"],
      [t.equipment, equipment.type || "N/A"],
      [t.report, inspectionNumber],
      ["Data", inspectionDate.toLocaleDateString("pt-PT")],
      [t.asset, (checklistType.type || "N/A").replace(":", "")],
      [t.model, equipment.model || "N/A"],
    ],
    { cols: 2 }
  );

  // ── Grupos e características ────────────────────────────────────────
  if (inspection.selectedGroups) {
    for (const group of inspection.selectedGroups) {
      kit.checkSpace(70);

      const groupImageUrl = inspection.groupImages?.[group.name];
      const processedImage = groupImageUrl ? await processGroupImage(kit, groupImageUrl) : null;

      const headerHeight = 26;
      kit.rect(50, kit.y - headerHeight, 495.28, headerHeight, kit.colors.dark);
      kit.text(group.name.replace(":", ""), 60, kit.y - headerHeight / 2 - 3, {
        size: 10.5,
        useFont: kit.boldFont,
        color: kit.colors.white,
      });
      kit.y -= headerHeight + 12;

      if (processedImage) {
        if (kit.checkSpace(processedImage.height + 20)) {
          kit.rect(50, kit.y - headerHeight, 495.28, headerHeight, kit.colors.dark);
          kit.text(group.name.replace(":", ""), 60, kit.y - headerHeight / 2 - 3, {
            size: 10.5,
            useFont: kit.boldFont,
            color: kit.colors.white,
          });
          kit.y -= headerHeight + 12;
        }
        const xOffset = (495.28 - processedImage.width) / 2;
        kit.page.drawImage(processedImage.image, {
          x: 50 + xOffset,
          y: kit.y - processedImage.height,
          width: processedImage.width,
          height: processedImage.height,
        });
        kit.y -= processedImage.height + 16;
      }

      for (const char of group.selectedCharacteristics) {
        kit.checkSpace(60);

        const state = inspection.states?.[group.name]?.[char]?.state;
        const nameLines = kit.wrapText(char, 300, kit.font, 9.5);
        const maxLines = Math.min(nameLines.length, 2);

        const nameTopY = kit.y - 4;
        nameLines.slice(0, maxLines).forEach((line, idx) => {
          kit.text(line, 55, nameTopY - idx * 14, { size: 9.5, useFont: kit.font });
        });

        if (!isTraining) {
          drawStateOptions(kit, kit.y - 4, state, language);
        }

        kit.y -= Math.max(20, maxLines * 14) + 14;

        const description = inspection.states?.[group.name]?.[char]?.description || "";
        if (description) {
          kit.checkSpace(30);
          kit.text(`${t.observation}:`, 55, kit.y, { size: 9, useFont: kit.boldFont });
          kit.y -= 15;
          const descLines = kit.wrapText(description, 480, kit.font, 9);
          descLines.forEach((line) => {
            kit.checkSpace(15);
            kit.text(line, 55, kit.y, { size: 9 });
            kit.y -= 14;
          });
          kit.y -= 4;
        }

        const imageUrl1 = inspection.states?.[group.name]?.[char]?.imageUrl1;
        const imageUrl2 = inspection.states?.[group.name]?.[char]?.imageUrl2;

        if (imageUrl1 || imageUrl2) {
          try {
            const maxWidth = 150;
            const maxHeight = 100;
            const spacing = 20;
            let image1 = null;
            let image2 = null;

            if (imageUrl1) {
              const storageRef1 = ref(storage, imageUrl1);
              const preSignedUrl1 = await getDownloadURL(storageRef1);
              const imgResponse1 = await fetch(preSignedUrl1);
              if (imgResponse1.ok) {
                const imgArrayBuffer1 = await imgResponse1.arrayBuffer();
                const pdfImage1 = await pdfDoc.embedJpg(imgArrayBuffer1);
                const scale1 = Math.min(maxWidth / pdfImage1.width, maxHeight / pdfImage1.height);
                image1 = { image: pdfImage1, width: pdfImage1.width * scale1, height: pdfImage1.height * scale1 };
              }
            }
            if (imageUrl2) {
              const storageRef2 = ref(storage, imageUrl2);
              const preSignedUrl2 = await getDownloadURL(storageRef2);
              const imgResponse2 = await fetch(preSignedUrl2);
              if (imgResponse2.ok) {
                const imgArrayBuffer2 = await imgResponse2.arrayBuffer();
                const pdfImage2 = await pdfDoc.embedJpg(imgArrayBuffer2);
                const scale2 = Math.min(maxWidth / pdfImage2.width, maxHeight / pdfImage2.height);
                image2 = { image: pdfImage2, width: pdfImage2.width * scale2, height: pdfImage2.height * scale2 };
              }
            }

            const maxImageHeight = Math.max(image1?.height || 0, image2?.height || 0);
            kit.checkSpace(maxImageHeight + 20);

            if (image1) {
              kit.page.drawImage(image1.image, { x: 50, y: kit.y - image1.height, width: image1.width, height: image1.height });
            }
            if (image2) {
              kit.page.drawImage(image2.image, {
                x: 50 + (image1 ? image1.width + spacing : 0),
                y: kit.y - image2.height,
                width: image2.width,
                height: image2.height,
              });
            }
            kit.y -= maxImageHeight + 16;
          } catch (error) {
            console.error("Erro ao carregar imagens da característica:", error);
          }
        }

        kit.hLine(50, 545.28, kit.y, 0.5, kit.colors.lineSoft);
        kit.y -= 16;
      }
    }
  }

  // ── Avaliação geral / participantes ──────────────────────────────────
  kit.checkSpace(220);
  const evalHeaderHeight = 26;
  kit.rect(50, kit.y - evalHeaderHeight, 495.28, evalHeaderHeight, kit.colors.dark);
  kit.text(isTraining ? t.trainingParticipants : t.generalEvaluation, 60, kit.y - evalHeaderHeight / 2 - 3, {
    size: 10.5,
    useFont: kit.boldFont,
    color: kit.colors.white,
  });
  kit.y -= evalHeaderHeight + 22;

  if (isTraining) {
    if (inspection.trainingParticipants && inspection.trainingParticipants.length > 0) {
      inspection.trainingParticipants.forEach((participant) => {
        kit.checkSpace(30);
        kit.text(`• ${participant}`, 60, kit.y, { size: 9.5 });
        const participantTextWidth = kit.font.widthOfTextAtSize(`• ${participant}`, 9.5);
        const signatureLineStart = 60 + participantTextWidth + 20;
        kit.text(`${t.signature}: `, signatureLineStart, kit.y, { size: 9.5 });
        const signatureTextWidth = kit.font.widthOfTextAtSize(`${t.signature}: `, 9.5);
        const lineStart = signatureLineStart + signatureTextWidth + 5;
        kit.hLine(lineStart, lineStart + 200, kit.y - 2, 0.5, kit.colors.ink);
        kit.y -= 30;
      });
    } else {
      kit.text(t.noParticipants, 60, kit.y, { size: 9.5, color: kit.colors.muted });
      kit.y -= 20;
    }
  } else {
    kit.text(`${t.overallCondition}: ${translateValue(inspection.overallCondition, "condition", language)}`, 60, kit.y, {
      size: 9.5,
    });
    kit.y -= 20;

    const translatedSafeToUse = translateValue(inspection.safeToUse, "yesNo", language);
    const labelText = `${t.safeToUse}: `;
    const baseTextWidth = kit.boldFont.widthOfTextAtSize(labelText, 9.5);
    kit.text(labelText, 60, kit.y, { size: 9.5, useFont: kit.boldFont });

    if (inspection.safeToUse === "Sim" || inspection.safeToUse === "Não") {
      const translatedStatusWidth = kit.boldFont.widthOfTextAtSize(translatedSafeToUse, 9.5);
      const boxPadding = 5;
      const leftPadding = 6;
      kit.rect(
        60 + baseTextWidth - 2,
        kit.y - boxPadding,
        translatedStatusWidth + boxPadding * 2 + leftPadding,
        9.5 + boxPadding * 2,
        inspection.safeToUse === "Sim" ? kit.colors.accent : kit.colors.danger
      );
      kit.text(translatedSafeToUse, 60 + baseTextWidth + leftPadding, kit.y, {
        size: 9.5,
        useFont: kit.boldFont,
        color: kit.colors.white,
      });
    } else {
      kit.text(translatedSafeToUse, 60 + baseTextWidth, kit.y, { size: 9.5, useFont: kit.boldFont });
    }
    kit.y -= 20;

    kit.text(`${t.maintenanceRequired}: ${translateValue(inspection.maintenanceRequired, "yesNo", language)}`, 60, kit.y, {
      size: 9.5,
    });
    kit.y -= 20;
    kit.text(`${t.assetStatus}: ${translateValue(inspection.assetStatus, "status", language)}`, 60, kit.y, { size: 9.5 });
    kit.y -= 20;
    kit.text(`${t.maintenancePriority}: ${translateValue(inspection.maintenancePriority, "priority", language)}`, 60, kit.y, {
      size: 9.5,
    });
    kit.y -= 26;

    if (inspection.additionalNotes) {
      kit.checkSpace(60);
      kit.text(`${t.additionalNotes}:`, 60, kit.y, { size: 9.5, useFont: kit.boldFont });
      kit.y -= 15;
      const notesLines = kit.wrapText(inspection.additionalNotes, 480, kit.font, 9.5);
      notesLines.forEach((line) => {
        kit.checkSpace(15);
        kit.text(line, 60, kit.y, { size: 9.5 });
        kit.y -= 14;
      });
      kit.y -= 20;
    }
  }

  // ── Assinaturas ──────────────────────────────────────────────────────
  kit.checkSpace(90);
  kit.y -= 20;
  const lineWidth = 200;
  const spacing = 50;
  const startXClient = (495.28 - lineWidth * 2 - spacing) / 2 + 50;
  const startXTecnico = startXClient + lineWidth + spacing;

  kit.hLine(startXClient, startXClient + lineWidth, kit.y, 1, kit.colors.ink);
  kit.text(`(${t.client})`, startXClient + lineWidth / 2, kit.y - 14, { size: 9, align: "center" });

  kit.hLine(startXTecnico, startXTecnico + lineWidth, kit.y, 1, kit.colors.ink);
  kit.text(`(${t.technician})`, startXTecnico + lineWidth / 2, kit.y - 14, { size: 9, align: "center" });

  kit.finish();

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
};

export default generateInspectionPDF;
