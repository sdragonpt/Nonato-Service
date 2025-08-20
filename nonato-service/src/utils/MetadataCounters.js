// MetadataCounters.js - Sistema ZERO REQUESTS para contadores

import { useState, useEffect, useCallback } from "react"; // ✅ ADICIONADO
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../firebase.jsx";

const METADATA_DOC = "metadata/parts_stats";
const CACHE_KEY = "parts_counters_cache";
const CACHE_TTL = 2 * 60 * 60 * 1000; // ✅ 2 HORAS (mínimo requests)

// ✅ CACHE EM MEMÓRIA (global para toda a app)
let memoryCache = {
  total: 0,
  byCategory: {},
  bySubcategory: {},
  lastUpdated: null,
  timestamp: 0
};

// ✅ CARREGAR do localStorage na inicialização
const loadCacheFromStorage = () => {
  try {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        memoryCache = parsed;
        console.log(`📊 Contadores carregados do localStorage: ${memoryCache.total} total`);
        return true;
      }
    }
  } catch (error) {
    console.warn("⚠️ Erro ao carregar cache de contadores:", error);
  }
  return false;
};

// ✅ SALVAR no localStorage
const saveCacheToStorage = () => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
  } catch (error) {
    console.warn("⚠️ Erro ao salvar cache de contadores:", error);
  }
};

// ✅ OBTER CONTADORES (ZERO REQUESTS na maioria das vezes)
export const getPartsCounters = async (forceRefresh = false) => {
  // 1. Tentar cache em memória primeiro
  if (!forceRefresh && memoryCache.timestamp > 0 && Date.now() - memoryCache.timestamp < CACHE_TTL) {
    console.log(`⚡ Contadores do cache (${memoryCache.total} total) - ZERO REQUESTS`);
    return {
      total: memoryCache.total,
      byCategory: memoryCache.byCategory,
      bySubcategory: memoryCache.bySubcategory,
      lastUpdated: memoryCache.lastUpdated,
      fromCache: true,
      source: 'memory'
    };
  }

  // 2. Tentar localStorage
  if (!forceRefresh && loadCacheFromStorage()) {
    console.log(`💾 Contadores do localStorage (${memoryCache.total} total) - ZERO REQUESTS`);
    return {
      total: memoryCache.total,
      byCategory: memoryCache.byCategory,
      bySubcategory: memoryCache.bySubcategory,
      lastUpdated: memoryCache.lastUpdated,
      fromCache: true,
      source: 'localStorage'
    };
  }

  // 3. ✅ ÚNICA VEZ - Buscar do Firestore
  try {
    console.log("📊 Buscando contadores do Firestore (ÚNICO REQUEST)...");
    
    const docSnap = await getDoc(doc(db, METADATA_DOC));
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Atualizar cache
      memoryCache = {
        total: data.totalParts || 0,
        byCategory: data.categoryCounts || {},
        bySubcategory: data.subcategoryCounts || {},
        lastUpdated: data.lastUpdated?.toDate() || new Date(),
        timestamp: Date.now()
      };
      
      saveCacheToStorage();
      
      console.log(`✅ Contadores obtidos: ${memoryCache.total} total - SALVO EM CACHE`);
      
      return {
        total: memoryCache.total,
        byCategory: memoryCache.byCategory,
        bySubcategory: memoryCache.bySubcategory,
        lastUpdated: memoryCache.lastUpdated,
        fromCache: false,
        source: 'firestore'
      };
    }
    
    // Se não existe, inicializar (só acontece uma vez)
    console.log("🔧 Inicializando contadores...");
    return await initializeCounters();
    
  } catch (error) {
    console.error("❌ Erro ao buscar contadores:", error);
    
    // ✅ FALLBACK - Usar cache expirado se disponível
    if (memoryCache.timestamp > 0) {
      console.log("⚠️ Usando cache expirado como fallback");
      return {
        total: memoryCache.total,
        byCategory: memoryCache.byCategory,
        bySubcategory: memoryCache.bySubcategory,
        lastUpdated: memoryCache.lastUpdated,
        fromCache: true,
        error: error.message,
        source: 'expired_cache'
      };
    }
    
    return {
      total: 0,
      byCategory: {},
      bySubcategory: {},
      lastUpdated: null,
      error: error.message,
      fromCache: false,
      source: 'error'
    };
  }
};

