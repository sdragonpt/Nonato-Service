// PartsCache.jsx - SILENT & FAST: Zero logs + Performance otimizada

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "../firebase.jsx";

const PartsCacheContext = createContext(null);

export const PartsCacheProvider = ({ children }) => {
  // ✅ CACHE MAPS - Otimizados
  const [partsCache, setPartsCache] = useState(new Map());
  const [countsCache, setCountsCache] = useState(new Map());
  const [loadingStates, setLoadingStates] = useState(new Map());

  const CACHE_DURATION = 15 * 60 * 1000; // ✅ 15 minutos (reduzido de 10)
  const ITEMS_PER_PAGE = 20;
  const MAX_CACHE_ENTRIES = 50; // ✅ Limite de entradas em cache

  // ✅ CACHE KEY - Simplificado
  const getCacheKey = useCallback((categoryId, subcategoryId, searchTerm) => {
    return `${categoryId || "all"}-${subcategoryId || "none"}-${
      searchTerm || "nosearch"
    }`;
  }, []);

  // ✅ CACHE VÁLIDO - Otimizado
  const isCacheValid = useCallback(
    (cacheEntry) => {
      return (
        cacheEntry?.lastFetch &&
        Date.now() - cacheEntry.lastFetch < CACHE_DURATION
      );
    },
    [CACHE_DURATION]
  );

  // ✅ CLEANUP AUTOMÁTICO - Mantém cache pequeno
  const cleanupCache = useCallback(() => {
    if (partsCache.size <= MAX_CACHE_ENTRIES) return;

    const entries = Array.from(partsCache.entries())
      .sort((a, b) => b[1].lastFetch - a[1].lastFetch) // Mais recentes primeiro
      .slice(0, MAX_CACHE_ENTRIES);

    setPartsCache(new Map(entries));
  }, [partsCache.size]);

  // ✅ FETCH SUBCATEGORY COUNTS - Simplificado
  const fetchSubcategoryCounts = useCallback(
    async (categoryId) => {
      const cacheKey = `counts-${categoryId}`;
      const cached = countsCache.get(cacheKey);

      if (cached && isCacheValid(cached)) {
        return cached.data;
      }

      try {
        const countsQuery = query(
          collection(db, "pecas"),
          where("categoryId", "==", categoryId)
        );

        const snapshot = await getDocs(countsQuery);
        const counts = {};

        snapshot.docs.forEach((doc) => {
          const subcategoryId = doc.data().subcategoryId || "sem-subcategoria";
          counts[subcategoryId] = (counts[subcategoryId] || 0) + 1;
        });

        setCountsCache((prev) =>
          new Map(prev).set(cacheKey, {
            data: counts,
            lastFetch: Date.now(),
          })
        );

        return counts;
      } catch (error) {
        return {};
      }
    },
    [countsCache, isCacheValid]
  );

  // ✅ FETCH PARTS - Ultra otimizado
  const fetchParts = useCallback(
    async ({
      categoryId = null,
      subcategoryId = null,
      searchTerm = "",
      sortField = "name",
      sortOrder = "asc",
      loadMore = false,
    }) => {
      const cacheKey = getCacheKey(categoryId, subcategoryId, searchTerm);
      const cached = partsCache.get(cacheKey);

      // Cache hit para busca normal
      if (!loadMore && cached && isCacheValid(cached)) {
        return {
          parts: cached.parts,
          hasMore: cached.hasMore,
          fromCache: true,
        };
      }

      // LoadMore sem cache é erro
      if (loadMore && !cached) {
        return { parts: [], hasMore: false, fromCache: false };
      }

      try {
        setLoadingStates((prev) => new Map(prev).set(cacheKey, true));

        // Construir query base
        let q = query(collection(db, "pecas"));

        // Aplicar filtros
        if (categoryId && categoryId !== "all") {
          q = query(q, where("categoryId", "==", categoryId));
        }
        if (subcategoryId && subcategoryId !== "none") {
          q = query(q, where("subcategoryId", "==", subcategoryId));
        }

        // ✅ BUSCA OTIMIZADA
        if (searchTerm) {
          // Para busca, buscar todos e filtrar localmente (mais eficiente)
          try {
            q = query(q, orderBy(sortField, sortOrder));
          } catch {
            // Fallback sem ordenação
          }

          const searchSnapshot = await getDocs(q);
          const allParts = searchSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          const filteredParts = allParts.filter((part) => {
            const searchLower = searchTerm.toLowerCase();
            return (
              part.name?.toLowerCase().includes(searchLower) ||
              part.code?.toLowerCase().includes(searchLower) ||
              part.description?.toLowerCase().includes(searchLower)
            );
          });

          const newCacheEntry = {
            parts: filteredParts,
            hasMore: false,
            lastVisible: null,
            lastFetch: Date.now(),
          };

          setPartsCache((prev) => new Map(prev).set(cacheKey, newCacheEntry));
          setLoadingStates((prev) => new Map(prev).set(cacheKey, false));

          // Cleanup automático
          setTimeout(cleanupCache, 100);

          return {
            parts: filteredParts,
            hasMore: false,
            fromCache: false,
          };
        }

        // ✅ QUERY NORMAL com paginação
        try {
          q = query(q, orderBy(sortField, sortOrder));
        } catch {
          // Continuar sem ordenação
        }

        if (loadMore && cached?.lastVisible) {
          q = query(q, startAfter(cached.lastVisible));
        }

        q = query(q, limit(ITEMS_PER_PAGE));

        const snapshot = await getDocs(q);
        const newParts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const existingParts = loadMore && cached ? cached.parts : [];
        const allParts = [...existingParts, ...newParts];
        const hasMore = snapshot.docs.length === ITEMS_PER_PAGE;
        const lastVisible =
          snapshot.docs.length > 0
            ? snapshot.docs[snapshot.docs.length - 1]
            : null;

        const newCacheEntry = {
          parts: allParts,
          hasMore,
          lastVisible,
          lastFetch: Date.now(),
        };

        setPartsCache((prev) => new Map(prev).set(cacheKey, newCacheEntry));
        setLoadingStates((prev) => new Map(prev).set(cacheKey, false));

        // Cleanup automático
        setTimeout(cleanupCache, 100);

        return {
          parts: allParts,
          hasMore,
          fromCache: false,
        };
      } catch (error) {
        setLoadingStates((prev) => new Map(prev).set(cacheKey, false));

        // Fallback para cache se houver erro
        if (cached) {
          return {
            parts: cached.parts,
            hasMore: cached.hasMore,
            fromCache: true,
            error: "Erro ao buscar. Mostrando cache.",
          };
        }

        return {
          parts: [],
          hasMore: false,
          fromCache: false,
          error: "Erro ao carregar peças.",
        };
      }
    },
    [partsCache, getCacheKey, isCacheValid, ITEMS_PER_PAGE, cleanupCache]
  );

  // ✅ IS LOADING - Direto
  const isLoading = useCallback(
    (categoryId, subcategoryId, searchTerm) => {
      const cacheKey = getCacheKey(categoryId, subcategoryId, searchTerm);
      return loadingStates.get(cacheKey) || false;
    },
    [loadingStates, getCacheKey]
  );

  // ✅ GET CACHED PARTS - Direto
  const getCachedParts = useCallback(
    (categoryId, subcategoryId, searchTerm) => {
      const cacheKey = getCacheKey(categoryId, subcategoryId, searchTerm);
      const cached = partsCache.get(cacheKey);

      if (cached && isCacheValid(cached)) {
        return {
          parts: cached.parts,
          hasMore: cached.hasMore,
          isValid: true,
        };
      }

      return {
        parts: [],
        hasMore: true,
        isValid: false,
      };
    },
    [partsCache, getCacheKey, isCacheValid]
  );

  // ✅ INVALIDATE CACHE - Simplificado
  const invalidateCache = useCallback(
    (categoryId, subcategoryId) => {
      const keysToRemove = [];

      for (const key of partsCache.keys()) {
        const [keyCat, keySub] = key.split("-");

        if (!categoryId || keyCat === categoryId || keyCat === "all") {
          if (!subcategoryId || keySub === subcategoryId || keySub === "none") {
            keysToRemove.push(key);
          }
        }
      }

      setPartsCache((prev) => {
        const newCache = new Map(prev);
        keysToRemove.forEach((key) => newCache.delete(key));
        return newCache;
      });

      // Invalidar contadores
      if (categoryId) {
        setCountsCache((prev) => {
          const newCache = new Map(prev);
          newCache.delete(`counts-${categoryId}`);
          return newCache;
        });
      }
    },
    [partsCache]
  );

  // ✅ ADD PART TO CACHE - Otimizado
  const addPartToCache = useCallback((newPart) => {
    setPartsCache((prev) => {
      const newCache = new Map();

      for (const [key, entry] of prev.entries()) {
        const [keyCat, keySub, keySearch] = key.split("-");

        const shouldInclude =
          (keyCat === "all" || keyCat === newPart.categoryId) &&
          (keySub === "none" || keySub === newPart.subcategoryId) &&
          (keySearch === "nosearch" ||
            newPart.name?.toLowerCase().includes(keySearch.toLowerCase()) ||
            newPart.code?.toLowerCase().includes(keySearch.toLowerCase()));

        if (shouldInclude) {
          newCache.set(key, {
            ...entry,
            parts: [newPart, ...entry.parts],
          });
        } else {
          newCache.set(key, entry);
        }
      }

      return newCache;
    });

    // Invalidar contadores
    if (newPart.categoryId) {
      setCountsCache((prev) => {
        const newCache = new Map(prev);
        newCache.delete(`counts-${newPart.categoryId}`);
        return newCache;
      });
    }
  }, []);

  // ✅ REMOVE PART FROM CACHE - Otimizado
  const removePartFromCache = useCallback((partId) => {
    setPartsCache((prev) => {
      const newCache = new Map();

      for (const [key, entry] of prev.entries()) {
        newCache.set(key, {
          ...entry,
          parts: entry.parts.filter((part) => part.id !== partId),
        });
      }

      return newCache;
    });

    setCountsCache(new Map()); // Invalidar todos os contadores
  }, []);

  // ✅ UPDATE PART IN CACHE - Otimizado
  const updatePartInCache = useCallback((partId, updatedData) => {
    setPartsCache((prev) => {
      const newCache = new Map();

      for (const [key, entry] of prev.entries()) {
        newCache.set(key, {
          ...entry,
          parts: entry.parts.map((part) =>
            part.id === partId ? { ...part, ...updatedData } : part
          ),
        });
      }

      return newCache;
    });

    if (updatedData.categoryId) {
      setCountsCache(new Map());
    }
  }, []);

  // ✅ STATS - Simplificadas
  const getCacheStats = useCallback(
    () => ({
      totalCacheEntries: partsCache.size,
      totalCountEntries: countsCache.size,
      loadingEntries: Array.from(loadingStates.values()).filter(Boolean).length,
    }),
    [partsCache.size, countsCache.size, loadingStates]
  );

  // ✅ CONTEXT VALUE - Memoizado
  const contextValue = useMemo(
    () => ({
      fetchParts,
      fetchSubcategoryCounts,
      getCachedParts,
      isLoading,
      invalidateCache,
      addPartToCache,
      removePartFromCache,
      updatePartInCache,
      getCacheStats,
    }),
    [
      fetchParts,
      fetchSubcategoryCounts,
      getCachedParts,
      isLoading,
      invalidateCache,
      addPartToCache,
      removePartFromCache,
      updatePartInCache,
      getCacheStats,
    ]
  );

  return (
    <PartsCacheContext.Provider value={contextValue}>
      {children}
    </PartsCacheContext.Provider>
  );
};

// ✅ HOOK - Otimizado
export const usePartsCache = () => {
  const context = useContext(PartsCacheContext);

  if (!context) {
    throw new Error("usePartsCache must be used within PartsCacheProvider");
  }

  return context;
};

export default PartsCacheProvider;
