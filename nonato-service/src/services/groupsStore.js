// src/services/groupsStore.js
// Grupos (ex.: HOMAG). Há UM tipo de grupo na app: os de "Serviços e
// Valores", guardados em UM documento — gruposCadastro/servicos — com um mapa
// `itens: { <id>: { nome, precos } }`, por isso carregar os grupos custa
// 1 leitura (mesmo raciocínio de services/categoriesStore.js).
//
// Cada grupo é uma tabela de preços: `precos: { <serviceId>: valor }` diz que
// serviços/despesas fazem parte do grupo e quanto custam nele (valor null =
// está no grupo mas ainda sem valor). O mesmo serviço pode estar em vários
// grupos com valores diferentes — o catálogo de nomes ("servicos") é
// partilhado, os valores são de cada grupo.
//
// Os clientes guardam `grupoIds` com o grupo a que pertencem (um, escolhido
// em Novo/Editar Cliente) — é por ele que os orçamentos sabem que valores usar.
//
// Migrações (correm sozinhas, uma vez):
// - o antigo `grupoId` dos serviços (um só grupo) passa para `precos`
//   (migrateLegacyServiceGroups);
// - os antigos grupos de clientes (gruposCadastro/clientes) passam a grupos
//   de serviços com o mesmo nome (migrateClientGroupsToServiceGroups).

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  deleteField,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase.jsx";
import { comparePtPt } from "../utils/sortHelpers.js";

export const GROUP_KINDS = {
  SERVICOS: "servicos",
  /** Só para a migração dos grupos de clientes antigos. */
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

/** Grupo (tabela de preços) de um cliente: o primeiro dos seus grupoIds que ainda existe. */
export function clientPriceGroup(clientGroupIds, groupsById) {
  const id = (clientGroupIds || []).find((gid) => groupsById.has(gid));
  return id ? groupsById.get(id) : null;
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

const normName = (s) => (s || "").trim().toLowerCase();

/**
 * Migração única: os grupos de clientes antigos (gruposCadastro/clientes)
 * passam a grupos de Serviços e Valores — junta-se ao grupo com o mesmo nome
 * ou cria-se um novo — e os clientes ficam a apontar para o grupo novo.
 * No fim marca gruposCadastro/clientes como migrado para não repetir.
 * Devolve { clientes: { <clientId>: grupoIds } } para atualizar a cache.
 */
export async function migrateClientGroupsToServiceGroups() {
  const clientesRef = groupsDoc(GROUP_KINDS.CLIENTES);
  const snap = await getDoc(clientesRef);
  if (!snap.exists() || snap.data().migradoParaServicosEm) return { clientes: {} };
  const oldGroups = snap.data().itens || {};
  const oldIds = Object.keys(oldGroups);

  const svcSnap = await getDoc(groupsDoc(GROUP_KINDS.SERVICOS));
  const svcItens = (svcSnap.exists() && svcSnap.data().itens) || {};
  const byName = new Map(Object.entries(svcItens).map(([id, g]) => [normName(g.nome), id]));

  const map = {};
  const newGroups = {};
  for (const [oid, g] of Object.entries(oldGroups)) {
    const key = normName(g.nome);
    if (!key) continue;
    let nid = byName.get(key);
    if (!nid) {
      nid = doc(collection(db, "gruposCadastro")).id;
      newGroups[nid] = { nome: g.nome.trim() };
      byName.set(key, nid);
    }
    map[oid] = nid;
  }

  // Clientes que estão em algum grupo antigo (array-contains-any aceita 30 de cada vez)
  const changed = {};
  for (let i = 0; i < oldIds.length; i += 30) {
    const chunk = oldIds.slice(i, i + 30);
    const qs = await getDocs(query(collection(db, "clientes"), where("grupoIds", "array-contains-any", chunk)));
    qs.forEach((d) => {
      const ids = d.data().grupoIds || [];
      changed[d.id] = [...new Set(ids.map((x) => map[x] || x).filter((x) => !oldGroups[x] || map[x]))];
    });
  }

  const entries = Object.entries(changed);
  for (let i = 0; i < Math.max(entries.length, 1); i += 400) {
    const batch = writeBatch(db);
    if (i === 0 && Object.keys(newGroups).length) {
      batch.set(groupsDoc(GROUP_KINDS.SERVICOS), { itens: newGroups }, { merge: true });
    }
    for (const [id, grupoIds] of entries.slice(i, i + 400)) {
      batch.update(doc(db, "clientes", id), { grupoIds });
    }
    if (i + 400 >= entries.length) {
      batch.set(clientesRef, { migradoParaServicosEm: serverTimestamp() }, { merge: true });
    }
    await batch.commit();
  }
  return { clientes: changed };
}
