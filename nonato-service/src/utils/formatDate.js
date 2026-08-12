// src/utils/formatDate.js
// Formatação de datas/Timestamps do Firestore, partilhada por toda a app.
//
// Antes deste ficheiro existir, a mesma lógica (Timestamp do Firestore →
// string em pt-PT) estava copiada e colada em mais de 20 componentes
// diferentes, cada um com pequenas variações. Isto centraliza os dois
// formatos realmente usados: só a data, e data + hora.

const toJsDate = (value) => {
  if (!value) return null;
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Só a data, ex.: "11/08/2026". Aceita Timestamp do Firestore, Date ou
// string/número que o `Date` consiga interpretar.
export const formatDate = (value, fallback = "N/A") => {
  const date = toJsDate(value);
  return date ? date.toLocaleDateString("pt-PT") : fallback;
};

// Data + hora, ex.: "11/08/2026, 14:30".
export const formatDateTime = (value, fallback = "N/A") => {
  const date = toJsDate(value);
  if (!date) return fallback;
  return date.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
