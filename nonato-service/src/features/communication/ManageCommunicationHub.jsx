// src/features/communication/ManageCommunicationHub.jsx
// Hub de Comunicação — mensagens internas entre equipa (admin, gestores,
// técnicos internos/externos). Equivalente ao "hub-comunicacao" do
// protótipo do cliente, adaptado ao modelo de utilizadores desta app.
//
// Modelo de dados (coleção "mensagensInternas"):
//   { conversationId, remetenteId, remetenteNome, destinatarioId,
//     destinatarioNome, mensagem, dataEnvio, lida, lidaEm,
//     entregue, entregueEm }
// "entregue" é marcado pela app do destinatário assim que a mensagem lhe
// chega (hooks/useUnreadMessages.js); "lida" quando abre a conversa.
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
import { getInitials } from "../../utils/getInitials.js";
import { MessageCircle, Send, Loader2, Users, Check, CheckCheck, ArrowLeft } from "lucide-react";

import { Textarea } from "@/components/ui/textarea.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { ScrollArea } from "@/components/ui/scroll-area.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { PageHeader, SearchInput, EmptyState } from "../../components/app";

const formatTime = (ts) =>
  ts?.toDate
    ? ts.toDate().toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;

// Estado de uma mensagem enviada: a enviar → enviada (✓) → entregue (✓✓) → vista (✓✓ verde).
const ReceiptIcon = ({ message }) => {
  if (!message.dataEnvio) {
    return <Loader2 className="h-3 w-3 animate-spin" aria-label="A enviar" />;
  }
  if (message.lida) {
    const when = formatTime(message.lidaEm);
    return (
      <span title={when ? `Vista em ${when}` : "Vista"} className="inline-flex">
        <CheckCheck className="h-3.5 w-3.5 text-sky-300" aria-label="Vista" />
      </span>
    );
  }
  if (message.entregue) {
    const when = formatTime(message.entregueEm);
    return (
      <span title={when ? `Entregue em ${when}` : "Entregue"} className="inline-flex">
        <CheckCheck className="h-3.5 w-3.5" aria-label="Entregue" />
      </span>
    );
  }
  return (
    <span title="Enviada" className="inline-flex">
      <Check className="h-3.5 w-3.5" aria-label="Enviada" />
    </span>
  );
};

function conversationIdFor(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
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
          batch.update(doc(db, "mensagensInternas", m.id), {
            lida: true,
            lidaEm: serverTimestamp(),
            entregue: true,
          });
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

  const lastSeenMineId = [...messages]
    .reverse()
    .find((m) => m.remetenteId === user?.uid && m.lida)?.id;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Hub de Comunicação"
        description="Mensagens internas entre administração, gestores e técnicos"
        icon={MessageCircle}
        actions={totalUnread > 0 && <Badge variant="danger">{totalUnread} por ler</Badge>}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="surface overflow-hidden shadow-elev">
        <div className="grid h-[calc(100dvh-14rem)] min-h-[460px] grid-cols-1 md:grid-cols-[300px_1fr]">
          {/* Lista de contactos (no telemóvel some quando há conversa aberta) */}
          <div
            className={`min-h-0 flex-col border-border md:flex md:border-r ${
              selectedContact ? "hidden" : "flex"
            }`}
          >
            <div className="border-b border-border p-3">
              <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Pesquisar colega…" />
            </div>

            <ScrollArea className="flex-1">
              {loadingContacts ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Sem colegas"
                  description='Adicione utilizadores com papel de Gestor ou Técnico em "Gerenciar Usuários".'
                  className="border-0 bg-transparent"
                />
              ) : (
                <div className="space-y-0.5 p-2">
                  {filteredContacts.map((contact) => {
                    const unread = unreadByContact[contact.uid] || 0;
                    const isActive = selectedContact?.uid === contact.uid;
                    return (
                      <button
                        key={contact.uid}
                        type="button"
                        onClick={() => setSelectedContact(contact)}
                        className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                          isActive ? "bg-primary/15" : "hover:bg-white/5"
                        }`}
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={contact.photoURL || ""} alt={contact.displayName} />
                          <AvatarFallback className="bg-muted text-xs text-foreground/90">
                            {getInitials(contact.displayName || contact.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm ${unread > 0 ? "font-semibold" : "font-medium"}`}>
                            {contact.displayName || contact.email}
                          </p>
                          <Badge className={`${getRoleBadgeStyle(contact.role)} mt-0.5 px-1.5 py-0 text-[10px]`}>
                            {getRoleLabel(contact.role)}
                          </Badge>
                        </div>
                        {unread > 0 && (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
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
          <div className={`min-h-0 flex-col ${selectedContact ? "flex" : "hidden md:flex"}`}>
            {!selectedContact ? (
              <EmptyState
                icon={MessageCircle}
                title="Nenhuma conversa aberta"
                description="Escolha um colega à esquerda para iniciar ou continuar uma conversa."
                className="my-auto border-0 bg-transparent"
              />
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-border px-3 py-2.5 sm:px-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 md:hidden"
                    onClick={() => setSelectedContact(null)}
                    aria-label="Voltar aos contactos"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={selectedContact.photoURL || ""} alt={selectedContact.displayName} />
                    <AvatarFallback className="bg-muted text-xs">
                      {getInitials(selectedContact.displayName || selectedContact.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {selectedContact.displayName || selectedContact.email}
                    </p>
                    <p className="text-xs text-muted-foreground">{getRoleLabel(selectedContact.role)}</p>
                  </div>
                </div>

                <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-black/10 p-3 sm:p-5">
                  {loadingMessages ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Ainda não há mensagens. Diga olá!
                    </p>
                  ) : (
                    messages.map((m) => {
                      const isMine = m.remetenteId === user?.uid;
                      const seenWhen = m.id === lastSeenMineId ? formatTime(m.lidaEm) : null;
                      return (
                        <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                          <div
                            className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[70%] ${
                              isMine
                                ? "rounded-br-md bg-primary text-primary-foreground"
                                : "rounded-bl-md bg-muted text-foreground"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{m.mensagem}</p>
                            <p
                              className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                                isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}
                            >
                              {formatTime(m.dataEnvio) || "A enviar…"}
                              {isMine && <ReceiptIcon message={m} />}
                            </p>
                          </div>
                          {seenWhen && (
                            <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">Vista {seenWhen}</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <form
                  onSubmit={handleSend}
                  className="flex items-end gap-2 border-t border-border p-3 sm:p-4"
                >
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escreva uma mensagem… (Enter envia, Shift+Enter muda de linha)"
                    rows={1}
                    className="max-h-32 min-h-[42px] resize-none rounded-xl"
                  />
                  <Button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="h-[42px] w-[42px] shrink-0 rounded-xl"
                    size="icon"
                    aria-label="Enviar"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Enviada</span>
        <span className="inline-flex items-center gap-1"><CheckCheck className="h-3.5 w-3.5" /> Entregue (a app do colega recebeu)</span>
        <span className="inline-flex items-center gap-1"><CheckCheck className="h-3.5 w-3.5 text-sky-400" /> Vista</span>
      </p>
    </div>
  );
};

export default ManageCommunicationHub;
