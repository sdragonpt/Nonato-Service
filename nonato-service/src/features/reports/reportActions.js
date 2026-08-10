// src/features/reports/reportActions.js
// Ação de alto nível para o fluxo "Criar Relatório": gera o PDF (normal ou
// especial), entrega ao utilizador (download/abrir) e guarda o registo
// permanente (Storage + coleção "relatorios") — é o que alimenta o
// histórico no perfil do cliente e na Biblioteca de Relatórios.
//
// "Normal" e "Especial" usam exatamente os mesmos dados de entrada — a
// única diferença é qual gerador de PDF é chamado (o especial acrescenta a
// secção de horas agrupadas por máquina). Não escreve nada na coleção
// "ordens": tanto faz os dados terem vindo de uma ordem real (selecionada
// e possivelmente editada só para este relatório) como terem sido
// preenchidos de raiz para um relatório isolado.
import generateServiceOrderPDF from "../orders/components/pdf/generateServiceOrderPDF.jsx";
import generateMachineHoursReportPDF from "../orders/components/pdf/generateMachineHoursReportPDF.jsx";
import { saveGeneratedReport, deliverPdfToDevice } from "../../utils/reportStorage.js";

/**
 * @param {Object} params
 * @param {"normal"|"especial"} params.tipo
 * @param {string|null} params.orderId - id da ordem de origem, ou null se relatório isolado
 * @param {string|null} params.orderNumber - nº da ordem de origem, ou null
 * @param {Object} params.order - dados "tipo ordem" (date, serviceType, priority, status,
 *   resultDescription, pontosEmAberto, checklist, partsQuoteItems, manualEquipment)
 * @param {Object|null} params.client - cliente registado (ou null se avulso)
 * @param {Object} params.clientData - { name, phone, address } já resolvidos p/ o PDF
 * @param {Object} params.equipmentData - { brand, model, serialNumber } já resolvidos p/ o PDF
 * @param {Array} params.workdays - dias de trabalho (workDate como Date ou "YYYY-MM-DD")
 */
export async function generateAndSaveReport({
  tipo,
  orderId,
  orderNumber,
  order,
  client,
  clientData,
  equipmentData,
  equipmentId,
  workdays,
}) {
  const label = orderNumber || orderId || `AVULSO-${Date.now()}`;
  const fileName =
    tipo === "especial"
      ? /^OS-/.test(label)
        ? `${label.replace(/^OS-/, "OS-E-")}.pdf`
        : `Especial-${label}.pdf`
      : `${label}.pdf`;

  const formattedData = {
    orderId: orderId || label,
    orderNumber: orderNumber || label,
    clientData,
    equipmentData,
    date: order.date,
    serviceType: order.serviceType || "",
    status: order.status || "",
    priority: order.priority || "",
    resultDescription: order.resultDescription || "",
    pontosEmAberto: order.pontosEmAberto || "",
    checklist: order.checklist || {},
    workdays: (workdays || []).map((workday) => ({
      ...workday,
      workDate: new Date(workday.workDate).toLocaleDateString(),
    })),
    partsQuoteItems: order.partsQuoteItems || [],
  };

  const generator = tipo === "especial" ? generateMachineHoursReportPDF : generateServiceOrderPDF;

  const pdfResult = await generator(
    label,
    formattedData,
    clientData,
    equipmentData,
    workdays || [],
    fileName
  );

  const clientName = clientData?.name || client?.name || "Cliente não registado";
  const equipmentLabel = `${equipmentData?.brand || ""} ${equipmentData?.model || ""}`.trim();

  const saved = await saveGeneratedReport({
    tipo,
    blob: pdfResult.blob,
    fileName,
    storageSubpath: client?.id ? client.id : "avulso",
    meta: {
      clientId: client?.id || null,
      clientName,
      orderId: orderId || null,
      orderNumber: orderNumber || label,
      equipmentId: equipmentId || null,
      equipmentLabel,
      isolado: !orderId,
    },
  });

  await deliverPdfToDevice(pdfResult.blob, fileName);

  return { ...saved, fileName };
}
