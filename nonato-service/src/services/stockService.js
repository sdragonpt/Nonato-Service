// src/services/stockService.js
// Stock interno de peças da Nonato Service (não confundir com o
// "Almoxarifado / Armazém", que é para máquinas e pedidos de separação).
//
// Artigos: coleção "stockPecas" com 8 documentos ("lotes", ids "0"–"7"),
// cada um com um mapa `itens: { <id>: { codigo, nome, imagem, quantidade,
// minimo, localizacao, notas, atualizadoEm } }`. Abrir a página de stock
// custa no máximo 8 leituras, seja qual for o número de artigos (o mesmo
// raciocínio de services/partCategoryAssignments.js).
//
// Movimentos (entradas/saídas/acertos): coleção "movimentosStock", um
// documento por movimento. Só se leem os de um artigo, quando se abre o
// histórico desse artigo.
//
// As entradas e saídas usam increment() (atómico): duas pessoas a mexer
// no mesmo artigo ao mesmo tempo não se atropelam.

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  writeBatch,
  increment,
  deleteField,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, firebaseApp, storage } from "../firebase.jsx";
import { compressImage } from "../utils/imageCompression.js";

export const STOCK_COLLECTION = "stockPecas";
export const STOCK_MOVEMENTS_COLLECTION = "movimentosStock";
const BUCKET_COUNT = 8;

function bucketFor(id) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return String(h % BUCKET_COUNT);
}

const bucketRef = (id) => doc(db, STOCK_COLLECTION, bucketFor(id));

const currentUserEmail = () => getAuth(firebaseApp).currentUser?.email || "";

/** Novo ID de artigo (não grava nada). */
export const newStockItemId = () => doc(collection(db, STOCK_COLLECTION)).id;

/**
 * Ouve o stock em tempo real. `onChange` recebe a lista de artigos
 * [{ id, codigo, nome, ... }]. Devolve a função para deixar de ouvir.
 */
export function subscribeStock(onChange, onError) {
  return onSnapshot(
    collection(db, STOCK_COLLECTION),
    (snap) => {
      const items = [];
      snap.docs.forEach((d) => {
        for (const [id, data] of Object.entries(d.data().itens || {})) {
          items.push({ id, ...data, quantidade: Number(data.quantidade) || 0 });
        }
      });
      onChange(items);
    },
    onError
  );
}

/** Regista um movimento no histórico (dentro do mesmo batch). */
function addMovement(batch, item, { tipo, quantidade, quantidadeFinal, motivo }) {
  batch.set(doc(collection(db, STOCK_MOVEMENTS_COLLECTION)), {
    itemId: item.id,
    codigo: item.codigo || "",
    nome: item.nome || "",
    tipo, // "criacao" | "entrada" | "saida" | "acerto"
    quantidade,
    quantidadeFinal,
    motivo: motivo || "",
    utilizador: currentUserEmail(),
    data: new Date(),
  });
}

const cleanFields = (data) => ({
  codigo: (data.codigo || "").trim(),
  nome: (data.nome || "").trim(),
  imagem: data.imagem || "",
  // Só preenchido quando a foto foi carregada para o Storage (e não vem do catálogo).
  imagemStoragePath: data.imagemStoragePath || "",
  // As mesmas categorias da Biblioteca de Peças (ver categoriesStore.js).
  categoryId: data.categoryId || "",
  subcategoryId: data.subcategoryId || "",
  minimo: Math.max(0, Number(data.minimo) || 0),
  localizacao: (data.localizacao || "").trim(),
  notas: (data.notas || "").trim(),
});

/** Cria um artigo novo com a quantidade inicial. */
export async function createStockItem(id, data) {
  const quantidade = Math.max(0, Number(data.quantidade) || 0);
  const fields = { ...cleanFields(data), quantidade, atualizadoEm: new Date() };
  const batch = writeBatch(db);
  batch.set(bucketRef(id), { itens: { [id]: fields } }, { merge: true });
  addMovement(batch, { id, ...fields }, {
    tipo: "criacao",
    quantidade,
    quantidadeFinal: quantidade,
    motivo: "Artigo criado",
  });
  await batch.commit();
}

/** Altera os dados do artigo (não a quantidade — essa muda por movimentos). */
export async function updateStockItem(id, data) {
  const batch = writeBatch(db);
  batch.set(
    bucketRef(id),
    { itens: { [id]: { ...cleanFields(data), atualizadoEm: new Date() } } },
    { merge: true }
  );
  await batch.commit();
}

/** Apaga o artigo (e a foto própria, se tiver). O histórico de movimentos fica guardado. */
export async function deleteStockItem(item) {
  const batch = writeBatch(db);
  batch.set(bucketRef(item.id), { itens: { [item.id]: deleteField() } }, { merge: true });
  await batch.commit();
  await deleteStockPhoto(item.imagemStoragePath);
}

/** Entrada (delta positivo) ou saída (delta negativo) de stock. */
export async function moveStock(item, delta, motivo) {
  const batch = writeBatch(db);
  batch.set(
    bucketRef(item.id),
    { itens: { [item.id]: { quantidade: increment(delta), atualizadoEm: new Date() } } },
    { merge: true }
  );
  addMovement(batch, item, {
    tipo: delta >= 0 ? "entrada" : "saida",
    quantidade: Math.abs(delta),
    quantidadeFinal: item.quantidade + delta,
    motivo,
  });
  await batch.commit();
}

/** Acerto de inventário: fixa a quantidade que foi contada na prateleira. */
export async function setStockQuantity(item, novaQuantidade, motivo) {
  const quantidade = Math.max(0, Number(novaQuantidade) || 0);
  const batch = writeBatch(db);
  batch.set(
    bucketRef(item.id),
    { itens: { [item.id]: { quantidade, atualizadoEm: new Date() } } },
    { merge: true }
  );
  addMovement(batch, item, {
    tipo: "acerto",
    quantidade: quantidade - item.quantidade,
    quantidadeFinal: quantidade,
    motivo: motivo || "Acerto de inventário",
  });
  await batch.commit();
}

/**
 * Carrega uma foto do artigo para o Storage (comprimida). Devolve
 * { url, storagePath } para gravar em imagem / imagemStoragePath.
 */
export async function uploadStockPhoto(itemId, file) {
  const compressed = await compressImage(file);
  const storagePath = `stock/${itemId}/${Date.now()}.jpg`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
  return { url: await getDownloadURL(storageRef), storagePath };
}

/** Apaga uma foto antiga do Storage. Falhar aqui não é grave (fica só o ficheiro órfão). */
export async function deleteStockPhoto(storagePath) {
  if (!storagePath) return;
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (err) {
    console.warn("Não foi possível apagar a foto antiga do stock:", err);
  }
}

/** Histórico de um artigo, mais recente primeiro. */
export async function loadStockMovements(itemId) {
  const snap = await getDocs(
    query(collection(db, STOCK_MOVEMENTS_COLLECTION), where("itemId", "==", itemId))
  );
  return snap.docs
    .map((d) => {
      const data = d.data();
      return { id: d.id, ...data, data: data.data?.toDate?.() || null };
    })
    .sort((a, b) => (b.data?.getTime() || 0) - (a.data?.getTime() || 0));
}
