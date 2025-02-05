import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';

export class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Verificar configuração de emails autorizados
          const configDoc = await getDoc(doc(db, 'config', 'authorizedEmails'));
          
          if (!configDoc.exists()) {
            // Criar documento de configuração se não existir
            await setDoc(doc(db, 'config', 'authorizedEmails'), {
              emails: ["sergionunoribeiro@gmail.com", "service.nonato@gmail.com"]
            });
          }

          const authorizedEmails = configDoc.exists() ? configDoc.data()?.emails || [] : [];

          // Verificar se o email está autorizado
          if (!authorizedEmails.includes(firebaseUser.email)) {
            await auth.signOut();
            throw new AuthorizationError("Usuário não autorizado para acessar o sistema.");
          }

          // Verificar/criar documento do usuário
          const userDoc = doc(db, 'users', firebaseUser.uid);
          const userSnapshot = await getDoc(userDoc);

          let userData;
          if (!userSnapshot.exists()) {
            // Criar novo documento de usuário
            userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              createdAt: new Date(),
              lastLogin: new Date(),
              role: firebaseUser.email === "sergionunoribeiro@gmail.com" ? "admin" : "client",
              // Adicionar campo para indicar método de login
              authProvider: firebaseUser.providerData[0]?.providerId || 'password'
            };
            await setDoc(userDoc, userData);
          } else {
            userData = userSnapshot.data();
            // Atualizar último login
            await setDoc(userDoc, { 
              lastLogin: new Date(),
              // Atualizar informações que podem ter mudado
              displayName: firebaseUser.displayName || userData.displayName,
              photoURL: firebaseUser.photoURL || userData.photoURL
            }, { merge: true });
          }

          setUser({ ...firebaseUser, ...userData });
        } catch (error) {
          console.error('Erro ao processar usuário:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);


  return { user, loading };
}

// Função para adicionar um email autorizado
export async function addAuthorizedEmail(email) {
  try {
    const configRef = doc(db, 'config', 'authorizedEmails');
    const configDoc = await getDoc(configRef);
    
    if (!configDoc.exists()) {
      // Se o documento não existir, criar com o array inicial
      await setDoc(configRef, {
        emails: [email, "sergionunoribeiro@gmail.com", "service.nonato@gmail.com"]
      });
    } else {
      // Se existir, adicionar o novo email
      await setDoc(configRef, {
        emails: arrayUnion(email)
      }, { merge: true });
    }
  } catch (error) {
    console.error('Erro ao adicionar email autorizado:', error);
    throw error;
  }
}