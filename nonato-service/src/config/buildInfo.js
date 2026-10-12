// src/config/buildInfo.js
// Identificação do build em execução, carimbada pelo vite.config.js:
// { time (ISO), commit, commitTitle, dirty }.

/* global __BUILD_INFO__ */
export const BUILD_INFO =
  typeof __BUILD_INFO__ !== "undefined"
    ? __BUILD_INFO__
    : { time: "", commit: "", commitTitle: "", dirty: false };

/** "12/10/2026, 15:42" */
export const buildTimeLabel = () =>
  BUILD_INFO.time
    ? new Date(BUILD_INFO.time).toLocaleString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

/**
 * Há um deploy mais recente do que o build que está aberto? Compara com o
 * /version.json do site (ficheiro estático: não gasta leituras da Firestore).
 */
export async function isNewerVersionAvailable() {
  if (import.meta.env.DEV || !BUILD_INFO.time) return false;
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return false;
    const remote = await res.json();
    return Boolean(remote?.time) && remote.time !== BUILD_INFO.time;
  } catch {
    return false; // sem rede — tenta na próxima vez
  }
}
