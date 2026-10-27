// src/components/layout/TabsBar.jsx
// Barra de abas (estilo browser) por baixo do título, dentro do topo em vidro
// do DashboardShell (src/App.jsx). Não tem fundo nem blur próprios — herda o
// vidro do topo, para não somar mais uma camada de blur.
//
// Alteração: removido mode="popLayout" do AnimatePresence. Esse modo é a
// causa mais provável do erro "Failed to execute 'removeChild'/'insertBefore'
// on 'Node'" — é um bug conhecido do Framer Motion quando popLayout corre
// ao mesmo tempo que o React troca conteúdo via Suspense/lazy loading
// (que acontece sempre que se abre uma página nova, porque cada rota é
// lazy-loaded e o TabsContext acrescenta logo uma aba nova).

import React, { useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, FileText } from "lucide-react";
import { useTabs } from "@/context/TabsContext.jsx";
import { ICON_MAP } from "@/config/navigationItems.jsx";
import { cn } from "@/lib/utils";

const TabChip = React.memo(function TabChip({ tab, isActive, onSelect, onClose }) {
  const Icon = ICON_MAP[tab.iconKey] || FileText;

  const handleClose = useCallback(
    (e) => {
      e.stopPropagation();
      onClose(tab.path);
    },
    [onClose, tab.path]
  );

  // Fechar com o botão do meio do rato (comportamento comum em browsers).
  const handleAuxClick = useCallback(
    (e) => {
      if (e.button === 1 && tab.closable) {
        e.preventDefault();
        onClose(tab.path);
      }
    },
    [onClose, tab.path, tab.closable]
  );

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      onClick={() => onSelect(tab.path)}
      onAuxClick={handleAuxClick}
      title={tab.label}
      className={cn(
        "group relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
        isActive
          ? "bg-white/10 text-foreground shadow-sm ring-1 ring-inset ring-white/10"
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
      <span className="max-w-[140px] truncate">{tab.label}</span>
      {tab.closable && (
        <span
          role="button"
          tabIndex={-1}
          onClick={handleClose}
          className="ml-0.5 shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-white/10 hover:text-foreground group-hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </span>
      )}
    </motion.button>
  );
});

export default function TabsBar() {
  const { tabs, activePath, openTab, closeTab, closeAllTabs } = useTabs();

  const closableCount = tabs.filter((t) => t.closable).length;

  return (
    <div className="flex items-center gap-2 border-t border-white/5 px-2 py-1.5">
      <div className="flex flex-1 items-center gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {tabs.map((tab) => (
            <TabChip
              key={tab.path}
              tab={tab}
              isActive={tab.path === activePath}
              onSelect={openTab}
              onClose={closeTab}
            />
          ))}
        </AnimatePresence>
      </div>

      {closableCount > 1 && (
        <button
          type="button"
          onClick={closeAllTabs}
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          title="Fechar todas as abas"
        >
          Fechar todas
        </button>
      )}
    </div>
  );
}
