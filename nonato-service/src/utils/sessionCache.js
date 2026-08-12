// src/utils/sessionCache.js
// Cache simples em memória (com expiração) para leituras "pesadas" que não
// têm um Context dedicado (como ClientsContext/EquipmentsContext/UsersContext)
// mas que também não faz sentido repetir sempre que a mesma página é
// visitada de novo na mesma sessão — ex.: ManageReportsLibrary.jsx e
// ManageAlerts.jsx, que leem coleções inteiras (ordens, orçamentos,
// relatórios) só para calcular contagens/alertas agregados.
//
// Nota: isto reduz leituras repetidas dentro da mesma sessão (visitar a
// página, sair, voltar), mas não substitui uma contagem desnormalizada no
// próprio documento do cliente — essa seria a correção "definitiva", mas
// exige alterações no backend (Cloud Function a manter um campo tipo
// `reportsCount`), fora do alcance de uma alteração só no frontend.

const store = new Map();

/**
 * Devolve o valor em cache se ainda estiver dentro do `ttlMs`, ou chama
 * `fetcher()` e guarda o resultado. Pedidos simultâneos para a mesma `key`
 * partilham a mesma promessa em vez de disparar 2 leituras em paralelo.
 */
export function getCached(key, ttlMs, fetcher) {
  const now = Date.now();
  const entry = store.get(key);

  if (entry?.promise) return entry.promise;
  if (entry && now - entry.time < ttlMs) return Promise.resolve(entry.data);

  const promise = fetcher()
    .then((data) => {
      store.set(key, { data, time: Date.now() });
      return data;
    })
    .catch((err) => {
      store.delete(key);
      throw err;
    });

  store.set(key, { promise, time: now });
  return promise;
}

/** Invalida uma entrada (ex.: depois de um utilizador apagar/criar um item,
 * para a próxima leitura ir buscar dados frescos em vez de esperar o TTL). */
export function invalidateCache(key) {
  store.delete(key);
}
