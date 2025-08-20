// UniversalFirestoreCache.js - LIMPO: Cache sem logs chatos
import { 
  doc, 
  getDoc, 
  getDocs, 
  collection, 
  query 
} from "firebase/firestore";
import { db } from "../firebase.jsx";

class UniversalFirestoreCache {
  constructor() {
    this.cache = new Map();
    this.queryCache = new Map();
    this.listeners = new Map();
    this.pendingRequests = new Map();
    this.readCount = 0;
    this.cacheHits = 0;
    this.isLogging = false;
    this.debugMode = false; // ✅ Modo debug desativado por padrão
    
    // ✅ CONFIGURAÇÕES DE CACHE - 30 DIAS PARA TUDO
    this.cacheConfig = {
      // Cache longo - 30 dias para dados estáticos
      users: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true },
      categorias: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true },
      image_library: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true },
      
      // ⭐ FOCO: Cache 30 dias para peças e loja pública
      pecas: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true },
      shop_access_tokens: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true },
      orcamentos_online: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true },
      
      // Cache 30 dias para outros dados
      services: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true },
      clients: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true },
      orders: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true },
      budgets: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true },
      agendamentos: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true },
      
      // Sem cache para dados críticos em tempo real
      notifications: { ttl: 0, persistent: false },
      logs: { ttl: 0, persistent: false },
      
      // Cache padrão - 30 dias
      default: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true }
    };

    this.loadPersistentCache();
    this.startCleanup();
    this.setupInterception();
  }

  // ✅ MODO DEBUG: Ativar/desativar logs
  setDebugMode(enabled) {
    this.debugMode = enabled;
    if (enabled) {
      console.log('🔧 UniversalCache: Debug mode ATIVADO');
    }
  }

  // ✅ LOG CONDICIONAL: Só loga se debug mode estiver ativo
  debugLog(message, ...args) {
    if (this.debugMode && !this.isLogging) {
      this.isLogging = true;
      console.log(`🔧 [UniversalCache] ${message}`, ...args);
      this.isLogging = false;
    }
  }

  // 🔗 Interceptar console.log para monitorar reads
  setupInterception() {
    this.originalLog = console.log;
    
    console.log = (...args) => {
      if (this.isLogging) {
        this.originalLog.apply(console, args);
        return;
      }

      const message = args.join(' ');
      if (message.includes('🔥 FIRESTORE READ') || 
          message.includes('Firestore read') ||
          message.includes('READ:')) {
        this.readCount++;
        this.logRead(message);
      }
      this.originalLog.apply(console, args);
    };
  }

  // 📝 Log de reads para o debug tool
  logRead(message) {
    this.isLogging = true;
    
    const timestamp = new Date().toISOString();
    
    // ✅ LIMPO: Não loga no console, apenas emite evento para o debug tool
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('firestore-read', {
        detail: { count: this.readCount, message, timestamp }
      }));
    }
    
    this.isLogging = false;
  }

  // 🔑 Gerar chave de cache
  getCacheKey(collection, docId = null, queryParams = null) {
    if (docId) {
      return `${collection}/${docId}`;
    }
    if (queryParams) {
      return `${collection}/query/${JSON.stringify(queryParams)}`;
    }
    return `${collection}/all`;
  }

  // ⚙️ Obter configuração de cache
  getCacheConfig(collection) {
    return this.cacheConfig[collection] || this.cacheConfig.default;
  }

  // ✅ Verificar se cache é válido
  isCacheValid(cacheEntry, collection) {
    if (!cacheEntry) return false;
    
    const config = this.getCacheConfig(collection);
    if (config.ttl === 0) return false;
    
    const now = Date.now();
    return (now - cacheEntry.timestamp) < config.ttl;
  }

  // 💾 Carregar cache persistente
  loadPersistentCache() {
    try {
      const saved = localStorage.getItem('universal_firestore_cache');
      if (saved) {
        const parsedCache = JSON.parse(saved);
        
        Object.entries(parsedCache).forEach(([key, data]) => {
          const collection = key.split('/')[0];
          const config = this.getCacheConfig(collection);
          
          if (config.persistent && this.isCacheValid(data, collection)) {
            this.cache.set(key, data);
          }
        });
        
        // ✅ LIMPO: Só loga se debug mode ativo
        this.debugLog(`Cache persistente carregado: ${this.cache.size} entradas`);
      }
    } catch (error) {
      // ✅ LIMPO: Erro sempre é mostrado (importante)
      console.warn('⚠️ Erro ao carregar cache persistente:', error);
      localStorage.removeItem('universal_firestore_cache');
    }
  }

  // 💾 Salvar cache persistente (silencioso)
  savePersistentCache() {
    try {
      const persistentData = {};
      
      for (const [key, data] of this.cache.entries()) {
        const collection = key.split('/')[0];
        const config = this.getCacheConfig(collection);
        
        if (config.persistent && this.isCacheValid(data, collection)) {
          persistentData[key] = data;
        }
      }
      
      localStorage.setItem('universal_firestore_cache', JSON.stringify(persistentData));
    } catch (error) {
      // ✅ LIMPO: Erro importante sempre é mostrado
      console.warn('⚠️ Erro ao salvar cache persistente:', error);
    }
  }

  // 🧹 Limpeza automática (silenciosa)
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  cleanup() {
    let removed = 0;
    
    for (const [key, data] of this.cache.entries()) {
      const collection = key.split('/')[0];
      if (!this.isCacheValid(data, collection)) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      this.debugLog(`Cache cleanup: ${removed} entradas removidas`);
      this.savePersistentCache();
    }
  }

  // 📄 Cache para documento único
  async cachedGetDoc(collectionName, documentId) {
    const cacheKey = this.getCacheKey(collectionName, documentId);
    
    // Verificar cache
    const cached = this.cache.get(cacheKey);
    if (this.isCacheValid(cached, collectionName)) {
      this.cacheHits++;
      this.debugLog(`Cache hit: ${cacheKey}`);
      return {
        exists: () => !!cached.data,
        data: () => cached.data,
        id: documentId,
        fromCache: true
      };
    }

    // Evitar requests duplicados
    if (this.pendingRequests.has(cacheKey)) {
      this.debugLog(`Aguardando request pendente: ${cacheKey}`);
      return await this.pendingRequests.get(cacheKey);
    }

    // Fazer request ao Firestore
    const promise = this.fetchDocument(collectionName, documentId, cacheKey);
    this.pendingRequests.set(cacheKey, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  // 🔥 Buscar documento do Firestore
  async fetchDocument(collectionName, documentId, cacheKey) {
    try {
      // ✅ LIMPO: Log para debug tool (será interceptado silenciosamente)
      console.log(`🔥 UNIVERSAL CACHE READ: ${collectionName}/${documentId}`);
      
      const docRef = doc(db, collectionName, documentId);
      const docSnap = await getDoc(docRef);
      
      // Salvar em cache
      const cacheData = {
        data: docSnap.exists() ? docSnap.data() : null,
        timestamp: Date.now(),
        exists: docSnap.exists()
      };
      
      this.cache.set(cacheKey, cacheData);
      
      // Salvar persistente se necessário (silencioso)
      const config = this.getCacheConfig(collectionName);
      if (config.persistent) {
        setTimeout(() => this.savePersistentCache(), 100);
      }
      
      this.debugLog(`Documento cached: ${cacheKey}`);
      
      return {
        exists: () => docSnap.exists(),
        data: () => docSnap.exists() ? docSnap.data() : undefined,
        id: documentId,
        fromCache: false
      };
      
    } catch (error) {
      // ✅ LIMPO: Erro importante sempre é mostrado
      console.error(`❌ Erro ao buscar ${collectionName}/${documentId}:`, error);
      throw error;
    }
  }

  // 📋 Cache para queries
  async cachedGetDocs(collectionName, queryConstraints = []) {
    const queryParams = this.serializeQuery(queryConstraints);
    const cacheKey = this.getCacheKey(collectionName, null, queryParams);
    
    // Verificar cache
    const cached = this.queryCache.get(cacheKey);
    if (this.isCacheValid(cached, collectionName)) {
      this.cacheHits++;
      this.debugLog(`Query cache hit: ${cacheKey}`);
      return {
        docs: cached.docs.map(doc => ({
          id: doc.id,
          data: () => doc.data,
          exists: true
        })),
        size: cached.docs.length,
        fromCache: true
      };
    }

    // Evitar requests duplicados
    if (this.pendingRequests.has(cacheKey)) {
      this.debugLog(`Aguardando query pendente: ${cacheKey}`);
      return await this.pendingRequests.get(cacheKey);
    }

    // Fazer query ao Firestore
    const promise = this.fetchQuery(collectionName, queryConstraints, cacheKey);
    this.pendingRequests.set(cacheKey, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  // 🔥 Executar query no Firestore
  async fetchQuery(collectionName, queryConstraints, cacheKey) {
    try {
      // ✅ LIMPO: Log para debug tool
      console.log(`🔥 UNIVERSAL CACHE QUERY: ${collectionName} (${queryConstraints.length} constraints)`);
      
      let q = collection(db, collectionName);
      
      if (queryConstraints.length > 0) {
        q = query(q, ...queryConstraints);
      }
      
      const querySnapshot = await getDocs(q);
      
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }));
      
      // Salvar em cache
      const cacheData = {
        docs,
        timestamp: Date.now(),
        size: docs.length
      };
      
      this.queryCache.set(cacheKey, cacheData);
      
      this.debugLog(`Query cached: ${cacheKey} (${docs.length} docs)`);
      
      return {
        docs: querySnapshot.docs,
        size: querySnapshot.size,
        fromCache: false
      };
      
    } catch (error) {
      console.error(`❌ Erro na query ${collectionName}:`, error);
      throw error;
    }
  }

  // 🔄 Serializar query para cache key
  serializeQuery(constraints) {
    return constraints.map(constraint => {
      if (constraint._delegate) {
        const delegate = constraint._delegate;
        return {
          type: delegate.type,
          field: delegate.field?.segments?.join('.'),
          op: delegate.op,
          value: delegate.value
        };
      }
      return constraint.toString();
    }).join('|');
  }

  // 🗑️ Invalidar cache de uma collection
  invalidateCollection(collectionName) {
    let removed = 0;
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(collectionName + '/')) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    for (const key of this.queryCache.keys()) {
      if (key.startsWith(collectionName + '/')) {
        this.queryCache.delete(key);
        removed++;
      }
    }
    
    this.debugLog(`Cache invalidado para ${collectionName}: ${removed} entradas`);
    this.savePersistentCache();
  }

  // 🗑️ Invalidar cache específico
  invalidateDocument(collectionName, documentId) {
    const cacheKey = this.getCacheKey(collectionName, documentId);
    const removed = this.cache.delete(cacheKey);
    
    if (removed) {
      this.debugLog(`Cache invalidado: ${cacheKey}`);
      this.savePersistentCache();
    }
  }

  // 📊 Estatísticas do cache
  getStats() {
    const collections = {};
    
    for (const key of this.cache.keys()) {
      const collection = key.split('/')[0];
      if (!collections[collection]) {
        collections[collection] = { docs: 0, queries: 0 };
      }
      collections[collection].docs++;
    }
    
    for (const key of this.queryCache.keys()) {
      const collection = key.split('/')[0];
      if (!collections[collection]) {
        collections[collection] = { docs: 0, queries: 0 };
      }
      collections[collection].queries++;
    }
    
    const hitRate = this.readCount > 0 ? 
      Math.round((this.cacheHits / (this.readCount + this.cacheHits)) * 100) : 0;
    
    return {
      totalDocs: this.cache.size,
      totalQueries: this.queryCache.size,
      totalReads: this.readCount,
      cacheHits: this.cacheHits,
      hitRate: `${hitRate}%`,
      collections,
      pendingRequests: this.pendingRequests.size
    };
  }

  // 🧹 Limpar todo o cache
  clearAll() {
    this.cache.clear();
    this.queryCache.clear();
    this.listeners.clear();
    this.pendingRequests.clear();
    localStorage.removeItem('universal_firestore_cache');
    console.log('🧹 Cache universal completamente limpo');
  }

  // ✅ Restaurar console.log original
  restoreOriginalConsole() {
    if (this.originalLog) {
      console.log = this.originalLog;
      console.log('🔧 Console.log original restaurado');
    }
  }
}

