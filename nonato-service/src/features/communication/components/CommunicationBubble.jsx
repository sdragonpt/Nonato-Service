// src/features/communication/components/CommunicationBubble.jsx
// Bolinha flutuante, sempre visível em qualquer página da app, para abrir o
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

  // Não faz sentido mostrar o atalho quando já estamos no Hub
  if (location.pathname === HUB_PATH) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(HUB_PATH)}
      aria-label="Abrir Hub de Comunicação"
      className="fixed bottom-6 left-6 md:left-[300px] z-40 h-12 w-12 rounded-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/30 flex items-center justify-center transition-transform hover:scale-105"
    >
      <MessageCircle className="h-5 w-5 text-white" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center border-2 border-zinc-900">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
};

export default CommunicationBubble;
