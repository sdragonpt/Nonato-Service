import { PDFDocument } from "pdf-lib";
import formatEuroNumber from "../../../../utils/formatters/formatEuroNumber";
import { calculateTotalsWithIVA } from "@/utils/formatters/budgetCalculations";
import { createPdfKit } from "../../../../utils/pdf/pdfKit.js";

const generateSimpleBudgetPDF = async (budget) => {
  const pdfDoc = await PDFDocument.create();

  const kit = await createPdfKit(pdfDoc, {
    title: budget.isExpense ? "Despesa" : "Orçamento",
    subtitle: "Nonato Service · Assistência Técnica",
    docLabel: "Nº",
    docNumber: budget.budgetNumber,
    footerNote: `NONATO SERVICE · ${budget.budgetNumber || ""}`,
  });

  const currentDate = new Date().toLocaleDateString("pt-PT");

  kit.newPage();

  kit.sectionTitle("Cliente");
  kit.infoPanel([
    ["Cliente", budget.clientData?.name || "-"],
    ["Data", currentDate],
  ]);

  kit.sectionTitle("Serviços");
  const columns = [
    { header: "Descrição", width: 198, align: "left", key: "name" },
    { header: "Unidade", width: 74, align: "left", key: "type" },
    { header: "Preço Unit.", width: 74, align: "right", key: "unit" },
    { header: "Qtd.", width: 60, align: "right", key: "qty" },
    { header: "Preço", width: 89.28, align: "right", key: "total" },
  ];

  kit.tableHeader(columns);
  budget.services.forEach((service, index) => {
    if (kit.checkSpace(24)) {
      kit.sectionTitle("Serviços (cont.)");
      kit.tableHeader(columns);
    }
    kit.tableRow(
      columns,
      {
        name: service.name || "-",
        type: service.type || "-",
        unit: `${formatEuroNumber(service.value || 0)} €`,
        qty: String(service.quantity || 0),
        total: `${formatEuroNumber(service.total || 0)} €`,
      },
      index
    );
  });
  kit.y -= 16;

  // ── Totais (Subtotal / IVA / Total) ────────────────────────────────
  kit.checkSpace(110);
  const totalsData = calculateTotalsWithIVA(budget.services, budget.ivaRate || 23);
  const showIVA = budget.showIVA && budget.ivaRate > 0;

  const drawTotalLine = (label, value, { emphasis = false } = {}) => {
    const boxWidth = 250;
    const boxHeight = 26;
    const boxX = 545.28 - boxWidth;
    kit.rect(
      boxX,
      kit.y - boxHeight,
      boxWidth,
      boxHeight,
      emphasis ? kit.colors.dark : kit.colors.rowAlt,
      emphasis ? undefined : kit.colors.lineSoft,
      emphasis ? 0 : 0.75
    );
    kit.text(label, boxX + 10, kit.y - boxHeight + 9, {
      size: 9.5,
      useFont: kit.boldFont,
      color: emphasis ? kit.colors.white : kit.colors.ink,
    });
    const valueText = `${value} €`;
    const valueW = kit.boldFont.widthOfTextAtSize(valueText, emphasis ? 12 : 10);
    kit.text(valueText, boxX + boxWidth - 12 - valueW, kit.y - boxHeight + (emphasis ? 8 : 9), {
      size: emphasis ? 12 : 10,
      useFont: kit.boldFont,
      color: emphasis ? kit.colors.accent : kit.colors.ink,
    });
    kit.y -= boxHeight + 6;
  };

  drawTotalLine("Subtotal", formatEuroNumber(totalsData.subtotal));
  if (showIVA) {
    drawTotalLine(`IVA (${budget.ivaRate}%)`, formatEuroNumber(totalsData.ivaAmount));
  }
  drawTotalLine("Total", formatEuroNumber(showIVA ? totalsData.total : totalsData.subtotal), { emphasis: true });
  kit.y -= 12;

  // ── Pagamento ───────────────────────────────────────────────────────
  kit.checkSpace(110);
  kit.sectionTitle("Pagamento");
  kit.infoPanel([
    ["Meios de Pagamento", "Transferência bancária ou dinheiro"],
    ["Dados Bancários", "PT50003600569910021386913"],
    ["Condições de Pagamento", "À vista"],
  ]);

  // ── Informações adicionais ─────────────────────────────────────────
  kit.checkSpace(110);
  kit.sectionTitle("Informações Adicionais");
  kit.text("A Nonato Service agradece e fará o melhor por você e pela sua empresa.", 50, kit.y, { size: 9.5 });
  kit.y -= 30;
  const thanks = "A Nonato Service agradece pela sua preferência.";
  kit.text(thanks, 50 + 495.28 / 2, kit.y, { size: 10, useFont: kit.boldFont, align: "center" });
  kit.y -= 16;
  kit.text(currentDate, 50 + 495.28 / 2, kit.y, { size: 9, align: "center", color: kit.colors.muted });
  kit.y -= 50;

  // ── Assinaturas ──────────────────────────────────────────────────────
  kit.checkSpace(60);
  const lineWidth = 200;
  const spacing = 50;
  const startXClient = (495.28 - lineWidth * 2 - spacing) / 2 + 50;
  const startXTecnico = startXClient + lineWidth + spacing;

  kit.hLine(startXClient, startXClient + lineWidth, kit.y, 1, kit.colors.ink);
  kit.text("(Cliente)", startXClient + lineWidth / 2, kit.y - 14, { size: 9, align: "center" });

  kit.hLine(startXTecnico, startXTecnico + lineWidth, kit.y, 1, kit.colors.ink);
  kit.text("(Técnico)", startXTecnico + lineWidth / 2, kit.y - 14, { size: 9, align: "center" });

  kit.finish();

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
};

export default generateSimpleBudgetPDF;
