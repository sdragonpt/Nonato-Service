// src/context/TabsContext.jsx
// Sistema de abas múltiplas (como o protótipo do cliente) por cima do
// React Router já existente. Cada rota visitada dentro de "/app/*" vira
// uma aba; fechar uma aba não perde os dados, só sai da rota.
//
// Só guarda { id, path, label, iconKey, closable } em cada aba — nunca o
// componente de ícone em si — para dar para persistir em localStorage.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getTabMetaForPath } from "@/config/navigationItems.jsx";

const TABS_STORAGE_KEY = "nonato-open-tabs";
const MAX_OPEN_TABS = 12;

const DASHBOARD_TAB = {
  id: "/app/dashboard",
  path: "/app/dashboard",
  label: "Dashboard",
  iconKey: "Home",
  closable: false,
};

function loadPersistedTabs() {
  if (typeof window === "undefined") return [DASHBOARD_TAB];
  try {
    const raw = window.localStorage.getItem(TABS_STORAGE_KEY);
    if (!raw) return [DASHBOARD_TAB];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [DASHBOARD_TAB];
    // Garante que a aba do Dashboard existe sempre e não é fechável,
    // mesmo que o localStorage tenha ficado com dados antigos/corrompidos.
    const withoutDashboard = parsed.filter((t) => t && t.path && t.path !== DASHBOARD_TAB.path);
    return [DASHBOARD_TAB, ...withoutDashboard];
  } catch {
    return [DASHBOARD_TAB];
  }
}

const TabsContext = createContext(null);

export function TabsProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabs, setTabs] = useState(loadPersistedTabs);
  const [activePath, setActivePath] = useState(DASHBOARD_TAB.path);

  // Persistir sempre que a lista de abas mudar.
  useEffect(() => {
    try {
      window.localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
    } catch {
      // localStorage indisponível/cheio — não é crítico, ignora.
    }
  }, [tabs]);

  // Sempre que a rota muda (navegação por Link, botão, etc.), regista/ativa
  // a aba correspondente automaticamente.
  useEffect(() => {
    const pathname = location.pathname;
    if (!pathname.startsWith("/app/")) return;

    setActivePath(pathname);
    setTabs((prev) => {
      if (prev.some((t) => t.path === pathname)) return prev;

      const meta = getTabMetaForPath(pathname);
      const newTab = {
        id: pathname,
        path: pathname,
        label: meta.label,
        iconKey: meta.iconKey || "FileText",
        closable: meta.closable !== false,
      };

      const next = [...prev, newTab];
      if (next.length <= MAX_OPEN_TABS) return next;

      // Excede o limite: descarta a aba fechável mais antiga (nunca a 1ª/dashboard).
      const evictIndex = next.findIndex((t) => t.closable);
      if (evictIndex === -1) return next;
      return next.filter((_, i) => i !== evictIndex);
    });
  }, [location.pathname]);

  const openTab = useCallback(
    (path) => {
      if (path === location.pathname) return;
      navigate(path);
    },
    [navigate, location.pathname]
  );

  const closeTab = useCallback(
    (path) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.path === path);
        if (idx === -1) return prev;
        const tab = prev[idx];
        if (!tab.closable) return prev;

        const next = prev.filter((t) => t.path !== path);

        if (activePath === path) {
          const fallback = next[idx - 1] || next[idx] || next[0] || DASHBOARD_TAB;
          navigate(fallback.path);
        }

        return next;
      });
    },
    [activePath, navigate]
  );

  const closeOtherTabs = useCallback(
    (path) => {
      setTabs((prev) => prev.filter((t) => !t.closable || t.path === path));
      if (activePath !== path) navigate(path);
    },
    [activePath, navigate]
  );

  const closeAllTabs = useCallback(() => {
    setTabs((prev) => prev.filter((t) => !t.closable));
    navigate(DASHBOARD_TAB.path);
  }, [navigate]);

  const value = useMemo(
    () => ({ tabs, activePath, openTab, closeTab, closeOtherTabs, closeAllTabs }),
    [tabs, activePath, openTab, closeTab, closeOtherTabs, closeAllTabs]
  );

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error("useTabs() só pode ser usado dentro de <TabsProvider>.");
  }
  return ctx;
}
