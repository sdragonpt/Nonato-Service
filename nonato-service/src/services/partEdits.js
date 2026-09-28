// src/services/partEdits.js
// Edições feitas na app a peças do catálogo estático HOMAG.
//
// O catálogo (public/pecas-data/*.json) é só de leitura para o browser, por
// isso as alterações feitas numa peça ficam guardadas aqui, numa coleção
// Firestore pequena: um documento por peça editada, indexado pelo código,
// só com os campos que foram alterados. O partsCatalogLoader.js aplica
// estas edições por cima do catálogo, pelo que toda a app (biblioteca,
// loja pública, pesquisa nos formulários) vê a versão editada.
//
// Mesmo padrão que services/partCategoryAssignments.js usa para as
// categorias. "Repor original" é só apagar o documento.

import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase.jsx";
import { compressImage } from "../utils/imageCompression.js";

export const PART_EDITS_COLLECTION = "pecasEditadas";

/** Campos da peça que podem ser editados na app. */
export const EDITABLE_PART_FIELDS = ["nome", "imagem", "descricao"];

let editsCache = null; // Map<codigo, edição>
let editsInFlight = null;

function docIdFor(codigo) {
  return encodeURIComponent(String(codigo));
}

/** Carrega todas as edições existentes, com cache em memória. */
export async function loadPartEdits({ force = false } = {}) {
  if (editsCache && !force) return editsCache;
  if (editsInFlight && !force) return editsInFlight;

  editsInFlight = (async () => {
    const snap = await getDocs(collection(db, PART_EDITS_COLLECTION));
    const map = new Map();
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.codigo) map.set(data.codigo, data);
    });
    editsCache = map;
    return map;
  })();

  try {
    return await editsInFlight;
  } finally {
    editsInFlight = null;
  }
}

export function invalidatePartEditsCache() {
  editsCache = null;
}

/**
 * Guarda as alterações de uma peça. `changes` só deve trazer os campos que
 * são diferentes do catálogo original — os restantes continuam a vir do JSON,
 * e se o catálogo for atualizado mais tarde esses campos acompanham.
 */
export async function savePartEdit(codigo, changes) {
  const data = { codigo, updatedAt: new Date() };
  for (const field of EDITABLE_PART_FIELDS) {
    if (changes[field] !== undefined) data[field] = changes[field];
  }
  // Sem merge: o documento passa a ter exatamente estes campos, para que um
  // campo reposto ao original deixe de estar sobreposto.
  await setDoc(doc(db, PART_EDITS_COLLECTION, docIdFor(codigo)), data);
  invalidatePartEditsCache();
}

/** Apaga todas as alterações de uma peça (volta ao que está no catálogo). */
export async function resetPartEdit(codigo) {
  await deleteDoc(doc(db, PART_EDITS_COLLECTION, docIdFor(codigo)));
  invalidatePartEditsCache();
}

/**
 * Carrega uma fotografia para o Storage e devolve o URL público. As imagens
 * do catálogo são lidas pela loja pública sem sessão; o URL de download do
 * Firebase inclui um token e funciona sem autenticação.
 */
export async function uploadPartImage(codigo, file) {
  const compressed = await compressImage(file);
  const safeCode = String(codigo).replace(/[^A-Za-z0-9._-]/g, "_");
  const path = `pecas/${safeCode}/${Date.now()}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}
