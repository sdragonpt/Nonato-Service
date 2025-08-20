// MetadataCounters.js - OTIMIZADO: Sem logs, mais eficiente

import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../firebase.jsx";

const METADATA_DOC = "metadata/parts_stats";
const CACHE_KEY = "parts_counters_cache";
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 horas

// Cache em memória global
let memoryCache = {
  total: 0,
  byCategory: {},
  bySubcategory: {},
  lastUpdated: null,
  timestamp: 0,
};

// Carregar do localStorage
const loadCacheFromStorage = () => {
  try {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        memoryCache = parsed;
        return true;
      }
    }
  } catch (error) {
    // Ignorar erro silenciosamente
  }
  return false;
};

// Salvar no localStorage
const saveCacheToStorage = () => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
  } catch (error) {
    // Ignorar erro silenciosamente
  }
};

// Obter contadores
export const getPartsCounters = async (forceRefresh = false) => {
  // 1. Cache em memória
  if (
    !forceRefresh &&
    memoryCache.timestamp > 0 &&
    Date.now() - memoryCache.timestamp < CACHE_TTL
  ) {
    return {
      total: memoryCache.total,
      byCategory: memoryCache.byCategory,
      bySubcategory: memoryCache.bySubcategory,
      lastUpdated: memoryCache.lastUpdated,
      fromCache: true,
    };
  }

  // 2. localStorage
  if (!forceRefresh && loadCacheFromStorage()) {
    return {
      total: memoryCache.total,
      byCategory: memoryCache.byCategory,
      bySubcategory: memoryCache.bySubcategory,
      lastUpdated: memoryCache.lastUpdated,
      fromCache: true,
    };
  }

  // 3. Firestore
  try {
    const docSnap = await getDoc(doc(db, METADATA_DOC));

    if (docSnap.exists()) {
      const data = docSnap.data();

      memoryCache = {
        total: data.totalParts || 0,
        byCategory: data.categoryCounts || {},
        bySubcategory: data.subcategoryCounts || {},
        lastUpdated: data.lastUpdated?.toDate() || new Date(),
        timestamp: Date.now(),
      };

      saveCacheToStorage();

      return {
        total: memoryCache.total,
        byCategory: memoryCache.byCategory,
        bySubcategory: memoryCache.bySubcategory,
        lastUpdated: memoryCache.lastUpdated,
        fromCache: false,
      };
    }

    return await initializeCounters();
  } catch (error) {
    // Fallback para cache expirado
    if (memoryCache.timestamp > 0) {
      return {
        total: memoryCache.total,
        byCategory: memoryCache.byCategory,
        bySubcategory: memoryCache.bySubcategory,
        lastUpdated: memoryCache.lastUpdated,
        fromCache: true,
        error: error.message,
      };
    }

    return {
      total: 0,
      byCategory: {},
      bySubcategory: {},
      lastUpdated: null,
      error: error.message,
    };
  }
};

// Inicializar contadores
const initializeCounters = async () => {
  try {
    const { getCountFromServer, collection } = await import(
      "firebase/firestore"
    );
    const totalSnapshot = await getCountFromServer(collection(db, "pecas"));
    const total = totalSnapshot.data().count;

    const initialData = {
      totalParts: total,
      categoryCounts: {},
      subcategoryCounts: {},
      lastUpdated: new Date(),
      version: 1,
    };

    await setDoc(doc(db, METADATA_DOC), initialData);

    memoryCache = {
      total,
      byCategory: {},
      bySubcategory: {},
      lastUpdated: new Date(),
      timestamp: Date.now(),
    };

    saveCacheToStorage();

    return {
      total,
      byCategory: {},
      bySubcategory: {},
      lastUpdated: new Date(),
      fromCache: false,
    };
  } catch (error) {
    return {
      total: 0,
      byCategory: {},
      bySubcategory: {},
      error: error.message,
    };
  }
};

