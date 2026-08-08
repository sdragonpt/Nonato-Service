// src/hooks/useUnreadMessages.js
// Contagem em tempo real de mensagens internas por ler (coleção
// "mensagensInternas"), para uso global na app — ex.: bolinha flutuante do
// Hub de Comunicação, visível em qualquer página. Mesma lógica que já
// existia dentro de ManageCommunicationHub.jsx, só que partilhável.
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./useAuth";

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, "mensagensInternas"),
      where("destinatarioId", "==", user.uid),
      where("lida", "==", false)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => setUnreadCount(snapshot.size),
      (err) => console.error("Erro ao contar mensagens não lidas:", err)
    );

    return () => unsubscribe();
  }, [user?.uid]);

  return unreadCount;
};
