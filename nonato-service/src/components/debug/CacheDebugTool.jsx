// CacheDebugTool.jsx - CORRIGIDO: Sem loop de re-render
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  getCacheStats,
  restoreConsole,
} from "../../context/UniversalFirestoreCache.js";
import {
  Activity,
  Database,
  Clock,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Monitor,
  X,
} from "lucide-react";

const CacheDebugTool = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState(() => getCacheStats()); // ✅ Lazy initial state
  const [reads, setReads] = useState([]);
  const [performance, setPerformance] = useState({
    totalSaved: 0,
    avgResponseTime: 0,
    lastHour: 0,
  });

  // ✅ CORREÇÃO: useRef para evitar re-creates
  const statsIntervalRef = useRef(null);
  const hourlyResetRef = useRef(null);

  // ✅ CORREÇÃO: useCallback para estabilizar handler
  const handleFirestoreRead = useCallback((event) => {
    const { count, message, timestamp } = event.detail;

    setReads((prev) => {
      const newRead = {
        id: Date.now(),
        count,
        message: message.slice(0, 100), // Truncar para evitar problemas
        timestamp,
        time: new Date(timestamp).toLocaleTimeString(),
      };

      // Manter apenas últimas 20 leituras (reduzido para performance)
      return [newRead, ...prev.slice(0, 19)];
    });

    // ✅ CORREÇÃO: Debounce performance updates
    setPerformance((prev) => ({
      ...prev,
      totalSaved: prev.totalSaved + 1,
      lastHour: prev.lastHour + 1,
    }));
  }, []);

  // ✅ CORREÇÃO: Event listener sem dependências problemáticas
  useEffect(() => {
    window.addEventListener("firestore-read", handleFirestoreRead);
    return () => {
      window.removeEventListener("firestore-read", handleFirestoreRead);
    };
  }, [handleFirestoreRead]);

  // ✅ CORREÇÃO: Stats update apenas quando modal está aberto
  useEffect(() => {
    if (!isOpen) {
      // Limpar interval se modal fechado
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      return;
    }

    // Atualizar stats apenas quando modal aberto
    const updateStats = () => {
      try {
        const newStats = getCacheStats();
        setStats(newStats);
      } catch (error) {
        console.warn("Erro ao obter stats do cache:", error);
      }
    };

    // Update inicial
    updateStats();

    // Interval apenas quando necessário
    statsIntervalRef.current = setInterval(updateStats, 3000); // Aumentado para 3s

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    };
  }, [isOpen]); // ✅ Apenas depende de isOpen

  // ✅ CORREÇÃO: Hourly reset com ref
  useEffect(() => {
    hourlyResetRef.current = setInterval(() => {
      setPerformance((prev) => ({
        ...prev,
        lastHour: 0,
      }));
    }, 60 * 60 * 1000); // 1 hora

    return () => {
      if (hourlyResetRef.current) {
        clearInterval(hourlyResetRef.current);
      }
    };
  }, []); // ✅ Sem dependências, executa uma vez

  // ✅ CORREÇÃO: Memoizar funções helper
  const formatMemory = useCallback((bytes) => {
    if (!bytes) return "0 B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }, []);

  const getHealthStatus = useCallback(() => {
    const hitRate = parseInt(stats.hitRate) || 0;
    if (hitRate >= 70)
      return {
        status: "excellent",
        color: "text-green-400",
        icon: CheckCircle,
      };
    if (hitRate >= 50)
      return { status: "good", color: "text-yellow-400", icon: Clock };
    return { status: "poor", color: "text-red-400", icon: AlertTriangle };
  }, [stats.hitRate]); // ✅ Apenas depende de hitRate

  const health = getHealthStatus();
  const HealthIcon = health.icon;

  // ✅ CORREÇÃO: Handlers estáveis
  const handleToggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleClearLogs = useCallback(() => {
    setReads([]);
    setPerformance({ totalSaved: 0, avgResponseTime: 0, lastHour: 0 });
  }, []);

  const handleRestoreConsole = useCallback(() => {
    restoreConsole();
    setReads([]);
  }, []);

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={handleToggleOpen}
          className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 group"
          title="Cache Debug Tool"
        >
          <div className="relative">
            <Database className="w-5 h-5" />
            {stats.cacheHits > 0 && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                {stats.cacheHits}
              </div>
            )}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-96 max-h-[80vh] overflow-hidden">
      {/* Header */}
      <div className="bg-purple-600 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-white" />
          <h3 className="text-white font-semibold">Cache Monitor</h3>
        </div>
        <button
          onClick={handleToggleOpen}
          className="text-white hover:text-purple-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Health Status */}
        <div className="bg-zinc-800 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">Cache Health</span>
            <div className="flex items-center gap-1">
              <HealthIcon className={`w-4 h-4 ${health.color}`} />
              <span className={`text-sm font-medium ${health.color}`}>
                {stats.hitRate}
              </span>
            </div>
          </div>
          <div className="w-full bg-zinc-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                health.status === "excellent"
                  ? "bg-green-500"
                  : health.status === "good"
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: stats.hitRate }}
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-800 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-zinc-400">Cache Hits</span>
            </div>
            <span className="text-xl font-bold text-white">
              {stats.cacheHits}
            </span>
          </div>

          <div className="bg-zinc-800 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs text-zinc-400">Total Reads</span>
            </div>
            <span className="text-xl font-bold text-white">
              {stats.totalReads}
            </span>
          </div>
        </div>

        {/* Collection Stats */}
        <div className="bg-zinc-800 p-3 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2">
            Collections Cached
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {Object.entries(stats.collections || {}).map(
              ([collection, data]) => (
                <div
                  key={collection}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm text-zinc-300">{collection}</span>
                  <div className="flex gap-2 text-xs">
                    <span className="text-blue-400">{data.docs || 0}d</span>
                    <span className="text-green-400">{data.queries || 0}q</span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Performance */}
        <div className="bg-zinc-800 p-3 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2">Performance</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Reads Saved:</span>
              <span className="text-green-400">{performance.totalSaved}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Last Hour:</span>
              <span className="text-blue-400">{performance.lastHour}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Pending:</span>
              <span className="text-yellow-400">
                {stats.pendingRequests || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Reads */}
        <div className="bg-zinc-800 p-3 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2">Recent Reads</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {reads.slice(0, 5).map((read) => (
              <div key={read.id} className="text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">#{read.count}</span>
                  <span className="text-zinc-500">{read.time}</span>
                </div>
                <div className="text-zinc-300 truncate">{read.message}</div>
              </div>
            ))}
            {reads.length === 0 && (
              <div className="text-xs text-zinc-500 text-center py-2">
                Nenhuma leitura recente
              </div>
            )}
          </div>
        </div>

        {/* Emergency Actions */}
        {process.env.NODE_ENV === "development" && (
          <div className="bg-red-900/20 border border-red-700 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-red-400 mb-2">
              Emergency Actions
            </h4>
            <div className="flex gap-2">
              <button
                onClick={handleRestoreConsole}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-2 px-3 rounded transition-colors"
                title="Restaurar console original se houver loop infinito"
              >
                <RefreshCw className="w-3 h-3 inline mr-1" />
                Fix Console
              </button>
              <button
                onClick={handleClearLogs}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs py-2 px-3 rounded transition-colors"
              >
                <Trash2 className="w-3 h-3 inline mr-1" />
                Clear Logs
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-zinc-800 p-2 border-t border-zinc-700">
        <div className="flex justify-between items-center text-xs text-zinc-400">
          <span>Universal Cache v2.1</span>
          <div className="flex items-center gap-1">
            <Monitor className="w-3 h-3" />
            <span>Stable</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CacheDebugTool;
