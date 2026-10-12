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
// Limite que este ficheiro NÃO resolve sozinho: imagens servidas por outro
// site sem autorização CORS (ex.: shop.homag.com) não podem ser descarregadas
// pelo browser — ver IMAGE_PROXY abaixo.

import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { loadPartsCatalog } from "../partsCatalogLoader.js";

/**
 * Função opcional (url) => url para ir buscar imagens de outros sites
 * através de um intermediário que autorize o download. null = desligado:
 * imagens de sites sem CORS ficam sem imagem no PDF.
 */
export const IMAGE_PROXY = null;

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

/** Bytes de uma imagem a partir de um data URL ou de um endereço. */
async function loadBytes(src) {
  if (src.startsWith("data:")) {
    const base64 = src.split(",")[1] || "";
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  }
  try {
    return await fetchBytes(src);
  } catch (err) {
    // Tipicamente CORS: o site de origem não autoriza o download pelo browser.
    const isOtherSite = /^https?:\/\//i.test(src) && !src.startsWith(window.location.origin);
    if (isOtherSite && IMAGE_PROXY) {
      try {
        return await fetchBytes(IMAGE_PROXY(src));
      } catch (proxyErr) {
        console.warn("Imagem não disponível nem pelo intermediário:", src, proxyErr);
        return null;
      }
    }
    console.warn("Imagem de outro site sem autorização de download (CORS):", src, err);
    return null;
  }
}

/** { data, isJpeg } pronto para pdfDoc.embedJpg/embedPng, ou null. */
async function toPdfImage(src) {
  if (!src) return null;
  const bytes = await loadBytes(src);
  const format = sniffImageFormat(bytes);
  if (format === "jpeg") return { data: bytes, isJpeg: true };
  if (format === "png") return { data: bytes, isJpeg: false };
  if (format === "webp" || format === "gif") {
    return { data: await convertToPng(bytes, `image/${format}`), isJpeg: false };
  }
  // SVG = desenho genérico "sem imagem" da HOMAG; outros formatos: sem imagem.
  return null;
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
async function catalogImageFor(item) {
  const code = item.code || item.codigo;
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
  const candidates = [
    await catalogImageFor(item),
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
      const image = await toPdfImage(src);
      if (image) return image;
    } catch (err) {
      console.warn("Erro ao preparar imagem para o PDF:", err);
    }
  }
  return null;
}
