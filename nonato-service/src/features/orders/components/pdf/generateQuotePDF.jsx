// generateQuotePDF.jsx - Orçamento de peças (anexado a uma ordem de serviço)
import { PDFDocument, rgb } from "pdf-lib";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../firebase.jsx";
import { createPdfKit } from "../../../../utils/pdf/pdfKit.js";

const generateQuotePDF = async (orderId, order, client, fileName) => {
  const pdfDoc = await PDFDocument.create();

  // ✅ FUNÇÃO PARA BUSCAR DADOS COMPLETOS DAS PEÇAS
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

  const enrichItemsWithPartData = async (items) => {
    if (!items || items.length === 0) return [];
    const enrichedItems = [];
    for (const item of items) {
      if (item.id) {
        const completePartData = await fetchCompletePartData(item.id);
        if (completePartData) {
          enrichedItems.push({
            ...completePartData,
            ...item,
            name: completePartData.name || item.name,
            code: completePartData.code || item.code,
            imageHash: completePartData.imageHash || item.imageHash,
            image: completePartData.image || item.image,
            imageUrl: completePartData.imageUrl || item.imageUrl,
          });
        } else {
          enrichedItems.push(item);
        }
      } else {
        enrichedItems.push(item);
      }
    }
    return enrichedItems;
  };

  const loadImageFromLibrary = async (imageHash) => {
    try {
      if (!imageHash) return null;
      const imageRef = doc(db, "image_library", imageHash);
      const imageDoc = await getDoc(imageRef);
      return imageDoc.exists() ? imageDoc.data().data : null;
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
        return { data: Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0)), isJpeg };
      }
      const response = await fetch(imageSrc);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      const isJpeg = imageSrc.toLowerCase().includes("jpg") || imageSrc.toLowerCase().includes("jpeg");
      return { data: new Uint8Array(arrayBuffer), isJpeg };
    } catch (error) {
      console.error("Erro ao carregar dados da imagem:", error);
      return null;
    }
  };

  const processItemImage = async (item) => {
    const imageFields = ["imageHash", "image", "imageUrl", "img"];
    for (const field of imageFields) {
      if (!item[field]) continue;
      try {
        let imageData = null;
        if (field === "imageHash") {
          const libraryImageData = await loadImageFromLibrary(item[field]);
          if (libraryImageData) imageData = await loadImageData(libraryImageData);
        } else {
          imageData = await loadImageData(item[field]);
        }
        if (imageData) return imageData;
      } catch (error) {
        console.error(`Erro ao processar campo '${field}':`, error);
      }
    }
    return null;
  };

  const fetchEquipmentData = async (equipmentId) => {
    try {
      if (!equipmentId) return null;
      const equipmentRef = doc(db, "equipamentos", equipmentId);
      const equipmentDoc = await getDoc(equipmentRef);
      return equipmentDoc.exists() ? { id: equipmentDoc.id, ...equipmentDoc.data() } : null;
    } catch (error) {
      console.error("Erro ao buscar dados do equipamento:", error);
      return null;
    }
  };

  // Nº definitivo do orçamento de peças: usa o campo persistido `quoteNumber`
  // (gerado uma única vez na criação/primeiro PDF, ver docNumbering.js).
  // O fallback só se aplica a documentos antigos que ainda não tenham sido
  // migrados para o novo esquema de numeração.
  const getShortQuoteId = (fullId) => {
    if (order.quoteNumber) return order.quoteNumber;
    if (!fullId) return "ORP-0000";
    return `ORP-${fullId}`;
  };

  const formatDate = (date) => {
    const options = { year: "2-digit", month: "2-digit", day: "2-digit" };
    return new Date(date).toLocaleDateString("pt-BR", options);
  };

  const formatPrice = (price) => {
    const numericAmount = parseFloat(price || 0);
    const isNegative = numericAmount < 0;
    const [intPart, decPart] = Math.abs(numericAmount).toFixed(2).split(".");
    const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${isNegative ? "-" : ""}€ ${intWithDots},${decPart}`;
  };

  const calculateTotals = (items = []) => {
    const subtotal = items?.reduce((sum, item) => sum + item.quantity * (item.price || 0), 0) || 0;
    const shipping = parseFloat(order.shippingPrice) || 0;
    const totalBeforeVat = subtotal + shipping;
    const vatAmount = order.includeVat && order.vatRate ? (totalBeforeVat * order.vatRate) / 100 : 0;
    const totalWithVat = totalBeforeVat + vatAmount;
    return { subtotal, shipping, totalBeforeVat, vatAmount, totalWithVat };
  };

  const originalItems = order.items || [];
  const enrichedItems = await enrichItemsWithPartData(originalItems);
  const shortQuoteId = getShortQuoteId(orderId);
  const totals = calculateTotals(enrichedItems);

  const kit = await createPdfKit(pdfDoc, {
    title: "Orçamento",
    subtitle: "Nonato Service · Orçamento de Peças",
    docLabel: "Nº",
    docNumber: shortQuoteId,
    footerNote: `NONATO SERVICE · ${shortQuoteId}`,
  });

  kit.newPage();

  // ── Dados do cliente e equipamento ──────────────────────────────────
  let equipmentModel = "N/A";
  let equipmentSerial = "N/A";
  let equipmentBrand = "N/A";
  if (order.manualEquipment?.model) {
    equipmentModel = order.manualEquipment.model;
    equipmentSerial = order.manualEquipment.serialNumber || "N/A";
    equipmentBrand = order.manualEquipment.brand || "N/A";
  } else if (order.equipmentId) {
    const equipment = await fetchEquipmentData(order.equipmentId);
    if (equipment) {
      equipmentModel = equipment.model || "N/A";
      equipmentSerial = equipment.serialNumber || "N/A";
      equipmentBrand = equipment.brand || "N/A";
    }
  }

  kit.sectionTitle("Dados do Cliente e Equipamento");
  const infoRows = [
    ["Cliente", order.clientInfo?.name || client?.name || "N/A"],
    ["Data", formatDate(new Date())],
    ["Email", order.clientInfo?.email || client?.email || "N/A"],
    ["Marca / Modelo", `${equipmentBrand} ${equipmentModel}`],
    ["Telefone", order.clientInfo?.phone || client?.phone || "N/A"],
    ["Nº de Série", equipmentSerial],
  ];
  if (order.clientInfo?.company) {
    infoRows.push(["Empresa", order.clientInfo.company]);
  }
  kit.infoPanel(infoRows, { cols: 2 });

  // ── Itens do orçamento ───────────────────────────────────────────────
  kit.checkSpace(120);
  kit.sectionTitle("Itens do Orçamento");

  const columns = [
    { header: "Imagem", width: 55, align: "center" },
    { header: "Item", width: 190, align: "left" },
    { header: "Código", width: 75, align: "center" },
    { header: "Qtd", width: 35, align: "center" },
    { header: "Preço Un.", width: 70.28, align: "right" },
    { header: "Subtotal", width: 70, align: "right" },
  ];

  const drawItemsHeader = () => {
    const headerHeight = 22;
    kit.rect(50, kit.y - headerHeight, 495.28, headerHeight, kit.colors.headerFill);
    let xPos = 50;
    columns.forEach((col) => {
      const label = col.header.toUpperCase();
      const tw = kit.boldFont.widthOfTextAtSize(label, 7.5);
      const tx = col.align === "center" ? xPos + (col.width - tw) / 2 : col.align === "right" ? xPos + col.width - tw - 8 : xPos + 8;
      kit.text(label, tx, kit.y - headerHeight + 8, { size: 7.5, useFont: kit.boldFont });
      xPos += col.width;
    });
    kit.hLine(50, 545.28, kit.y - headerHeight, 1, kit.colors.ink);
    kit.y -= headerHeight;
  };

  drawItemsHeader();

  const warnColor = rgb(0.72, 0.42, 0.05);
  const warnBg = rgb(0.99, 0.95, 0.88);

  for (let idx = 0; idx < enrichedItems.length; idx++) {
    const item = enrichedItems[idx];
    const price = item.price || 0;
    const subtotal = item.quantity * price;
    const hasPrice = price > 0;

    const nameLines = kit.wrapText(item.name, columns[1].width - 12, kit.font, 9);
    const maxLines = Math.min(nameLines.length, 3);
    const itemHeight = Math.max(46, maxLines * 12 + 16);

    if (kit.checkSpace(itemHeight + 10)) {
      kit.sectionTitle("Itens do Orçamento (cont.)");
      drawItemsHeader();
    }

    const bg = hasPrice ? (idx % 2 === 0 ? kit.colors.accentSoft : kit.colors.paper) : (idx % 2 === 0 ? warnBg : kit.colors.paper);
    let xPos = 50;

    // Imagem
    kit.rect(xPos, kit.y - itemHeight, columns[0].width, itemHeight, bg, kit.colors.lineSoft, 0.5);
    try {
      const imageData = await processItemImage(item);
      if (imageData) {
        const partImage = imageData.isJpeg ? await pdfDoc.embedJpg(imageData.data) : await pdfDoc.embedPng(imageData.data);
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
        kit.text("N/A", xPos + columns[0].width / 2 - 8, kit.y - itemHeight / 2 - 4, { size: 8, color: kit.colors.muted });
      }
    } catch (error) {
      console.error(`Erro ao processar imagem para ${item.name}:`, error);
      kit.text("ERRO", xPos + columns[0].width / 2 - 12, kit.y - itemHeight / 2 - 4, { size: 8, color: kit.colors.danger });
    }
    xPos += columns[0].width;

    // Nome
    kit.rect(xPos, kit.y - itemHeight, columns[1].width, itemHeight, bg, kit.colors.lineSoft, 0.5);
    nameLines.slice(0, maxLines).forEach((line, lineIndex) => {
      kit.text(line, xPos + 6, kit.y - 14 - lineIndex * 12, {
        size: 9,
        useFont: kit.font,
        color: hasPrice ? kit.colors.ink : warnColor,
      });
    });
    xPos += columns[1].width;

    const remainingValues = [
      item.code || "N/A",
      item.quantity.toString(),
      price > 0 ? formatPrice(price) : "A definir",
      price > 0 ? formatPrice(subtotal) : "A definir",
    ];
    remainingValues.forEach((value, i2) => {
      const col = columns[i2 + 2];
      kit.rect(xPos, kit.y - itemHeight, col.width, itemHeight, bg, kit.colors.lineSoft, 0.5);
      const tw = kit.font.widthOfTextAtSize(value, 9);
      const tx = col.align === "right" ? xPos + col.width - tw - 8 : xPos + (col.width - tw) / 2;
      kit.text(value, tx, kit.y - itemHeight / 2 - 4, { size: 9, color: hasPrice ? kit.colors.ink : warnColor });
      xPos += col.width;
    });

    kit.y -= itemHeight;
  }

  kit.y -= 16;

  // ── Envio ─────────────────────────────────────────────────────────
  if (order.shippingType && order.shippingPrice > 0) {
    kit.checkSpace(60);
    kit.sectionTitle("Informações de Envio");
    kit.infoPanel([
      ["Tipo", order.shippingType],
      ["Preço", formatPrice(order.shippingPrice)],
    ]);
  }

  // ── Totais ────────────────────────────────────────────────────────
  kit.checkSpace(140);
  const drawTotalLine = (label, value, { emphasis = false, tint } = {}) => {
    const boxWidth = 250;
    const boxHeight = emphasis ? 30 : 25;
    const boxX = 545.28 - boxWidth;
    kit.rect(
      boxX,
      kit.y - boxHeight,
      boxWidth,
      boxHeight,
      emphasis ? kit.colors.dark : tint || kit.colors.rowAlt,
      emphasis ? undefined : kit.colors.lineSoft,
      emphasis ? 0 : 0.75
    );
    kit.text(label.toUpperCase(), boxX + 10, kit.y - boxHeight + (emphasis ? 11 : 9), {
      size: emphasis ? 9.5 : 8.5,
      useFont: kit.boldFont,
      color: emphasis ? kit.colors.white : kit.colors.ink,
    });
    const valueText = value;
    const valueW = kit.boldFont.widthOfTextAtSize(valueText, emphasis ? 12 : 10);
    kit.text(valueText, boxX + boxWidth - 12 - valueW, kit.y - boxHeight + (emphasis ? 10 : 9), {
      size: emphasis ? 12 : 10,
      useFont: kit.boldFont,
      color: emphasis ? kit.colors.accent : kit.colors.ink,
    });
    kit.y -= boxHeight + 4;
  };

  drawTotalLine("Subtotal Itens", formatPrice(totals.subtotal));
  if (totals.shipping > 0) {
    drawTotalLine("Envio", formatPrice(totals.shipping));
  }
  if (order.includeVat && totals.vatAmount > 0) {
    drawTotalLine("Total S/ IVA", formatPrice(totals.totalBeforeVat));
    drawTotalLine(`IVA (${order.vatRate}%)`, formatPrice(totals.vatAmount));
  }
  const finalTotal = order.includeVat ? totals.totalWithVat : totals.totalBeforeVat;
  drawTotalLine("Total Final", formatPrice(finalTotal), { emphasis: true });
  kit.y -= 14;

  // ── Observações ───────────────────────────────────────────────────
  if (order.clientInfo?.message) {
    kit.checkSpace(90);
    kit.sectionTitle("Observações");
    const lines = kit.wrapText(order.clientInfo.message, 475, kit.font, 9.5);
    const lineHeight = 13;
    const boxHeight = Math.max(lines.slice(0, 4).length * lineHeight + 16, 34);
    kit.rect(50, kit.y - boxHeight, 495.28, boxHeight, kit.colors.paper, kit.colors.lineSoft, 0.75);
    lines.slice(0, 4).forEach((line, idx) => {
      kit.text(line, 60, kit.y - 16 - idx * lineHeight, { size: 9.5 });
    });
    kit.y -= boxHeight + 18;
  }

  // ── Aviso importante ───────────────────────────────────────────────
  kit.checkSpace(90);
  const warningBoxHeight = 62;
  kit.rect(50, kit.y - warningBoxHeight, 495.28, warningBoxHeight, rgb(0.99, 0.94, 0.94), kit.colors.danger, 1.25);
  kit.text("AVISO IMPORTANTE", 60, kit.y - 18, { size: 9.5, useFont: kit.boldFont, color: kit.colors.danger });
  const warningText = "NÃO SERÁ ACEITE A TROCA DE PEÇAS POR EQUÍVOCO OU ENGANO DE QUEM SOLICITOU.";
  const warningLines = kit.wrapText(warningText, 475, kit.font, 9);
  warningLines.forEach((line, idx) => {
    kit.text(line, 60, kit.y - 34 - idx * 12, { size: 9, color: rgb(0.6, 0.15, 0.15) });
  });
  kit.text("Todas as peças devem ser verificadas antes da confirmação do pedido.", 60, kit.y - warningBoxHeight + 10, {
    size: 8,
    color: rgb(0.6, 0.15, 0.15),
  });
  kit.y -= warningBoxHeight + 24;

  // ── Assinaturas ──────────────────────────────────────────────────────
  kit.checkSpace(90);
  kit.sectionTitle("Assinaturas");
  kit.y -= 30;

  const lineWidth = 150;
  const gap = 50;
  const clienteX = (495.28 - 2 * lineWidth - gap) / 2 + 50;
  const elaboradoX = clienteX + lineWidth + gap;

  kit.hLine(clienteX, clienteX + lineWidth, kit.y, 1, kit.colors.ink);
  kit.hLine(elaboradoX, elaboradoX + lineWidth, kit.y, 1, kit.colors.ink);
  kit.text("(Cliente)", clienteX + lineWidth / 2, kit.y - 14, { size: 9, align: "center" });
  kit.text("(Elaborado por)", elaboradoX + lineWidth / 2, kit.y - 14, { size: 9, align: "center" });

  kit.y -= 40;
  kit.text("Data: ___/___/______", 50 + 495.28 / 2, kit.y, { size: 9, align: "center" });

  kit.finish();

  const pdfBytes = await pdfDoc.save();
  return {
    blob: new Blob([pdfBytes], { type: "application/pdf" }),
    fileName: fileName.replace(orderId, shortQuoteId),
  };
};

export default generateQuotePDF;
