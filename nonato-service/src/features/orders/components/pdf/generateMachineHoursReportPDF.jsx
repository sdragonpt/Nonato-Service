import { PDFDocument } from "pdf-lib";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../firebase.jsx";
import { createPdfKit } from "../../../../utils/pdf/pdfKit.js";

// ─────────────────────────────────────────────────────────────────────────
// Relatório especial "por equipamento": tem exatamente o mesmo conteúdo do
// relatório normal (dados do cliente, tabela de horas/deslocamentos,
// descrições, peças, resultados, assinaturas) mais uma secção extra que
// agrupa as horas por MÁQUINA em vez de por data — só faz sentido gerar
// quando a ordem tem dias de trabalho com máquinas registadas (ver
// `hasMachineEntries` em OrderDetail.jsx, que controla a visibilidade do
// botão).
// ─────────────────────────────────────────────────────────────────────────
const generateMachineHoursReportPDF = async (
  orderIdForPDF,
  order,
  client,
  equipment,
  workdays,
  fileName
) => {
  const pdfDoc = await PDFDocument.create();

  const kit = await createPdfKit(pdfDoc, {
    title: "Relatório de Serviço",
    subtitle: "Horas por Equipamento · Nonato Service",
    docNumber: orderIdForPDF,
    footerNote: `NONATO SERVICE · ${orderIdForPDF}`,
  });

  const safeText = kit.safeText;

  const formatDate = (date) => {
    const options = { year: "2-digit", month: "2-digit", day: "2-digit" };
    return new Date(date).toLocaleDateString("pt-BR", options);
  };

  // ✅ Só remove caracteres verdadeiramente não imprimíveis — acentuação
  // portuguesa (á, ç, ã, õ...) é suportada pela fonte Helvetica/WinAnsi
  // usada no PDF, por isso já não é preciso apagá-la.
  const sanitizeText = (text) => {
    if (!text) return "";
    return text
      .replace(/\n/g, " ")
      .replace(/\r/g, " ")
      .replace(/\t/g, " ")
      .replace(/\s+/g, " ")
      .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "")
      .trim();
  };

  // ── Cálculos de horas/km (lógica inalterada) ─────────────────────────
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

  // Soma a duração (em minutos) de todos os blocos "máquina + horário" de um
  // dia — cada bloco é somado individualmente, por isso os intervalos entre
  // máquinas (ex.: pausa entre sair de uma e entrar noutra) não entram na
  // conta, ao contrário do cálculo antigo de início/fim únicos do dia.
  function sumMachineEntriesMinutes(entries) {
    let totalMinutes = 0;
    (entries || []).forEach((entry) => {
      if (!entry.startHour || !entry.endHour) return;
      const startTime = new Date(`1970-01-01T${entry.startHour}:00`);
      let endTime = new Date(`1970-01-01T${entry.endHour}:00`);
      if (endTime < startTime) endTime.setDate(endTime.getDate() + 1);
      const diffMinutes = (endTime - startTime) / 1000 / 60;
      if (diffMinutes > 0) totalMinutes += diffMinutes;
    });
    return totalMinutes;
  }

  function minutesToHoursLabel(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  }

  // "Horas de Trabalho" desconta sempre a pausa/almoço do dia, mesmo em
  // dias com várias máquinas ("Total de Horas em Máquinas", mais abaixo,
  // continua a ser o tempo real em cada máquina, sem desconto de pausa).
  function dayWorkMinutes(day) {
    let dayMinutes = 0;
    if (day.machineEntries && day.machineEntries.length > 0) {
      dayMinutes = sumMachineEntriesMinutes(day.machineEntries);
    } else if (day.startHour && day.endHour) {
      const startTime = new Date(`1970-01-01T${day.startHour}:00`);
      let endTime = new Date(`1970-01-01T${day.endHour}:00`);
      if (endTime < startTime) endTime.setDate(endTime.getDate() + 1);
      dayMinutes = (endTime - startTime) / 1000 / 60;
    }
    const [pauseH, pauseM] = (day.pauseHours || "0:00").split(":").map(Number);
    dayMinutes -= (pauseH || 0) * 60 + (pauseM || 0);
    return dayMinutes > 0 ? dayMinutes : 0;
  }

  const calculateTotalWorkHours = (days) => {
    let totalMinutes = 0;
    days.forEach((day) => {
      totalMinutes += dayWorkMinutes(day);
    });
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  const calculateTotalKm = (days) =>
    days
      .reduce((total, day) => {
        const departure = parseFloat(day.kmDeparture) || 0;
        const returnKm = parseFloat(day.kmReturn) || 0;
        return total + departure + returnKm;
      }, 0)
      .toFixed(2);

  const calculateTotalTravelHours = (days) => {
    let totalMinutes = 0;
    days.forEach((day) => {
      if (day.departureTime && day.arrivalTime) {
        const goingHours = calculateHours(day.departureTime, day.arrivalTime);
        if (goingHours !== "0") {
          const [goingH, goingM] = goingHours.split(":").map(Number);
          totalMinutes += goingH * 60 + goingM;
        }
      }
      if (day.returnDepartureTime && day.returnArrivalTime) {
        const returnHours = calculateHours(
          day.returnDepartureTime,
          day.returnArrivalTime
        );
        if (returnHours !== "0") {
          const [returnH, returnM] = returnHours.split(":").map(Number);
          totalMinutes += returnH * 60 + returnM;
        }
      }
    });
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  // ── Peças (Firestore + imagens) — lógica inalterada ──────────────────
  const fetchCompletePartData = async (partId) => {
    try {
      const partRef = doc(db, "pecas", partId);
      const partDoc = await getDoc(partRef);
      if (partDoc.exists()) {
        return { id: partId, ...partDoc.data() };
      }
      return null;
    } catch (error) {
      console.error(`Erro ao buscar peça ${partId}:`, error);
      return null;
    }
  };

  const enrichPartsWithData = async (parts) => {
    if (!parts || parts.length === 0) return [];
    const enrichedParts = [];
    for (const part of parts) {
      if (part.id) {
        const completePartData = await fetchCompletePartData(part.id);
        if (completePartData) {
          enrichedParts.push({
            ...completePartData,
            ...part,
            name: completePartData.name || part.name,
            code: completePartData.code || part.code,
          });
        } else {
          enrichedParts.push(part);
        }
      } else {
        enrichedParts.push(part);
      }
    }
    return enrichedParts;
  };

  const loadImageFromLibrary = async (imageHash) => {
    try {
      if (!imageHash) return null;
      const imageRef = doc(db, "image_library", imageHash);
      const imageDoc = await getDoc(imageRef);
      if (imageDoc.exists()) {
        return imageDoc.data().data;
      }
      return null;
    } catch (error) {
      console.error("Erro ao carregar imagem da biblioteca:", error);
      return null;
    }
  };

  const loadImageData = async (imageSrc) => {
    try {
      if (!imageSrc) return null;
      if (imageSrc.startsWith("data:image/")) {
        const base64Data = imageSrc.split(",")[1];
        const isJpeg = imageSrc.includes("jpeg") || imageSrc.includes("jpg");
        return {
          data: Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0)),
          isJpeg,
        };
      }
      const response = await fetch(imageSrc);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      const isJpeg =
        imageSrc.toLowerCase().includes("jpg") ||
        imageSrc.toLowerCase().includes("jpeg");
      return { data: new Uint8Array(arrayBuffer), isJpeg };
    } catch (error) {
      console.error("Erro ao carregar dados da imagem:", error);
      return null;
    }
  };

  // ── Equipamentos (só nesta versão do relatório) ──────────────────────
  const fetchEquipmentDetails = async (equipmentId) => {
    if (!equipmentId) return null;
    try {
      const snap = await getDoc(doc(db, "equipamentos", equipmentId));
      return snap.exists() ? snap.data() : null;
    } catch (err) {
      console.error("Erro ao buscar equipamento:", err);
      return null;
    }
  };

  // Agrupa todos os blocos de máquina de todos os dias por equipamento
  // (mesma máquina em dias/blocos diferentes cai no mesmo grupo).
  const groupByEquipment = (days) => {
    const map = new Map();
    const sortedDays = [...days].sort((a, b) => new Date(a.workDate) - new Date(b.workDate));
    sortedDays.forEach((day) => {
      if (!day.machineEntries || day.machineEntries.length === 0) return;
      const dateLabel = formatDate(day.workDate);
      day.machineEntries.forEach((entry) => {
        if (!entry.startHour || !entry.endHour) return;
        const key = entry.equipmentId || `manual:${entry.equipmentLabel}`;
        if (!map.has(key)) {
          map.set(key, {
            equipmentId: entry.equipmentId || null,
            equipmentLabel: entry.equipmentLabel || "Máquina não identificada",
            rows: [],
            totalMinutes: 0,
          });
        }
        const group = map.get(key);
        const minutes = sumMachineEntriesMinutes([entry]);
        group.rows.push({ dateLabel, startHour: entry.startHour, endHour: entry.endHour, minutes });
        group.totalMinutes += minutes;
      });
    });
    return Array.from(map.values());
  };

  // ── Secções partilhadas com o relatório normal ───────────────────────

  // Sem Máquina/Modelo nem Número da Máquina aqui — este relatório pode
  // ter várias máquinas (ver secção "Horas por Equipamento" mais abaixo),
  // por isso um único campo de equipamento seria enganador. Esses campos
  // mantêm-se nos outros PDFs (relatório normal, orçamentos, etc.).
  const drawInfoSection = () => {
    kit.checkSpace(120);
    kit.sectionTitle("Dados do Cliente");
    kit.infoPanel(
      [
        ["Cliente", safeText(client.name)],
        ["Data", safeText(order.date)],
        ["Técnico", "Nonato"],
        ["Tipo de Serviço", safeText(order.serviceType)],
        ["Cidade", safeText(client.address)],
        ["Telefone", safeText(client.phone)],
      ],
      { cols: 2 }
    );
  };

  const hoursColumns = [44, 40, 40, 25, 38, 38, 25, 40, 40, 25, 38, 38, 25, 40];
  const hoursGroups = [
    { label: "DATA", span: [0] },
    { label: "IDA", span: [1, 2, 3], sub: ["SAÍDA", "CHEGADA", "DUR."] },
    { label: "TRABALHO", span: [4, 5, 6], sub: ["INÍCIO", "FIM", "DUR."] },
    { label: "RETORNO", span: [7, 8, 9], sub: ["SAÍDA", "CHEGADA", "DUR."] },
    { label: "KM", span: [10, 11, 12], sub: ["IDA", "RET.", "TOTAL"] },
    { label: "PAUSA", span: [13] },
  ];
  const computedCols = new Set([3, 6, 9, 12]);

  const drawHoursTableHeader = () => {
    const groupH = 15;
    const subH = 15;
    kit.rect(50, kit.y - groupH - subH, 495.28, groupH + subH, kit.colors.headerFill);

    let xPos = 50;
    hoursGroups.forEach((group) => {
      const groupWidth = group.span.reduce((sum, idx) => sum + hoursColumns[idx], 0);
      if (!group.sub) {
        const tw = kit.boldFont.widthOfTextAtSize(group.label, 7.5);
        kit.text(group.label, xPos + (groupWidth - tw) / 2, kit.y - groupH - subH / 2 - 2, {
          size: 7.5,
          useFont: kit.boldFont,
          color: kit.colors.ink,
        });
      } else {
        const tw = kit.boldFont.widthOfTextAtSize(group.label, 7.5);
        kit.text(group.label, xPos + (groupWidth - tw) / 2, kit.y - groupH + 4, {
          size: 7.5,
          useFont: kit.boldFont,
          color: kit.colors.ink,
        });
        let subX = xPos;
        group.span.forEach((idx, subIdx) => {
          const w = hoursColumns[idx];
          const subLabel = group.sub[subIdx];
          const stw = kit.font.widthOfTextAtSize(subLabel, 6);
          kit.text(subLabel, subX + (w - stw) / 2, kit.y - groupH - subH + 5, {
            size: 6,
            useFont: kit.font,
            color: kit.colors.muted,
          });
          subX += w;
        });
      }
      xPos += groupWidth;
    });

    kit.hLine(50, 50 + 495.28, kit.y - groupH - subH, 1, kit.colors.ink);
    kit.y -= groupH + subH;
  };

  const drawHoursTableRow = (workday, index) => {
    const cellHeight = 20;
    const hoursIda = calculateHours(workday.departureTime, workday.arrivalTime);
    const hoursRetorno = calculateHours(workday.returnDepartureTime, workday.returnArrivalTime);
    const hoursWork = minutesToHoursLabel(dayWorkMinutes(workday));
    const kmTotal = (Number(workday.kmDeparture) || 0) + (Number(workday.kmReturn) || 0);

    const rowData = [
      formatDate(workday.workDate),
      workday.departureTime,
      workday.arrivalTime,
      hoursIda,
      workday.startHour,
      workday.endHour,
      hoursWork,
      workday.returnDepartureTime,
      workday.returnArrivalTime,
      hoursRetorno,
      workday.kmDeparture,
      workday.kmReturn,
      kmTotal.toString(),
      workday.pauseHours,
    ];

    const bg = index % 2 === 0 ? kit.colors.paper : kit.colors.rowAlt;
    let xPos = 50;
    rowData.forEach((data, colIndex) => {
      const isComputed = computedCols.has(colIndex);
      kit.rect(xPos, kit.y - cellHeight, hoursColumns[colIndex], cellHeight, isComputed ? kit.colors.accentSoft : bg);
      const value = safeText(data);
      const useFont = isComputed ? kit.boldFont : kit.font;
      const tw = useFont.widthOfTextAtSize(value, 7.5);
      kit.text(value, xPos + (hoursColumns[colIndex] - tw) / 2, kit.y - cellHeight + 6, {
        size: 7.5,
        useFont,
        color: isComputed ? kit.colors.accent : kit.colors.ink,
      });
      xPos += hoursColumns[colIndex];
    });
    kit.hLine(50, 50 + 495.28, kit.y - cellHeight, 0.5, kit.colors.lineSoft);
    kit.y -= cellHeight;
  };

  const drawHoursSection = () => {
    kit.checkSpace(150);
    kit.sectionTitle("Controlo de Horas e Deslocamentos");
    drawHoursTableHeader();

    const sortedWorkdays = [...workdays].sort((a, b) => a.workDate - b.workDate);
    sortedWorkdays.forEach((workday, index) => {
      if (kit.checkSpace(40)) {
        kit.sectionTitle("Controlo de Horas e Deslocamentos (cont.)");
        drawHoursTableHeader();
      }
      drawHoursTableRow(workday, index);
    });

    kit.tableTotalRow("Total de Horas de Trabalho", `${calculateTotalWorkHours(workdays)}h`, {});
    kit.y -= 16;
  };

  // ── Secção exclusiva deste relatório: horas por equipamento ──────────
  const drawEquipmentSection = async (groups) => {
    kit.checkSpace(60);

    const totalMachineMinutes = groups.reduce((sum, g) => sum + g.totalMinutes, 0);
    const daysWithMachines = workdays.filter((d) => d.machineEntries && d.machineEntries.length > 0).length;
    kit.statBand(
      "Total de Horas em Máquinas",
      `${minutesToHoursLabel(totalMachineMinutes)}h`,
      `${groups.length} equipamento${groups.length === 1 ? "" : "s"} · ${daysWithMachines} dia${daysWithMachines === 1 ? "" : "s"} de trabalho`
    );

    kit.sectionTitle(`Horas por Equipamento (${groups.length})`);

    if (groups.length === 0) {
      kit.text("Não há máquinas registadas nos dias de trabalho desta ordem.", 50, kit.y, {
        size: 9,
        color: kit.colors.muted,
      });
      kit.y -= 24;
      return;
    }

    const columns = [
      { header: "Data", width: 90, align: "left" },
      { header: "Horário", width: 340, align: "left" },
      { header: "Duração", width: 65.28, align: "right" },
    ];

    const drawMiniHeader = () => {
      const headerHeight = 18;
      kit.rect(50, kit.y - headerHeight, 495.28, headerHeight, kit.colors.headerFill);
      let xPos = 50;
      columns.forEach((col) => {
        const label = col.header.toUpperCase();
        const tw = kit.boldFont.widthOfTextAtSize(label, 7.5);
        const tx = col.align === "right" ? xPos + col.width - tw - 8 : xPos + 8;
        kit.text(label, tx, kit.y - headerHeight + 6, { size: 7.5, useFont: kit.boldFont, color: kit.colors.ink });
        xPos += col.width;
      });
      kit.y -= headerHeight;
    };

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const details = group.equipmentId ? await fetchEquipmentDetails(group.equipmentId) : null;

      const headerHeight = 38;
      const estimatedHeight = headerHeight + 18 + group.rows.length * 18 + 22 + 16;
      if (kit.checkSpace(Math.min(estimatedHeight, 620))) {
        kit.sectionTitle(`Horas por Equipamento (${groups.length}) — cont.`);
      }

      kit.rect(50, kit.y - headerHeight, 495.28, headerHeight, kit.colors.dark);
      kit.numberBadge(58, kit.y - headerHeight + (headerHeight - 20) / 2, 20, i + 1);

      const nameX = 58 + 20 + 12;
      const totalLabel = `${minutesToHoursLabel(group.totalMinutes)}h`;
      const totalW = kit.boldFont.widthOfTextAtSize(totalLabel, 12);
      const nameMaxWidth = 545.28 - 12 - totalW - nameX - 10;

      // Etiqueta principal (Máquina/Modelo) em cima, nº de série pequeno e
      // cinzento por baixo, com espaço suficiente entre as duas linhas.
      kit.text(group.equipmentLabel, nameX, kit.y - 15, {
        size: 10.5,
        useFont: kit.boldFont,
        color: kit.colors.white,
        maxWidth: nameMaxWidth,
      });

      if (details) {
        const detailLabel = `${safeText(details.model, "")}${details.serialNumber ? `  ·  Nº Série: ${details.serialNumber}` : ""}`;
        kit.text(detailLabel, nameX, kit.y - 29, {
          size: 7.5,
          color: kit.colors.muted,
          maxWidth: nameMaxWidth,
        });
      }

      kit.text(totalLabel, 545.28 - 12, kit.y - headerHeight / 2 - 3, {
        size: 12,
        useFont: kit.boldFont,
        color: kit.colors.accent,
        align: "right",
      });

      kit.y -= headerHeight;

      drawMiniHeader();
      group.rows.forEach((row, rowIdx) => {
        if (kit.checkSpace(18 + 40)) {
          kit.sectionTitle(`Horas por Equipamento (${groups.length}) — cont.`);
          drawMiniHeader();
        }
        const bg = rowIdx % 2 === 0 ? kit.colors.paper : kit.colors.rowAlt;
        const rowHeight = 18;
        kit.rect(50, kit.y - rowHeight, 495.28, rowHeight, bg);
        let xPos = 50;
        const values = [row.dateLabel, `${row.startHour} – ${row.endHour}`, `${minutesToHoursLabel(row.minutes)}h`];
        values.forEach((value, colIdx) => {
          const col = columns[colIdx];
          const useFont = kit.font;
          const tw = useFont.widthOfTextAtSize(value, 8.5);
          const tx = col.align === "right" ? xPos + col.width - tw - 8 : xPos + 8;
          kit.text(value, tx, kit.y - rowHeight + 5, { size: 8.5, useFont, color: kit.colors.ink });
          xPos += col.width;
        });
        kit.hLine(50, 545.28, kit.y - rowHeight, 0.5, kit.colors.lineSoft);
        kit.y -= rowHeight;
      });

      if (kit.checkSpace(40)) {
        kit.sectionTitle(`Horas por Equipamento (${groups.length}) — cont.`);
      }
      kit.tableTotalRow("Total do equipamento", totalLabel, {});
      kit.y -= 16;
    }
  };

  const drawDescriptionsSection = () => {
    const hasValidDescriptions = workdays.some((day) => {
      const description = safeText(day.description);
      return description.trim() !== "" && description.trim().toUpperCase() !== "N/A";
    });
    if (!hasValidDescriptions) return;

    kit.checkSpace(80);
    kit.sectionTitle("Descrição do Trabalho Realizado");

    const sortedWorkdays = [...workdays].sort((a, b) => a.workDate - b.workDate);
    sortedWorkdays.forEach((day) => {
      const description = sanitizeText(safeText(day.description));
      if (description.trim() === "" || description.trim().toUpperCase() === "N/A") return;

      const maxWidth = 495.28 - 20;
      const lines = kit.wrapText(description, maxWidth, kit.font, 9);
      const lineHeight = 13;
      const boxHeight = Math.max(lines.length * lineHeight + 16, 34);
      const dateTagHeight = 20;

      if (kit.checkSpace(dateTagHeight + boxHeight + 30)) {
        kit.sectionTitle("Descrição do Trabalho Realizado (cont.)");
      }

      kit.rect(50, kit.y - dateTagHeight, 90, dateTagHeight, kit.colors.dark);
      kit.text(formatDate(day.workDate), 50 + 10, kit.y - dateTagHeight + 6, {
        size: 8.5,
        useFont: kit.boldFont,
        color: kit.colors.white,
      });
      kit.y -= dateTagHeight + 6;

      kit.rect(50, kit.y - boxHeight, 495.28, boxHeight, kit.colors.paper, kit.colors.lineSoft, 0.75);
      lines.forEach((line, idx) => {
        if (!line.trim()) return;
        kit.text(line.trim(), 50 + 12, kit.y - 16 - idx * lineHeight, {
          size: 9,
          useFont: kit.font,
          color: kit.colors.ink,
        });
      });
      kit.y -= boxHeight + 16;
    });
  };

  const drawPartsRequestSection = async () => {
    if (!order.checklist?.pecas || !order.partsQuoteItems?.length) return;

    kit.checkSpace(120);
    kit.sectionTitle("Peças que Necessitam de Ser Substituídas");

    const columns = [
      { header: "Imagem", width: 60, align: "center" },
      { header: "Descrição do Item", width: 275, align: "left" },
      { header: "Código", width: 105, align: "center" },
      { header: "Qtd", width: 55.28, align: "center" },
    ];

    const drawHeader = () => {
      const headerHeight = 22;
      kit.rect(50, kit.y - headerHeight, 495.28, headerHeight, kit.colors.headerFill);
      let xPos = 50;
      columns.forEach((col) => {
        const tw = kit.boldFont.widthOfTextAtSize(col.header.toUpperCase(), 7.5);
        const tx = col.align === "center" ? xPos + (col.width - tw) / 2 : xPos + 8;
        kit.text(col.header.toUpperCase(), tx, kit.y - headerHeight + 8, { size: 7.5, useFont: kit.boldFont });
        xPos += col.width;
      });
      kit.hLine(50, 545.28, kit.y - headerHeight, 1, kit.colors.ink);
      kit.y -= headerHeight;
    };

    drawHeader();

    const enrichedParts = await enrichPartsWithData(order.partsQuoteItems);

    for (let idx = 0; idx < enrichedParts.length; idx++) {
      const part = enrichedParts[idx];
      const nameLines = kit.wrapText(part.name || "Nome não disponível", columns[1].width - 15, kit.font, 9);
      const maxLines = Math.min(nameLines.length, 3);
      const itemHeight = Math.max(46, maxLines * 12 + 16);

      if (kit.checkSpace(itemHeight + 10)) {
        kit.sectionTitle("Peças que Necessitam de Ser Substituídas (cont.)");
        drawHeader();
      }

      const bg = idx % 2 === 0 ? kit.colors.paper : kit.colors.rowAlt;
      let xPos = 50;

      kit.rect(xPos, kit.y - itemHeight, columns[0].width, itemHeight, bg, kit.colors.lineSoft, 0.5);
      try {
        let imageData = null;
        if (part.imageHash) {
          const libraryImageData = await loadImageFromLibrary(part.imageHash);
          if (libraryImageData) imageData = await loadImageData(libraryImageData);
        } else if (part.image) {
          imageData = await loadImageData(part.image);
        }

        if (imageData) {
          const partImage = imageData.isJpeg
            ? await pdfDoc.embedJpg(imageData.data)
            : await pdfDoc.embedPng(imageData.data);
          const maxImgWidth = columns[0].width - 8;
          const maxImgHeight = itemHeight - 8;
          let imgWidth = maxImgWidth;
          let imgHeight = (imgWidth * partImage.height) / partImage.width;
          if (imgHeight > maxImgHeight) {
            imgHeight = maxImgHeight;
            imgWidth = (imgHeight * partImage.width) / partImage.height;
          }
          kit.page.drawImage(partImage, {
            x: xPos + (columns[0].width - imgWidth) / 2,
            y: kit.y - itemHeight + (itemHeight - imgHeight) / 2,
            width: imgWidth,
            height: imgHeight,
          });
        } else {
          kit.text("N/A", xPos + columns[0].width / 2 - 8, kit.y - itemHeight / 2 - 4, {
            size: 8,
            color: kit.colors.muted,
          });
        }
      } catch (error) {
        console.error("Erro ao processar imagem:", error);
      }
      xPos += columns[0].width;

      kit.rect(xPos, kit.y - itemHeight, columns[1].width, itemHeight, bg, kit.colors.lineSoft, 0.5);
      nameLines.slice(0, maxLines).forEach((line, lineIndex) => {
        kit.text(line, xPos + 8, kit.y - 16 - lineIndex * 12, { size: 9, useFont: kit.font });
      });
      xPos += columns[1].width;

      kit.rect(xPos, kit.y - itemHeight, columns[2].width, itemHeight, bg, kit.colors.lineSoft, 0.5);
      const codeText = part.code || "N/A";
      const codeW = kit.font.widthOfTextAtSize(codeText, 9);
      kit.text(codeText, xPos + (columns[2].width - codeW) / 2, kit.y - itemHeight / 2 - 4, { size: 9 });
      xPos += columns[2].width;

      kit.rect(xPos, kit.y - itemHeight, columns[3].width, itemHeight, kit.colors.accentSoft, kit.colors.lineSoft, 0.5);
      const qtyText = String(part.quantity);
      const qtyW = kit.boldFont.widthOfTextAtSize(qtyText, 10);
      kit.text(qtyText, xPos + (columns[3].width - qtyW) / 2, kit.y - itemHeight / 2 - 4, {
        size: 10,
        useFont: kit.boldFont,
        color: kit.colors.accent,
      });

      kit.y -= itemHeight;
    }

    kit.y -= 18;
  };

  const drawCheckbox = (x, y, checked, label) => {
    if (checked) {
      kit.rect(x, y, 13, 13, kit.colors.accent);
      kit.text("X", x + 3.5, y + 3, { size: 9, useFont: kit.boldFont, color: kit.colors.white });
    } else {
      kit.rect(x, y, 13, 13, kit.colors.paper, kit.colors.line, 1);
    }
    kit.text(label, x + 21, y + 3, { size: 9.5, useFont: kit.font, color: kit.colors.ink });
  };

  const drawAdjustableTextBox = (label, textContent) => {
    const maxWidth = 495.28 - 20;
    const cleanText = sanitizeText(safeText(textContent, ""));
    const lines = kit.wrapText(cleanText || "-", maxWidth, kit.font, 9);
    const lineHeight = 13;
    const boxHeight = Math.max(lines.length * lineHeight + 16, 32);

    if (kit.checkSpace(boxHeight + 24)) {
      kit.sectionTitle("Resultados do Trabalho (cont.)");
    }

    kit.text(label, 50, kit.y, { size: 9.5, useFont: kit.boldFont, color: kit.colors.ink });
    kit.y -= 16;

    kit.rect(50, kit.y - boxHeight, 495.28, boxHeight, kit.colors.paper, kit.colors.lineSoft, 0.75);
    lines.forEach((line, idx) => {
      if (!line.trim()) return;
      kit.text(line.trim(), 60, kit.y - 16 - idx * lineHeight, { size: 9, useFont: kit.font, color: kit.colors.ink });
    });
    kit.y -= boxHeight + 20;
  };

  const drawResultsSection = () => {
    kit.checkSpace(220);
    kit.y -= 6;

    kit.statRow([
      { label: "Horas de Trabalho", value: `${calculateTotalWorkHours(workdays)}h` },
      { label: "Km's Percorridos", value: `${calculateTotalKm(workdays)} km` },
      { label: "Horas de Viagem", value: `${calculateTotalTravelHours(workdays)}h` },
    ]);

    kit.sectionTitle("Resultados do Trabalho");

    const checkboxes = [
      { key: "concluido", label: "Serviço Concluído" },
      { key: "producao", label: "Liberação para Produção" },
      { key: "retorno", label: "Retorno Necessário" },
      { key: "funcionarios", label: "Instrução dos Funcionários" },
      { key: "documentacao", label: "Entrega da Documentação" },
      { key: "pecas", label: "Necessário troca de Peças" },
    ];
    const cols = 2;
    const colWidth = 495.28 / cols;
    checkboxes.forEach((checkbox, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = 50 + col * colWidth;
      const y = kit.y - row * 24;
      drawCheckbox(x, y, order.checklist[checkbox.key], checkbox.label);
    });
    kit.y -= Math.ceil(checkboxes.length / cols) * 24 + 18;

    drawAdjustableTextBox("Observações:", order.resultDescription);
    drawAdjustableTextBox("Pontos em Aberto:", order.pontosEmAberto);
  };

  const drawSignaturesSection = () => {
    kit.checkSpace(110);
    kit.sectionTitle("Assinaturas");
    kit.y -= 40;

    const lineWidth = 180;
    const gap = 60;
    const clienteX = (595.28 - 2 * lineWidth - gap) / 2;
    const tecnicoX = clienteX + lineWidth + gap;

    kit.hLine(clienteX, clienteX + lineWidth, kit.y, 1, kit.colors.ink);
    kit.hLine(tecnicoX, tecnicoX + lineWidth, kit.y, 1, kit.colors.ink);

    kit.text("CLIENTE", clienteX + lineWidth / 2, kit.y - 16, {
      size: 9.5,
      useFont: kit.boldFont,
      align: "center",
    });
    kit.text("TÉCNICO", tecnicoX + lineWidth / 2, kit.y - 16, {
      size: 9.5,
      useFont: kit.boldFont,
      align: "center",
    });
  };

  // ── Execução ───────────────────────────────────────────────────────
  kit.newPage();
  drawInfoSection();
  drawHoursSection();
  const equipmentGroups = groupByEquipment(workdays);
  await drawEquipmentSection(equipmentGroups);
  drawDescriptionsSection();
  await drawPartsRequestSection();
  drawResultsSection();
  drawSignaturesSection();
  kit.finish();

  const pdfBytes = await pdfDoc.save();
  return { blob: new Blob([pdfBytes], { type: "application/pdf" }), fileName };
};

export default generateMachineHoursReportPDF;