// ✅ INICIALIZAR (só roda uma vez)
const initializeCounters = async () => {
  try {
    // Usar aggregation para count inicial
    const { getCountFromServer, collection } = await import("firebase/firestore");
    const totalSnapshot = await getCountFromServer(collection(db, "pecas"));
    const total = totalSnapshot.data().count;
    
    const initialData = {
      totalParts: total,
      categoryCounts: {},
      subcategoryCounts: {},
      lastUpdated: new Date(),
      version: 1
    };
    
    await setDoc(doc(db, METADATA_DOC), initialData);
    
    // Atualizar cache
    memoryCache = {
      total,
      byCategory: {},
      bySubcategory: {},
      lastUpdated: new Date(),
      timestamp: Date.now()
    };
    
    saveCacheToStorage();
    
    console.log("✅ Contadores inicializados:", total);
    
    return {
      total,
      byCategory: {},
      bySubcategory: {},
      lastUpdated: new Date(),
      fromCache: false,
      source: 'initialized'
    };
    
  } catch (error) {
    console.error("❌ Erro ao inicializar contadores:", error);
    return { total: 0, byCategory: {}, bySubcategory: {}, error: error.message };
  }
};

// ✅ UPDATE LOCAL IMEDIATO (ZERO REQUESTS)
export const updateCountersLocal = (delta, categoryId = null, subcategoryId = null) => {
  console.log(`📊 Update local: ${delta > 0 ? '+' : ''}${delta} (ZERO REQUESTS)`);
  
  // Atualizar cache em memória
  memoryCache.total = Math.max(0, memoryCache.total + delta);
  
  if (categoryId) {
    memoryCache.byCategory[categoryId] = Math.max(0, (memoryCache.byCategory[categoryId] || 0) + delta);
  }
  
  if (subcategoryId) {
    memoryCache.bySubcategory[subcategoryId] = Math.max(0, (memoryCache.bySubcategory[subcategoryId] || 0) + delta);
  }
  
  memoryCache.lastUpdated = new Date();
  memoryCache.timestamp = Date.now();
  
  // Salvar no localStorage
  saveCacheToStorage();
  
  console.log(`✅ Contadores atualizados localmente: ${memoryCache.total} total`);
  
  return {
    total: memoryCache.total,
    byCategory: memoryCache.byCategory,
    bySubcategory: memoryCache.bySubcategory,
    lastUpdated: memoryCache.lastUpdated,
    fromCache: true,
    source: 'local_update'
  };
};

// ✅ INCREMENTAR (Background + Local Update)
export const incrementPartCount = async (categoryId, subcategoryId) => {
  // 1. ✅ UPDATE IMEDIATO LOCAL (UI responde instantaneamente)
  updateCountersLocal(1, categoryId, subcategoryId);
  
  // 2. ✅ UPDATE BACKGROUND (não bloqueia UI)
  setTimeout(async () => {
    try {
      const metadataRef = doc(db, METADATA_DOC);
      
      const updates = {
        totalParts: increment(1),
        lastUpdated: new Date()
      };
      
      if (categoryId) {
        updates[`categoryCounts.${categoryId}`] = increment(1);
      }
      
      if (subcategoryId) {
        updates[`subcategoryCounts.${subcategoryId}`] = increment(1);
      }
      
      await updateDoc(metadataRef, updates);
      console.log("📈 Contador incrementado no background");
      
    } catch (error) {
      console.error("❌ Erro ao incrementar (background):", error);
      // Reverter update local se falhou
      updateCountersLocal(-1, categoryId, subcategoryId);
    }
  }, 100); // 100ms delay para não bloquear
};

