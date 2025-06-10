// UniversalFirestoreCache.js - Cache para TODAS as operações do Firestore (CORRIGIDO)
import { 
  doc, 
  getDoc, 
  getDocs, 
  collection, 
  query,
  onSnapshot 
} from "firebase/firestore";
import { db } from "../firebase.jsx";

class UniversalFirestoreCache {
  constructor() {
    this.cache = new Map(); // Cache em memória
    this.queryCache = new Map(); // Cache para queries
    this.listeners = new Map(); // Cache para listeners
    this.pendingRequests = new Map(); // Evita requests duplicados
    this.readCount = 0; // Contador de leituras
    this.cacheHits = 0; // Contador de cache hits
    this.isLogging = false; // ✅ NOVO: Flag para evitar recursão
    
    // ✅ CONFIGURAÇÕES DE CACHE - 30 DIAS PARA TUDO
    this.cacheConfig = {
      // Cache longo - 30 dias para dados estáticos
      users: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true }, // 30 dias
      categorias: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true }, // 30 dias
      image_library: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true }, // 30 dias
      
      // ⭐ FOCO: Cache 30 dias para peças e loja pública
      pecas: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true }, // 30 dias
      shop_access_tokens: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true }, // 30 dias
      orcamentos_online: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true }, // 30 dias
      
      // Cache 30 dias para outros dados (para implementação futura)
      services: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true }, // 30 dias
      clients: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true }, // 30 dias
      orders: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true }, // 30 dias
      budgets: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true }, // 30 dias
      agendamentos: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true }, // 30 dias
      
      // Sem cache apenas para dados críticos em tempo real
      notifications: { ttl: 0, persistent: false },
      logs: { ttl: 0, persistent: false },
      
      // Cache padrão - 30 dias
      default: { ttl: 30 * 24 * 60 * 60 * 1000, persistent: true } // 30 dias
    };

    this.loadPersistentCache();
    this.startCleanup();
    this.setupInterception();
  }

  // 🔗 Interceptar todas as funções do Firestore (CORRIGIDO)
  setupInterception() {
    // ✅ CORREÇÃO: Salvar referência original ANTES de interceptar
    this.originalLog = console.log;
    
    console.log = (...args) => {
      // ✅ CORREÇÃO: Evitar recursão infinita
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

  // 📝 Log detalhado de leituras (CORRIGIDO)
  logRead(message) {
    // ✅ CORREÇÃO: Usar flag para evitar recursão
    this.isLogging = true;
    
    const timestamp = new Date().toISOString();
    
    // ✅ CORREÇÃO: Usar originalLog diretamente
    this.originalLog(`📊 [${timestamp}] FIRESTORE READ #${this.readCount}: ${message}`);
    
    // Emitir evento para debug tool
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('firestore-read', {
        detail: { count: this.readCount, message, timestamp }
      }));
    }
    
    // ✅ CORREÇÃO: Resetar flag
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
    if (config.ttl === 0) return false; // Sem cache
    
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
        
        // ✅ CORREÇÃO: Usar originalLog ou flag para evitar interceptação
        this.isLogging = true;
        console.log(`🗄️ Cache persistente carregado: ${this.cache.size} entradas`);
        this.isLogging = false;
      }
    } catch (error) {
      this.isLogging = true;
      console.warn('⚠️ Erro ao carregar cache persistente:', error);
      this.isLogging = false;
      localStorage.removeItem('universal_firestore_cache');
    }
  }

  // 💾 Salvar cache persistente
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
      this.isLogging = true;
      console.warn('⚠️ Erro ao salvar cache persistente:', error);
      this.isLogging = false;
    }
  }

  // 🧹 Limpeza automática
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // A cada 5 minutos
  }

  cleanup() {
    let removed = 0;
    const now = Date.now();
    
    for (const [key, data] of this.cache.entries()) {
      const collection = key.split('/')[0];
      if (!this.isCacheValid(data, collection)) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      this.isLogging = true;
      console.log(`🧹 Cache cleanup: ${removed} entradas removidas`);
      this.isLogging = false;
      this.savePersistentCache();
    }
  }

  // 📄 Cache para documento único (getDoc)
  async cachedGetDoc(collectionName, documentId) {
    const cacheKey = this.getCacheKey(collectionName, documentId);
    
    // Verificar cache
    const cached = this.cache.get(cacheKey);
    if (this.isCacheValid(cached, collectionName)) {
      this.cacheHits++;
      this.isLogging = true;
      console.log(`⚡ Cache hit: ${cacheKey}`);
      this.isLogging = false;
      return {
        exists: () => !!cached.data,
        data: () => cached.data,
        id: documentId,
        fromCache: true
      };
    }

    // Evitar requests duplicados
    if (this.pendingRequests.has(cacheKey)) {
      this.isLogging = true;
      console.log(`⏳ Aguardando request pendente: ${cacheKey}`);
      this.isLogging = false;
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
      // ✅ CORREÇÃO: Este log VAI ser interceptado, mas não causa recursão
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
      
      // Salvar persistente se necessário
      const config = this.getCacheConfig(collectionName);
      if (config.persistent) {
        setTimeout(() => this.savePersistentCache(), 100);
      }
      
      this.isLogging = true;
      console.log(`📥 Documento cached: ${cacheKey}`);
      this.isLogging = false;
      
      return {
        exists: () => docSnap.exists(),
        data: () => docSnap.exists() ? docSnap.data() : undefined,
        id: documentId,
        fromCache: false
      };
      
    } catch (error) {
      this.isLogging = true;
      console.error(`❌ Erro ao buscar ${collectionName}/${documentId}:`, error);
      this.isLogging = false;
      throw error;
    }
  }

  // 📋 Cache para queries (getDocs) - CORRIGIDO
  async cachedGetDocs(collectionName, queryConstraints = []) {
    const queryParams = this.serializeQuery(queryConstraints);
    const cacheKey = this.getCacheKey(collectionName, null, queryParams);
    
    // Verificar cache
    const cached = this.queryCache.get(cacheKey);
    if (this.isCacheValid(cached, collectionName)) {
      this.cacheHits++;
      this.isLogging = true;
      console.log(`⚡ Query cache hit: ${cacheKey}`);
      this.isLogging = false;
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
      this.isLogging = true;
      console.log(`⏳ Aguardando query pendente: ${cacheKey}`);
      this.isLogging = false;
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
      console.log(`🔥 UNIVERSAL CACHE QUERY: ${collectionName} (${queryConstraints.length} constraints)`);
      
      let q = collection(db, collectionName);
      
      // Aplicar constraints
      if (queryConstraints.length > 0) {
        q = query(q, ...queryConstraints);
      }
      
      const querySnapshot = await getDocs(q);
      
      // Processar resultados
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
      
      this.isLogging = true;
      console.log(`📥 Query cached: ${cacheKey} (${docs.length} docs)`);
      this.isLogging = false;
      
      return {
        docs: querySnapshot.docs,
        size: querySnapshot.size,
        fromCache: false
      };
      
    } catch (error) {
      this.isLogging = true;
      console.error(`❌ Erro na query ${collectionName}:`, error);
      this.isLogging = false;
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
    
    this.isLogging = true;
    console.log(`🗑️ Cache invalidado para ${collectionName}: ${removed} entradas`);
    this.isLogging = false;
    this.savePersistentCache();
  }

  // 🗑️ Invalidar cache específico
  invalidateDocument(collectionName, documentId) {
    const cacheKey = this.getCacheKey(collectionName, documentId);
    const removed = this.cache.delete(cacheKey);
    
    if (removed) {
      this.isLogging = true;
      console.log(`🗑️ Cache invalidado: ${cacheKey}`);
      this.isLogging = false;
      this.savePersistentCache();
    }
  }

  // 📊 Estatísticas do cache
  getStats() {
    const collections = {};
    
    // Estatísticas por collection
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
    this.isLogging = true;
    console.log('🧹 Cache universal completamente limpo');
    this.isLogging = false;
  }

  // ✅ NOVO: Método para restaurar console.log original
  restoreOriginalConsole() {
    if (this.originalLog) {
      console.log = this.originalLog;
      this.isLogging = true;
      console.log('🔧 Console.log original restaurado');
      this.isLogging = false;
    }
  }
}

// 🌟 Instância singleton
const universalCache = new UniversalFirestoreCache();

// 🔧 Funções wrapper para substituir as originais do Firestore
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

// ✅ NOVO: Função para emergência - restaurar console original
export const restoreConsole = () => {
  universalCache.restoreOriginalConsole();
};

export default universalCache;