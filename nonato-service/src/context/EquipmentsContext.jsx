// EquipmentsContext.jsx - Cache global de equipamentos para reduzir leituras do Firebase
//
// Mesmo padrão do ClientsContext.jsx: um único sítio busca a coleção
// "equipamentos" e partilha o resultado com toda a app, em vez de cada
// página/formulário fazer o seu próprio getDocs(collection(db,
// "equipamentos")). Antes deste contexto existir, a coleção inteira era
// descarregada da Firestore em mais de 10 sítios diferentes (AddOrder,
// EditOrder, ManageOrders, formulários de agendamento, etc.).
//
// ✅ Tempo real (onSnapshot) em vez de "ler uma vez + cache com prazo de
// validade": a app fica aberta muitas horas seguidas, por isso uma cache
// com prazo continuava a reler a coleção inteira várias vezes ao longo do
// dia. Com onSnapshot paga-se a leitura completa uma vez (quando o primeiro
// componente pede equipamentos) e depois só chegam as alterações pontuais.
//
// Tal como antes, este cache é PREGUIÇOSO (lazy): só liga o listener
// quando o primeiro componente chama ensureEquipments().

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

const EquipmentsContext = createContext();

export const EquipmentsProvider = ({ children }) => {
  const [equipments, setEquipments] = useState([]);
  const [equipmentsMap, setEquipmentsMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const unsubscribeRef = useRef(null);
  const latestListRef = useRef(null);
  const firstSnapshotPromiseRef = useRef(null);

  const startListening = useCallback(() => {
    if (unsubscribeRef.current) return firstSnapshotPromiseRef.current;

    setIsLoading(true);
    firstSnapshotPromiseRef.current = new Promise((resolve) => {
      let resolved = false;
      const unsub = onSnapshot(
        query(collection(db, "equipamentos")),
        (snapshot) => {
          // equipamentos não tem exclusão suave (sem campo eliminadoEm)
          const list = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
          const map = new Map(list.map((e) => [e.id, e]));

          latestListRef.current = list;
          setEquipments(list);
          setEquipmentsMap(map);
          setIsLoading(false);
          setError(null);

          if (!resolved) {
            resolved = true;
            resolve(list);
          }
        },
        (err) => {
          console.error("Erro ao ouvir equipamentos:", err);
          setError("Erro ao carregar equipamentos");
          setIsLoading(false);
          if (!resolved) {
            resolved = true;
            resolve([]);
          }
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

  // Função principal: chamar isto em vez de getDocs(collection(db, "equipamentos")).
  const ensureEquipments = useCallback(async () => {
    startListening();
    if (latestListRef.current !== null) return latestListRef.current;
    return firstSnapshotPromiseRef.current;
  }, [startListening]);

  // Com tempo real os dados já se atualizam sozinhos — mantido por
  // compatibilidade com quem já chamava refreshEquipments().
  const refreshEquipments = useCallback(
    () => ensureEquipments(),
    [ensureEquipments]
  );

  const getEquipmentById = useCallback(
    (id) => equipmentsMap.get(id) || null,
    [equipmentsMap]
  );

  // Atualizações otimistas da cache — mantidas para a UI atualizar no
  // instante, sem esperar a viagem de ida e volta à Firestore.
  const addEquipmentToCache = useCallback((newEquipment) => {
    setEquipments((prev) => [...prev, newEquipment]);
    setEquipmentsMap((prev) => new Map(prev).set(newEquipment.id, newEquipment));
  }, []);

  const updateEquipmentInCache = useCallback((equipmentId, updatedData) => {
    setEquipments((prev) =>
      prev.map((e) => (e.id === equipmentId ? { ...e, ...updatedData } : e))
    );
    setEquipmentsMap((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(equipmentId);
      if (current) newMap.set(equipmentId, { ...current, ...updatedData });
      return newMap;
    });
  }, []);

  const removeEquipmentFromCache = useCallback((equipmentId) => {
    setEquipments((prev) => prev.filter((e) => e.id !== equipmentId));
    setEquipmentsMap((prev) => {
      const newMap = new Map(prev);
      newMap.delete(equipmentId);
      return newMap;
    });
  }, []);

  const contextValue = {
    equipments,
    isLoading,
    error,
    isCacheValid: !!unsubscribeRef.current,

    ensureEquipments,
    refreshEquipments,

    getEquipmentById,

    addEquipmentToCache,
    updateEquipmentInCache,
    removeEquipmentFromCache,
  };

  return (
    <EquipmentsContext.Provider value={contextValue}>
      {children}
    </EquipmentsContext.Provider>
  );
};

// Hook exportado separadamente para evitar problemas com Fast Refresh
function useEquipments() {
  const context = useContext(EquipmentsContext);
  if (!context) {
    throw new Error("useEquipments must be used within EquipmentsProvider");
  }
  return context;
}

export { useEquipments };
