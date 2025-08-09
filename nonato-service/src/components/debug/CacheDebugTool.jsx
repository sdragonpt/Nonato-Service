// // CacheDebugTool.jsx - MELHORADO: Mostra TODAS as leituras do Firestore
// import React, { useState, useEffect, useCallback, useRef } from "react";
// import {
//   getCacheStats,
//   restoreConsole,
// } from "../../context/UniversalFirestoreCache.js";
// import {
//   Activity,
//   Database,
//   Clock,
//   Trash2,
//   RefreshCw,
//   AlertTriangle,
//   CheckCircle,
//   TrendingUp,
//   Monitor,
//   X,
//   Filter,
//   Eye,
//   BarChart3,
//   Zap,
//   Search,
// } from "lucide-react";

// const CacheDebugTool = () => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [stats, setStats] = useState(() => getCacheStats());
//   const [allReads, setAllReads] = useState([]); // ✅ TODAS as leituras
//   const [filteredReads, setFilteredReads] = useState([]);
//   const [selectedCollection, setSelectedCollection] = useState("all");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [showCacheHitsOnly, setShowCacheHitsOnly] = useState(false);

//   // ✅ NOVO: Estatísticas detalhadas
//   const [detailedStats, setDetailedStats] = useState({
//     totalReads: 0,
//     cacheHits: 0,
//     firestoreReads: 0,
//     readsByCollection: {},
//     readsByType: { getDoc: 0, getDocs: 0, query: 0 },
//     recentActivity: [],
//   });

//   const statsIntervalRef = useRef(null);
//   const maxReads = 1000; // ✅ Manter até 1000 leituras na memória

//   // ✅ MELHORADO: Handler para capturar TODAS as leituras
//   const handleFirestoreRead = useCallback((event) => {
//     const { count, message, timestamp } = event.detail;

//     // ✅ Parsear informações da mensagem
//     const isCacheHit = message.includes("Cache hit") || message.includes("⚡");
//     const isQuery = message.includes("QUERY") || message.includes("query");
//     const isGetDoc = message.includes("READ:") || message.includes("getDoc");

//     // Extrair collection da mensagem
//     let collection = "unknown";
//     const matches = message.match(/(?:READ:|QUERY:)\s*(\w+)(?:\/|$)/i);
//     if (matches) {
//       collection = matches[1];
//     } else if (message.includes("/")) {
//       const pathMatch = message.match(/(\w+)\/\w+/);
//       if (pathMatch) collection = pathMatch[1];
//     }

//     const newRead = {
//       id: Date.now() + Math.random(),
//       count,
//       message: message.slice(0, 200), // ✅ Mais caracteres
//       timestamp,
//       time: new Date(timestamp).toLocaleTimeString(),
//       collection,
//       isCacheHit,
//       type: isQuery ? "query" : isGetDoc ? "getDoc" : "other",
//       source: isCacheHit ? "cache" : "firestore",
//     };

//     setAllReads((prev) => {
//       const updated = [newRead, ...prev];
//       // ✅ Manter apenas as últimas N leituras para não sobrecarregar memória
//       return updated.slice(0, maxReads);
//     });

//     // ✅ Atualizar estatísticas detalhadas
//     setDetailedStats((prev) => ({
//       ...prev,
//       totalReads: prev.totalReads + 1,
//       cacheHits: isCacheHit ? prev.cacheHits + 1 : prev.cacheHits,
//       firestoreReads: !isCacheHit
//         ? prev.firestoreReads + 1
//         : prev.firestoreReads,
//       readsByCollection: {
//         ...prev.readsByCollection,
//         [collection]: (prev.readsByCollection[collection] || 0) + 1,
//       },
//       readsByType: {
//         ...prev.readsByType,
//         [newRead.type]: prev.readsByType[newRead.type] + 1,
//       },
//       recentActivity: [newRead, ...prev.recentActivity.slice(0, 9)], // Últimas 10
//     }));
//   }, []);

