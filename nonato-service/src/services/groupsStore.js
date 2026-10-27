// src/services/groupsStore.js
// Listas de grupos usadas para organizar cadastros (grupos de serviços,
// grupos de clientes). Cada lista é UM documento — gruposCadastro/<tipo> —
// com um mapa `itens: { <id>: { nome, precos? } }`, por isso carregar os
// grupos custa 1 leitura (mesmo raciocínio de services/categoriesStore.js).
//
// Grupos de serviços = tabelas de preços: `precos: { <serviceId>: valor }`
// diz que serviços/despesas fazem parte do grupo e quanto custam nele
// (valor null = está no grupo mas ainda sem valor). O mesmo serviço pode
// estar em vários grupos com valores diferentes — o catálogo de nomes
// ("servicos") é partilhado, os valores são de cada grupo.
//
// Os clientes guardam `grupoIds` (vários grupos de clientes). O antigo
// `grupoId` dos serviços (um só grupo) é migrado para `precos` — ver
// migrateLegacyServiceGroups. Apagar um grupo não mexe nos serviços/clientes.

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, setDoc, deleteField, writeBatch } from "firebase/firestore";
import { db } from "../firebase.jsx";
import { comparePtPt } from "../utils/sortHelpers.js";

export const GROUP_KINDS = {
  SERVICOS: "servicos",
  CLIENTES: "clientes",
};

const groupsDoc = (kind) => doc(db, "gruposCadastro", kind);

/** Grupos de um tipo, em tempo real, ordenados por nome: [{ id, nome, precos }]. */
export function useGroups(kind) {
  const [state, setState] = useState({ groups: [], byId: new Map(), loading: true });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      groupsDoc(kind),
      (snap) => {
        const itens = (snap.exists() && snap.data().itens) || {};
        const groups = Object.entries(itens)
          .map(([id, g]) => ({ id, nome: g.nome || "", precos: g.precos || {} }))
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

/** Cria um grupo e devolve o id. `precos` opcional (ex.: ao duplicar). */
export async function createGroup(kind, nome, precos) {
  const id = doc(collection(db, "gruposCadastro")).id;
  const item = { nome: nome.trim() };
  if (precos && Object.keys(precos).length) item.precos = precos;
  await setDoc(groupsDoc(kind), { itens: { [id]: item } }, { merge: true });
  return id;
}

export async function renameGroup(kind, id, nome) {
  await setDoc(groupsDoc(kind), { itens: { [id]: { nome: nome.trim() } } }, { merge: true });
}

export async function deleteGroup(kind, id) {
  await setDoc(groupsDoc(kind), { itens: { [id]: deleteField() } }, { merge: true });
}

/** Põe um serviço num grupo com um valor (null = sem valor ainda). */
export async function setGroupPrice(kind, groupId, serviceId, valor) {
  const v = valor === "" || valor == null || Number.isNaN(Number(valor)) ? null : Number(valor);
  await setDoc(
    groupsDoc(kind),
    { itens: { [groupId]: { precos: { [serviceId]: v } } } },
    { merge: true }
  );
}

/** Tira um serviço de um grupo (o serviço continua no catálogo). */
export async function removeFromGroup(kind, groupId, serviceId) {
  await setDoc(
    groupsDoc(kind),
    { itens: { [groupId]: { precos: { [serviceId]: deleteField() } } } },
    { merge: true }
  );
}

/**
 * Migração única: serviços antigos com `grupoId` passam a fazer parte desse
 * grupo (sem valor) e o `grupoId` é apagado do serviço — assim, se depois
 * alguém tirar o serviço do grupo, ele não volta a entrar.
 */
export async function migrateLegacyServiceGroups(services, groupsById) {
  const legacy = services.filter((s) => s.grupoId);
  if (!legacy.length) return 0;
  const batch = writeBatch(db);
  const missing = {};
  for (const s of legacy) {
    const g = groupsById.get(s.grupoId);
    if (g && !(s.id in g.precos)) (missing[g.id] ||= {})[s.id] = null;
    batch.update(doc(db, "servicos", s.id), { grupoId: deleteField() });
  }
  const ids = Object.keys(missing);
  if (ids.length) {
    const itens = Object.fromEntries(ids.map((id) => [id, { precos: missing[id] }]));
    batch.set(groupsDoc(GROUP_KINDS.SERVICOS), { itens }, { merge: true });
  }
  await batch.commit();
  return legacy.length;
}
