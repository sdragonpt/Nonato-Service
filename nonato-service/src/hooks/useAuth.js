import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
          // Verificar/criar documento do usuário no Firestore
          const userDoc = doc(db, 'users', firebaseUser.uid);
          const userSnapshot = await getDoc(userDoc);

          if (!userSnapshot.exists()) {
            // Se é a primeira vez do usuário, criar documento
            await setDoc(userDoc, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              createdAt: new Date(),
              lastLogin: new Date()
            });
          } else {
            // Atualizar último login
            await setDoc(userDoc, { lastLogin: new Date() }, { merge: true });
          }

          // Combinar dados do Auth com dados do Firestore
          const userData = userSnapshot.exists() 
            ? { ...firebaseUser, ...userSnapshot.data() }
            : firebaseUser;

          setUser(userData);
        } catch (error) {
          console.error('Erro ao processar usuário:', error);
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