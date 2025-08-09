// usePublicShopCache.js - Cache específico para loja pública
import { useState, useEffect, useCallback } from 'react';
import { 
  cachedGetDoc, 
  cachedGetDocs, 
  invalidateCache 
} from '../context/UniversalFirestoreCache.js';
import { where, orderBy, limit } from 'firebase/firestore';

// 🎣 Hook para buscar peças na loja pública com cache
export const usePublicShopParts = (filters = {}) => {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const {
    categoryId,
    subcategoryId,
    searchTerm,
    sortBy = 'name',
    limitCount = 20,
    enabled = true
  } = filters;

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

      console.log(`🏪 PublicShop: Buscando peças (cache 30 dias)`);

      const constraints = [];

      // Filtros da loja pública
      if (categoryId && categoryId !== 'all') {
        constraints.push(where('categoryId', '==', categoryId));
      }

      if (subcategoryId && subcategoryId !== 'all') {
        constraints.push(where('subcategoryId', '==', subcategoryId));
      }

      // Ordenação
      constraints.push(orderBy(sortBy, 'asc'));

      // Limite para loja pública (páginas menores)
      constraints.push(limit(limitCount));

      const querySnapshot = await cachedGetDocs("pecas", ...constraints);
      
      let allParts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filtro de busca local (otimizado para loja)
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

      setHasMore(querySnapshot.docs.length === limitCount && !searchTerm);

      if (querySnapshot.fromCache) {
        console.log(`⚡ Loja: Peças do cache (${allParts.length} itens)`);
      }

    } catch (err) {
      console.error('❌ Erro na loja pública:', err);
      setError(err.message || "Erro ao carregar peças");
    } finally {
      setLoading(false);
    }
  }, [categoryId, subcategoryId, searchTerm, sortBy, limitCount, enabled]);

  useEffect(() => {
    fetchParts(false);
  }, [fetchParts]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchParts(true);
    }
  }, [hasMore, loading, fetchParts]);

  const refetch = useCallback(() => {
    // Não invalidar cache na loja pública (dados estáticos)
    // invalidateCache("pecas");
    fetchParts(false);
  }, [fetchParts]);

  return {
    parts,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
    isEmpty: parts.length === 0,
    totalCount: parts.length
  };
};

// 🎣 Hook para contadores de subcategorias na loja
export const usePublicShopCategoryCounts = (categoryId) => {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    if (!categoryId || categoryId === 'all') {
      setCounts({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      console.log(`🏪 Buscando contadores para categoria: ${categoryId}`);

      // Buscar todas as peças da categoria (com cache)
      const constraints = [where('categoryId', '==', categoryId)];
      const querySnapshot = await cachedGetDocs("pecas", ...constraints);

      const countsMap = {};
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const subcategoryId = data.subcategoryId || 'sem-subcategoria';
        countsMap[subcategoryId] = (countsMap[subcategoryId] || 0) + 1;
      });

      setCounts(countsMap);

      if (querySnapshot.fromCache) {
        console.log(`⚡ Contadores do cache para ${categoryId}`);
      }

    } catch (err) {
      console.error('❌ Erro ao buscar contadores:', err);
      setCounts({});
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return { counts, loading };
};

// 🎣 Hook para tokens de acesso da loja (cache 30 dias)
export const useShopAccessToken = (tokenId) => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchToken = useCallback(async () => {
    if (!tokenId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`🏪 Verificando token de acesso: ${tokenId}`);

      const tokenDoc = await cachedGetDoc("shop_access_tokens", tokenId);
      
      if (tokenDoc.exists()) {
        setToken({ id: tokenId, ...tokenDoc.data() });
        
        if (tokenDoc.fromCache) {
          console.log(`⚡ Token do cache: ${tokenId}`);
        }
      } else {
        setToken(null);
        setError("Token não encontrado");
      }

    } catch (err) {
      console.error(`❌ Erro ao verificar token:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tokenId]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  const refetch = useCallback(() => {
    invalidateCache("shop_access_tokens", tokenId);
    fetchToken();
  }, [tokenId, fetchToken]);

  return {
    token,
    loading,
    error,
    refetch,
    isValid: token?.status === 'active' && token?.accessStatus === 'approved'
  };
};

// 🎣 Hook para orçamentos online da loja (cache 30 dias)
export const useOnlineQuotes = (filters = {}) => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { status, limit: limitCount = 50, enabled = true } = filters;

  const fetchQuotes = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`🏪 Buscando orçamentos online (cache 30 dias)`);

      const constraints = [];

      if (status) {
        constraints.push(where('status', '==', status));
      }

      // Ordenar por data (mais recentes primeiro)
      constraints.push(orderBy('createdAt', 'desc'));
      constraints.push(limit(limitCount));

      const querySnapshot = await cachedGetDocs("orcamentos-online", ...constraints);
      
      const allQuotes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setQuotes(allQuotes);

      if (querySnapshot.fromCache) {
        console.log(`⚡ Orçamentos do cache (${allQuotes.length} itens)`);
      }

    } catch (err) {
      console.error('❌ Erro ao carregar orçamentos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status, limitCount, enabled]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const refetch = useCallback(() => {
    invalidateCache("orcamentos-online");
    fetchQuotes();
  }, [fetchQuotes]);

  return {
    quotes,
    loading,
    error,
    refetch,
    isEmpty: quotes.length === 0
  };
};

// 🎣 Hook para performance da loja pública
export const usePublicShopPerformance = () => {
  const [performance, setPerformance] = useState({
    cacheHitRate: 0,
    averageLoadTime: 0,
    totalRequests: 0,
    cachedRequests: 0
  });

  useEffect(() => {
    let requestCount = 0;
    let cacheHitCount = 0;
    let totalLoadTime = 0;

    const handleShopRequest = () => {
      requestCount++;
    };

    const handleCacheHit = () => {
      cacheHitCount++;
    };

    // Escutar eventos personalizados (se implementados)
    window.addEventListener('shop-request', handleShopRequest);
    window.addEventListener('shop-cache-hit', handleCacheHit);

    const updatePerformance = () => {
      setPerformance({
        cacheHitRate: requestCount > 0 ? Math.round((cacheHitCount / requestCount) * 100) : 0,
        averageLoadTime: requestCount > 0 ? Math.round(totalLoadTime / requestCount) : 0,
        totalRequests: requestCount,
        cachedRequests: cacheHitCount
      });
    };

    const interval = setInterval(updatePerformance, 5000);

    return () => {
      window.removeEventListener('shop-request', handleShopRequest);
      window.removeEventListener('shop-cache-hit', handleCacheHit);
      clearInterval(interval);
    };
  }, []);

  return performance;
};