// Update local
export const updateCountersLocal = (
  delta,
  categoryId = null,
  subcategoryId = null
) => {
  memoryCache.total = Math.max(0, memoryCache.total + delta);

  if (categoryId) {
    memoryCache.byCategory[categoryId] = Math.max(
      0,
      (memoryCache.byCategory[categoryId] || 0) + delta
    );
  }

  if (subcategoryId) {
    memoryCache.bySubcategory[subcategoryId] = Math.max(
      0,
      (memoryCache.bySubcategory[subcategoryId] || 0) + delta
    );
  }

  memoryCache.lastUpdated = new Date();
  memoryCache.timestamp = Date.now();

  saveCacheToStorage();

  // Disparar evento para atualizar UI
  window.dispatchEvent(new CustomEvent("counters-updated"));

  return {
    total: memoryCache.total,
    byCategory: memoryCache.byCategory,
    bySubcategory: memoryCache.bySubcategory,
    lastUpdated: memoryCache.lastUpdated,
    fromCache: true,
  };
};

// Incrementar
export const incrementPartCount = async (categoryId, subcategoryId) => {
  // Update local imediato
  updateCountersLocal(1, categoryId, subcategoryId);

  // Update background
  setTimeout(async () => {
    try {
      const updates = {
        totalParts: increment(1),
        lastUpdated: new Date(),
      };

      if (categoryId) {
        updates[`categoryCounts.${categoryId}`] = increment(1);
      }

      if (subcategoryId) {
        updates[`subcategoryCounts.${subcategoryId}`] = increment(1);
      }

      await updateDoc(doc(db, METADATA_DOC), updates);
    } catch (error) {
      // Reverter se falhou
      updateCountersLocal(-1, categoryId, subcategoryId);
    }
  }, 100);
};

// Decrementar
export const decrementPartCount = async (categoryId, subcategoryId) => {
  // Update local imediato
  updateCountersLocal(-1, categoryId, subcategoryId);

  // Update background
  setTimeout(async () => {
    try {
      const updates = {
        totalParts: increment(-1),
        lastUpdated: new Date(),
      };

      if (categoryId) {
        updates[`categoryCounts.${categoryId}`] = increment(-1);
      }

      if (subcategoryId) {
        updates[`subcategoryCounts.${subcategoryId}`] = increment(-1);
      }

      await updateDoc(doc(db, METADATA_DOC), updates);
    } catch (error) {
      // Reverter se falhou
      updateCountersLocal(1, categoryId, subcategoryId);
    }
  }, 100);
};

// Hook otimizado
export const usePartsCounters = () => {
  const [counters, setCounters] = useState(() => {
    loadCacheFromStorage();
    return {
      total: memoryCache.total,
      byCategory: memoryCache.byCategory,
      bySubcategory: memoryCache.bySubcategory,
      loading: memoryCache.timestamp === 0,
      error: null,
      lastUpdated: memoryCache.lastUpdated,
    };
  });

  const loadCounters = useCallback(async (forceRefresh = false) => {
    if (
      !forceRefresh &&
      memoryCache.timestamp > 0 &&
      Date.now() - memoryCache.timestamp < CACHE_TTL
    ) {
      return;
    }

    try {
      setCounters((prev) => ({ ...prev, loading: true, error: null }));

      const data = await getPartsCounters(forceRefresh);

      setCounters({
        total: data.total,
        byCategory: data.byCategory,
        bySubcategory: data.bySubcategory,
        loading: false,
        error: data.error || null,
        lastUpdated: data.lastUpdated,
      });
    } catch (error) {
      setCounters((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  }, []);

  useEffect(() => {
    if (memoryCache.timestamp === 0) {
      loadCounters();
    }
  }, [loadCounters]);

  useEffect(() => {
    const handleLocalUpdate = () => {
      setCounters({
        total: memoryCache.total,
        byCategory: memoryCache.byCategory,
        bySubcategory: memoryCache.bySubcategory,
        loading: false,
        error: null,
        lastUpdated: memoryCache.lastUpdated,
      });
    };

    window.addEventListener("counters-updated", handleLocalUpdate);
    return () =>
      window.removeEventListener("counters-updated", handleLocalUpdate);
  }, []);

  const refresh = useCallback(
    (force = false) => {
      loadCounters(force);
    },
    [loadCounters]
  );

  return {
    counters,
    refresh,
    loading: counters.loading,
    getTotalCount: () => memoryCache.total,
    getCategoryCount: (id) => memoryCache.byCategory[id] || 0,
    getSubcategoryCount: (id) => memoryCache.bySubcategory[id] || 0,
  };
};

// Carregar cache na inicialização
loadCacheFromStorage();