// 🌟 Instância singleton
const universalCache = new UniversalFirestoreCache();

// ✅ EXPOSER DEBUG MODE GLOBALMENTE (para desenvolvimento)
if (typeof window !== 'undefined') {
  window.enableCacheDebug = () => universalCache.setDebugMode(true);
  window.disableCacheDebug = () => universalCache.setDebugMode(false);
}

// 🔧 Funções wrapper
export const cachedGetDoc = async (collectionName, documentId) => {
  return await universalCache.cachedGetDoc(collectionName, documentId);
};

export const cachedGetDocs = async (collectionName, ...queryConstraints) => {
  return await universalCache.cachedGetDocs(collectionName, queryConstraints);
};

export const invalidateCache = (collectionName, documentId = null) => {
  if (documentId) {
    universalCache.invalidateDocument(collectionName, documentId);
  } else {
    universalCache.invalidateCollection(collectionName);
  }
};

export const getCacheStats = () => {
  return universalCache.getStats();
};

export const clearAllCache = () => {
  universalCache.clearAll();
};

export const restoreConsole = () => {
  universalCache.restoreOriginalConsole();
};

// ✅ NOVO: Enable/disable debug mode
export const enableDebugMode = () => {
  universalCache.setDebugMode(true);
};

export const disableDebugMode = () => {
  universalCache.setDebugMode(false);
};

export default universalCache;