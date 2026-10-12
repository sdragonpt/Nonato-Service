// src/utils/pdf/partImage.js
// Carrega a imagem de uma peça para pôr num PDF (pdf-lib só aceita JPEG e
// PNG). Usado pelos dois PDFs de orçamento de peças.
//
// Porque existe (antes cada PDF tinha a sua cópia, com três problemas):
// 1. O formato era adivinhado pelo NOME do ficheiro. No catálogo há centenas
//    de ficheiros ".png" que são JPEG por dentro, e os endereços da HOMAG
//    nem extensão têm — o PDF lia-os no formato errado e mostrava "N/A".
//    Agora o formato é detetado pelos primeiros bytes do ficheiro.
// 2. A imagem era procurada na coleção antiga "pecas" da Firestore. As peças
//    vêm hoje do catálogo estático (com as edições feitas na app), por isso
//    é aí que se vai buscar a imagem atual, pelo código da peça.
// 3. Formatos que o pdf-lib não aceita (WebP, GIF) são convertidos para PNG.
//
// Imagens alojadas noutros sites (ex.: shop.homag.com — a maior parte do
// catálogo): o browser mostra-as, mas o site não autoriza que a app
// descarregue o ficheiro (CORS). Por isso:
// - a primeira vez que uma peça dessas entra num PDF, a imagem é pedida
//   através de um intermediário (IMAGE_PROXY), já reduzida para JPEG pequeno;
// - fica guardada na Firestore (coleção "imagensPecas", um documento por
//   código de peça) e, daí em diante, vem sempre de lá — 1 leitura, sem
//   depender de terceiros nem do site de origem.

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { loadPartsCatalog } from "../partsCatalogLoader.js";

/**
 * Intermediário para o PRIMEIRO download de imagens de outros sites: wsrv.nl
 * (images.weserv.nl), um serviço público e de código aberto de
 * redimensionamento de imagens. Só recebe o endereço público da imagem da
 * peça — nenhum dado da app, de clientes ou de orçamentos. Devolve um JPEG
 * com 700px de largura máxima. Pôr a null para desligar (as imagens de
 * outros sites que ainda não estejam guardadas saem "N/A" no PDF).
 */
export const IMAGE_PROXY = (url) =>
  `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg&w=700&q=82`;

export const PART_IMAGE_CACHE_COLLECTION = "imagensPecas";
// Um documento da Firestore não pode passar de 1 MB; as imagens reduzidas
// ficam por volta de 10–60 KB. Acima disto não se guarda (usa-se só desta vez).
const MAX_CACHE_BYTES = 400 * 1024;

const startsWith = (bytes, signature) => signature.every((b, i) => bytes[i] === b);

/** "jpeg" | "png" | "webp" | "gif" | "svg" | null, pelo conteúdo do ficheiro. */
export function sniffImageFormat(bytes) {
  if (!bytes || bytes.length < 12) return null;
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return "png";
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "gif";
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "webp";
  }
  const head = String.fromCharCode(...bytes.slice(0, 256)).trimStart().toLowerCase();
  if (head.startsWith("<?xml") || head.startsWith("<svg")) return "svg";
  return null;
}

/** Converte uma imagem que o browser saiba abrir (WebP, GIF…) para PNG. */
async function convertToPng(bytes, mime) {
  const bitmap = await createImageBitmap(new Blob([bytes], { type: mime }));
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) return null;
  return new Uint8Array(await response.arrayBuffer());
}

const bytesFromBase64 = (base64) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

const base64FromBytes = (bytes) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

const isOtherSite = (src) =>
  /^https?:\/\//i.test(src) && !src.startsWith(window.location.origin);

/** { data, isJpeg } pronto para pdfDoc.embedJpg/embedPng a partir de bytes, ou null. */
async function toPdfImage(bytes) {
  const format = sniffImageFormat(bytes);
  if (format === "jpeg") return { data: bytes, isJpeg: true };
  if (format === "png") return { data: bytes, isJpeg: false };
  if (format === "webp" || format === "gif") {
    return { data: await convertToPng(bytes, `image/${format}`), isJpeg: false };
  }
  // SVG = desenho genérico "sem imagem" da HOMAG; outros formatos: sem imagem.
  return null;
}

// ── Imagens guardadas na Firestore (uma por código de peça) ────────────────

const cacheRef = (code) =>
  doc(db, PART_IMAGE_CACHE_COLLECTION, encodeURIComponent(String(code)));

