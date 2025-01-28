import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
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

          // Verificar se o email está autorizado
          if (!authorizedEmails.includes(firebaseUser.email)) {
            console.warn("Usuário não autorizado:", firebaseUser.email);
            setUser(null);
            setLoading(false);
            return;
          }

          const userDoc = doc(db, "users", firebaseUser.uid);
          const userSnapshot = await getDoc(userDoc);

          if (!userSnapshot.exists()) {
            // Adiciona o usuário ao Firestore caso não exista
            console.log("Criando novo usuário no Firestore:", firebaseUser.email);
            await setDoc(userDoc, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || "Novo Usuário",
              photoURL: firebaseUser.photoURL || "",
              role: "client", // Define um papel padrão, como "client"
              isAuthorized: true, // Adiciona a autorização padrão
              createdAt: new Date(),
              lastLogin: new Date(),
            });
          } else {
            // Atualiza o último login para usuários existentes
            await setDoc(
              userDoc,
              { lastLogin: new Date() },
              { merge: true }
            );
          }

          // Define os dados do usuário no estado
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || "",
            photoURL: firebaseUser.photoURL || "",
            role: userSnapshot.exists() ? userSnapshot.data().role : "client",
            ...userSnapshot.data(),
          });
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