//   // ✅ Event listener
//   useEffect(() => {
//     window.addEventListener("firestore-read", handleFirestoreRead);
//     return () => {
//       window.removeEventListener("firestore-read", handleFirestoreRead);
//     };
//   }, [handleFirestoreRead]);

//   // ✅ FILTROS: Aplicar filtros nas leituras
//   useEffect(() => {
//     let filtered = allReads;

//     // Filtro por collection
//     if (selectedCollection !== "all") {
//       filtered = filtered.filter(
//         (read) => read.collection === selectedCollection
//       );
//     }

//     // Filtro por termo de busca
//     if (searchTerm) {
//       const search = searchTerm.toLowerCase();
//       filtered = filtered.filter(
//         (read) =>
//           read.message.toLowerCase().includes(search) ||
//           read.collection.toLowerCase().includes(search)
//       );
//     }

//     // Filtro apenas cache hits
//     if (showCacheHitsOnly) {
//       filtered = filtered.filter((read) => read.isCacheHit);
//     }

//     setFilteredReads(filtered);
//   }, [allReads, selectedCollection, searchTerm, showCacheHitsOnly]);

//   // ✅ Stats update apenas quando modal está aberto
//   useEffect(() => {
//     if (!isOpen) {
//       if (statsIntervalRef.current) {
//         clearInterval(statsIntervalRef.current);
//         statsIntervalRef.current = null;
//       }
//       return;
//     }

//     const updateStats = () => {
//       try {
//         const newStats = getCacheStats();
//         setStats(newStats);
//       } catch (error) {
//         console.warn("Erro ao obter stats do cache:", error);
//       }
//     };

//     updateStats();
//     statsIntervalRef.current = setInterval(updateStats, 2000);

//     return () => {
//       if (statsIntervalRef.current) {
//         clearInterval(statsIntervalRef.current);
//         statsIntervalRef.current = null;
//       }
//     };
//   }, [isOpen]);

//   // ✅ HELPER: Obter collections únicas
//   const getUniqueCollections = useCallback(() => {
//     const collections = new Set(allReads.map((read) => read.collection));
//     return ["all", ...Array.from(collections).sort()];
//   }, [allReads]);

//   // ✅ HANDLERS
//   const handleToggleOpen = useCallback(() => {
//     setIsOpen((prev) => !prev);
//   }, []);

//   const handleClearLogs = useCallback(() => {
//     setAllReads([]);
//     setFilteredReads([]);
//     setDetailedStats({
//       totalReads: 0,
//       cacheHits: 0,
//       firestoreReads: 0,
//       readsByCollection: {},
//       readsByType: { getDoc: 0, getDocs: 0, query: 0 },
//       recentActivity: [],
//     });
//   }, []);

//   const handleRestoreConsole = useCallback(() => {
//     restoreConsole();
//     handleClearLogs();
//   }, [handleClearLogs]);

//   // ✅ CALCULATORS
//   const hitRate =
//     detailedStats.totalReads > 0
//       ? Math.round((detailedStats.cacheHits / detailedStats.totalReads) * 100)
//       : 0;

//   if (!isOpen) {
//     return (
//       <div className="fixed bottom-4 right-4 z-50">
//         <button
//           onClick={handleToggleOpen}
//           className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 group"
//           title={`Cache Monitor - ${detailedStats.totalReads} reads total`}
//         >
//           <div className="relative">
//             <Database className="w-5 h-5" />
//             {detailedStats.totalReads > 0 && (
//               <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
//                 {detailedStats.totalReads > 99
//                   ? "99+"
//                   : detailedStats.totalReads}
//               </div>
//             )}
//           </div>
//         </button>
//       </div>
//     );
//   }

//   return (
//     <div className="fixed bottom-4 right-4 z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-[500px] max-h-[85vh] overflow-hidden">
//       {/* Header */}
//       <div className="bg-purple-600 p-3 flex items-center justify-between">
//         <div className="flex items-center gap-2">
//           <Database className="w-5 h-5 text-white" />
//           <h3 className="text-white font-semibold">Firestore Monitor</h3>
//           <span className="text-purple-200 text-sm">
//             ({detailedStats.totalReads} reads)
//           </span>
//         </div>
//         <button
//           onClick={handleToggleOpen}
//           className="text-white hover:text-purple-200 transition-colors"
//         >
//           <X className="w-5 h-5" />
//         </button>
//       </div>