/** Imagem já guardada para esta peça E para este endereço de origem, ou null. */
async function readCachedImage(code, src) {
  try {
    const snap = await getDoc(cacheRef(code));
    if (!snap.exists()) return null;
    const data = snap.data();
    // Se a imagem da peça mudou no catálogo, a guardada já não serve.
    if (data.origem !== src || !data.base64) return null;
    return bytesFromBase64(data.base64);
  } catch (err) {
    console.warn("Erro ao ler a imagem guardada da peça:", err);
    return null;
  }
}

async function saveCachedImage(code, src, bytes) {
  if (bytes.length > MAX_CACHE_BYTES) return;
  try {
    await setDoc(cacheRef(code), {
      codigo: String(code),
      origem: src,
      base64: base64FromBytes(bytes),
      bytes: bytes.length,
      guardadaEm: new Date(),
    });
  } catch (err) {
    // Não é grave: a imagem entra neste PDF e volta a ser pedida no próximo.
    console.warn("Não foi possível guardar a imagem da peça:", err);
  }
}

/** Imagem de outro site: da Firestore se já lá estiver; senão descarrega-a (uma vez) e guarda. */
async function loadOtherSiteImage(code, src) {
  if (code) {
    const cached = await readCachedImage(code, src);
    if (cached) return cached;
  }
  if (!IMAGE_PROXY) {
    console.warn("Imagem de outro site sem autorização de download (CORS):", src);
    return null;
  }
  let bytes = null;
  try {
    bytes = await fetchBytes(IMAGE_PROXY(src));
  } catch (err) {
    console.warn("Não foi possível descarregar a imagem pelo intermediário:", src, err);
    return null;
  }
  // Só se guarda o que for mesmo uma imagem que o PDF aceita.
  const format = sniffImageFormat(bytes);
  if (format !== "jpeg" && format !== "png") return null;
  if (code) await saveCachedImage(code, src, bytes);
  return bytes;
}

/** Bytes de uma imagem a partir de um data URL ou de um endereço. */
async function loadBytes(src, code) {
  if (src.startsWith("data:")) return bytesFromBase64(src.split(",")[1] || "");
  if (isOtherSite(src)) {
    // Firebase Storage e afins autorizam o download; a HOMAG não. Tenta
    // direto só nos primeiros, para não encher a consola de erros de CORS.
    const blocksDownloads = /(^|\.)homag\.com$/i.test(new URL(src).hostname);
    if (!blocksDownloads) {
      try {
        const direct = await fetchBytes(src);
        if (direct) return direct;
      } catch {
        // CORS — segue para o caminho de "outro site".
      }
    }
    return loadOtherSiteImage(code, src);
  }
  try {
    return await fetchBytes(src);
  } catch (err) {
    console.warn("Não foi possível carregar a imagem:", src, err);
    return null;
  }
}

/** Imagem guardada na coleção antiga image_library (orçamentos antigos). */
async function loadFromImageLibrary(imageHash) {
  try {
    const snap = await getDoc(doc(db, "image_library", imageHash));
    return snap.exists() ? snap.data().data : null;
  } catch (err) {
    console.warn("Erro ao ler image_library:", err);
    return null;
  }
}

/** Imagem atual da peça no catálogo (já com as edições feitas na app). */
async function catalogImageFor(code) {
  if (!code) return null;
  try {
    const { pecas } = await loadPartsCatalog();
    return pecas.find((p) => p.codigo === code)?.imagem || null;
  } catch (err) {
    console.warn("Erro ao ler o catálogo de peças:", err);
    return null;
  }
}

/**
 * Imagem de um item de orçamento para o PDF. Tenta, por ordem: a imagem
 * atual da peça no catálogo, a imagem gravada no próprio item, e a
 * image_library antiga. Devolve { data: Uint8Array, isJpeg } ou null.
 */
export async function loadPartImageForPdf(item) {
  const code = item.code || item.codigo || "";
  const candidates = [
    await catalogImageFor(code),
    item.image,
    item.imageUrl,
    item.img,
    item.imageHash ? await loadFromImageLibrary(item.imageHash) : null,
  ];
  const tried = new Set();
  for (const src of candidates) {
    if (!src || typeof src !== "string" || tried.has(src)) continue;
    tried.add(src);
    try {
      const bytes = await loadBytes(src, code);
      const image = bytes ? await toPdfImage(bytes) : null;
      if (image) return image;
    } catch (err) {
      console.warn("Erro ao preparar imagem para o PDF:", err);
    }
  }
  return null;
}
