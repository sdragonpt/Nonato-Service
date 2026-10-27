// src/features/communication/components/CommunicationBubble.jsx
// Botão flutuante, sempre visível em qualquer página da app, para abrir o
// Hub de Comunicação rapidamente. Mostra o número de mensagens por ler em
// tempo real. Fica no canto inferior esquerdo para não colidir com os FABs
// de canto inferior direito que várias páginas já têm.
import { useLocation, useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useUnreadMessages } from "../../../hooks/useUnreadMessages.js";

const HUB_PATH = "/app/hub-comunicacao";

const CommunicationBubble = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const unreadCount = useUnreadMessages();
  const hasUnread = unreadCount > 0;

  // Não faz sentido mostrar o atalho quando já estamos no Hub
  if (location.pathname === HUB_PATH) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(HUB_PATH)}
      aria-label={hasUnread ? `Abrir Hub de Comunicação (${unreadCount} por ler)` : "Abrir Hub de Comunicação"}
      title="Mensagens"
      className={`fixed bottom-[calc(1rem+var(--safe-bottom))] left-4 z-40 flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 hover:-translate-y-0.5 md:left-[304px] ${
        hasUnread
          ? "bg-primary text-primary-foreground shadow-glow"
          : "glass text-primary hover:bg-white/10"
      }`}
    >
      {hasUnread && (
        <span className="absolute inset-0 animate-ping rounded-2xl bg-primary/40 [animation-duration:2.5s]" aria-hidden />
      )}
      <MessageCircle className="relative h-5 w-5" />
      {hasUnread && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-red-500 px-1 text-[10px] font-bold text-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
};

export default CommunicationBubble;
