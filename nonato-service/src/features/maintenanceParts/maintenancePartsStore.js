// src/features/maintenanceParts/maintenancePartsStore.js
// "Peças para Manutenção" — documento com a lista de peças necessárias para a
// manutenção de um equipamento (código, nome, imagem, quantidade, nota), sem
// preços. Coleção "pecasManutencao"; número próprio PM-MMAA-0000.
//
// Documento: { number, clientId, clientName, equipment: { source, id, brand,
//   model, serialNumber }, titulo, observacoes, itens: [{ key, code, name,
//   image, quantity, nota }], createdAt, updatedAt, createdBy }

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

const COL = "pecasManutencao";

export const emptyMaintenanceDoc = () => ({
  clientId: "",
  clientName: "",
  equipment: { source: "", id: "", brand: "", model: "", serialNumber: "" },
  titulo: "",
  observacoes: "",
  itens: [],
});

export async function listMaintenanceDocs() {
  const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getMaintenanceDoc(id) {
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

const clean = (data) => ({
  clientId: data.clientId || "",
  clientName: data.clientName || "",
  equipment: {
    source: data.equipment?.source || "",
    id: data.equipment?.id || "",
    brand: data.equipment?.brand || "",
    model: data.equipment?.model || "",
    serialNumber: data.equipment?.serialNumber || "",
  },
  titulo: data.titulo || "",
  observacoes: data.observacoes || "",
  itens: (data.itens || []).map((i) => ({
    key: i.key,
    code: i.code || "",
    name: i.name || "",
    image: i.image || null,
    quantity: Math.max(1, parseInt(i.quantity, 10) || 1),
    nota: i.nota || "",
  })),
});

/** Cria (com número novo) e devolve { id, number }. */
export async function createMaintenanceDoc(data, createdBy) {
  const number = await generateDocNumber("pm");
  const ref = await addDoc(collection(db, COL), {
    ...clean(data),
    number,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: createdBy || "",
  });
  return { id: ref.id, number };
}

export async function updateMaintenanceDoc(id, data) {
  await updateDoc(doc(db, COL, id), { ...clean(data), updatedAt: serverTimestamp() });
}

export const deleteMaintenanceDoc = (id) => deleteDoc(doc(db, COL, id));
