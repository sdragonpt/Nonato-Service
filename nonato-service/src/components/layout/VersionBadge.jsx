// VersionBadge.jsx
// Versão da app no rodapé da barra lateral + janela "O que há de novo".
//
// - Mostra a versão atual (config/changelog.js); ao clicar abre a lista
//   completa de atualizações e a identificação do build.
// - Ao abrir a app, mostra sozinha TODAS as novidades desde a última vez que
//   este utilizador as viu. O "até onde viu" fica na ficha do utilizador
//   (users/<uid>.ultimaNovidadeVista = n da entrada), por isso é por pessoa
//   e não por computador. A ficha já é lida no login — não há leituras extra.
// - Verifica de vez em quando se há um deploy mais recente e mostra o botão
//   "Atualizar" (ver config/buildInfo.js).

import { useEffect, useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase.jsx";
import { CHANGELOG, LATEST, TIPO_META } from "../../config/changelog.js";
import { BUILD_INFO, buildTimeLabel, isNewerVersionAvailable } from "../../config/buildInfo.js";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";

const UPDATE_CHECK_MS = 5 * 60 * 1000;
// Quem nunca viu novidades não leva com o histórico todo: só as mais recentes.
const FIRST_TIME_COUNT = 3;

const formatDay = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
};

/** Agrupa entradas por dia, mantendo a ordem (mais recente primeiro). */
const groupByDay = (entries) => {
  const groups = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last && last.data === entry.data) last.entries.push(entry);
    else groups.push({ data: entry.data, entries: [entry] });
  }
  return groups;
};

const EntryList = ({ entries }) => (
  <div className="space-y-5">
    {groupByDay(entries).map((group) => (
      <section key={group.data}>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {formatDay(group.data)}
          {group.entries.length > 1 && ` · ${group.entries.length} atualizações`}
        </h3>
        <div className="space-y-3">
          {group.entries.map((entry) => (
            <article key={entry.n} className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
              <header className="flex items-baseline justify-between gap-2">
                <h4 className="font-semibold text-white">{entry.titulo}</h4>
                <span className="shrink-0 text-xs text-zinc-500">
                  v{entry.versao}
                  {entry.interna && " · interna"}
                </span>
              </header>
              <ul className="mt-2 space-y-1.5">
                {entry.itens.map((item, i) => {
                  const meta = TIPO_META[item.tipo] || TIPO_META.melhoria;
                  return (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span
                        className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                      <span>{item.texto}</span>
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      </section>
    ))}
  </div>
);

const VersionBadge = ({ user }) => {
  const [mode, setMode] = useState(null); // null | "novidades" | "todas"
  const [seenN, setSeenN] = useState(null); // marcado como visto nesta sessão
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Novidades que este utilizador ainda não viu (sem as internas).
  const unseen = useMemo(() => {
    if (!user?.uid) return [];
    const visible = CHANGELOG.filter((e) => !e.interna);
    const last = seenN ?? user.ultimaNovidadeVista;
    if (typeof last !== "number") return visible.slice(0, FIRST_TIME_COUNT);
    return visible.filter((e) => e.n > last);
  }, [user?.uid, user?.ultimaNovidadeVista, seenN]);

  // Abre sozinha quando há novidades por ver.
  useEffect(() => {
    if (unseen.length > 0 && seenN === null) setMode("novidades");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseen.length]);

  const markSeen = async () => {
    setSeenN(LATEST.n);
    if (!user?.uid || user.ultimaNovidadeVista === LATEST.n) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { ultimaNovidadeVista: LATEST.n });
    } catch (err) {
      // Não é grave: as novidades voltam a aparecer no próximo login.
      console.warn("Não foi possível guardar as novidades vistas:", err);
    }
  };

  const handleOpenChange = (open) => {
    if (open) return;
    if (mode === "novidades") markSeen();
    setMode(null);
  };

  // Há um deploy mais recente? Verifica ao abrir, de 5 em 5 min e ao voltar ao separador.
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      if (await isNewerVersionAvailable()) {
        if (!cancelled) setUpdateAvailable(true);
      }
    };
    check();
    const timer = setInterval(check, UPDATE_CHECK_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  const showingNews = mode === "novidades";

  return (
    <>
      <div className="mb-3 space-y-2">
        <button
          type="button"
          onClick={() => setMode("todas")}
          title="Ver o que há de novo"
          className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left hover:bg-zinc-800/60"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium text-zinc-400">Versão {LATEST.versao}</span>
          </span>
          <span className="text-[10px] text-zinc-500">O que há de novo</span>
        </button>

        {updateAvailable && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-green-500/40 bg-green-500/15 px-2 py-1.5 text-xs font-semibold text-green-300 hover:bg-green-500/25"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Nova versão disponível — Atualizar
          </button>
        )}
      </div>

      <Dialog open={mode !== null} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-zinc-800 border-zinc-700 max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-green-400" />
              {showingNews ? "Novidades desde a sua última visita" : "O que há de novo"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {showingNews
                ? unseen.length === 1
                  ? "Há 1 atualização nova."
                  : `Há ${unseen.length} atualizações novas.`
                : `Versão ${LATEST.versao} · todas as atualizações, da mais recente para a mais antiga.`}
            </DialogDescription>
          </DialogHeader>

          <EntryList entries={showingNews ? unseen : CHANGELOG} />

          {!showingNews && BUILD_INFO.time && (
            <p className="border-t border-zinc-700 pt-3 text-xs text-zinc-500">
              Publicado em {buildTimeLabel()}
              {BUILD_INFO.commit && (
                <>
                  {" "}
                  · commit <span className="font-mono text-zinc-400">{BUILD_INFO.commit}</span>
                  {BUILD_INFO.commitTitle && ` “${BUILD_INFO.commitTitle}”`}
                  {BUILD_INFO.dirty && " + alterações ainda sem commit"}
                </>
              )}
            </p>
          )}

          <DialogFooter>
            <Button
              onClick={() => handleOpenChange(false)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {showingNews ? "Entendido" : "Fechar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VersionBadge;
