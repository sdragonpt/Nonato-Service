// ImageCacheManager.js - Sistema de cache inteligente para imagens
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.jsx";

class ImageCacheManager {
  constructor() {
    this.memoryCache = new Map(); // Cache em memória
    this.loadingPromises = new Map(); // Evita múltiplas requests simultâneas
    this.STORAGE_KEY = 'nonato_image_cache';
    this.MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB máximo no localStorage
    this.CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 dias
    
    // Carrega cache do localStorage na inicialização
    this.loadStorageCache();
    
    // Limpa cache expirado periodicamente
    this.startCleanupTimer();
  }

  // 📦 Carrega cache do localStorage
  loadStorageCache() {
    try {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        
        // Verifica se não expirou
        Object.entries(parsedCache).forEach(([hash, data]) => {
          if (data.timestamp && Date.now() - data.timestamp < this.CACHE_DURATION) {
            this.memoryCache.set(hash, {
              data: data.imageData,
              timestamp: data.timestamp,
              fromStorage: true
            });
          }
        });
        
        console.log(`🖼️ Carregadas ${this.memoryCache.size} imagens do cache`);
      }
    } catch (error) {
      console.warn('⚠️ Erro ao carregar cache de imagens:', error);
      this.clearStorageCache();
    }
  }

  // 💾 Salva cache no localStorage
  saveToStorage() {
    try {
      const cacheToSave = {};
      let totalSize = 0;
      
      // Converte para formato de storage
      for (const [hash, cacheData] of this.memoryCache.entries()) {
        const size = new Blob([cacheData.data]).size;
        
        // Verifica limite de tamanho
        if (totalSize + size > this.MAX_STORAGE_SIZE) {
          console.warn(`📏 Cache de imagens atingiu limite de ${this.MAX_STORAGE_SIZE / 1024 / 1024}MB`);
          break;
        }
        
        cacheToSave[hash] = {
          imageData: cacheData.data,
          timestamp: cacheData.timestamp
        };
        
        totalSize += size;
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cacheToSave));
      console.log(`💾 Cache salvo: ${Object.keys(cacheToSave).length} imagens (${(totalSize / 1024 / 1024).toFixed(2)}MB)`);
      
    } catch (error) {
      console.warn('⚠️ Erro ao salvar cache (storage cheio?):', error);
      this.clearStorageCache();
    }
  }

  // 🧹 Limpa cache expirado
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
      console.log(`🧹 Removidas ${removed} imagens expiradas do cache`);
      this.saveToStorage();
    }
  }

  // ⏰ Timer de limpeza
  startCleanupTimer() {
    // Limpa cache expirado a cada hora
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  // 🖼️ Carrega imagem com cache inteligente
  async loadImage(imageHash) {
    if (!imageHash) return null;

    // 1. Verifica cache em memória
    const cached = this.memoryCache.get(imageHash);
    if (cached) {
      console.log(`⚡ Cache hit: ${imageHash}`);
      return cached.data;
    }

    // 2. Evita múltiplas requests simultâneas para a mesma imagem
    if (this.loadingPromises.has(imageHash)) {
      console.log(`⏳ Aguardando request em andamento: ${imageHash}`);
      return await this.loadingPromises.get(imageHash);
    }

    // 3. Cria promessa de carregamento
    const loadPromise = this.fetchImageFromFirestore(imageHash);
    this.loadingPromises.set(imageHash, loadPromise);

    try {
      const imageData = await loadPromise;
      
      if (imageData) {
        // Salva no cache em memória
        this.memoryCache.set(imageHash, {
          data: imageData,
          timestamp: Date.now(),
          fromStorage: false
        });
        
        // Salva no localStorage (de forma assíncrona para não bloquear)
        setTimeout(() => this.saveToStorage(), 100);
        
        console.log(`📥 Imagem carregada e cached: ${imageHash}`);
      }
      
      return imageData;
      
    } catch (error) {
      console.error(`❌ Erro ao carregar imagem ${imageHash}:`, error);
      return null;
      
    } finally {
      // Remove promessa do mapa
      this.loadingPromises.delete(imageHash);
    }
  }

  // 🔥 Busca imagem do Firestore (apenas quando necessário)
  async fetchImageFromFirestore(imageHash) {
    try {
      console.log(`🔥 FIRESTORE READ: Carregando imagem ${imageHash}`);
      
      const imageRef = doc(db, "image_library", imageHash);
      const imageDoc = await getDoc(imageRef);

      if (imageDoc.exists()) {
        return imageDoc.data().data;
      }
      
      console.warn(`❌ Imagem não encontrada: ${imageHash}`);
      return null;
      
    } catch (error) {
      console.error(`❌ Erro ao buscar imagem ${imageHash}:`, error);
      throw error;
    }
  }

  // 🗑️ Remove imagem do cache
  removeFromCache(imageHash) {
    const removed = this.memoryCache.delete(imageHash);
    if (removed) {
      console.log(`🗑️ Imagem removida do cache: ${imageHash}`);
      this.saveToStorage();
    }
  }

  // 🧹 Limpa todo o cache
  clearAllCache() {
    this.memoryCache.clear();
    this.clearStorageCache();
    console.log('🧹 Cache de imagens completamente limpo');
  }

  // 🗑️ Limpa localStorage
  clearStorageCache() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('⚠️ Erro ao limpar storage cache:', error);
    }
  }

  // 📊 Estatísticas do cache
  getStats() {
    const memorySize = this.memoryCache.size;
    let storageEntries = 0;
    
    try {
      const storage = localStorage.getItem(this.STORAGE_KEY);
      if (storage) {
        storageEntries = Object.keys(JSON.parse(storage)).length;
      }
    } catch (error) {
      // Ignore
    }
    
    return {
      memoryEntries: memorySize,
      storageEntries,
      loadingPromises: this.loadingPromises.size,
      hitRate: this._calculateHitRate()
    };
  }

  // 📈 Calcula taxa de acerto (opcional)
  _calculateHitRate() {
    // Implementação básica - pode ser expandida
    return this.memoryCache.size > 0 ? 
      `${Math.round((this.memoryCache.size / (this.memoryCache.size + this.loadingPromises.size)) * 100)}%` : 
      '0%';
  }

  // 🔄 Pré-carrega imagens importantes
  async preloadImages(imageHashes) {
    if (!Array.isArray(imageHashes)) return;
    
    console.log(`🚀 Pré-carregando ${imageHashes.length} imagens...`);
    
    const promises = imageHashes
      .filter(hash => hash && !this.memoryCache.has(hash))
      .slice(0, 10) // Limita a 10 simultâneas
      .map(hash => this.loadImage(hash));
    
    try {
      await Promise.allSettled(promises);
      console.log('✅ Pré-carregamento concluído');
    } catch (error) {
      console.warn('⚠️ Erro no pré-carregamento:', error);
    }
  }
}

// Instância singleton
const imageCache = new ImageCacheManager();

export default imageCache;