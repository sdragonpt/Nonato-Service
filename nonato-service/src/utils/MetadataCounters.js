// MetadataCounters.js - SILENT & FAST: Zero logs + Performance otimizada

import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../firebase.jsx";

const METADATA_DOC = "metadata/parts_stats";
const CACHE_KEY = "parts_counters_cache";
const CACHE_TTL = 24 * 60 * 60 * 1000; // ✅ 24 HORAS (reduzido de 2h)

// ✅ CACHE EM MEMÓRIA GLOBAL - Mais eficiente
let memoryCache = {
  total: 0,
  byCategory: {},
  bySubcategory: {},
  lastUpdated: null,
  timestamp: 0,
  version: 1,
};

// ✅ STORAGE UTILS - Simplificados e silenciosos
const loadFromStorage = () => {
  try {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Date.now() - parsed.timestamp < CACHE_TTL && parsed.version === 1) {
        memoryCache = parsed;
        return true;
      }
    }
  } catch {
    localStorage.removeItem(CACHE_KEY);
  }
  return false;
};

const saveToStorage = () => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
  } catch {
    // Storage cheio - ignorar silenciosamente
  }
};

// ✅ OBTER CONTADORES - ULTRA RÁPIDO
export const getPartsCounters = async (forceRefresh = false) => {
  // 1. Cache em memória válido
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
      source: "memory",
    };
  }

  // 2. Tentar localStorage
  if (!forceRefresh && loadFromStorage()) {
    return {
      total: memoryCache.total,
      byCategory: memoryCache.byCategory,
      bySubcategory: memoryCache.bySubcategory,
      lastUpdated: memoryCache.lastUpdated,
      fromCache: true,
      source: "storage",
    };
  }

  // 3. Fetch do Firestore (apenas quando necessário)
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
        version: 1,
      };

      saveToStorage();

      return {
        total: memoryCache.total,
        byCategory: memoryCache.byCategory,
        bySubcategory: memoryCache.bySubcategory,
        lastUpdated: memoryCache.lastUpdated,
        fromCache: false,
        source: "firestore",
      };
    }

    // Inicializar se não existe
    return await initializeCounters();
  } catch (error) {
    // Fallback para cache expirado se disponível
    if (memoryCache.timestamp > 0) {
      return {
        total: memoryCache.total,
        byCategory: memoryCache.byCategory,
        bySubcategory: memoryCache.bySubcategory,
        lastUpdated: memoryCache.lastUpdated,
        fromCache: true,
        error: error.message,
        source: "expired_cache",
      };
    }

    return {
      total: 0,
      byCategory: {},
      bySubcategory: {},
      lastUpdated: null,
      error: error.message,
      fromCache: false,
      source: "error",
    };
  }
};

// ✅ INICIALIZAR - Mais simples
const initializeCounters = async () => {
  try {
    // Usar aggregation para count inicial
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
      version: 1,
    };

    saveToStorage();

    return {
      total,
      byCategory: {},
      bySubcategory: {},
      lastUpdated: new Date(),
      fromCache: false,
      source: "initialized",
    };
  } catch (error) {
    return {
      total: 0,
      byCategory: {},
      bySubcategory: {},
      error: error.message,
      fromCache: false,
      source: "init_error",
    };
  }
};

// ✅ UPDATE LOCAL INSTANTÂNEO - Zero requests
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

  saveToStorage();

  // Emitir evento para listeners
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("counters-updated", {
        detail: {
          total: memoryCache.total,
          delta,
          categoryId,
          subcategoryId,
        },
      })
    );
  }

  return {
    total: memoryCache.total,
    byCategory: memoryCache.byCategory,
    bySubcategory: memoryCache.bySubcategory,
    lastUpdated: memoryCache.lastUpdated,
    fromCache: true,
    source: "local_update",
  };
};

// ✅ BACKGROUND UPDATE - Não bloqueia UI
const queuedUpdates = [];
let updateTimer = null;

