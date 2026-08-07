// ClientsContext.jsx - Cache global de clientes para reduzir leituras do Firebase
//
// Mesmo padrão do CategoriesContext.jsx (já em uso e a funcionar): um único
// sítio busca a coleção "clientes" e partilha o resultado com toda a app,
// em vez de cada página/formulário fazer o seu próprio getDocs(collection
// (db, "clientes")).
//
// Diferença importante: este cache é PREGUIÇOSO (lazy) — ao contrário das
// categorias, não busca nada assim que a app abre. Só vai à Firestore
// quando o primeiro componente que precisa de clientes chama
// ensureClients() (normalmente dentro de um useEffect). Isto evita leituras
// desnecessárias em páginas onde o utilizador nunca chega a mexer no campo
// de cliente.

import { createContext, useContext, useState, useRef, useCallback } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../firebase.jsx";

const ClientsContext = createContext();

// Cache por 5 minutos (igual ao CategoriesContext)
const CACHE_DURATION = 5 * 60 * 1000;

export const ClientsProvider = ({ children }) => {
  const [clients, setClients] = useState([]);
  const [clientsMap, setClientsMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Refs (não causam re-render) para controlar frescura da cache e evitar
  // pedidos duplicados quando vários componentes montam ao mesmo tempo
  const lastFetchRef = useRef(null);
  const inFlightRef = useRef(null);

  const doFetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const snapshot = await getDocs(query(collection(db, "clientes")));
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      const map = new Map(list.map((c) => [c.id, c]));

      setClients(list);
      setClientsMap(map);
      lastFetchRef.current = Date.now();

      return list;
    } catch (err) {
      console.error("Erro ao buscar clientes:", err);
      setError("Erro ao carregar clientes");
      return [];
    } finally {
      setIsLoading(false);
      inFlightRef.current = null;
    }
  }, []);

  // Função principal: chamar isto em vez de getDocs(collection(db, "clientes")).
  // Só busca à Firestore se ainda não tiver dados, se a cache já tiver mais
  // de 5 minutos, ou se forceRefresh=true. Se já houver um pedido em curso
  // (ex.: duas páginas a montar ao mesmo tempo), partilha a mesma promessa
  // em vez de disparar dois pedidos em paralelo.
  const ensureClients = useCallback(
    async (forceRefresh = false) => {
      const isFresh =
        !forceRefresh &&
        lastFetchRef.current &&
        Date.now() - lastFetchRef.current < CACHE_DURATION;

      if (isFresh) return clients;

      if (inFlightRef.current) return inFlightRef.current;

      inFlightRef.current = doFetch();
      return inFlightRef.current;
    },
    [clients, doFetch]
  );

  // Força atualização (ex.: depois de criar/editar um cliente e quereres
  // garantir que a lista partilhada fica já correta)
  const refreshClients = useCallback(() => ensureClients(true), [ensureClients]);

  const getClientById = useCallback(
    (id) => clientsMap.get(id) || null,
    [clientsMap]
  );

  // Atualizações otimistas da cache (evitam ter de voltar a ler tudo da
  // Firestore só porque um cliente foi criado/editado/removido nesta sessão)
  const addClientToCache = useCallback((newClient) => {
    setClients((prev) => [...prev, newClient]);
    setClientsMap((prev) => new Map(prev).set(newClient.id, newClient));
  }, []);

  const updateClientInCache = useCallback((clientId, updatedData) => {
    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, ...updatedData } : c))
    );
    setClientsMap((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(clientId);
      if (current) newMap.set(clientId, { ...current, ...updatedData });
      return newMap;
    });
  }, []);

  const removeClientFromCache = useCallback((clientId) => {
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    setClientsMap((prev) => {
      const newMap = new Map(prev);
      newMap.delete(clientId);
      return newMap;
    });
  }, []);

  const contextValue = {
    // Estado
    clients,
    isLoading,
    error,
    isCacheValid:
      !!lastFetchRef.current &&
      Date.now() - lastFetchRef.current < CACHE_DURATION,

    // Buscar (preguiçoso, partilhado)
    ensureClients,
    refreshClients,

    // Leitura do cache
    getClientById,

    // Gestão do cache
    addClientToCache,
    updateClientInCache,
    removeClientFromCache,
  };

  return (
    <ClientsContext.Provider value={contextValue}>
      {children}
    </ClientsContext.Provider>
  );
};

// Hook exportado separadamente para evitar problemas com Fast Refresh
function useClients() {
  const context = useContext(ClientsContext);
  if (!context) {
    throw new Error("useClients must be used within ClientsProvider");
  }
  return context;
}

export { useClients };
