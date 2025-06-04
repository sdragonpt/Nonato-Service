// PartsCache.jsx - CORRIGIDO: Sistema de cache inteligente para peças

import React, { createContext, useContext, useState, useCallback } from "react";
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

// ✅ CORRIGIR: Criar contexto corretamente
const PartsCacheContext = createContext(null);

export const PartsCacheProvider = ({ children }) => {
  // ✅ CACHE ESTRUTURADO por categoria/subcategoria
  const [partsCache, setPartsCache] = useState(new Map());
  const [countsCache, setCountsCache] = useState(new Map());
  const [loadingStates, setLoadingStates] = useState(new Map());

  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos
  const ITEMS_PER_PAGE = 20;

  // ✅ FUNÇÃO PARA GERAR CHAVE DO CACHE
  const getCacheKey = useCallback(
    (categoryId = null, subcategoryId = null, searchTerm = "") => {
      const parts = [
        categoryId || "all",
        subcategoryId || "none",
        searchTerm || "nosearch",
      ];
      return parts.join("-");
    },
    []
  );

  // ✅ VERIFICAR SE CACHE É VÁLIDO
  const isCacheValid = useCallback(
    (cacheEntry) => {
      if (!cacheEntry || !cacheEntry.lastFetch) return false;
      return Date.now() - cacheEntry.lastFetch < CACHE_DURATION;
    },
    [CACHE_DURATION]
  );

  // ✅ BUSCAR CONTADORES DE PEÇAS POR SUBCATEGORIA (query rápida)
  const fetchSubcategoryCounts = useCallback(
    async (categoryId) => {
      const cacheKey = `counts-${categoryId}`;

      // Verificar cache de contadores
      const cached = countsCache.get(cacheKey);
      if (cached && isCacheValid(cached)) {
        console.log(
          `💾 Usando cache de contadores para categoria: ${categoryId}`
        );
        return cached.data;
      }

      try {
        console.log(`📊 Buscando contadores para categoria ${categoryId}...`);

        // Query para buscar contadores por subcategoria
        const countsQuery = query(
          collection(db, "pecas"),
          where("categoryId", "==", categoryId)
        );

        const snapshot = await getDocs(countsQuery);
        const counts = new Map();

        // Contar peças por subcategoria
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const subcategoryId = data.subcategoryId || "sem-subcategoria";
          counts.set(subcategoryId, (counts.get(subcategoryId) || 0) + 1);
        });

        const countsData = Object.fromEntries(counts);

        // Salvar no cache
        setCountsCache((prev) =>
          new Map(prev).set(cacheKey, {
            data: countsData,
            lastFetch: Date.now(),
          })
        );

        console.log(`✅ Contadores carregados:`, countsData);
        return countsData;
      } catch (error) {
        console.error("❌ Erro ao buscar contadores:", error);
        return {};
      }
    },
    [countsCache, isCacheValid]
  );

  // ✅ BUSCAR PEÇAS COM CACHE INTELIGENTE
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

      // Verificar cache existente
      const cached = partsCache.get(cacheKey);

      // Se tem cache válido e não é loadMore, retornar cache
      if (!loadMore && cached && isCacheValid(cached)) {
        console.log(`💾 Usando cache para: ${cacheKey}`);
        return {
          parts: cached.parts,
          hasMore: cached.hasMore,
          fromCache: true,
        };
      }

      // Se é loadMore mas não tem cache, é erro
      if (loadMore && !cached) {
        console.warn("⚠️ Tentativa de loadMore sem cache existente");
        return { parts: [], hasMore: false, fromCache: false };
      }

      try {
        // Marcar como carregando
        setLoadingStates((prev) => new Map(prev).set(cacheKey, true));

        console.log(
          `🔄 Buscando peças para: ${cacheKey}${loadMore ? " (load more)" : ""}`
        );

        // Construir query
        let q = query(collection(db, "pecas"));

        // Aplicar filtros
        if (categoryId && categoryId !== "all") {
          q = query(q, where("categoryId", "==", categoryId));
        }
        if (subcategoryId && subcategoryId !== "none") {
          q = query(q, where("subcategoryId", "==", subcategoryId));
        }

        // ✅ LÓGICA DE BUSCA OTIMIZADA
        if (searchTerm) {
          // Para busca, buscar todos e filtrar localmente
          try {
            const searchQuery = query(q, orderBy(sortField, sortOrder));
            const searchSnapshot = await getDocs(searchQuery);

            const allParts = searchSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            const filteredParts = allParts.filter(
              (part) =>
                part.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                part.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                part.description
                  ?.toLowerCase()
                  .includes(searchTerm.toLowerCase())
            );

            // Salvar no cache
            const newCacheEntry = {
              parts: filteredParts,
              hasMore: false,
              lastVisible: null,
              lastFetch: Date.now(),
            };

            setPartsCache((prev) => new Map(prev).set(cacheKey, newCacheEntry));
            setLoadingStates((prev) => new Map(prev).set(cacheKey, false));

            return {
              parts: filteredParts,
              hasMore: false,
              fromCache: false,
            };
          } catch (orderError) {
            // Fallback sem ordenação para busca
            console.warn("⚠️ Fallback para busca sem ordenação:", orderError);
            const fallbackQuery = query(q);
            const fallbackSnapshot = await getDocs(fallbackQuery);

            const allParts = fallbackSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            const filteredParts = allParts.filter(
              (part) =>
                part.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                part.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                part.description
                  ?.toLowerCase()
                  .includes(searchTerm.toLowerCase())
            );

            const newCacheEntry = {
              parts: filteredParts,
              hasMore: false,
              lastVisible: null,
              lastFetch: Date.now(),
            };

            setPartsCache((prev) => new Map(prev).set(cacheKey, newCacheEntry));
            setLoadingStates((prev) => new Map(prev).set(cacheKey, false));

            return {
              parts: filteredParts,
              hasMore: false,
              fromCache: false,
              warning: "Busca sem ordenação (índice não disponível)",
            };
          }
        }

        // Aplicar ordenação e paginação para dados normais
        try {
          q = query(q, orderBy(sortField, sortOrder));
        } catch (orderError) {
          console.warn("⚠️ Fallback sem ordenação:", orderError);
          // Continuar sem ordenação
        }

        // Para loadMore, usar cursor do cache
        if (loadMore && cached?.lastVisible) {
          q = query(q, startAfter(cached.lastVisible));
        }

        q = query(q, limit(ITEMS_PER_PAGE));

        const snapshot = await getDocs(q);
        const newParts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log(`📦 ${newParts.length} peças carregadas`);

        // Atualizar cache
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

        return {
          parts: allParts,
          hasMore,
          fromCache: false,
        };
      } catch (error) {
        console.error("❌ Erro ao buscar peças:", error);
        setLoadingStates((prev) => new Map(prev).set(cacheKey, false));

        // Retornar cache se houver erro
        if (cached) {
          return {
            parts: cached.parts,
            hasMore: cached.hasMore,
            fromCache: true,
            error: "Erro ao buscar novas peças. Mostrando dados em cache.",
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
    [partsCache, getCacheKey, isCacheValid, ITEMS_PER_PAGE]
  );

  // ✅ VERIFICAR SE ESTÁ CARREGANDO
  const isLoading = useCallback(
    (categoryId = null, subcategoryId = null, searchTerm = "") => {
      const cacheKey = getCacheKey(categoryId, subcategoryId, searchTerm);
      return loadingStates.get(cacheKey) || false;
    },
    [loadingStates, getCacheKey]
  );

  // ✅ OBTER PEÇAS DO CACHE (sem fazer requisição)
  const getCachedParts = useCallback(
    (categoryId = null, subcategoryId = null, searchTerm = "") => {
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

  // ✅ INVALIDAR CACHE ESPECÍFICO
  const invalidateCache = useCallback(
    (categoryId = null, subcategoryId = null) => {
      console.log(
        `🧹 Invalidando cache para categoria: ${categoryId}, subcategoria: ${subcategoryId}`
      );

      // Remover entradas relacionadas
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

      // Invalidar contadores também
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

  // ✅ ADICIONAR PEÇA AO CACHE
  const addPartToCache = useCallback((newPart) => {
    console.log(`➕ Adicionando peça ao cache: ${newPart.name}`);

    // Atualizar todas as entradas relevantes do cache
    setPartsCache((prev) => {
      const newCache = new Map();

      for (const [key, entry] of prev.entries()) {
        const [keyCat, keySub, keySearch] = key.split("-");

        let shouldInclude = false;

        // Verificar se a peça se encaixa neste cache
        if (keyCat === "all" || keyCat === newPart.categoryId) {
          if (keySub === "none" || keySub === newPart.subcategoryId) {
            if (
              keySearch === "nosearch" ||
              newPart.name?.toLowerCase().includes(keySearch.toLowerCase()) ||
              newPart.code?.toLowerCase().includes(keySearch.toLowerCase())
            ) {
              shouldInclude = true;
            }
          }
        }

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

  // ✅ REMOVER PEÇA DO CACHE
  const removePartFromCache = useCallback((partId) => {
    console.log(`➖ Removendo peça do cache: ${partId}`);

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

    // Invalidar todos os contadores (mais simples)
    setCountsCache(new Map());
  }, []);

  // ✅ ATUALIZAR PEÇA NO CACHE
  const updatePartInCache = useCallback((partId, updatedData) => {
    console.log(`🔄 Atualizando peça no cache: ${partId}`);

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

    // Se mudou categoria, invalidar contadores
    if (updatedData.categoryId) {
      setCountsCache(new Map());
    }
  }, []);

  // ✅ STATS DO CACHE
  const getCacheStats = useCallback(() => {
    return {
      totalCacheEntries: partsCache.size,
      totalCountEntries: countsCache.size,
      loadingEntries: Array.from(loadingStates.entries()).filter(
        ([key, value]) => value
      ).length,
      cacheKeys: Array.from(partsCache.keys()),
    };
  }, [partsCache, countsCache, loadingStates]);

  // ✅ CONTEXTO VALUE
  const contextValue = {
    // Funções principais
    fetchParts,
    fetchSubcategoryCounts,
    getCachedParts,
    isLoading,

    // Gerenciamento de cache
    invalidateCache,
    addPartToCache,
    removePartFromCache,
    updatePartInCache,

    // Debug
    getCacheStats,

    // Estado interno (para debug)
    _debug: {
      partsCache: partsCache.size,
      countsCache: countsCache.size,
      loadingStates: loadingStates.size,
    },
  };

  return (
    <PartsCacheContext.Provider value={contextValue}>
      {children}
    </PartsCacheContext.Provider>
  );
};

// ✅ HOOK CORRIGIDO - Melhor error handling
export const usePartsCache = () => {
  const context = useContext(PartsCacheContext);

  if (!context) {
    throw new Error(
      "usePartsCache must be used within PartsCacheProvider. Verifique se o componente está envolvido pelo PartsCacheProvider no App.jsx."
    );
  }

  return context;
};
