import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

/** Contas dono — as únicas no código (ver isOwner() em firestore.rules). */
export const OWNER_EMAILS = ["sergionunoribeiro@gmail.com", "service.nonato@gmail.com"];

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
          // Verificar se é um usuário anônimo
          if (firebaseUser.isAnonymous) {
            // Usuários anônimos são permitidos, mas não são considerados autenticados
            // para fins de acesso à plataforma
            setUser(null);
            setLoading(false);
            return;
          }

          // Verificar configuração de emails autorizados
          const configDoc = await getDoc(doc(db, 'config', 'authorizedEmails'));
          
          if (!configDoc.exists()) {
            // Criar documento de configuração se não existir
            // Só as contas dono ficam no código; todos os outros acessos são
            // geridos na app (Gerir Utilizadores).
            await setDoc(doc(db, 'config', 'authorizedEmails'), {
              emails: OWNER_EMAILS
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
            // Convite feito por um admin (AddUser.jsx): traz a função e o nome
            // escolhidos. As regras da Firestore só aceitam esta função se o
            // convite existir — ninguém se promove a si próprio.
            let invite = null;
            try {
              const inviteSnap = await getDoc(doc(db, 'authorized_profiles', firebaseUser.email));
              if (inviteSnap.exists()) invite = inviteSnap.data();
            } catch (err) {
              console.warn('Não foi possível ler o convite do utilizador:', err);
            }

            // Criar novo documento de usuário
            userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || invite?.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              createdAt: new Date(),
              lastLogin: new Date(),
              role: firebaseUser.email === "sergionunoribeiro@gmail.com" ? "admin" : invite?.role || "client",
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
        emails: [email, ...OWNER_EMAILS]
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

/**
 * Retira o acesso a um email (e apaga o convite, se houver). As contas dono
 * nunca são retiradas.
 */
export async function revokeAuthorizedEmail(email) {
  if (OWNER_EMAILS.includes(email)) return;
  await setDoc(doc(db, 'config', 'authorizedEmails'), {
    emails: arrayRemove(email)
  }, { merge: true });
  await deleteDoc(doc(db, 'authorized_profiles', email));
}