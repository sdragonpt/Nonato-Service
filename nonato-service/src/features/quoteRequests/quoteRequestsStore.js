// src/features/quoteRequests/quoteRequestsStore.js
// "Pedidos de Orçamento Avulsos" — pedir preços a um fornecedor por peças que
// não são do nosso catálogo. Coleção "pedidosOrcamentoAvulso"; número próprio
// POA-MMAA-0000. Sem preços: é o fornecedor que os vai dar.
//
// Documento: { number, fornecedor: { id, nome, contato, email, telefone },
//   clientName, equipment: { brand, model, serialNumber }, texto,
//   observacoes, itens: [{ key, nome, marca, referencia, quantidade, nota,
//   imagem }], createdAt, updatedAt, createdBy }

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

export const DEFAULT_REQUEST_TEXT =
  "Vimos por este meio solicitar orçamento para as peças abaixo indicadas.\n" +
  "Agradecemos o envio dos preços unitários, disponibilidade e prazo de entrega.\n" +
  "Com os melhores cumprimentos, Nonato Service";

export const emptyQuoteRequest = () => ({
  fornecedor: { id: "", nome: "", contato: "", email: "", telefone: "" },
  clientName: "",
  equipment: { brand: "", model: "", serialNumber: "" },
  texto: DEFAULT_REQUEST_TEXT,
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
  fornecedor: {
    id: d.fornecedor?.id || "",
    nome: d.fornecedor?.nome || "",
    contato: d.fornecedor?.contato || "",
    email: d.fornecedor?.email || "",
    telefone: d.fornecedor?.telefone || "",
  },
  clientName: d.clientName || "",
  equipment: {
    brand: d.equipment?.brand || "",
    model: d.equipment?.model || "",
    serialNumber: d.equipment?.serialNumber || "",
  },
  texto: d.texto || "",
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
