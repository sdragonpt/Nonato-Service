// src/services/groupsStore.js
// Listas de grupos usadas para organizar cadastros (grupos de serviços,
// grupos de clientes). Cada lista é UM documento — gruposCadastro/<tipo> —
// com um mapa `itens: { <id>: { nome } }`, por isso carregar os grupos custa
// 1 leitura (mesmo raciocínio de services/categoriesStore.js).
//
// Os serviços guardam `grupoId` (um grupo); os clientes guardam `grupoIds`
// (vários). Apagar um grupo não mexe nos serviços/clientes: o id deixa de
// corresponder a um grupo e é simplesmente ignorado ao mostrar.

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, setDoc, deleteField } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { comparePtPt } from "../utils/sortHelpers.js";

export const GROUP_KINDS = {
  SERVICOS: "servicos",
  CLIENTES: "clientes",
};

const groupsDoc = (kind) => doc(db, "gruposCadastro", kind);

/** Grupos de um tipo, em tempo real, ordenados por nome: [{ id, nome }]. */
export function useGroups(kind) {
  const [state, setState] = useState({ groups: [], byId: new Map(), loading: true });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      groupsDoc(kind),
      (snap) => {
        const itens = (snap.exists() && snap.data().itens) || {};
        const groups = Object.entries(itens)
          .map(([id, g]) => ({ id, nome: g.nome || "" }))
          .sort((a, b) => comparePtPt(a.nome, b.nome));
        setState({ groups, byId: new Map(groups.map((g) => [g.id, g])), loading: false });
      },
      (err) => {
        console.error(`Erro ao carregar grupos (${kind}):`, err);
        setState((s) => ({ ...s, loading: false }));
      }
    );
    return () => unsubscribe();
  }, [kind]);

  return state;
}

/** Cria um grupo e devolve o id. */
export async function createGroup(kind, nome) {
  const id = doc(collection(db, "gruposCadastro")).id;
  await setDoc(groupsDoc(kind), { itens: { [id]: { nome: nome.trim() } } }, { merge: true });
  return id;
}

export async function renameGroup(kind, id, nome) {
  await setDoc(groupsDoc(kind), { itens: { [id]: { nome: nome.trim() } } }, { merge: true });
}

export async function deleteGroup(kind, id) {
  await setDoc(groupsDoc(kind), { itens: { [id]: deleteField() } }, { merge: true });
}
