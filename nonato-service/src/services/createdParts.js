// src/services/createdParts.js
// Peças criadas na app (não existem no catálogo estático HOMAG).
//
// O catálogo (public/pecas-data/*.json) é só de leitura, por isso as peças
// novas ficam na Firestore, coleção "pecasCriadas": um documento por peça,
// indexado pelo código. O partsCatalogLoader.js junta-as ao catálogo, pelo
// que aparecem em todo o lado (biblioteca, loja pública, pesquisa nos
// formulários, PDFs) e podem ter categoria e edições como as outras.
//
// Documento: { codigo, nome, descricao, imagem, codigosRelacionados,
//   criadaNaApp: true, createdAt, createdBy }

import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebase.jsx";

export const CREATED_PARTS_COLLECTION = "pecasCriadas";

let cache = null; // Map<codigo, peça>
let inFlight = null;

const docIdFor = (codigo) => encodeURIComponent(String(codigo));

/** Todas as peças criadas na app, com cache em memória. */
export async function loadCreatedParts({ force = false } = {}) {
  if (cache && !force) return cache;
  if (inFlight && !force) return inFlight;
  inFlight = (async () => {
    const snap = await getDocs(collection(db, CREATED_PARTS_COLLECTION));
    const map = new Map();
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.codigo) map.set(data.codigo, { ...data, criadaNaApp: true });
    });
    cache = map;
    return map;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export function invalidateCreatedPartsCache() {
  cache = null;
}

/**
 * Cria uma peça. Falha se já existir uma peça criada com o mesmo código
 * (a verificação contra o catálogo HOMAG é feita no formulário).
 */
export async function createPart({ codigo, nome, descricao = "", imagem = "", codigosRelacionados = [] }, createdBy = "") {
  const code = String(codigo).trim();
  const ref = doc(db, CREATED_PARTS_COLLECTION, docIdFor(code));
  if ((await getDoc(ref)).exists()) {
    throw new Error(`Já existe uma peça criada com o código ${code}.`);
  }
  await setDoc(ref, {
    codigo: code,
    nome: nome.trim(),
    descricao: descricao.trim(),
    imagem: imagem || "",
    codigosRelacionados,
    criadaNaApp: true,
    createdAt: new Date(),
    createdBy,
  });
  invalidateCreatedPartsCache();
}

/** Apaga uma peça criada na app (as do catálogo HOMAG não se apagam). */
export async function deleteCreatedPart(codigo) {
  await deleteDoc(doc(db, CREATED_PARTS_COLLECTION, docIdFor(codigo)));
  invalidateCreatedPartsCache();
}
