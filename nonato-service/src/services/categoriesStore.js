// src/services/categoriesStore.js
// Categorias e subcategorias de peças, guardadas num ÚNICO documento
// Firestore: categoriasPecas/todas, com um mapa
// `itens: { <id>: { name, parentId, ...outros campos } }`.
// parentId null = categoria principal; parentId = id da mãe = subcategoria.
//
// Porquê: a app e a loja pública precisam da lista inteira em cada visita.
// Com um documento por categoria (a antiga coleção "categorias") isso
// custava ~117 leituras por visita; assim custa 1 (mais 1 por cada
// alteração, enquanto a página estiver aberta — ver CategoriesContext).

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteField,
} from "firebase/firestore";
import { db } from "../firebase.jsx";

export const CATEGORIES_DOC = doc(db, "categoriasPecas", "todas");

/** Coleção antiga (um documento por categoria). Só usada para migrar/limpar. */
export const LEGACY_CATEGORIES_COLLECTION = "categorias";

/** Converte o documento em [{ id, name, parentId, ... }]. */
export function categoriesFromSnapshot(snap) {
  const itens = (snap.exists() && snap.data().itens) || {};
  return Object.entries(itens).map(([id, data]) => ({
    id,
    ...data,
    parentId: data.parentId ?? null,
  }));
}

/** Lê todas as categorias uma vez (1 leitura). */
export async function loadCategories() {
  return categoriesFromSnapshot(await getDoc(CATEGORIES_DOC));
}

/** Cria ou substitui uma categoria/subcategoria. */
export async function saveCategory(id, data) {
  await setDoc(CATEGORIES_DOC, { itens: { [String(id)]: data } }, { merge: true });
}

/** Altera só os campos indicados de uma categoria/subcategoria. */
export async function updateCategory(id, fields) {
  await setDoc(CATEGORIES_DOC, { itens: { [String(id)]: fields } }, { merge: true });
}

/** Apaga várias categorias/subcategorias de uma vez. */
export async function deleteCategories(ids) {
  if (ids.length === 0) return;
  const itens = {};
  ids.forEach((id) => {
    itens[String(id)] = deleteField();
  });
  await setDoc(CATEGORIES_DOC, { itens }, { merge: true });
}

/** Substitui a lista inteira (importação do backup). */
export async function replaceAllCategories(list) {
  const itens = {};
  list.forEach(({ id, ...data }) => {
    itens[String(id)] = data;
  });
  await setDoc(CATEGORIES_DOC, { itens });
}

/**
 * Lê as categorias que ainda estejam na coleção antiga ("categorias", um
 * documento por categoria). Uso pontual: migração.
 */
export async function loadLegacyCategories() {
  const snap = await getDocs(collection(db, LEGACY_CATEGORIES_COLLECTION));
  return {
    list: snap.docs.map((d) => ({ id: d.id, ...d.data(), parentId: d.data().parentId ?? null })),
    refs: snap.docs.map((d) => d.ref),
  };
}
