// src/services/partCategoryAssignments.js
// Todas as peças da app vêm agora do catálogo estático HOMAG (ver
// src/utils/partsCatalogLoader.js) — nome, código e imagem já não vivem na
// Firestore. Categoria e subcategoria continuam a ter de ser editáveis a
// partir da app, por isso ficam guardadas aqui, à parte do conteúdo da peça.
//
// Armazenamento: coleção "classificacaoPecas" com 16 documentos ("lotes",
// ids "0"–"15"), cada um com um mapa `pecas: { <codigo>: { c, cn, s, sn } }`
// (c/cn = id/nome da categoria, s/sn = id/nome da subcategoria). O lote de
// cada peça sai de um hash do código, para ficarem todos com tamanho
// parecido (~1.400 peças por lote com o catálogo inteiro classificado —
// longe do limite de 1 MB e de 20.000 campos por documento).
//
// Porquê: a loja pública e a Biblioteca de Peças precisam da classificação
// inteira em cada visita. Com um documento por peça (a antiga coleção
// "atribuicoesPecas") isso custava ~2.600 leituras por visita; assim custa
// no máximo 16.
//
// A API exportada é a mesma de antes: o resto da app não sabe como os
// dados estão guardados.

import {
  collection,
  getDocs,
  doc,
  setDoc,
  writeBatch,
  deleteField,
} from "firebase/firestore";
import { db } from "../firebase.jsx";

export const PART_ASSIGNMENTS_COLLECTION = "classificacaoPecas";

/** Coleção antiga (um documento por peça). Só usada para migrar/limpar. */
export const LEGACY_PART_ASSIGNMENTS_COLLECTION = "atribuicoesPecas";

const BUCKET_COUNT = 16;

let assignmentsCache = null; // Map<codigo, assignment>
let assignmentsInFlight = null;

