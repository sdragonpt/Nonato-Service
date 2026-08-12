// src/features/communication/ManageCommunicationHub.jsx
// Hub de Comunicação — mensagens internas entre equipa (admin, gestores,
// técnicos internos/externos). Equivalente ao "hub-comunicacao" do
// protótipo do cliente, adaptado ao modelo de utilizadores desta app.
//
// Modelo de dados (coleção "mensagensInternas"):
//   { conversationId, remetenteId, remetenteNome, destinatarioId,
//     destinatarioNome, mensagem, dataEnvio, lida }
// conversationId = [uidA, uidB] ordenados e juntos por "_" — permite
// consultar uma conversa 1-para-1 com uma única query, sem precisar de OR.

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { useAuth } from "../../hooks/useAuth";
import { useUsers } from "../../context/UsersContext.jsx";
import { getRoleLabel, getRoleBadgeStyle, isStaffRole } from "../../config/roles.js";
import { MessageCircle, Send, Loader2, Search, Users } from "lucide-react";

import { Card } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { ScrollArea } from "@/components/ui/scroll-area.jsx";

function conversationIdFor(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

function getInitials(name) {
  return (
    (name || "")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??"
  );
}

const ManageCommunicationHub = () => {
  const { user } = useAuth();
  const { ensureUsers } = useUsers();
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [unreadByContact, setUnreadByContact] = useState({});
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const scrollRef = useRef(null);

  // Lista de contactos (equipa interna, excluindo o próprio utilizador)
  useEffect(() => {
    if (!user?.uid) return;
    const fetchContacts = async () => {
      try {
        setLoadingContacts(true);
        const allUsers = await ensureUsers();
        const list = allUsers.filter(
          (u) => u.uid !== user.uid && isStaffRole(u.role)
        );
        setContacts(list);
      } catch (err) {
        console.error("Erro ao carregar contactos:", err);
        setError("Erro ao carregar a lista de contactos.");
      } finally {
        setLoadingContacts(false);
      }
    };
    fetchContacts();
  }, [user?.uid]);

  // Contagem de mensagens não lidas, em tempo real, agrupada por remetente
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "mensagensInternas"),
      where("destinatarioId", "==", user.uid),
      where("lida", "==", false)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const counts = {};
        snapshot.docs.forEach((d) => {
          const data = d.data();
          counts[data.remetenteId] = (counts[data.remetenteId] || 0) + 1;
        });
        setUnreadByContact(counts);
      },
      (err) => console.error("Erro ao subscrever mensagens não lidas:", err)
    );
    return () => unsubscribe();
  }, [user?.uid]);

  // Conversa selecionada, em tempo real
  useEffect(() => {
    if (!user?.uid || !selectedContact) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    const convId = conversationIdFor(user.uid, selectedContact.uid);
    const q = query(
      collection(db, "mensagensInternas"),
      where("conversationId", "==", convId),
      orderBy("dataEnvio", "asc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMessages(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingMessages(false);
      },
      (err) => {
        console.error("Erro ao carregar conversa:", err);
        setError("Erro ao carregar a conversa.");
        setLoadingMessages(false);
      }
    );
    return () => unsubscribe();
  }, [user?.uid, selectedContact]);

  // Marcar como lidas as mensagens recebidas do contacto selecionado
  useEffect(() => {
    if (!user?.uid || !selectedContact) return;
    const unreadFromContact = messages.filter(
      (m) => m.destinatarioId === user.uid && m.remetenteId === selectedContact.uid && !m.lida
    );
    if (unreadFromContact.length === 0) return;

    const markAsRead = async () => {
      try {
        const batch = writeBatch(db);
        unreadFromContact.forEach((m) => {
          batch.update(doc(db, "mensagensInternas", m.id), { lida: true });
        });
        await batch.commit();
      } catch (err) {
        console.error("Erro ao marcar mensagens como lidas:", err);
      }
    };
    markAsRead();
  }, [messages, selectedContact, user?.uid]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(
    async (e) => {
      e?.preventDefault();
      if (!draft.trim() || !selectedContact || !user?.uid) return;

      try {
        setSending(true);
        await addDoc(collection(db, "mensagensInternas"), {
          conversationId: conversationIdFor(user.uid, selectedContact.uid),
          remetenteId: user.uid,
          remetenteNome: user.displayName || user.email || "Utilizador",
          destinatarioId: selectedContact.uid,
          destinatarioNome: selectedContact.displayName || selectedContact.email,
          mensagem: draft.trim(),
          dataEnvio: serverTimestamp(),
          lida: false,
        });
        setDraft("");
      } catch (err) {
        console.error("Erro ao enviar mensagem:", err);
        setError("Erro ao enviar mensagem. Por favor, tente novamente.");
      } finally {
        setSending(false);
      }
    },
    [draft, selectedContact, user]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredContacts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return contacts
      .filter(
        (c) =>
          !term ||
          (c.displayName || "").toLowerCase().includes(term) ||
          (c.email || "").toLowerCase().includes(term)
      )
      .sort((a, b) => (unreadByContact[b.uid] || 0) - (unreadByContact[a.uid] || 0));
  }, [contacts, searchTerm, unreadByContact]);

  const totalUnread = Object.values(unreadByContact).reduce((sum, n) => sum + n, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageCircle className="h-8 w-8 text-green-500" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            Hub de Comunicação
            {totalUnread > 0 && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                {totalUnread} por ler
              </Badge>
            )}
          </h1>
          <p className="text-sm text-zinc-400">
            Mensagens internas entre administração, gestores e técnicos
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <Card className="bg-zinc-800 border-zinc-700 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-[560px] max-h-[70vh]">
          {/* Lista de contactos */}
          <div className="border-b md:border-b-0 md:border-r border-zinc-700 flex flex-col">
            <div className="p-3 border-b border-zinc-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="Pesquisar colega..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500 h-9"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {loadingContacts ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Users className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">
                    Sem colegas de equipa registados ainda. Adiciona utilizadores com papel de
                    Gestor ou Técnico em "Gerenciar Usuários".
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-700/50">
                  {filteredContacts.map((contact) => {
                    const unread = unreadByContact[contact.uid] || 0;
                    const isActive = selectedContact?.uid === contact.uid;
                    return (
                      <button
                        key={contact.uid}
                        type="button"
                        onClick={() => setSelectedContact(contact)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                          isActive ? "bg-green-600/20" : "hover:bg-zinc-700/40"
                        }`}
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={contact.photoURL || ""} alt={contact.displayName} />
                          <AvatarFallback className="bg-zinc-700 text-zinc-300 text-xs">
                            {getInitials(contact.displayName || contact.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">
                            {contact.displayName || contact.email}
                          </p>
                          <Badge
                            className={`${getRoleBadgeStyle(contact.role)} text-[10px] px-1.5 py-0 mt-0.5`}
                          >
                            {getRoleLabel(contact.role)}
                          </Badge>
                        </div>
                        {unread > 0 && (
                          <span className="shrink-0 h-5 min-w-5 px-1 rounded-full bg-green-500 text-zinc-900 text-[11px] font-bold flex items-center justify-center">
                            {unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Conversa */}
          <div className="flex flex-col">
            {!selectedContact ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <MessageCircle className="h-10 w-10 text-zinc-600 mb-3" />
                <p className="text-zinc-400 text-sm">
                  Seleciona um colega à esquerda para iniciar ou continuar uma conversa.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-700">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedContact.photoURL || ""} />
                    <AvatarFallback className="bg-zinc-700 text-zinc-300 text-xs">
                      {getInitials(selectedContact.displayName || selectedContact.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {selectedContact.displayName || selectedContact.email}
                    </p>
                    <p className="text-xs text-zinc-500">{getRoleLabel(selectedContact.role)}</p>
                  </div>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingMessages ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-zinc-500 py-8">
                      Ainda não há mensagens. Diz olá!
                    </p>
                  ) : (
                    messages.map((m) => {
                      const isMine = m.remetenteId === user?.uid;
                      return (
                        <div
                          key={m.id}
                          className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                              isMine
                                ? "bg-green-600 text-white rounded-br-sm"
                                : "bg-zinc-700 text-zinc-100 rounded-bl-sm"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{m.mensagem}</p>
                            <p
                              className={`text-[10px] mt-1 ${
                                isMine ? "text-green-100/70" : "text-zinc-400"
                              }`}
                            >
                              {m.dataEnvio?.toDate
                                ? m.dataEnvio.toDate().toLocaleString("pt-PT", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "A enviar..."}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form
                  onSubmit={handleSend}
                  className="flex items-end gap-2 p-3 border-t border-zinc-700"
                >
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escreve uma mensagem... (Enter para enviar, Shift+Enter para nova linha)"
                    rows={1}
                    className="min-h-[40px] max-h-32 resize-none bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                  <Button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="bg-green-600 hover:bg-green-700 shrink-0"
                    size="icon"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ManageCommunicationHub;