//       {/* Content */}
//       <div className="max-h-[75vh] overflow-y-auto">
//         {/* ✅ OVERVIEW STATS */}
//         <div className="p-4 border-b border-zinc-700">
//           <div className="grid grid-cols-3 gap-3 mb-4">
//             <div className="bg-zinc-800 p-3 rounded-lg text-center">
//               <div className="text-2xl font-bold text-green-400">
//                 {detailedStats.cacheHits}
//               </div>
//               <div className="text-xs text-zinc-400">Cache Hits</div>
//             </div>
//             <div className="bg-zinc-800 p-3 rounded-lg text-center">
//               <div className="text-2xl font-bold text-red-400">
//                 {detailedStats.firestoreReads}
//               </div>
//               <div className="text-xs text-zinc-400">Firestore Reads</div>
//             </div>
//             <div className="bg-zinc-800 p-3 rounded-lg text-center">
//               <div className="text-2xl font-bold text-blue-400">{hitRate}%</div>
//               <div className="text-xs text-zinc-400">Hit Rate</div>
//             </div>
//           </div>

//           {/* ✅ READS BY TYPE */}
//           <div className="grid grid-cols-3 gap-2 text-sm">
//             <div className="flex justify-between">
//               <span className="text-zinc-400">getDoc:</span>
//               <span className="text-white">
//                 {detailedStats.readsByType.getDoc}
//               </span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-zinc-400">getDocs:</span>
//               <span className="text-white">
//                 {detailedStats.readsByType.getDocs}
//               </span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-zinc-400">query:</span>
//               <span className="text-white">
//                 {detailedStats.readsByType.query}
//               </span>
//             </div>
//           </div>
//         </div>

//         {/* ✅ FILTROS */}
//         <div className="p-4 border-b border-zinc-700 space-y-3">
//           <div className="flex items-center gap-2">
//             <Filter className="w-4 h-4 text-zinc-400" />
//             <span className="text-sm font-medium text-white">Filtros</span>
//           </div>

//           {/* Collection Filter */}
//           <select
//             value={selectedCollection}
//             onChange={(e) => setSelectedCollection(e.target.value)}
//             className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white text-sm"
//           >
//             {getUniqueCollections().map((collection) => (
//               <option key={collection} value={collection}>
//                 {collection === "all" ? "Todas as Collections" : collection}
//               </option>
//             ))}
//           </select>

//           {/* Search */}
//           <div className="relative">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
//             <input
//               type="text"
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               placeholder="Buscar nas mensagens..."
//               className="w-full pl-10 pr-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-white text-sm placeholder-zinc-400"
//             />
//           </div>

//           {/* Cache Hits Only */}
//           <label className="flex items-center gap-2 cursor-pointer">
//             <input
//               type="checkbox"
//               checked={showCacheHitsOnly}
//               onChange={(e) => setShowCacheHitsOnly(e.target.checked)}
//               className="rounded"
//             />
//             <span className="text-sm text-zinc-300">Apenas Cache Hits</span>
//             <Zap className="w-4 h-4 text-yellow-400" />
//           </label>
//         </div>

