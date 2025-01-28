import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const authorizedEmails = ["sergionunoribeiro@gmail.com", "service.nonato@gmail.com"];

          if (!authorizedEmails.includes(firebaseUser.email)) {
            console.warn("Usuário não autorizado:", firebaseUser.email);
            setUser(null);
            setLoading(false);
            return;
          }

          const userDoc = doc(db, "users", firebaseUser.uid);
          const userSnapshot = await getDoc(userDoc);

          if (userSnapshot.exists() && userSnapshot.data().isAuthorized) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || "",
              photoURL: firebaseUser.photoURL || "",
              role: userSnapshot.data().role || "client", // Adiciona o role aqui
              ...userSnapshot.data(),
            });
          } else {
            console.warn("Usuário não autorizado no Firestore");
            setUser(null);
          }
        } catch (err) {
          console.error("Erro ao verificar autorização:", err);
          setError("Erro ao verificar autorização");
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  return { user, loading, error };
}
