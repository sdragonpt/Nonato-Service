// src/utils/catalogPartSearch.js
// Pesquisa partilhada sobre o catálogo estático HOMAG, usada por qualquer
// formulário que precise de "escolher uma peça" (Ordens de Serviço,
// Orçamentos de Peças, Pedidos de Armazém). Substitui as várias cópias de
// pesquisa Firestore (getDocs/query em "pecas") que existiam nesses
// formulários — agora é tudo o mesmo catálogo em memória.

import { loadPartsCatalog } from "./partsCatalogLoader.js";

/**
 * Pesquisa peças do catálogo por nome ou código.
 * Devolve objetos já no formato que os formulários de peças esperam
 * (id/name/code/image/imageHash), para minimizar alterações nesses formulários.
 */
export async function searchCatalogParts(term, { limit = 10 } = {}) {
  const t = term.trim().toLowerCase();
  if (!t) return [];

  const { pecas } = await loadPartsCatalog();
  const results = [];

  for (const p of pecas) {
    const nome = (p.nome || "").toLowerCase();
    const codigo = (p.codigo || "").toLowerCase();
    const relacionado = (p.codigosRelacionados || []).some((c) =>
      c.toLowerCase().includes(t)
    );
    if (nome.includes(t) || codigo.includes(t) || relacionado) {
      results.push({
        id: p.codigo,
        name: p.nome,
        code: p.codigo,
        image: p.imagem || null,
        imageHash: null,
      });
      if (results.length >= limit) break;
    }
  }

  return results;
}
