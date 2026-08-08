// src/services/partCategoryAssignments.js
// Todas as peças da app vêm agora do catálogo estático HOMAG (ver
// src/utils/partsCatalogLoader.js) — nome, código e imagem já não vivem na
// Firestore. Categoria e subcategoria continuam a ter de ser editáveis a
// partir da app, por isso ficam guardadas aqui, numa coleção Firestore
// pequena e independente do conteúdo da peça: um documento por peça
// classificada, indexado pelo código, só com os campos de classificação.
//
// Isto substitui por completo o antigo conceito de "peça gerida" (um
// clone completo da peça na Firestore) — não há nome/preço/descrição
// aqui, só a atribuição de categoria.

import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase.jsx";

export const PART_ASSIGNMENTS_COLLECTION = "atribuicoesPecas";

let assignmentsCache = null; // Map<codigo, assignment>
let assignmentsInFlight = null;

function docIdFor(codigo) {
  // Códigos HOMAG são tipicamente numéricos, mas sanitizamos na mesma para
  // nunca produzir um id inválido para a Firestore (não pode conter "/").
  return encodeURIComponent(String(codigo));
}

/** Carrega todas as atribuições de categoria existentes, com cache em memória. */
export async function loadPartAssignments({ force = false } = {}) {
  if (assignmentsCache && !force) return assignmentsCache;
  if (assignmentsInFlight && !force) return assignmentsInFlight;

  assignmentsInFlight = (async () => {
    const snap = await getDocs(collection(db, PART_ASSIGNMENTS_COLLECTION));
    const map = new Map();
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.codigo) {
        map.set(data.codigo, data);
      }
    });
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
export async function setPartCategory(
  codigo,
  { categoryId = "", categoryName = "", subcategoryId = "", subcategoryName = "" }
) {
  await setDoc(
    doc(db, PART_ASSIGNMENTS_COLLECTION, docIdFor(codigo)),
    {
      codigo,
      categoryId,
      categoryName,
      subcategoryId,
      subcategoryName,
      updatedAt: new Date(),
    },
    { merge: true }
  );
  invalidatePartAssignmentsCache();
}

/** Remove a classificação de uma peça (volta a ficar "sem categoria"). */
export async function clearPartCategory(codigo) {
  await deleteDoc(doc(db, PART_ASSIGNMENTS_COLLECTION, docIdFor(codigo)));
  invalidatePartAssignmentsCache();
}

/**
 * Grava em massa o resultado da classificação automática (regras por
 * palavra-chave). `matches` é um array de { codigo, categoryId,
 * categoryName, subcategoryId, subcategoryName }.
 */
export async function bulkApplyAssignments(matches) {
  const now = new Date();
  for (let i = 0; i < matches.length; i += 450) {
    const chunk = matches.slice(i, i + 450);
    const batch = writeBatch(db);
    chunk.forEach((m) => {
      batch.set(
        doc(db, PART_ASSIGNMENTS_COLLECTION, docIdFor(m.codigo)),
        {
          codigo: m.codigo,
          categoryId: m.categoryId || "",
          categoryName: m.categoryName || "",
          subcategoryId: m.subcategoryId || "",
          subcategoryName: m.subcategoryName || "",
          updatedAt: now,
        },
        { merge: true }
      );
    });
    await batch.commit();
  }
  invalidatePartAssignmentsCache();
}

/** Atualiza categoryName em todas as atribuições dessa categoria (categoria renomeada). */
export async function renameCategoryInAssignments(categoryId, newName) {
  const q = query(
    collection(db, PART_ASSIGNMENTS_COLLECTION),
    where("categoryId", "==", categoryId)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, { categoryName: newName });
  });
  if (!snap.empty) await batch.commit();
  invalidatePartAssignmentsCache();
}

/** Atualiza subcategoryName em todas as atribuições dessa subcategoria (subcategoria renomeada). */
export async function renameSubcategoryInAssignments(subcategoryId, newName) {
  const q = query(
    collection(db, PART_ASSIGNMENTS_COLLECTION),
    where("subcategoryId", "==", subcategoryId)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, { subcategoryName: newName });
  });
  if (!snap.empty) await batch.commit();
  invalidatePartAssignmentsCache();
}

/** Limpa categoryId/categoryName (e subcategoria) de todas as peças dessa categoria (categoria apagada). */
export async function clearCategoryFromAssignments(categoryId) {
  const q = query(
    collection(db, PART_ASSIGNMENTS_COLLECTION),
    where("categoryId", "==", categoryId)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, {
      categoryId: "",
      categoryName: "",
      subcategoryId: "",
      subcategoryName: "",
    });
  });
  if (!snap.empty) await batch.commit();
  invalidatePartAssignmentsCache();
}

/** Limpa subcategoryId/subcategoryName de todas as peças dessa subcategoria (subcategoria apagada). */
export async function clearSubcategoryFromAssignments(subcategoryId) {
  const q = query(
    collection(db, PART_ASSIGNMENTS_COLLECTION),
    where("subcategoryId", "==", subcategoryId)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, { subcategoryId: "", subcategoryName: "" });
  });
  if (!snap.empty) await batch.commit();
  invalidatePartAssignmentsCache();
}
