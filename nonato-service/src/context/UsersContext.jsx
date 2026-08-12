// UsersContext.jsx - Cache global de utilizadores para reduzir leituras do Firebase
//
// Mesmo padrão do ClientsContext.jsx/EquipmentsContext.jsx: um único sítio
// busca a coleção "users" e partilha o resultado com toda a app. Antes
// deste contexto existir, a coleção inteira era descarregada da Firestore
// em cerca de 8 sítios diferentes (diálogos de agendamento, dashboard,
// central de comunicação, gestão de técnicos, etc.).
//
// ✅ Tempo real (onSnapshot) em vez de "ler uma vez + cache com prazo de
// validade" — mesma razão dos outros dois contextos: sessões longas não
// se beneficiavam de uma cache de 5 min, e a lista de utilizadores muda
// muito raramente, por isso o custo do listener é baixo.
//
// Tal como os outros contextos, este cache é PREGUIÇOSO (lazy): só liga o
// listener quando o primeiro componente chama ensureUsers().

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

const UsersContext = createContext();

export const UsersProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [usersMap, setUsersMap] = useState(new Map());
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
        query(collection(db, "users")),
        (snapshot) => {
          // users não tem exclusão suave (sem campo eliminadoEm)
          const list = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
          const map = new Map(list.map((u) => [u.id, u]));

          latestListRef.current = list;
          setUsers(list);
          setUsersMap(map);
          setIsLoading(false);
          setError(null);

          if (!resolved) {
            resolved = true;
            resolve(list);
          }
        },
        (err) => {
          console.error("Erro ao ouvir utilizadores:", err);
          setError("Erro ao carregar utilizadores");
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

  // Função principal: chamar isto em vez de getDocs(collection(db, "users")).
  const ensureUsers = useCallback(async () => {
    startListening();
    if (latestListRef.current !== null) return latestListRef.current;
    return firstSnapshotPromiseRef.current;
  }, [startListening]);

  // Com tempo real os dados já se atualizam sozinhos — mantido por
  // compatibilidade com quem já chamava refreshUsers().
  const refreshUsers = useCallback(() => ensureUsers(), [ensureUsers]);

  const getUserById = useCallback(
    (id) => usersMap.get(id) || null,
    [usersMap]
  );

  const contextValue = {
    users,
    isLoading,
    error,
    isCacheValid: !!unsubscribeRef.current,

    ensureUsers,
    refreshUsers,

    getUserById,
  };

  return (
    <UsersContext.Provider value={contextValue}>
      {children}
    </UsersContext.Provider>
  );
};

// Hook exportado separadamente para evitar problemas com Fast Refresh
function useUsers() {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error("useUsers must be used within UsersProvider");
  }
  return context;
}

export { useUsers };
