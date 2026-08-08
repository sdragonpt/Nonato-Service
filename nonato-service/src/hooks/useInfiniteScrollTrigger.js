// useInfiniteScrollTrigger.js
//
// Hook partilhado para scroll infinito: observa um elemento "sentinela"
// (tipicamente uma div vazia no fundo da lista) e chama onIntersect() assim
// que ele entra no ecrã (com uma margem, para carregar um pouco antes de
// chegar mesmo ao fundo). Usado em conjunto com fetchPage()/loadMore() nas
// páginas "Gerir ..." para ir buscando lotes seguintes à medida que o
// utilizador desce na lista, sem precisar de clicar em nada.
import { useEffect, useRef } from "react";

export function useInfiniteScrollTrigger(onIntersect, { enabled = true, rootMargin = "300px" } = {}) {
  const sentinelRef = useRef(null);
  const callbackRef = useRef(onIntersect);

  useEffect(() => {
    callbackRef.current = onIntersect;
  }, [onIntersect]);

  useEffect(() => {
    if (!enabled) return undefined;
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          callbackRef.current?.();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return sentinelRef;
}

export default useInfiniteScrollTrigger;
