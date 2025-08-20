import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, arrayUnion } from "firebase/firestore";
import { db, firebaseApp } from "../firebase";

export class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    const auth = getAuth(firebaseApp);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Verificar se é um usuário anônimo
          if (firebaseUser.isAnonymous) {
            setUser(null);
            setLoading(false);
            return;
          }

          // ✅ OTIMIZADO: Verificação rápida de autorização
          const configRef = doc(db, "config", "authorizedEmails");
          const configDoc = await getDoc(configRef);

          if (!configDoc.exists()) {
            await setDoc(configRef, {
              emails: [
                "sergionunoribeiro@gmail.com",
                "service.nonato@gmail.com",
              ],
            });
          }

          const authorizedEmails = configDoc.exists()
            ? configDoc.data()?.emails || []
            : [];

          if (!authorizedEmails.includes(firebaseUser.email)) {
            await auth.signOut();
            throw new AuthorizationError(
              "Usuário não autorizado para acessar o sistema."
            );
          }

          // ✅ OTIMIZADO: Busca dados do usuário rapidamente
          const userDoc = doc(db, "users", firebaseUser.uid);
          const userSnapshot = await getDoc(userDoc);

          let userData;

          if (!userSnapshot.exists()) {
            // ✅ Criar usuário se não existir (primeira vez)
            userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || "",
              photoURL: firebaseUser.photoURL || "",
              createdAt: new Date(),
              lastLogin: new Date(),
              role:
                firebaseUser.email === "sergionunoribeiro@gmail.com" ||
                firebaseUser.email === "service.nonato@gmail.com"
                  ? "admin"
                  : "client",
              authProvider:
                firebaseUser.providerData[0]?.providerId || "password",
            };
            await setDoc(userDoc, userData);
          } else {
            userData = userSnapshot.data();
            // ✅ OTIMIZADO: Update mínimo e async (não bloqueia UI)
            setDoc(
              userDoc,
              {
                lastLogin: new Date(),
                displayName: firebaseUser.displayName || userData.displayName,
                photoURL: firebaseUser.photoURL || userData.photoURL,
              },
              { merge: true }
            ).catch(console.error); // Fire and forget
          }

          setUser({ ...firebaseUser, ...userData });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Erro ao processar usuário:", error);
        setUser(null);

        // Se for erro de autorização, não faz mais tentativas
        if (error instanceof AuthorizationError) {
          // Usuário será redirecionado pelo ProtectedRoute
        }
      } finally {
        // ✅ OTIMIZADO: Loading muito mais rápido
        if (initialLoad) {
          setInitialLoad(false);
          // Primeiro load: delay mínimo para evitar flash
          setTimeout(() => setLoading(false), 100);
        } else {
          // Subsequent loads: instantâneo
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [initialLoad]);

  return {
    user,
    loading: initialLoad || loading, // Só mostra loading no primeiro carregamento
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
  };
}

// Função para adicionar um email autorizado
export async function addAuthorizedEmail(email) {
  try {
    const configRef = doc(db, "config", "authorizedEmails");
    const configDoc = await getDoc(configRef);

    if (!configDoc.exists()) {
      await setDoc(configRef, {
        emails: [
          email,
          "sergionunoribeiro@gmail.com",
          "service.nonato@gmail.com",
        ],
      });
    } else {
      await setDoc(
        configRef,
        {
          emails: arrayUnion(email),
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.error("Erro ao adicionar email autorizado:", error);
    throw error;
  }
}
