// ClientsContext.jsx - Cache global de clientes para reduzir leituras do Firebase
//
// Mesmo padrão do CategoriesContext.jsx (já em uso e a funcionar): um único
// sítio busca a coleção "clientes" e partilha o resultado com toda a app,
// em vez de cada página/formulário fazer o seu próprio getDocs(collection
// (db, "clientes")).
//
// ✅ Tempo real (onSnapshot) em vez de "ler uma vez + cache com prazo de
// validade": a app fica aberta muitas horas seguidas (não são só 5 min),
// por isso uma cache com prazo continuava a reler a coleção inteira várias
// vezes ao longo do dia mesmo sem nada ter mudado. Com onSnapshot, paga-se
// a leitura completa uma única vez (quando o primeiro componente pede
// clientes) e, a partir daí, só chegam as alterações pontuais — muito mais
// barato num dia de uso normal, e os dados ficam sempre atualizados entre
// todos os que têm a app aberta, sem precisar de refresh.
//
// A API pública mantém-se igual à versão anterior (ensureClients,
// getClientById, addClientToCache, etc.) para não ser preciso tocar nos
// ficheiros que já a usam.

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../firebase.jsx";

const ClientsContext = createContext();

export const ClientsProvider = ({ children }) => {
  const [clients, setClients] = useState([]);
  const [clientsMap, setClientsMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const unsubscribeRef = useRef(null);
  const latestListRef = useRef(null);
  const firstSnapshotPromiseRef = useRef(null);

  // Só liga o listener quando o primeiro componente pedir clientes
  // (ensureClients) — evita gastar uma leitura em sessões que nunca
  // chegam a mexer em nada relacionado com clientes.
  const startListening = useCallback(() => {
    if (unsubscribeRef.current) return firstSnapshotPromiseRef.current;

    setIsLoading(true);
    firstSnapshotPromiseRef.current = new Promise((resolve) => {
      let resolved = false;
      const resolveOnce = (list) => {
        if (!resolved) {
          resolved = true;
          resolve(list);
        }
      };

      // ✅ Se algum código tiver feito um getDoc a um cliente específico
      // antes disto, esse documento fica na cache local da Firestore e
      // pode gerar um 1º snapshot "fromCache" incompleto. Só resolve com
      // um snapshot confirmado pelo servidor, para quem chamou
      // ensureClients() não ficar com uma lista parcial; o timeout evita
      // bloquear para sempre se não houver ligação.
      const fallbackTimer = setTimeout(() => {
        if (latestListRef.current !== null) resolveOnce(latestListRef.current);
      }, 4000);

      const unsub = onSnapshot(
        query(collection(db, "clientes")),
        (snapshot) => {
          // ✅ Clientes com eliminadoEm (exclusão suave, ver ClientDetail.jsx
          // e ManageClients.jsx) ficam de fora — desaparecem de imediato de
          // todos os pickers/selects de cliente em toda a app.
          const list = snapshot.docs
            .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
            .filter((c) => !c.eliminadoEm);
          const map = new Map(list.map((c) => [c.id, c]));

          latestListRef.current = list;
          setClients(list);
          setClientsMap(map);
          setIsLoading(false);
          setError(null);

          if (!snapshot.metadata.fromCache) {
            clearTimeout(fallbackTimer);
            resolveOnce(list);
          }
        },
        (err) => {
          console.error("Erro ao ouvir clientes:", err);
          setError("Erro ao carregar clientes");
          setIsLoading(false);
          clearTimeout(fallbackTimer);
          resolveOnce([]);
        }
      );
      unsubscribeRef.current = unsub;
    });

    return firstSnapshotPromiseRef.current;
  }, []);

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, []);

  // Função principal: chamar isto em vez de getDocs(collection(db, "clientes")).
  // Devolve os dados mais recentes já disponíveis, ou espera pela 1ª leitura.
  const ensureClients = useCallback(async () => {
    startListening();
    if (latestListRef.current !== null) return latestListRef.current;
    return firstSnapshotPromiseRef.current;
  }, [startListening]);

  // Com tempo real os dados já se atualizam sozinhos — mantido por
  // compatibilidade com quem já chamava refreshClients() depois de criar/
  // editar um cliente.
  const refreshClients = useCallback(() => ensureClients(), [ensureClients]);

  const getClientById = useCallback(
    (id) => clientsMap.get(id) || null,
    [clientsMap]
  );

  // Atualizações otimistas da cache — com o listener em tempo real já não
  // são estritamente necessárias (a alteração chega sozinha), mas ficam
  // para a UI atualizar no instante, sem esperar a viagem de ida e volta
  // à Firestore.
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
    isCacheValid: !!unsubscribeRef.current,

    // Buscar (tempo real, partilhado)
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
