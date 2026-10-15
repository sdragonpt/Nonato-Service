// src/features/company/pdf/companyDocumentsPDF.js
// Documentos da própria empresa, gerados a partir do "Cadastro da Nonato
// Service" (config/companyProfile):
// - Ficha Cadastral — identificação, morada e contactos, para clientes e
//   fornecedores, com declaração e linhas para assinar;
// - Dados para Pagamento — dados bancários para depósito/transferência
//   (IBAN, banco, SWIFT/BIC e NIF; o NIB não sai no PDF).
// Usam o mesmo kit de design dos outros PDFs (utils/pdf/pdfKit.js). Campos
// sem informação saem como linha em branco, para preencher à mão.

import { PDFDocument } from "pdf-lib";
import { createPdfKit, PDF_MARGIN, PDF_PAGE_WIDTH } from "../../../utils/pdf/pdfKit.js";

const CONTENT_WIDTH = PDF_PAGE_WIDTH - 2 * PDF_MARGIN;
const BLANK = "______________________________";

const value = (v) => (v && String(v).trim() ? String(v).trim() : BLANK);
const joinFilled = (...parts) => parts.map((p) => (p || "").trim()).filter(Boolean).join(" / ");

const companyName = (p) => p.nomeEmpresa || p.denominacaoSocial || "Nonato Service";

/** Parágrafo com quebra de linha automática. */
function paragraph(kit, text, { size = 9, color, bold = false, gapAfter = 10 } = {}) {
  const useFont = bold ? kit.boldFont : kit.font;
  const lines = kit.wrapText(text, CONTENT_WIDTH, useFont, size);
  kit.checkSpace(lines.length * (size + 4) + gapAfter);
  lines.forEach((line) => {
    kit.text(line, PDF_MARGIN, kit.y, { size, useFont, color: color || kit.colors.ink });
    kit.y -= size + 4;
  });
  kit.y -= gapAfter;
}

/** Linha "Rótulo: ________" para preencher à mão. */
function fillLine(kit, label, x, width) {
  kit.text(label, x, kit.y, { size: 9, useFont: kit.boldFont, color: kit.colors.muted });
  const labelW = kit.boldFont.widthOfTextAtSize(label, 9);
  kit.hLine(x + labelW + 6, x + width, kit.y - 2, 0.75, kit.colors.line);
}

