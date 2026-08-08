// ImageCacheManager.js - SILENT & FAST: Zero logs + Performance otimizada

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.jsx";

class ImageCacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.loadingPromises = new Map();
    this.STORAGE_KEY = "nonato_image_cache";
    this.MAX_STORAGE_SIZE = 20 * 1024 * 1024; // ✅ 20MB (reduzido de 50MB)
    this.CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // ✅ 30 dias (aumentado)
    this.MAX_MEMORY_ENTRIES = 100; // ✅ Limite de entradas em memória

    this.loadStorageCache();
    this.startCleanupTimer();
  }

  // ✅ CARREGAR CACHE - Silencioso e otimizado
  loadStorageCache() {
    try {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      if (!cached) return;

      const parsedCache = JSON.parse(cached);
      const now = Date.now();
      let loaded = 0;

      Object.entries(parsedCache).forEach(([hash, data]) => {
        if (data.timestamp && now - data.timestamp < this.CACHE_DURATION) {
          this.memoryCache.set(hash, {
            data: data.imageData,
            timestamp: data.timestamp,
            fromStorage: true,
          });
          loaded++;
        }
      });

      // Cleanup automático se muito grande
      if (this.memoryCache.size > this.MAX_MEMORY_ENTRIES) {
        this.cleanupMemoryCache();
      }
    } catch {
      this.clearStorageCache();
    }
  }

  // ✅ LIMPEZA DE MEMÓRIA - Mantém apenas as mais recentes
  cleanupMemoryCache() {
    if (this.memoryCache.size <= this.MAX_MEMORY_ENTRIES) return;

    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp) // Mais recentes primeiro
      .slice(0, this.MAX_MEMORY_ENTRIES); // Manter apenas as MAX_MEMORY_ENTRIES mais recentes

    this.memoryCache.clear();
    entries.forEach(([key, value]) => {
      this.memoryCache.set(key, value);
    });
  }

  // ✅ SALVAR NO STORAGE - Otimizado e silencioso
  saveToStorage() {
    try {
      const cacheToSave = {};
      let totalSize = 0;

      // Ordenar por timestamp (mais recentes primeiro)
      const sortedEntries = Array.from(this.memoryCache.entries()).sort(
        (a, b) => b[1].timestamp - a[1].timestamp
      );

      for (const [hash, cacheData] of sortedEntries) {
        const dataSize = new Blob([cacheData.data]).size;

        if (totalSize + dataSize > this.MAX_STORAGE_SIZE) break;

        cacheToSave[hash] = {
          imageData: cacheData.data,
          timestamp: cacheData.timestamp,
        };

        totalSize += dataSize;
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cacheToSave));
    } catch {
      // Storage cheio - limpar e tentar novamente
      this.clearStorageCache();
    }
  }

  // ✅ CLEANUP TIMER - Mais eficiente (6 horas em vez de 1 hora)
  startCleanupTimer() {
    setInterval(() => this.cleanup(), 6 * 60 * 60 * 1000);
  }

  // ✅ CLEANUP - Silencioso
  cleanup() {
    const now = Date.now();
    let removed = 0;

    for (const [hash, data] of this.memoryCache.entries()) {
      if (now - data.timestamp > this.CACHE_DURATION) {
        this.memoryCache.delete(hash);
        removed++;
      }
    }

    if (removed > 0) {
      this.saveToStorage();
    }
  }

  // ✅ LOAD IMAGE - Ultra otimizado
  async loadImage(imageHash) {
    if (!imageHash) return null;

    // 1. Cache hit em memória
    const cached = this.memoryCache.get(imageHash);
    if (cached) {
      return cached.data;
    }

    // 2. Evitar requests duplicados
    if (this.loadingPromises.has(imageHash)) {
      return await this.loadingPromises.get(imageHash);
    }

    // 3. Fetch do Firestore
    const loadPromise = this.fetchImageFromFirestore(imageHash);
    this.loadingPromises.set(imageHash, loadPromise);

    try {
      const imageData = await loadPromise;

      if (imageData) {
        // Salvar no cache
        this.memoryCache.set(imageHash, {
          data: imageData,
          timestamp: Date.now(),
          fromStorage: false,
        });

        // Cleanup se necessário
        if (this.memoryCache.size > this.MAX_MEMORY_ENTRIES) {
          this.cleanupMemoryCache();
        }

        // Salvar no storage (async para não bloquear)
        setTimeout(() => this.saveToStorage(), 100);
      }

      return imageData;
    } catch (error) {
      return null;
    } finally {
      this.loadingPromises.delete(imageHash);
    }
  }

  // ✅ FETCH FROM FIRESTORE - Silencioso
  async fetchImageFromFirestore(imageHash) {
    try {
      const imageRef = doc(db, "image_library", imageHash);
      const imageDoc = await getDoc(imageRef);

      if (imageDoc.exists()) {
        return imageDoc.data().data;
      }

      return null;
    } catch (error) {
      throw error;
    }
  }

  // ✅ REMOVE FROM CACHE - Silencioso
  removeFromCache(imageHash) {
    const removed = this.memoryCache.delete(imageHash);
    if (removed) {
      this.saveToStorage();
    }
  }

  // ✅ CLEAR ALL CACHE - Silencioso
  clearAllCache() {
    this.memoryCache.clear();
    this.clearStorageCache();
  }

  // ✅ CLEAR STORAGE - Silencioso
  clearStorageCache() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {
      // Ignorar erro
    }
  }

  // ✅ STATS - Simplificadas
  getStats() {
    let storageEntries = 0;

    try {
      const storage = localStorage.getItem(this.STORAGE_KEY);
      if (storage) {
        storageEntries = Object.keys(JSON.parse(storage)).length;
      }
    } catch {
      // Ignorar
    }

    return {
      memoryEntries: this.memoryCache.size,
      storageEntries,
      loadingPromises: this.loadingPromises.size,
      hitRate: this.calculateHitRate(),
    };
  }

  // ✅ HIT RATE - Simplificado
  calculateHitRate() {
    if (this.memoryCache.size === 0) return "0%";

    const total = this.memoryCache.size + this.loadingPromises.size;
    return total > 0
      ? `${Math.round((this.memoryCache.size / total) * 100)}%`
      : "0%";
  }

  // ✅ PRELOAD - Otimizado com limite
  async preloadImages(imageHashes) {
    if (!Array.isArray(imageHashes) || imageHashes.length === 0) return;

    const toPreload = imageHashes
      .filter((hash) => hash && !this.memoryCache.has(hash))
      .slice(0, 5); // ✅ Limite a 5 simultâneas (reduzido de 10)

    if (toPreload.length === 0) return;

    const promises = toPreload.map(
      (hash) => this.loadImage(hash).catch(() => null) // Ignorar erros
    );

    try {
      await Promise.allSettled(promises);
    } catch {
      // Ignorar erros de preload
    }
  }

  // ✅ CACHE SIZE EM BYTES
  getCacheSizeBytes() {
    let totalSize = 0;

    for (const [, data] of this.memoryCache.entries()) {
      try {
        totalSize += new Blob([data.data]).size;
      } catch {
        // Ignorar erro
      }
    }

    return totalSize;
  }

  // ✅ CACHE SIZE FORMATADO
  getCacheSizeFormatted() {
    const bytes = this.getCacheSizeBytes();

    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

// ✅ INSTÂNCIA SINGLETON
const imageCache = new ImageCacheManager();

export default imageCache;
