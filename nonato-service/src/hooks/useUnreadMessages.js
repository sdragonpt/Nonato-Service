// src/hooks/useUnreadMessages.js
// Contagem em tempo real de mensagens internas por ler (coleção
// "mensagensInternas"), para uso global na app — ex.: bolinha flutuante do
// Hub de Comunicação, visível em qualquer página. Mesma lógica que já
// existia dentro de ManageCommunicationHub.jsx, só que partilhável.
//
// Também marca as mensagens recebidas como "entregues" (entregue/entregueEm):
// como este hook corre em qualquer página enquanto a app está aberta, é o
// sítio certo para o remetente saber que a mensagem chegou, mesmo antes de
// ser vista no Hub (essa parte é o campo "lida"/"lidaEm").
import { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  writeBatch,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./useAuth";

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  // Ids já enviados para marcar como entregues (evita escrever duas vezes
  // enquanto o snapshot seguinte ainda não chegou).
  const deliveringRef = useRef(new Set());

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
      (snapshot) => {
        setUnreadCount(snapshot.size);

        const pending = snapshot.docs.filter(
          (d) => !d.data().entregue && !deliveringRef.current.has(d.id)
        );
        if (pending.length === 0) return;
        const batch = writeBatch(db);
        pending.forEach((d) => {
          deliveringRef.current.add(d.id);
          batch.update(doc(db, "mensagensInternas", d.id), {
            entregue: true,
            entregueEm: serverTimestamp(),
          });
        });
        batch.commit().catch((err) => {
          pending.forEach((d) => deliveringRef.current.delete(d.id));
          console.error("Erro ao marcar mensagens como entregues:", err);
        });
      },
      (err) => console.error("Erro ao contar mensagens não lidas:", err)
    );

    return () => unsubscribe();
  }, [user?.uid]);

  return unreadCount;
};