function bucketFor(codigo) {
  let h = 0;
  for (const ch of String(codigo)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return String(h % BUCKET_COUNT);
}

function toEntry({ categoryId = "", categoryName = "", subcategoryId = "", subcategoryName = "" }) {
  return { c: categoryId, cn: categoryName, s: subcategoryId, sn: subcategoryName };
}

function fromEntry(codigo, e) {
  return {
    codigo,
    categoryId: e?.c || "",
    categoryName: e?.cn || "",
    subcategoryId: e?.s || "",
    subcategoryName: e?.sn || "",
  };
}

/** Lê todos os lotes: [{ id, pecas }]. */
async function readBuckets() {
  const snap = await getDocs(collection(db, PART_ASSIGNMENTS_COLLECTION));
  return snap.docs.map((d) => ({ id: d.id, pecas: d.data().pecas || {} }));
}

/**
 * Grava alterações agrupadas por lote. `changesByBucket` é
 * Map<lote, { <codigo>: entrada | deleteField() }>.
 */
async function writeBucketChanges(changesByBucket) {
  if (changesByBucket.size === 0) return;
  const batch = writeBatch(db);
  for (const [bucket, pecas] of changesByBucket) {
    batch.set(doc(db, PART_ASSIGNMENTS_COLLECTION, bucket), { pecas }, { merge: true });
  }
  await batch.commit();
}

/** Carrega todas as atribuições de categoria existentes, com cache em memória. */
export async function loadPartAssignments({ force = false } = {}) {
  if (assignmentsCache && !force) return assignmentsCache;
  if (assignmentsInFlight && !force) return assignmentsInFlight;

  assignmentsInFlight = (async () => {
    const map = new Map();
    for (const { pecas } of await readBuckets()) {
      for (const [codigo, e] of Object.entries(pecas)) {
        map.set(codigo, fromEntry(codigo, e));
      }
    }
    assignmentsCache = map;
    return map;
  })();

  try {
    return await assignmentsInFlight;
  } finally {
    assignmentsInFlight = null;
  }
}

export function invalidatePartAssignmentsCache() {
  assignmentsCache = null;
}

/** Atribui (ou atualiza) a categoria/subcategoria de uma peça do catálogo. */
export async function setPartCategory(codigo, assignment) {
  await setDoc(
    doc(db, PART_ASSIGNMENTS_COLLECTION, bucketFor(codigo)),
    { pecas: { [codigo]: toEntry(assignment) } },
    { merge: true }
  );
  invalidatePartAssignmentsCache();
}

/** Remove a classificação de uma peça (volta a ficar "sem categoria"). */
export async function clearPartCategory(codigo) {
  await setDoc(
    doc(db, PART_ASSIGNMENTS_COLLECTION, bucketFor(codigo)),
    { pecas: { [codigo]: deleteField() } },
    { merge: true }
  );
  invalidatePartAssignmentsCache();
}

/**
 * Grava em massa (classificação automática por regras, importação do
 * backup). `matches` é um array de { codigo, categoryId, categoryName,
 * subcategoryId, subcategoryName }.
 */
export async function bulkApplyAssignments(matches) {
  const changes = new Map();
  for (const m of matches) {
    const bucket = bucketFor(m.codigo);
    if (!changes.has(bucket)) changes.set(bucket, {});
    changes.get(bucket)[m.codigo] = toEntry(m);
  }
  await writeBucketChanges(changes);
  invalidatePartAssignmentsCache();
}

/**
 * Aplica `fn(entrada)` a todas as peças; se devolver algo (entrada nova ou
 * deleteField()), grava-o. Lê os lotes e só reescreve as peças que mudaram.
 */
async function updateWhere(fn) {
  const changes = new Map();
  for (const { id, pecas } of await readBuckets()) {
    for (const [codigo, e] of Object.entries(pecas)) {
      const next = fn(e);
      if (!next) continue;
      if (!changes.has(id)) changes.set(id, {});
      changes.get(id)[codigo] = next;
    }
  }
  await writeBucketChanges(changes);
  invalidatePartAssignmentsCache();
}

/** Atualiza o nome da categoria em todas as peças dessa categoria (categoria renomeada). */
export async function renameCategoryInAssignments(categoryId, newName) {
  await updateWhere((e) => (e.c === categoryId ? { ...e, cn: newName } : null));
}

/** Atualiza o nome da subcategoria em todas as peças dessa subcategoria (subcategoria renomeada). */
export async function renameSubcategoryInAssignments(subcategoryId, newName) {
  await updateWhere((e) => (e.s === subcategoryId ? { ...e, sn: newName } : null));
}

/** Tira a categoria (e subcategoria) a todas as peças dessa categoria (categoria apagada). */
export async function clearCategoryFromAssignments(categoryId) {
  await updateWhere((e) => (e.c === categoryId ? deleteField() : null));
}

/** Tira a subcategoria a todas as peças dessa subcategoria (subcategoria apagada). */
export async function clearSubcategoryFromAssignments(subcategoryId) {
  await updateWhere((e) => (e.s === subcategoryId ? { ...e, s: "", sn: "" } : null));
}

/** Apaga todas as classificações. Usado pela importação do backup. */
export async function clearAllAssignments() {
  const snap = await getDocs(collection(db, PART_ASSIGNMENTS_COLLECTION));
  if (!snap.empty) {
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  invalidatePartAssignmentsCache();
}

/**
 * Lê as classificações que ainda estejam na coleção antiga
 * ("atribuicoesPecas", um documento por peça). Uso pontual: migração.
 */
export async function loadLegacyAssignments() {
  const snap = await getDocs(collection(db, LEGACY_PART_ASSIGNMENTS_COLLECTION));
  const map = new Map();
  snap.docs.forEach((d) => {
    const data = d.data();
    if (data.codigo && data.categoryId) map.set(data.codigo, fromEntry(data.codigo, toEntry(data)));
  });
  return { map, refs: snap.docs.map((d) => d.ref) };
}
