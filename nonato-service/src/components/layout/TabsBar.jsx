// src/components/layout/TabsBar.jsx
// Barra de abas (estilo VSCode/browser) fixa por baixo do header do
// Dashboard. Mesma linguagem visual do resto da app: fundo zinc-800/900,
// acento verde na aba ativa, framer-motion nas transições.
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
      className={`group relative flex items-center gap-2 shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all border ${
        isActive
          ? "bg-green-600/20 text-green-400 border-green-500/30 shadow-sm shadow-green-500/10"
          : "bg-zinc-800/40 text-zinc-400 border-transparent hover:bg-zinc-700/50 hover:text-white"
      }`}
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-green-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
      <span className="max-w-[140px] truncate">{tab.label}</span>
      {tab.closable && (
        <span
          role="button"
          tabIndex={-1}
          onClick={handleClose}
          className="ml-0.5 shrink-0 rounded p-0.5 text-zinc-500 opacity-0 transition-opacity hover:bg-zinc-600/60 hover:text-white group-hover:opacity-100"
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
    <div className="sticky top-16 z-20 border-b border-zinc-700/50 bg-zinc-800/60 backdrop-blur-xl">
      <div className="flex items-center gap-2 px-4 py-2">
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700/60 scrollbar-track-transparent">
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
            className="shrink-0 rounded-lg border border-zinc-700/50 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 transition-all hover:bg-zinc-700/50 hover:text-white"
            title="Fechar todas as abas"
          >
            Fechar todas
          </button>
        )}
      </div>
    </div>
  );
}