const processQueuedUpdates = async () => {
  if (queuedUpdates.length === 0) return;

  try {
    const updates = [...queuedUpdates];
    queuedUpdates.length = 0; // Limpar queue

    const metadataRef = doc(db, METADATA_DOC);
    const updateDoc = {};

    let totalDelta = 0;
    const categoryDeltas = {};
    const subcategoryDeltas = {};

    // Consolidar todos os updates
    updates.forEach(({ delta, categoryId, subcategoryId }) => {
      totalDelta += delta;

      if (categoryId) {
        categoryDeltas[categoryId] = (categoryDeltas[categoryId] || 0) + delta;
      }

      if (subcategoryId) {
        subcategoryDeltas[subcategoryId] =
          (subcategoryDeltas[subcategoryId] || 0) + delta;
      }
    });

    // Aplicar updates consolidados
    if (totalDelta !== 0) {
      updateDoc.totalParts = increment(totalDelta);
    }

    Object.entries(categoryDeltas).forEach(([id, delta]) => {
      if (delta !== 0) {
        updateDoc[`categoryCounts.${id}`] = increment(delta);
      }
    });

    Object.entries(subcategoryDeltas).forEach(([id, delta]) => {
      if (delta !== 0) {
        updateDoc[`subcategoryCounts.${id}`] = increment(delta);
      }
    });

    updateDoc.lastUpdated = new Date();

    await updateDoc(metadataRef, updateDoc);
  } catch (error) {
    // Se falhou, reverter updates locais
    queuedUpdates.forEach(({ delta, categoryId, subcategoryId }) => {
      updateCountersLocal(-delta, categoryId, subcategoryId);
    });
  }
};

// ✅ INCREMENTAR - Background otimizado
export const incrementPartCount = (categoryId, subcategoryId) => {
  // 1. Update imediato local
  updateCountersLocal(1, categoryId, subcategoryId);

  // 2. Queue para background update
  queuedUpdates.push({ delta: 1, categoryId, subcategoryId });

  // 3. Processar queue (debounced)
  if (updateTimer) clearTimeout(updateTimer);
  updateTimer = setTimeout(processQueuedUpdates, 1000); // 1 segundo de delay
};

// ✅ DECREMENTAR - Background otimizado
export const decrementPartCount = (categoryId, subcategoryId) => {
  updateCountersLocal(-1, categoryId, subcategoryId);
  queuedUpdates.push({ delta: -1, categoryId, subcategoryId });

  if (updateTimer) clearTimeout(updateTimer);
  updateTimer = setTimeout(processQueuedUpdates, 1000);
};

// ✅ INVALIDAR CACHE
export const invalidateCountersCache = () => {
  memoryCache.timestamp = 0;
  localStorage.removeItem(CACHE_KEY);
};

// ✅ GETTERS DIRETOS - Zero overhead
export const getSpecificCount = (type, id = null) => {
  if (memoryCache.timestamp === 0) return null;

  switch (type) {
    case "total":
      return memoryCache.total;
    case "category":
      return memoryCache.byCategory[id] || 0;
    case "subcategory":
      return memoryCache.bySubcategory[id] || 0;
    default:
      return null;
  }
};

// ✅ HOOK ULTRA OTIMIZADO
export const usePartsCounters = () => {
  const [counters, setCounters] = useState(() => {
    // Carregar cache imediatamente
    loadFromStorage();
    return {
      total: memoryCache.total,
      byCategory: memoryCache.byCategory,
      bySubcategory: memoryCache.bySubcategory,
      loading: memoryCache.timestamp === 0,
      error: null,
      lastUpdated: memoryCache.lastUpdated,
      source: memoryCache.timestamp > 0 ? "cache" : "loading",
    };
  });

  const loadCounters = useCallback(async (forceRefresh = false) => {
    if (
      !forceRefresh &&
      memoryCache.timestamp > 0 &&
      Date.now() - memoryCache.timestamp < CACHE_TTL
    ) {
      return; // Cache válido - não fazer nada
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
        source: data.source,
      });
    } catch (error) {
      setCounters((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  }, []);

  // Carregar apenas se cache não existe
  useEffect(() => {
    if (memoryCache.timestamp === 0) {
      loadCounters();
    }
  }, [loadCounters]);

  // Listener para updates locais
  useEffect(() => {
    const handleLocalUpdate = () => {
      setCounters({
        total: memoryCache.total,
        byCategory: memoryCache.byCategory,
        bySubcategory: memoryCache.bySubcategory,
        loading: false,
        error: null,
        lastUpdated: memoryCache.lastUpdated,
        source: "local_update",
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
    // Helpers diretos - Zero requests
    getTotalCount: () => memoryCache.total,
    getCategoryCount: (id) => memoryCache.byCategory[id] || 0,
    getSubcategoryCount: (id) => memoryCache.bySubcategory[id] || 0,
  };
};

// ✅ Carregar cache na inicialização
loadFromStorage();