//         {/* ✅ READS BY COLLECTION */}
//         <div className="p-4 border-b border-zinc-700">
//           <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
//             <BarChart3 className="w-4 h-4" />
//             Reads por Collection
//           </h4>
//           <div className="space-y-2 max-h-32 overflow-y-auto">
//             {Object.entries(detailedStats.readsByCollection)
//               .sort(([, a], [, b]) => b - a)
//               .map(([collection, count]) => (
//                 <div
//                   key={collection}
//                   className="flex justify-between items-center"
//                 >
//                   <span className="text-sm text-zinc-300">{collection}</span>
//                   <div className="flex items-center gap-2">
//                     <div className="w-16 bg-zinc-700 rounded-full h-2">
//                       <div
//                         className="bg-blue-500 h-2 rounded-full"
//                         style={{
//                           width: `${Math.min(
//                             100,
//                             (count /
//                               Math.max(
//                                 ...Object.values(
//                                   detailedStats.readsByCollection
//                                 )
//                               )) *
//                               100
//                           )}%`,
//                         }}
//                       />
//                     </div>
//                     <span className="text-sm text-white font-medium w-8 text-right">
//                       {count}
//                     </span>
//                   </div>
//                 </div>
//               ))}
//           </div>
//         </div>

//         {/* ✅ ALL READS LOG */}
//         <div className="p-4">
//           <div className="flex items-center justify-between mb-3">
//             <h4 className="text-sm font-medium text-white flex items-center gap-2">
//               <Eye className="w-4 h-4" />
//               Todas as Leituras
//               <span className="text-zinc-400">({filteredReads.length})</span>
//             </h4>
//             <button
//               onClick={handleClearLogs}
//               className="text-zinc-400 hover:text-white transition-colors"
//               title="Limpar logs"
//             >
//               <Trash2 className="w-4 h-4" />
//             </button>
//           </div>

//           <div className="space-y-1 max-h-80 overflow-y-auto">
//             {filteredReads.map((read) => (
//               <div
//                 key={read.id}
//                 className={`text-xs p-2 rounded border-l-2 ${
//                   read.isCacheHit
//                     ? "bg-green-900/20 border-green-500"
//                     : "bg-red-900/20 border-red-500"
//                 }`}
//               >
//                 <div className="flex justify-between items-center mb-1">
//                   <div className="flex items-center gap-2">
//                     <span className="text-zinc-400">#{read.count}</span>
//                     <span
//                       className={`px-1 rounded text-xs ${
//                         read.isCacheHit
//                           ? "bg-green-600 text-white"
//                           : "bg-red-600 text-white"
//                       }`}
//                     >
//                       {read.source}
//                     </span>
//                     <span className="bg-blue-600 text-white px-1 rounded text-xs">
//                       {read.collection}
//                     </span>
//                     <span className="bg-purple-600 text-white px-1 rounded text-xs">
//                       {read.type}
//                     </span>
//                   </div>
//                   <span className="text-zinc-500">{read.time}</span>
//                 </div>
//                 <div className="text-zinc-300 break-all">{read.message}</div>
//               </div>
//             ))}

//             {filteredReads.length === 0 && (
//               <div className="text-xs text-zinc-500 text-center py-4">
//                 {allReads.length === 0
//                   ? "Nenhuma leitura registrada ainda"
//                   : "Nenhuma leitura encontrada com os filtros aplicados"}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Emergency Actions */}
//         {process.env.NODE_ENV === "development" && (
//           <div className="p-4 border-t border-zinc-700 bg-red-900/20">
//             <h4 className="text-sm font-medium text-red-400 mb-2">
//               Emergency Actions
//             </h4>
//             <div className="flex gap-2">
//               <button
//                 onClick={handleRestoreConsole}
//                 className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-2 px-3 rounded transition-colors"
//                 title="Restaurar console original se houver loop infinito"
//               >
//                 <RefreshCw className="w-3 h-3 inline mr-1" />
//                 Fix Console
//               </button>
//               <button
//                 onClick={handleClearLogs}
//                 className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs py-2 px-3 rounded transition-colors"
//               >
//                 <Trash2 className="w-3 h-3 inline mr-1" />
//                 Clear All
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Footer */}
//       <div className="bg-zinc-800 p-2 border-t border-zinc-700">
//         <div className="flex justify-between items-center text-xs text-zinc-400">
//           <span>Firestore Monitor v3.0</span>
//           <div className="flex items-center gap-2">
//             <Monitor className="w-3 h-3" />
//             <span>{detailedStats.totalReads} total reads tracked</span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CacheDebugTool;