// ✅ DECREMENTAR (Background + Local Update)
export const decrementPartCount = async (categoryId, subcategoryId) => {
  // 1. ✅ UPDATE IMEDIATO LOCAL
  updateCountersLocal(-1, categoryId, subcategoryId);
  
  // 2. ✅ UPDATE BACKGROUND
  setTimeout(async () => {
    try {
      const metadataRef = doc(db, METADATA_DOC);
      
      const updates = {
        totalParts: increment(-1),
        lastUpdated: new Date()
      };
      
      if (categoryId) {
        updates[`categoryCounts.${categoryId}`] = increment(-1);
      }
      
      if (subcategoryId) {
        updates[`subcategoryCounts.${subcategoryId}`] = increment(-1);
      }
      
      await updateDoc(metadataRef, updates);
      console.log("📉 Contador decrementado no background");
      
    } catch (error) {
      console.error("❌ Erro ao decrementar (background):", error);
      // Reverter update local se falhou
      updateCountersLocal(1, categoryId, subcategoryId);
    }
  }, 100);
};

// ✅ INVALIDAR CACHE (forçar próximo fetch)
export const invalidateCountersCache = () => {
  console.log("🧹 Invalidando cache de contadores");
  memoryCache.timestamp = 0;
  localStorage.removeItem(CACHE_KEY);
};

// ✅ OBTER CONTAGEM ESPECÍFICA (ZERO REQUESTS)
export const getSpecificCount = (type, id = null) => {
  if (memoryCache.timestamp === 0) {
    return null; // Cache não carregado
  }
  
  switch (type) {
    case 'total':
      return memoryCache.total;
    case 'category':
      return memoryCache.byCategory[id] || 0;
    case 'subcategory':
      return memoryCache.bySubcategory[id] || 0;
    default:
      return null;
  }
};

// ✅ HOOK OTIMIZADO (ZERO REQUESTS)
export const usePartsCounters = () => {
  const [counters, setCounters] = useState(() => {
    // ✅ CARREGAR cache imediatamente (síncrono)
    loadCacheFromStorage();
    return {
      total: memoryCache.total,
      byCategory: memoryCache.byCategory,
      bySubcategory: memoryCache.bySubcategory,
      loading: memoryCache.timestamp === 0,
      error: null,
      lastUpdated: memoryCache.lastUpdated,
      source: memoryCache.timestamp > 0 ? 'cache' : 'loading'
    };
  });

  const loadCounters = useCallback(async (forceRefresh = false) => {
    // ✅ Se tem cache válido e não é force refresh, não fazer nada
    if (!forceRefresh && memoryCache.timestamp > 0 && Date.now() - memoryCache.timestamp < CACHE_TTL) {
      console.log("⚡ usePartsCounters: Usando cache existente (ZERO REQUESTS)");
      return;
    }

    try {
      setCounters(prev => ({ ...prev, loading: true, error: null }));
      
      const data = await getPartsCounters(forceRefresh);
      
      setCounters({
        total: data.total,
        byCategory: data.byCategory,
        bySubcategory: data.bySubcategory,
        loading: false,
        error: data.error || null,
        lastUpdated: data.lastUpdated,
        source: data.source
      });
      
    } catch (error) {
      setCounters(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
    }
  }, []);

  // ✅ CARREGAR apenas se não tem cache
  useEffect(() => {
    if (memoryCache.timestamp === 0) {
      loadCounters();
    }
  }, [loadCounters]);

  // ✅ LISTENER para updates locais
  useEffect(() => {
    const handleLocalUpdate = () => {
      setCounters({
        total: memoryCache.total,
        byCategory: memoryCache.byCategory,
        bySubcategory: memoryCache.bySubcategory,
        loading: false,
        error: null,
        lastUpdated: memoryCache.lastUpdated,
        source: 'local_update'
      });
    };

    // Event listener customizado para updates
    window.addEventListener('counters-updated', handleLocalUpdate);
    return () => window.removeEventListener('counters-updated', handleLocalUpdate);
  }, []);

  const refresh = useCallback((force = false) => {
    loadCounters(force);
  }, [loadCounters]);

  return {
    counters,
    refresh,
    loading: counters.loading,
    // ✅ HELPERS DIRETOS (ZERO REQUESTS)
    getTotalCount: () => memoryCache.total,
    getCategoryCount: (id) => memoryCache.byCategory[id] || 0,
    getSubcategoryCount: (id) => memoryCache.bySubcategory[id] || 0,
  };
};

// ✅ CARREGAR cache na inicialização da app
loadCacheFromStorage();