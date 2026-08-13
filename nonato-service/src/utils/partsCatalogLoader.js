// src/utils/partsCatalogLoader.js
// Lê o catálogo estático de peças (public/pecas-data/), gerado pelo script
// scripts/parts-catalog/build-catalog.js a partir de CSVs (ex.: exports da
// HOMAG). Suporta múltiplos "lotes" — basta correr o script outra vez com um
// novo CSV para acrescentar mais peças, sem tocar nos lotes já existentes.
//
// PROTÓTIPO: esta função ainda não está ligada a nenhuma página da app.
// Serve para validar a abordagem (ver useStaticPartsCatalog mais abaixo,
// ou chamar loadPartsCatalog() diretamente) antes de decidir substituir a
// Biblioteca de Peças atual (Firestore) por esta.

import { useState, useEffect } from "react";
import { comparePtPt } from "./sortHelpers.js";

let cachedCatalog = null;
let inFlightPromise = null;

/**
 * Vai buscar o manifest.json e todos os lotes que ele lista, junta tudo
 * numa única lista e remove duplicados por código (o lote que aparecer
 * depois no manifest "ganha" em caso de código repetido entre lotes).
 * O resultado fica em cache em memória — só faz os pedidos de rede uma vez
 * por sessão da app.
 */
export async function loadPartsCatalog({ force = false } = {}) {
  if (cachedCatalog && !force) return cachedCatalog;
  if (inFlightPromise && !force) return inFlightPromise;

  inFlightPromise = (async () => {
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

    const merged = Array.from(byCodigo.values()).sort((a, b) =>
      comparePtPt(a.nome, b.nome)
    );

    cachedCatalog = {
      pecas: merged,
      lotes: manifest,
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
