// src/components/ui/NotificationsDropdown.jsx
import { useNotificationContext } from "../../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  ShoppingBag,
  FileText,
  AlertCircle,
  Check,
  X,
  Sparkles,
} from "lucide-react"; // Adicione X

const getNotificationIcon = (type) => {
  switch (type) {
    case "new_order":
      return <ShoppingBag className="h-4 w-4 text-green-500" />;
    case "new_quote_request":
      return <FileText className="h-4 w-4 text-blue-500" />;
    case "order_status_change":
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case "system_update":
      return <Sparkles className="h-4 w-4 text-green-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

const NotificationsDropdown = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationContext();
  const navigate = useNavigate();

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Atualização da app: abre a lista "O que há de novo" (VersionBadge).
    if (notification.type === "system_update") {
      window.dispatchEvent(new Event("nonato:open-changelog"));
      return;
    }

    // Navegar para a página apropriada baseado no tipo
    switch (notification.type) {
      case "new_order":
        navigate(`/app//orcamento-online`);
        break;
      case "new_quote_request":
        navigate(`/app/orcamento-online`);
        break;
      default:
        navigate("/app/orcamento-online");
        break;
    }
  };

  const handleDelete = async (e, notificationId) => {
    e.stopPropagation(); // Evita que o clique no X acione o clique na notificação
    await deleteNotification(notificationId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground hover:bg-white/5"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 p-0 flex items-center justify-center">
              <span className="text-[10px]">{unreadCount}</span>
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80"
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <span className="text-sm font-medium text-foreground">Notificações</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              {unreadCount} nova{unreadCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="py-2 max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`px-4 py-3 focus:bg-white/5 cursor-pointer ${
                  !notification.read ? "bg-white/5" : ""
                }`}
                onSelect={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3 w-full">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1">
                    <p className="text-sm text-foreground font-medium">
                      {notification.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(notification.createdAt.toDate(), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-red-400 hover:bg-red-500/20"
                    onClick={(e) => handleDelete(e, notification.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-4 py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/70 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          )}
        </div>
        <div className="p-2 border-t border-border flex justify-between">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground hover:bg-white/5"
            onClick={() => navigate("/app/notifications")}
          >
            Ver todas
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground hover:bg-white/5"
              onClick={markAllAsRead}
            >
              <Check className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsDropdown;
