// src/features/clients/invoiceRequests.js
// Histórico dos pedidos de fatura (coleção "pedidosFatura"). Guarda-se só o
// que foi preenchido na janela "Solicitar fatura" — não o PDF — para se
// poder gerar o mesmo pedido outra vez a partir do perfil do cliente.
//
// Documento: { clientId, tipo, referencia, sourceId, data, texto, valor,
//   comIva, taxaIva, nota, maquinas: [{ nome, numero }], cliente: { name,
//   nif, phone, email, address, postalCode, company }, createdAt, createdBy }
// sourceId = id do orçamento de peças / OS de origem (em "ordens"), ou null
// nos pedidos avulsos. Se a origem for apagada, o pedido deixa de ser válido.

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";

const COL = "pedidosFatura";

export async function saveInvoiceRequest({ clientId, sourceId, form, createdBy }) {
  return addDoc(collection(db, COL), {
    clientId,
    tipo: form.tipo,
    referencia: form.referencia || "",
    sourceId: form.tipo === "avulsa" ? null : sourceId || null,
    data: form.data,
    texto: form.texto,
    valor: form.valor,
    comIva: !!form.comIva,
    taxaIva: form.taxaIva,
    nota: form.nota,
    maquinas: form.tipo === "os" ? form.maquinas || [] : [],
    cliente: {
      name: form.name || "",
      nif: form.nif || "",
      phone: form.phone || "",
      email: form.email || "",
      address: form.address || "",
      postalCode: form.postalCode || "",
      company: form.company || "",
    },
    createdAt: serverTimestamp(),
    createdBy: createdBy || "",
  });
}

export async function listInvoiceRequests(clientId) {
  const snap = await getDocs(query(collection(db, COL), where("clientId", "==", clientId)));
  const millis = (v) => (v?.toDate ? v.toDate().getTime() : 0);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => millis(b.createdAt) - millis(a.createdAt));
}

export const deleteInvoiceRequest = (id) => deleteDoc(doc(db, COL, id));

/**
 * O documento de origem ainda existe? (orçamento de peças / OS em "ordens";
 * os que estão na Reciclagem — eliminadoEm — contam como apagados).
 * Pedidos avulsos ou sem sourceId (escritos à mão) não têm origem a verificar.
 */
export async function invoiceSourceExists(request) {
  if (request.tipo === "avulsa" || !request.sourceId) return true;
  const snap = await getDoc(doc(db, "ordens", request.sourceId));
  return snap.exists() && !snap.data().eliminadoEm;
}
