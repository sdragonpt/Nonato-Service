// src/components/ui/NotificationsDropdown.jsx
import React from "react";
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
} from "lucide-react"; // Adicione X

const getNotificationIcon = (type) => {
  switch (type) {
    case "new_order":
      return <ShoppingBag className="h-4 w-4 text-green-500" />;
    case "new_quote_request":
      return <FileText className="h-4 w-4 text-blue-500" />;
    case "order_status_change":
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Bell className="h-4 w-4 text-zinc-400" />;
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
          className="relative text-zinc-400 hover:text-white hover:bg-zinc-700/50"
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
        className="w-80 bg-zinc-800 border-zinc-700"
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-700">
          <span className="text-sm font-medium text-white">Notificações</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-zinc-700 text-zinc-400">
              {unreadCount} nova{unreadCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="py-2 max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`px-4 py-3 focus:bg-zinc-700/50 cursor-pointer ${
                  !notification.read ? "bg-zinc-700/20" : ""
                }`}
                onSelect={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3 w-full">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">
                      {notification.title}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {notification.message}
                    </p>
                    <span className="text-xs text-zinc-500">
                      {formatDistanceToNow(notification.createdAt.toDate(), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-zinc-400 hover:text-red-400 hover:bg-red-500/20"
                    onClick={(e) => handleDelete(e, notification.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-4 py-8 text-center">
              <Bell className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">Nenhuma notificação</p>
            </div>
          )}
        </div>
        <div className="p-2 border-t border-zinc-700 flex justify-between">
          <Button
            variant="ghost"
            className="text-zinc-400 hover:text-white hover:bg-zinc-700/50"
            onClick={() => navigate("/app/notifications")}
          >
            Ver todas
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              className="text-zinc-400 hover:text-white hover:bg-zinc-700/50"
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
