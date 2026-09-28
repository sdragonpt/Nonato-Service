// src/utils/partsCatalogLoader.js
// Lê o catálogo estático de peças (public/pecas-data/), gerado pelo script
// scripts/parts-catalog/build-catalog.js a partir de CSVs ou JSONs (ex.:
// exports da HOMAG). Suporta múltiplos "lotes" listados no manifest.json.
//
// Por cima do catálogo aplica as edições feitas na app (coleção
// "pecasEditadas", ver services/partEdits.js) — assim todos os sítios que
// usam o catálogo (Biblioteca de Peças, loja pública, pesquisa de peças nos
// formulários) veem o nome/imagem/descrição já editados.

import { useState, useEffect } from "react";
import { comparePtPt } from "./sortHelpers.js";
import { loadPartEdits } from "../services/partEdits.js";

let baseCatalog = null; // catálogo tal como vem dos JSONs
let baseInFlight = null;
let cachedCatalog = null; // catálogo com as edições aplicadas
let inFlightPromise = null;

/**
 * Vai buscar o manifest.json e todos os lotes que ele lista, junta tudo
 * numa única lista e remove duplicados por código (o lote que aparecer
 * depois no manifest "ganha" em caso de código repetido entre lotes).
 * Os ficheiros só são pedidos uma vez por sessão da app.
 */
async function loadBaseCatalog({ force = false } = {}) {
  if (baseCatalog && !force) return baseCatalog;
  if (baseInFlight && !force) return baseInFlight;

  baseInFlight = (async () => {
    const manifestRes = await fetch("/pecas-data/manifest.json");
    if (!manifestRes.ok) {
      throw new Error("Não foi possível carregar o manifest do catálogo de peças.");
    }
    const manifest = await manifestRes.json();

    const byCodigo = new Map();

    for (const entry of manifest) {
      const res = await fetch(`/pecas-data/${entry.file}`);
      if (!res.ok) {
        console.warn(`Lote "${entry.file}" não pôde ser carregado, a ignorar.`);
        continue;
      }
      const pecas = await res.json();
      for (const peca of pecas) {
        if (!peca?.codigo) continue;
        byCodigo.set(peca.codigo, peca);
      }
    }

    baseCatalog = { byCodigo, lotes: manifest };
    return baseCatalog;
  })();

  try {
    return await baseInFlight;
  } finally {
    baseInFlight = null;
  }
}

/** Aplica uma edição a uma peça, guardando os valores originais. */
function applyEdit(peca, edit) {
  if (!edit) return peca;
  const original = {
    nome: peca.nome,
    imagem: peca.imagem || "",
    descricao: peca.descricao || "",
  };
  const merged = { ...peca, editada: true, original };
  if (edit.nome !== undefined) merged.nome = edit.nome;
  if (edit.imagem !== undefined) merged.imagem = edit.imagem;
  if (edit.descricao !== undefined) merged.descricao = edit.descricao;
  return merged;
}

export async function loadPartsCatalog({ force = false } = {}) {
  if (cachedCatalog && !force) return cachedCatalog;
  if (inFlightPromise && !force) return inFlightPromise;

  inFlightPromise = (async () => {
    const base = await loadBaseCatalog({ force });

    // Se as edições não carregarem (ex.: sem rede para a Firestore, ou
    // regras ainda não publicadas), o catálogo continua a funcionar.
    let edits = new Map();
    try {
      edits = await loadPartEdits({ force });
    } catch (err) {
      console.warn("Não foi possível carregar as edições de peças:", err);
    }

    const merged = Array.from(base.byCodigo.values())
      .map((p) => applyEdit(p, edits.get(p.codigo)))
      .sort((a, b) => comparePtPt(a.nome, b.nome));

    cachedCatalog = {
      pecas: merged,
      lotes: base.lotes,
      total: merged.length,
    };
    return cachedCatalog;
  })();

  try {
    return await inFlightPromise;
  } finally {
    inFlightPromise = null;
  }
}

/**
 * Obriga a próxima chamada a loadPartsCatalog() a reaplicar as edições
 * (os JSONs não voltam a ser pedidos). Chamar depois de editar uma peça.
 */
export function invalidatePartsCatalogEdits() {
  cachedCatalog = null;
}

/** Hook de conveniência para usar o catálogo diretamente num componente React. */
export function useStaticPartsCatalog() {
  const [state, setState] = useState({
    pecas: [],
    lotes: [],
    total: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    loadPartsCatalog()
      .then((result) => {
        if (!cancelled) setState({ ...result, loading: false, error: null });
      })
      .catch((err) => {
        console.error("Erro ao carregar catálogo de peças:", err);
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false, error: err.message }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
