// firestorePage.js
//
// Pequeno utilitário partilhado para paginar listas do Firestore por
// cursor (limit + startAfter), em vez de ler a coleção inteira de uma vez
// e cortar em páginas já no browser. Usado pelas páginas "Gerir ..." que
// mostram listas grandes (Ordens, Orçamentos, Inspeções, Orçamentos de
// Peças, Orçamentos Online), com um botão "Carregar mais" em vez de
// paginação numerada.
import { getDocs, limit, startAfter, query } from "firebase/firestore";

// Busca um lote de documentos de uma query já construída (com
// orderBy/where aplicados), a partir de um cursor opcional (o último
// documento do lote anterior). Devolve os documentos já mapeados para
// {id, ...data}, o cursor a usar na próxima chamada, e se é provável que
// existam mais documentos a seguir.
export async function fetchPage(baseQuery, { pageSize = 20, cursor = null } = {}) {
  const constraints = [limit(pageSize)];
  if (cursor) constraints.push(startAfter(cursor));
  const snap = await getDocs(query(baseQuery, ...constraints));
  return {
    docs: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    cursor: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === pageSize,
  };
}

export default fetchPage;
