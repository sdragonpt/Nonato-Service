// OrcamentosContext.jsx - Cache global de orçamentos para reduzir leituras do Firebase
//
// Mesmo padrão do ClientsContext.jsx/EquipmentsContext.jsx/UsersContext.jsx:
// um único sítio busca a coleção "orcamentos" e partilha o resultado com
// toda a app. Antes deste contexto existir, a coleção inteira era
// descarregada da Firestore em cerca de 6 sítios diferentes (ManageAlerts,
// ManageClients, ManageDebtors, ManageReportsLibrary, ManageFinances e a
// secção financeira de ClientDetail), cada um com o seu próprio getDocs —
// vários deles com uma cache própria de 5 min (ver src/utils/sessionCache.js)
// só para não repetir a mesma leitura completa várias vezes por sessão.
//
// ✅ Tempo real (onSnapshot) em vez de "ler uma vez + cache com prazo de
// validade": a app fica aberta muitas horas seguidas, por isso uma cache
// com prazo continuava a reler a coleção inteira várias vezes ao longo do
// dia. Com onSnapshot paga-se a leitura completa uma vez (quando o primeiro
// componente pede orçamentos) e depois só chegam as alterações pontuais.
//
// Tal como os outros contextos, este cache é PREGUIÇOSO (lazy): só liga o
// listener quando o primeiro componente chama ensureOrcamentos().
//
// Nota: ManageBudgets.jsx (a listagem principal de orçamentos) NÃO usa este
// contexto — lê a coleção por lotes com cursor do Firestore (fetchPage, ver
// src/utils/firestorePage.js) porque é uma lista potencialmente grande com
// paginação/scroll infinito deliberados, o que não combina com um cache
// completo em memória.

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

const OrcamentosContext = createContext();

export const OrcamentosProvider = ({ children }) => {
  const [orcamentos, setOrcamentos] = useState([]);
  const [orcamentosMap, setOrcamentosMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const unsubscribeRef = useRef(null);
  const latestListRef = useRef(null);
  const firstSnapshotPromiseRef = useRef(null);

  // Só liga o listener quando o primeiro componente pedir orçamentos
  // (ensureOrcamentos) — evita gastar uma leitura em sessões que nunca
  // chegam a mexer em nada relacionado com orçamentos.
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

      // ✅ Se algum código tiver feito um getDoc a um orçamento específico
      // antes disto (ex.: EditBudget.jsx/EditSimpleBudget.jsx a abrir um
      // orçamento para editar), esse documento fica na cache local da
      // Firestore e pode gerar um 1º snapshot "fromCache" incompleto. Só
      // resolve com um snapshot confirmado pelo servidor, para quem chamou
      // ensureOrcamentos() não ficar com uma lista parcial; o timeout evita
      // bloquear para sempre se não houver ligação.
      const fallbackTimer = setTimeout(() => {
        if (latestListRef.current !== null) resolveOnce(latestListRef.current);
      }, 4000);

      const unsub = onSnapshot(
        query(collection(db, "orcamentos")),
        (snapshot) => {
          // orcamentos não tem exclusão suave (sem campo eliminadoEm) —
          // ver ManageBudgets.jsx (deleteDoc direto) e ManageRecycleBin.jsx
          // (não lista "orcamentos" entre os tipos recicláveis).
          const list = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
          const map = new Map(list.map((o) => [o.id, o]));

          latestListRef.current = list;
          setOrcamentos(list);
          setOrcamentosMap(map);
          setIsLoading(false);
          setError(null);

          if (!snapshot.metadata.fromCache) {
            clearTimeout(fallbackTimer);
            resolveOnce(list);
          }
        },
        (err) => {
          console.error("Erro ao ouvir orçamentos:", err);
          setError("Erro ao carregar orçamentos");
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

  // Função principal: chamar isto em vez de getDocs(collection(db, "orcamentos")).
  // Devolve os dados mais recentes já disponíveis, ou espera pela 1ª leitura.
  const ensureOrcamentos = useCallback(async () => {
    startListening();
    if (latestListRef.current !== null) return latestListRef.current;
    return firstSnapshotPromiseRef.current;
  }, [startListening]);

  // Com tempo real os dados já se atualizam sozinhos — mantido por
  // compatibilidade com quem já chamava refreshOrcamentos() depois de criar/
  // editar um orçamento.
  const refreshOrcamentos = useCallback(
    () => ensureOrcamentos(),
    [ensureOrcamentos]
  );

  const getOrcamentoById = useCallback(
    (id) => orcamentosMap.get(id) || null,
    [orcamentosMap]
  );

  // Atualizações otimistas da cache — com o listener em tempo real já não
  // são estritamente necessárias (a alteração chega sozinha), mas ficam
  // para a UI atualizar no instante, sem esperar a viagem de ida e volta
  // à Firestore.
  const addOrcamentoToCache = useCallback((newOrcamento) => {
    setOrcamentos((prev) => [...prev, newOrcamento]);
    setOrcamentosMap((prev) => new Map(prev).set(newOrcamento.id, newOrcamento));
  }, []);

  const updateOrcamentoInCache = useCallback((orcamentoId, updatedData) => {
    setOrcamentos((prev) =>
      prev.map((o) => (o.id === orcamentoId ? { ...o, ...updatedData } : o))
    );
    setOrcamentosMap((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(orcamentoId);
      if (current) newMap.set(orcamentoId, { ...current, ...updatedData });
      return newMap;
    });
  }, []);

  const removeOrcamentoFromCache = useCallback((orcamentoId) => {
    setOrcamentos((prev) => prev.filter((o) => o.id !== orcamentoId));
    setOrcamentosMap((prev) => {
      const newMap = new Map(prev);
      newMap.delete(orcamentoId);
      return newMap;
    });
  }, []);

  const contextValue = {
    // Estado
    orcamentos,
    isLoading,
    error,
    isCacheValid: !!unsubscribeRef.current,

    // Buscar (tempo real, partilhado)
    ensureOrcamentos,
    refreshOrcamentos,

    // Leitura do cache
    getOrcamentoById,

    // Gestão do cache
    addOrcamentoToCache,
    updateOrcamentoInCache,
    removeOrcamentoFromCache,
  };

  return (
    <OrcamentosContext.Provider value={contextValue}>
      {children}
    </OrcamentosContext.Provider>
  );
};

// Hook exportado separadamente para evitar problemas com Fast Refresh
function useOrcamentos() {
  const context = useContext(OrcamentosContext);
  if (!context) {
    throw new Error("useOrcamentos must be used within OrcamentosProvider");
  }
  return context;
}

export { useOrcamentos };
