// PartsCache.jsx - OTIMIZADO: Mais simples e eficiente

import { createContext, useContext, useState, useCallback } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase.jsx";

const PartsCacheContext = createContext(null);

export const PartsCacheProvider = ({ children }) => {
  const [cache, setCache] = useState(new Map());
  const [countsCache, setCountsCache] = useState(new Map());
  const CACHE_DURATION = 15 * 60 * 1000; // 15 minutos

  // Verificar validade do cache
  const isCacheValid = useCallback((entry) => {
    if (!entry) return false;
    return Date.now() - entry.timestamp < CACHE_DURATION;
  }, []);

  // Buscar peças com cache inteligente
  const fetchParts = useCallback(
    async ({
      categoryId = null,
      subcategoryId = null,
      searchTerm = "",
      limit: limitCount = 100,
    }) => {
      try {
        // Para pesquisa, sempre buscar fresh
        if (searchTerm) {
          let q = query(collection(db, "pecas"));

          // Buscar todos para filtrar localmente (mais eficiente para pesquisa)
          const snapshot = await getDocs(q);
          const allParts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Filtrar localmente
          const search = searchTerm.toLowerCase();
          const filtered = allParts.filter(
            (part) =>
              part.name?.toLowerCase().includes(search) ||
              part.code?.toLowerCase().includes(search) ||
              part.description?.toLowerCase().includes(search)
          );

          return { parts: filtered.slice(0, limitCount), hasMore: false };
        }

        // Para navegação por categoria, usar cache
        const cacheKey = `${categoryId || "all"}-${subcategoryId || "none"}`;
        const cached = cache.get(cacheKey);

        if (cached && isCacheValid(cached)) {
          return { parts: cached.data, hasMore: false, fromCache: true };
        }

        // Buscar do Firestore
        let q = query(collection(db, "pecas"));

        if (categoryId) {
          q = query(q, where("categoryId", "==", categoryId));
        }
        if (subcategoryId) {
          q = query(q, where("subcategoryId", "==", subcategoryId));
        }

        q = query(q, orderBy("name"), limit(limitCount));

        const snapshot = await getDocs(q);
        const parts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Salvar no cache
        setCache((prev) =>
          new Map(prev).set(cacheKey, {
            data: parts,
            timestamp: Date.now(),
          })
        );

        return { parts, hasMore: parts.length === limitCount };
      } catch (error) {
        return { parts: [], hasMore: false, error: error.message };
      }
    },
    [cache, isCacheValid]
  );

  // Buscar contadores de subcategorias
  const fetchSubcategoryCounts = useCallback(
    async (categoryId) => {
      const cacheKey = `counts-${categoryId}`;
      const cached = countsCache.get(cacheKey);

      if (cached && isCacheValid(cached)) {
        return cached.data;
      }

      try {
        const q = query(
          collection(db, "pecas"),
          where("categoryId", "==", categoryId)
        );

        const snapshot = await getDocs(q);
        const counts = {};

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const subcategoryId = data.subcategoryId || "sem-subcategoria";
          counts[subcategoryId] = (counts[subcategoryId] || 0) + 1;
        });

        setCountsCache((prev) =>
          new Map(prev).set(cacheKey, {
            data: counts,
            timestamp: Date.now(),
          })
        );

        return counts;
      } catch (error) {
        return {};
      }
    },
    [countsCache, isCacheValid]
  );

  // Invalidar cache
  const invalidateCache = useCallback(() => {
    setCache(new Map());
    setCountsCache(new Map());
  }, []);

  // Remover peça do cache
  const removePartFromCache = useCallback((partId) => {
    setCache((prev) => {
      const newCache = new Map();
      for (const [key, entry] of prev.entries()) {
        newCache.set(key, {
          ...entry,
          data: entry.data.filter((part) => part.id !== partId),
        });
      }
      return newCache;
    });
  }, []);

  const value = {
    fetchParts,
    fetchSubcategoryCounts,
    invalidateCache,
    removePartFromCache,
  };

  return (
    <PartsCacheContext.Provider value={value}>
      {children}
    </PartsCacheContext.Provider>
  );
};

export const usePartsCache = () => {
  const context = useContext(PartsCacheContext);
  if (!context) {
    throw new Error("usePartsCache must be used within PartsCacheProvider");
  }
  return context;
};
