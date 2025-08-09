// usePartsWithCache.js - CORRIGIDO: Sem loop de re-render
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  cachedGetDoc, 
  cachedGetDocs, 
  invalidateCache 
} from '../context/UniversalFirestoreCache.js';
import { where, orderBy, limit, startAfter } from 'firebase/firestore';

// 🎣 Hook para buscar peça única com cache
export const usePartWithCache = (partId, options = {}) => {
  const [part, setPart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ CORREÇÃO: Estabilizar options com useMemo
  const optionsStable = useMemo(() => ({
    enabled: true,
    onSuccess: null,
    onError: null,
    ...options
  }), [options.enabled]); // ✅ Apenas depende de propriedades específicas

  const { enabled, onSuccess, onError } = optionsStable;

  // ✅ CORREÇÃO: useCallback estável
  const fetchPart = useCallback(async () => {
    if (!enabled || !partId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`🎯 usePartWithCache: Buscando peça ${partId}`);
      
      const partDoc = await cachedGetDoc("pecas", partId);
      
      if (partDoc.exists()) {
        const partData = { id: partId, ...partDoc.data() };
        setPart(partData);
        
        // ✅ CORREÇÃO: Callback apenas se existir
        if (onSuccess) {
          onSuccess(partData);
        }
        
        if (partDoc.fromCache) {
          console.log(`⚡ Peça do cache: ${partId}`);
        }
      } else {
        setPart(null);
        setError("Peça não encontrada");
      }
      
    } catch (err) {
      console.error(`❌ Erro ao carregar peça ${partId}:`, err);
      setError(err.message);
      
      // ✅ CORREÇÃO: Callback apenas se existir
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [partId, enabled, onSuccess, onError]); // ✅ Dependências estáveis

  useEffect(() => {
    fetchPart();
  }, [fetchPart]);

  // ✅ CORREÇÃO: useCallback estável para refetch
  const refetch = useCallback(() => {
    invalidateCache("pecas", partId);
    fetchPart();
  }, [partId, fetchPart]);

  return {
    part,
    loading,
    error,
    refetch,
    exists: !!part
  };
};

// 🎣 Hook para buscar lista de peças com cache
export const usePartsWithCache = (filters = {}, options = {}) => {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // ✅ CORREÇÃO: Estabilizar filters
  const filtersStable = useMemo(() => ({
    categoryId: null,
    subcategoryId: null,
    searchTerm: '',
    sortBy: 'name',
    sortOrder: 'asc',
    limitCount: 50,
    enabled: true,
    ...filters
  }), [
    filters.categoryId,
    filters.subcategoryId,
    filters.searchTerm,
    filters.sortBy,
    filters.sortOrder,
    filters.limitCount,
    filters.enabled
  ]);

  // ✅ CORREÇÃO: Estabilizar options
  const optionsStable = useMemo(() => ({
    onSuccess: null,
    onError: null,
    ...options
  }), []); // Options não mudam frequentemente

  const {
    categoryId,
    subcategoryId,
    searchTerm,
    sortBy,
    sortOrder,
    limitCount,
    enabled
  } = filtersStable;

  const { onSuccess, onError } = optionsStable;

  // ✅ CORREÇÃO: useCallback estável
  const fetchParts = useCallback(async (loadMore = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      if (!loadMore) {
        setLoading(true);
        setError(null);
      }

      console.log(`🎯 usePartsWithCache: Buscando peças (loadMore: ${loadMore})`);

      const constraints = [];

      // Filtros condicionais
      if (categoryId && categoryId !== 'all') {
        constraints.push(where('categoryId', '==', categoryId));
      }

      if (subcategoryId && subcategoryId !== 'none') {
        constraints.push(where('subcategoryId', '==', subcategoryId));
      }

      // Ordenação
      if (sortBy) {
        constraints.push(orderBy(sortBy, sortOrder));
      }

      // Limite
      if (limitCount) {
        constraints.push(limit(limitCount));
      }

      const querySnapshot = await cachedGetDocs("pecas", ...constraints);
      
      let allParts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filtro de busca local (mais eficiente)
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        allParts = allParts.filter(part => 
          part.name?.toLowerCase().includes(search) ||
          part.code?.toLowerCase().includes(search) ||
          part.description?.toLowerCase().includes(search)
        );
      }

      if (loadMore) {
        setParts(prev => [...prev, ...allParts]);
      } else {
        setParts(allParts);
      }

      setHasMore(querySnapshot.docs.length === limitCount);
      
      // ✅ CORREÇÃO: Callback apenas se existir
      if (onSuccess) {
        onSuccess(allParts);
      }

      if (querySnapshot.fromCache) {
        console.log(`⚡ Lista de peças do cache (${allParts.length} itens)`);
      }

    } catch (err) {
      console.error('❌ Erro ao carregar peças:', err);
      setError(err.message);
      
      // ✅ CORREÇÃO: Callback apenas se existir
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [
    categoryId, subcategoryId, searchTerm, sortBy, sortOrder, limitCount, enabled, onSuccess, onError
  ]);

  useEffect(() => {
    fetchParts(false);
  }, [fetchParts]);

  // ✅ CORREÇÃO: useCallback estável
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchParts(true);
    }
  }, [hasMore, loading, fetchParts]);

  const refetch = useCallback(() => {
    invalidateCache("pecas");
    fetchParts(false);
  }, [fetchParts]);

  return {
    parts,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
    isEmpty: parts.length === 0
  };
};

// 🎣 Hook para invalidar cache de peças após operações
export const usePartsCacheActions = () => {
  // ✅ CORREÇÃO: useCallback estável para todas as ações
  const invalidatePart = useCallback((partId) => {
    console.log(`🗑️ Invalidando cache da peça: ${partId}`);
    invalidateCache("pecas", partId);
  }, []);

  const invalidateAllParts = useCallback(() => {
    console.log(`🗑️ Invalidando cache de todas as peças`);
    invalidateCache("pecas");
  }, []);

  const invalidatePartsByCategory = useCallback((categoryId) => {
    console.log(`🗑️ Invalidando cache de peças da categoria: ${categoryId}`);
    // Como não temos invalidação específica por categoria, invalidamos tudo
    invalidateCache("pecas");
  }, []);

  return {
    invalidatePart,
    invalidateAllParts,
    invalidatePartsByCategory
  };
};

// 🎣 Hook para estatísticas de cache de peças
export const usePartsCacheStats = () => {
  const [stats, setStats] = useState({
    totalCached: 0,
    cacheHitRate: 0,
    lastUpdate: null
  });

  // ✅ CORREÇÃO: useRef para interval
  const intervalRef = useRef(null);

  useEffect(() => {
    const updateStats = () => {
      // Placeholder - pode ser implementado quando necessário
      setStats({
        totalCached: 0,
        cacheHitRate: 0,
        lastUpdate: new Date()
      });
    };

    updateStats();
    
    // ✅ CORREÇÃO: useRef para controlar interval
    intervalRef.current = setInterval(updateStats, 30000); // 30s

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return stats;
};