async function download(pdfDoc, fileName) {
  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Ficha Cadastral ───────────────────────────────────────────────────

export async function generateFichaCadastralPDF(profile) {
  const pdfDoc = await PDFDocument.create();
  const name = companyName(profile);
  const kit = await createPdfKit(pdfDoc, {
    title: "Ficha Cadastral",
    subtitle: `${name} · ${profile.atividadePrincipal || "Assistência Técnica"}`,
    footerNote: `${name.toUpperCase()} · FICHA CADASTRAL`,
  });

  kit.newPage();

  paragraph(
    kit,
    "Ficha de identificação empresarial para apresentação a clientes e fornecedores. Os campos sem informação disponibilizada permanecem em branco.",
    { size: 9, color: kit.colors.muted, gapAfter: 14 }
  );

  kit.sectionTitle("01 · Identificação da empresa");
  kit.infoPanel([
    ["Denominação social", value(profile.denominacaoSocial || profile.nomeEmpresa)],
    ["Nome comercial", value(profile.nomeEmpresa)],
    ["NIF", value(profile.nif)],
    ["Atividade principal", value(profile.atividadePrincipal)],
    ["CAE", value(profile.cae)],
    ["Data de constituição", value(profile.dataConstituicao)],
  ]);

  kit.sectionTitle("02 · Morada");
  kit.infoPanel([
    ["Morada", value(profile.morada)],
    ["Código postal / Localidade", value([profile.codigoPostal, profile.localidade].filter(Boolean).join(" "))],
    ["Concelho / Distrito", value(joinFilled(profile.concelho, profile.distrito))],
    ["País", value(profile.pais)],
  ]);

  kit.sectionTitle("03 · Contactos");
  kit.infoPanel([
    ["Telefone / Telemóvel", value(joinFilled(profile.telefone, profile.telemovel))],
    ["E-mail", value(profile.email)],
    ["Website", value(profile.website)],
  ]);

  // Declaração + assinatura
  kit.checkSpace(150);
  kit.sectionTitle("Declaração");
  paragraph(
    kit,
    "Confirmo que os dados preenchidos nesta ficha correspondem às informações disponibilizadas pela empresa.",
    { size: 9.5, gapAfter: 22 }
  );

  const half = (CONTENT_WIDTH - 24) / 2;
  fillLine(kit, "Local:", PDF_MARGIN, half);
  fillLine(kit, "Data:", PDF_MARGIN + half + 24, half);
  kit.y -= 30;
  fillLine(kit, "Nome do responsável:", PDF_MARGIN, half);
  fillLine(kit, "Assinatura:", PDF_MARGIN + half + 24, half);
  kit.y -= 34;

  paragraph(
    kit,
    "Nota: modelo de apresentação comercial; não substitui certidões ou comprovativos oficiais de registo.",
    { size: 8, color: kit.colors.muted, gapAfter: 0 }
  );

  kit.finish();
  await download(pdfDoc, "Ficha Cadastral - Nonato Service.pdf");
}

// ─── Dados para Pagamento ──────────────────────────────────────────────

export async function generateDadosPagamentoPDF(profile) {
  const pdfDoc = await PDFDocument.create();
  const name = companyName(profile);
  const kit = await createPdfKit(pdfDoc, {
    title: "Dados para Pagamento",
    subtitle: `Depósito / transferência bancária · ${name}`,
    footerNote: `${name.toUpperCase()} · DADOS PARA PAGAMENTO`,
  });

  kit.newPage();

  paragraph(kit, `Utilize os dados abaixo para efetuar o pagamento à ${name}.`, {
    size: 10,
    gapAfter: 16,
  });

  // Só o IBAN (o NIB não sai no PDF), no mesmo quadro que o resto.
  kit.sectionTitle("Dados bancários");
  kit.infoPanel([
    ["IBAN", value(profile.iban)],
    ["Banco", value(profile.nomeBanco)],
    ["SWIFT / BIC", value(profile.swift)],
    ["NIF (titular da conta)", value(profile.nif)],
  ]);

  kit.sectionTitle("Contacto");
  kit.infoPanel([
    ["Morada", value([profile.morada, profile.codigoPostal, profile.localidade].filter(Boolean).join(", "))],
    ["Telefone", value(joinFilled(profile.telefone, profile.telemovel))],
    ["E-mail", value(profile.email)],
    // Num documento de pagamento, o website só aparece se existir.
    ...(profile.website ? [["Website", profile.website]] : []),
  ]);

  // Aviso final, em caixa
  const note =
    "Utilize exatamente os dados acima para efetuar o depósito ou a transferência do seu pagamento. Em caso de dúvida, contacte-nos pelo telefone ou e-mail indicados.";
  const lines = kit.wrapText(note, CONTENT_WIDTH - 28, kit.font, 9);
  const boxH = lines.length * 13 + 20;
  kit.checkSpace(boxH + 30);
  kit.rect(PDF_MARGIN, kit.y - boxH, CONTENT_WIDTH, boxH, kit.colors.accentSoft, kit.colors.accent, 0.75);
  lines.forEach((line, i) => {
    kit.text(line, PDF_MARGIN + 14, kit.y - 16 - i * 13, { size: 9, color: kit.colors.ink });
  });
  kit.y -= boxH + 18;

  const generatedAt = new Date().toLocaleString("pt-PT");
  kit.text(`Documento gerado em ${generatedAt}.`, PDF_PAGE_WIDTH / 2, kit.y, {
    size: 7.5,
    color: kit.colors.muted,
    align: "center",
  });

  kit.finish();
  await download(pdfDoc, "Dados para Pagamento - Nonato Service.pdf");
}
