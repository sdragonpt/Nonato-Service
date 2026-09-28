// src/hooks/useCatalogParts.js
// Fonte única de peças da app: o catálogo estático HOMAG (JSON em
// public/pecas-data/, ver partsCatalogLoader.js) + a classificação de
// categoria/subcategoria guardada à parte na Firestore (ver
// services/partCategoryAssignments.js). Substitui o antigo
// useMergedPartsCatalog.js, que ainda misturava isto com peças "geridas"
// na Firestore — esse conceito deixou de existir.

import { useState, useEffect, useCallback } from "react";
import {
  loadPartsCatalog,
  invalidatePartsCatalogEdits,
} from "../utils/partsCatalogLoader.js";
import { invalidatePartEditsCache } from "../services/partEdits.js";
import {
  loadPartAssignments,
  invalidatePartAssignmentsCache,
} from "../services/partCategoryAssignments.js";

function mergePart(catalogPart, assignment) {
  return {
    id: catalogPart.codigo,
    codigo: catalogPart.codigo,
    code: catalogPart.codigo,
    nome: catalogPart.nome,
    name: catalogPart.nome,
    imagem: catalogPart.imagem || "",
    image: catalogPart.imagem || null,
    imageHash: null,
    descricao: catalogPart.descricao || "",
    description: catalogPart.descricao || "",
    codigosRelacionados: catalogPart.codigosRelacionados || [],
    relatedCodes: catalogPart.codigosRelacionados || [],
    editada: Boolean(catalogPart.editada),
    original: catalogPart.original || null,
    categoryId: assignment?.categoryId || "",
    categoryName: assignment?.categoryName || "",
    subcategoryId: assignment?.subcategoryId || "",
    subcategoryName: assignment?.subcategoryName || "",
  };
}

export function useCatalogParts() {
  const [state, setState] = useState({
    parts: [],
    loading: true,
    error: null,
    total: 0,
    classifiedCount: 0,
  });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    Promise.all([
      loadPartsCatalog(),
      loadPartAssignments({ force: reloadToken > 0 }),
    ])
      .then(([catalog, assignments]) => {
        if (cancelled) return;

        let classifiedCount = 0;
        const parts = catalog.pecas.map((p) => {
          const assignment = assignments.get(p.codigo);
          if (assignment?.categoryId) classifiedCount += 1;
          return mergePart(p, assignment);
        });

        setState({
          parts,
          loading: false,
          error: null,
          total: parts.length,
          classifiedCount,
        });
      })
      .catch((err) => {
        console.error("Erro ao carregar catálogo de peças:", err);
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err.message || "Erro ao carregar peças.",
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const refresh = useCallback(() => {
    invalidatePartAssignmentsCache();
    invalidatePartEditsCache();
    invalidatePartsCatalogEdits();
    setReloadToken((t) => t + 1);
  }, []);

  return { ...state, refresh };
}
