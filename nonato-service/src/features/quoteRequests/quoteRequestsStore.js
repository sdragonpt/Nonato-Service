// src/features/quoteRequests/quoteRequestsStore.js
// "Pedidos de Orçamento Avulsos" — pedido de orçamento de peças que não são
// do nosso catálogo, para um cliente (registado ou não). Coleção
// "pedidosOrcamentoAvulso"; número próprio POA-MMAA-0000. Sem preços.
//
// Documento: { number, cliente: { id, name, nif, phone, email, address },
//   observacoes, itens: [{ key, nome, marca, referencia, quantidade, nota,
//   imagem }], createdAt, updatedAt, createdBy }
// cliente.id vazio = cliente não registado (dados escritos à mão).

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { generateDocNumber } from "../../utils/docNumbering.js";

const COL = "pedidosOrcamentoAvulso";

export const emptyQuoteRequest = () => ({
  cliente: { id: "", name: "", nif: "", phone: "", email: "", address: "" },
  observacoes: "",
  itens: [],
});

export async function listQuoteRequests() {
  const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getQuoteRequest(id) {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

const clean = (d) => ({
  cliente: {
    id: d.cliente?.id || "",
    name: d.cliente?.name || "",
    nif: d.cliente?.nif || "",
    phone: d.cliente?.phone || "",
    email: d.cliente?.email || "",
    address: d.cliente?.address || "",
  },
  observacoes: d.observacoes || "",
  itens: (d.itens || []).map((i) => ({
    key: i.key,
    nome: i.nome || "",
    marca: i.marca || "",
    referencia: i.referencia || "",
    quantidade: Math.max(1, parseInt(i.quantidade, 10) || 1),
    nota: i.nota || "",
    imagem: i.imagem || "",
  })),
});

/** Cria (com número novo) e devolve { id, number }. */
export async function createQuoteRequest(data, createdBy) {
  const number = await generateDocNumber("poa");
  const ref = await addDoc(collection(db, COL), {
    ...clean(data),
    number,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: createdBy || "",
  });
  return { id: ref.id, number };
}

export async function updateQuoteRequest(id, data) {
  await updateDoc(doc(db, COL, id), { ...clean(data), updatedAt: serverTimestamp() });
}

export const deleteQuoteRequest = (id) => deleteDoc(doc(db, COL, id));
