// useUniversalCache.js - CORRIGIDO: Sem loop de re-render
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  cachedGetDoc, 
  cachedGetDocs, 
  invalidateCache, 
  getCacheStats 
} from '../context/UniversalFirestoreCache.js';
import { where, orderBy, limit, startAfter } from 'firebase/firestore';

// 🎣 Hook principal para cache universal
export const useUniversalCache = () => {
  const [stats, setStats] = useState(() => getCacheStats()); // ✅ Lazy initial state
  const intervalRef = useRef(null);

  // ✅ CORREÇÃO: Atualizar stats apenas quando necessário
  useEffect(() => {
    const updateStats = () => {
      try {
        setStats(getCacheStats());
      } catch (error) {
        console.warn('Erro ao obter stats do cache:', error);
      }
    };

    // Interval com ref para controle
    intervalRef.current = setInterval(updateStats, 5000); // Aumentado para 5s

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // ✅ Sem dependências, executa uma vez

  // ✅ CORREÇÃO: useCallback para estabilizar função
  const invalidate = useCallback((collection, docId = null) => {
    invalidateCache(collection, docId);
    // Atualizar stats imediatamente após invalidação
    setStats(getCacheStats());
  }, []);

  return {
    stats,
    invalidate,
    cachedGetDoc,
    cachedGetDocs
  };
};

// 🎣 Hook para buscar documento único com cache
export const useCachedDocument = (collection, documentId, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ CORREÇÃO: Destructure options com default estável
  const optionsStable = useMemo(() => ({
    enabled: true,
    onSuccess: null,
    onError: null,
    refetchInterval: null,
    ...options
  }), [options.enabled, options.refetchInterval]); // ✅ Apenas depende de propriedades específicas

  const { enabled, onSuccess, onError, refetchInterval } = optionsStable;

  // ✅ CORREÇÃO: useCallback para estabilizar fetchDocument
  const fetchDocument = useCallback(async () => {
    if (!enabled || !collection || !documentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`🎣 useCachedDocument: Buscando ${collection}/${documentId}`);
      
      const doc = await cachedGetDoc(collection, documentId);
      
      if (doc.exists()) {
        const docData = { id: documentId, ...doc.data() };
        setData(docData);
        
        // ✅ CORREÇÃO: Chamar callback apenas se existir
        if (onSuccess) {
          onSuccess(docData);
        }
        
        if (doc.fromCache) {
          console.log(`⚡ Hook cache hit: ${collection}/${documentId}`);
        }
      } else {
        setData(null);
        console.log(`❌ Documento não encontrado: ${collection}/${documentId}`);
      }
      
    } catch (err) {
      console.error(`❌ Erro no hook ${collection}/${documentId}:`, err);
      setError(err.message);
      
      // ✅ CORREÇÃO: Chamar callback apenas se existir
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [collection, documentId, enabled, onSuccess, onError]); // ✅ Dependências estáveis

  // ✅ CORREÇÃO: Fetch inicial apenas quando dependências mudam
  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  // ✅ CORREÇÃO: Refetch periódico com cleanup adequado
  useEffect(() => {
    if (!refetchInterval) return;

    const interval = setInterval(fetchDocument, refetchInterval);
    return () => clearInterval(interval);
  }, [fetchDocument, refetchInterval]);

  // ✅ CORREÇÃO: useCallback estável para refetch
  const refetch = useCallback(() => {
    // Invalidar cache e buscar novamente
    invalidateCache(collection, documentId);
    fetchDocument();
  }, [collection, documentId, fetchDocument]);

  return {
    data,
    loading,
    error,
    refetch,
    exists: !!data
  };
};

// 🎣 Hook para buscar coleção com cache
export const useCachedCollection = (collection, queryOptions = {}, options = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ CORREÇÃO: Estabilizar options
  const optionsStable = useMemo(() => ({
    enabled: true,
    onSuccess: null,
    onError: null,
    refetchInterval: null,
    ...options
  }), [options.enabled, options.refetchInterval]); // Apenas propriedades específicas

  const { enabled, onSuccess, onError, refetchInterval } = optionsStable;

  // ✅ CORREÇÃO: Estabilizar queryOptions
  const queryOptionsStable = useMemo(() => ({
    where: null,
    orderBy: null,
    limit: null,
    startAfter: null,
    ...queryOptions
  }), [
    JSON.stringify(queryOptions.where),
    JSON.stringify(queryOptions.orderBy),
    queryOptions.limit,
    queryOptions.startAfter
  ]); // ✅ Serializar objetos complexos

  const { where: whereClause, orderBy: orderByClause, limit: limitClause, startAfter: startAfterClause } = queryOptionsStable;

  // ✅ CORREÇÃO: useCallback estável
  const fetchCollection = useCallback(async () => {
    if (!enabled || !collection) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const constraints = [];

      // Construir constraints
      if (whereClause) {
        if (Array.isArray(whereClause[0])) {
          // Múltiplos where
          whereClause.forEach(([field, operator, value]) => {
            constraints.push(where(field, operator, value));
          });
        } else {
          // Single where
          constraints.push(where(...whereClause));
        }
      }

      if (orderByClause) {
        if (Array.isArray(orderByClause[0])) {
          // Múltiplos orderBy
          orderByClause.forEach(([field, direction]) => {
            constraints.push(orderBy(field, direction));
          });
        } else {
          // Single orderBy
          constraints.push(orderBy(...orderByClause));
        }
      }

      if (limitClause) {
        constraints.push(limit(limitClause));
      }

      if (startAfterClause) {
        constraints.push(startAfter(startAfterClause));
      }

      console.log(`🎣 useCachedCollection: Buscando ${collection} (${constraints.length} constraints)`);

      const querySnapshot = await cachedGetDocs(collection, ...constraints);
      
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setData(docs);
      
      // ✅ CORREÇÃO: Callback apenas se existir
      if (onSuccess) {
        onSuccess(docs);
      }

      if (querySnapshot.fromCache) {
        console.log(`⚡ Hook query cache hit: ${collection}`);
      }

    } catch (err) {
      console.error(`❌ Erro na query ${collection}:`, err);
      setError(err.message);
      
      // ✅ CORREÇÃO: Callback apenas se existir
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [collection, whereClause, orderByClause, limitClause, startAfterClause, enabled, onSuccess, onError]);

  // Fetch inicial
  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  // Refetch periódico
  useEffect(() => {
    if (!refetchInterval) return;

    const interval = setInterval(fetchCollection, refetchInterval);
    return () => clearInterval(interval);
  }, [fetchCollection, refetchInterval]);

  // ✅ CORREÇÃO: useCallback estável
  const refetch = useCallback(() => {
    invalidateCache(collection);
    fetchCollection();
  }, [collection, fetchCollection]);

  return {
    data,
    loading,
    error,
    refetch,
    isEmpty: data.length === 0
  };
};

// 🎣 Hook para buscar peças com cache otimizado
export const useCachedParts = (filters = {}) => {
  // ✅ CORREÇÃO: Estabilizar filters
  const filtersStable = useMemo(() => ({
    categoryId: null,
    subcategoryId: null,
    searchTerm: '',
    sortBy: 'name',
    limit: 50,
    ...filters
  }), [
    filters.categoryId,
    filters.subcategoryId,
    filters.searchTerm,
    filters.sortBy,
    filters.limit
  ]);

  const { categoryId, subcategoryId, searchTerm, sortBy, limit: limitCount } = filtersStable;

  // ✅ CORREÇÃO: Memoizar queryOptions
  const queryOptions = useMemo(() => {
    const options = {
      where: [],
      orderBy: [sortBy, 'asc'],
      limit: limitCount
    };

    // Adicionar filtros condicionalmente
    if (categoryId && categoryId !== 'all') {
      options.where.push(['categoryId', '==', categoryId]);
    }

    if (subcategoryId && subcategoryId !== 'none') {
      options.where.push(['subcategoryId', '==', subcategoryId]);
    }

    return options;
  }, [categoryId, subcategoryId, sortBy, limitCount]);

  const result = useCachedCollection('pecas', queryOptions, {
    enabled: true
  });

  // ✅ CORREÇÃO: Memoizar filteredData
  const filteredData = useMemo(() => {
    if (!searchTerm) return result.data;
    
    const search = searchTerm.toLowerCase();
    return result.data.filter(part => 
      part.name?.toLowerCase().includes(search) ||
      part.code?.toLowerCase().includes(search) ||
      part.description?.toLowerCase().includes(search)
    );
  }, [result.data, searchTerm]);

  return {
    ...result,
    data: filteredData,
    totalCount: result.data.length,
    filteredCount: filteredData.length
  };
};

// 🎣 Hook para buscar categorias com cache
export const useCachedCategories = () => {
  return useCachedCollection('categorias', {
    orderBy: ['name', 'asc']
  }, {
    refetchInterval: 5 * 60 * 1000 // 5 minutos
  });
};

// 🎣 Hook para buscar cliente específico
export const useCachedClient = (clientId) => {
  return useCachedDocument('clients', clientId, {
    enabled: !!clientId
  });
};

// 🎣 Hook para buscar orçamentos
export const useCachedBudgets = (status = null) => {
  // ✅ CORREÇÃO: Memoizar queryOptions
  const queryOptions = useMemo(() => {
    const options = {
      orderBy: ['createdAt', 'desc'],
      limit: 100
    };

    if (status) {
      options.where = ['status', '==', status];
    }

    return options;
  }, [status]);

  return useCachedCollection('budgets', queryOptions);
};

// 🎣 Hook para monitorar performance
export const useCachePerformance = () => {
  const [performance, setPerformance] = useState({
    readsSaved: 0,
    timeSaved: 0,
    hitRate: 0
  });

  // ✅ CORREÇÃO: useCallback estável
  const handleFirestoreRead = useCallback((event) => {
    setPerformance(prev => ({
      ...prev,
      readsSaved: prev.readsSaved + 1
    }));
  }, []);

  useEffect(() => {
    window.addEventListener('firestore-read', handleFirestoreRead);
    return () => window.removeEventListener('firestore-read', handleFirestoreRead);
  }, [handleFirestoreRead]);

  // ✅ CORREÇÃO: Interval com cleanup adequado
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = getCacheStats();
      setPerformance(prev => ({
        ...prev,
        hitRate: stats.hitRate
      }));
    }, 10000); // 10 segundos

    return () => clearInterval(interval);
  }, []);

  return performance;
};