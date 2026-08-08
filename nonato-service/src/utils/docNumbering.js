// Numeração sequencial partilhada por toda a aplicação.
//
// Cada "série" (Ordens, Orçamentos, Despesas, Orçamentos de Peças,
// Protocolos, Inspeções) tem o seu próprio prefixo e o seu próprio contador,
// para que os números sejam fáceis de identificar e de localizar:
//
//   OS-0826-0187    Ordem de Serviço nº 187, criada em Ago/2026
//   ORC-0826-0042   Orçamento nº 42
//   DESP-0826-0015  Despesa nº 15
//   ORP-0826-0009   Orçamento de Peças nº 9
//   PROT-0826-0003  Protocolo nº 3
//   INSP-0826-0056  Inspeção nº 56
//
// O bloco "0826" é o mês+ano de criação (MMAA) — apenas informativo, o
// contador em si nunca reinicia, para nunca haver dois documentos com o
// mesmo número.
import { doc, runTransaction } from "firebase/firestore";
import { db } from "../firebase.jsx";

export const DOC_NUMBER_PREFIXES = {
  os: "OS",
  orc: "ORC",
  desp: "DESP",
  orp: "ORP",
  prot: "PROT",
  insp: "INSP",
};

const pad4 = (n) => String(n).padStart(4, "0");

// Formato MMAA, igual ao já usado historicamente nas Despesas.
const monthYearTag = (date = new Date()) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${month}${year}`;
};

export const formatDocNumber = (seriesKey, sequentialNumber, date = new Date()) => {
  const prefix = DOC_NUMBER_PREFIXES[seriesKey];
  if (!prefix) throw new Error(`Série de numeração desconhecida: ${seriesKey}`);
  return `${prefix}-${monthYearTag(date)}-${pad4(sequentialNumber)}`;
};

// Incrementa (de forma atómica, via transação) o contador da série indicada
// e devolve o novo número sequencial (1, 2, 3, ...). Usar quando a série NÃO
// tem já um contador próprio (ex.: Orçamentos, Despesas, Orçamentos de
// Peças, Protocolos). Para Ordens e Inspeções, que já usam o seu contador
// interno (`ordersCounter` / `inspectionsCounter`) como o próprio ID do
// documento, usar diretamente `formatDocNumber` com esse valor em vez desta
// função, para não criar uma segunda contagem paralela.
export const getNextSequentialNumber = async (seriesKey) => {
  if (!DOC_NUMBER_PREFIXES[seriesKey]) {
    throw new Error(`Série de numeração desconhecida: ${seriesKey}`);
  }
  const counterRef = doc(db, "counters", `${seriesKey}Counter`);
  const nextNumber = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    const current = snap.exists() ? snap.data().count || 0 : 0;
    const next = current + 1;
    transaction.set(counterRef, { count: next }, { merge: true });
    return next;
  });
  return nextNumber;
};

// Atalho: incrementa o contador da série e já devolve o número formatado.
export const generateDocNumber = async (seriesKey, date = new Date()) => {
  const seq = await getNextSequentialNumber(seriesKey);
  return formatDocNumber(seriesKey, seq, date);
};

export default generateDocNumber;
