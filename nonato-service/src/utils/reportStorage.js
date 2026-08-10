// src/utils/reportStorage.js
// Utilitário partilhado para persistir relatórios gerados (normais e
// especiais): envia o PDF para o Storage e grava um registo na coleção
// "relatorios" — é isto que dá origem ao "histórico de relatórios" visível
// no perfil do cliente e na Biblioteca de Relatórios.
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase.jsx";

/**
 * Envia o blob do PDF para o Storage e grava o registo do relatório.
 *
 * @param {Object} params
 * @param {"normal"|"especial"} params.tipo
 * @param {Blob} params.blob - PDF já gerado
 * @param {string} params.fileName - ex: "OS-0826-0187.pdf"
 * @param {string} params.storageSubpath - subpasta para organizar o Storage
 *   (ex: clientId para relatórios normais, warehouseEquipmentId para especiais)
 * @param {Object} params.meta - campos adicionais a gravar no documento
 *   (clientId, clientName, orderId, orderNumber, equipmentLabel,
 *   warehouseEquipmentId, warehouseEquipmentLabel, ...)
 * @returns {Promise<{id: string, url: string, storagePath: string}>}
 */
export async function saveGeneratedReport({ tipo, blob, fileName, storageSubpath, meta = {} }) {
  const safeName = fileName.replace(/[^a-zA-Z0-9_.\- ]/g, "_");
  const storagePath = `relatorios/${tipo}/${storageSubpath || "geral"}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, blob, { contentType: "application/pdf" });
  const url = await getDownloadURL(storageRef);

  const docRef = await addDoc(collection(db, "relatorios"), {
    tipo,
    fileName,
    url,
    storagePath,
    createdAt: new Date(),
    ...meta,
  });

  return { id: docRef.id, url, storagePath };
}

/**
 * Despoleta o download do PDF no browser (versão web) ou grava e abre no
 * dispositivo (versão Capacitor/mobile) — mesmo comportamento que já existia
 * em OrderDetail.jsx para o botão "PDF Ordem".
 */
export async function deliverPdfToDevice(blob, fileName) {
  if (window?.Capacitor?.isNative) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { FileOpener } = await import("@capacitor-community/file-opener");
    const reader = new FileReader();
    await new Promise((resolve, reject) => {
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result.split(",")[1];
          await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents,
          });
          const { uri } = await Filesystem.getUri({
            directory: Directory.Documents,
            path: fileName,
          });
          await FileOpener.open({ filePath: uri, contentType: "application/pdf" });
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Descarrega um relatório já guardado (a partir do seu URL do Storage) —
 * usado no perfil do cliente e na Biblioteca de Relatórios, onde só temos
 * o URL (não o blob em memória, que só existe no momento em que o PDF é
 * gerado). Um simples `window.open(url)` abre o PDF numa nova aba em vez de
 * descarregar (URLs de Storage são de outra origem, por isso o atributo
 * `download` de um `<a>` sozinho não força o download); por isso buscamos o
 * ficheiro e criamos o download a partir do blob, tal como já acontece
 * para um PDF recém-gerado.
 */
export async function downloadFileFromUrl(url, fileName) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha ao descarregar ficheiro (${response.status})`);
  const blob = await response.blob();
  await deliverPdfToDevice(blob, fileName);
}

export default saveGeneratedReport;
