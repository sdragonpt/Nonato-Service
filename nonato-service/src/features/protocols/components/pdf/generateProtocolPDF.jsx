// generateProtocolPDF.jsx - Gera o PDF do Protocolo de Serviço (antes/depois + peças)
import { PDFDocument } from "pdf-lib";
import { createPdfKit } from "../../../../utils/pdf/pdfKit.js";

async function embedImageFromUrl(pdfDoc, url) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("png")) {
      return await pdfDoc.embedPng(arrayBuffer);
    }
    try {
      return await pdfDoc.embedJpg(arrayBuffer);
    } catch {
      return await pdfDoc.embedPng(arrayBuffer);
    }
  } catch (err) {
    console.error("Erro ao incorporar imagem no PDF:", err);
    return null;
  }
}

const generateProtocolPDF = async (protocol, companyProfile = {}) => {
  const pdfDoc = await PDFDocument.create();

  const protocolNumber = protocol.protocolNumber || `PROT-${protocol.id || ""}`;

  const kit = await createPdfKit(pdfDoc, {
    title: "Protocolo de Serviço",
    subtitle: companyProfile.nomeEmpresa || "Nonato Service",
    docLabel: "Nº",
    docNumber: protocolNumber,
    footerNote: `NONATO SERVICE · ${protocolNumber}`,
  });

  kit.newPage();

  const protocolDate = protocol.createdAt?.toDate
    ? protocol.createdAt.toDate()
    : protocol.createdAt
    ? new Date(protocol.createdAt)
    : new Date();

  kit.sectionTitle(protocol.title || "Sem Título");
  kit.infoPanel(
    [
      ["Cliente", protocol.clientName || "N/A"],
      ["Data", protocolDate.toLocaleDateString("pt-PT")],
      ["Estado", protocol.status === "concluido" ? "Concluído" : "Rascunho"],
      ...(protocol.equipmentName ? [["Equipamento", protocol.equipmentName]] : []),
    ],
    { cols: 2 }
  );

  const renderSection = async (label, blocks) => {
    if (!blocks || blocks.length === 0) return;

    kit.checkSpace(50);
    kit.sectionTitle(label);

    for (const block of blocks) {
      if (block.tipo === "texto" && block.texto) {
        const lines = kit.wrapText(block.texto, 495.28, kit.font, 10);
        kit.checkSpace(lines.length * 14 + 14);
        lines.forEach((line) => {
          kit.text(line, 50, kit.y, { size: 10 });
          kit.y -= 14;
        });
        kit.y -= 8;
      } else if (block.tipo === "imagem" && block.imageUrl) {
        const image = await embedImageFromUrl(pdfDoc, block.imageUrl);
        if (image) {
          const maxImgWidth = 220;
          const scale = Math.min(1, maxImgWidth / image.width);
          const imgWidth = image.width * scale;
          const imgHeight = image.height * scale;
          kit.checkSpace(imgHeight + 16);
          kit.rect(50 - 4, kit.y - imgHeight - 4, imgWidth + 8, imgHeight + 8, kit.colors.paper, kit.colors.lineSoft, 0.75);
          kit.page.drawImage(image, { x: 50, y: kit.y - imgHeight, width: imgWidth, height: imgHeight });
          kit.y -= imgHeight + 18;
        }
      }
    }
    kit.y -= 8;
  };

  await renderSection("Antes", protocol.blocosAntes);
  await renderSection("Depois", protocol.blocosDepois);

  if (protocol.pecasTrocadas && protocol.pecasTrocadas.length > 0) {
    kit.checkSpace(60);
    kit.sectionTitle("Peças Trocadas");

    const columns = [
      { header: "Peça", width: 300, align: "left", key: "name" },
      { header: "Código", width: 130, align: "left", key: "code" },
      { header: "Qtd.", width: 65.28, align: "right", key: "quantity" },
    ];
    kit.tableHeader(columns);
    protocol.pecasTrocadas.forEach((peca, index) => {
      if (kit.checkSpace(24)) {
        kit.sectionTitle("Peças Trocadas (cont.)");
        kit.tableHeader(columns);
      }
      kit.tableRow(
        columns,
        { name: peca.name || "-", code: peca.code || "-", quantity: String(peca.quantity || 1) },
        index
      );
    });
    kit.y -= 16;
  }

  kit.checkSpace(70);
  kit.y -= 20;
  kit.hLine(50, 250, kit.y, 0.75, kit.colors.line);
  kit.text("Assinatura do Cliente", 50, kit.y - 12, { size: 8, color: kit.colors.muted });

  kit.finish();

  return await pdfDoc.save();
};

export default generateProtocolPDF;
