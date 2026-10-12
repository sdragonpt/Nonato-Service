// src/utils/formatDate.js
// Formatação de datas/Timestamps do Firestore, partilhada por toda a app.
//
// Antes deste ficheiro existir, a mesma lógica (Timestamp do Firestore →
// string em pt-PT) estava copiada e colada em mais de 20 componentes
// diferentes, cada um com pequenas variações. Isto centraliza os dois
// formatos realmente usados: só a data, e data + hora.

// Data no formato "AAAA-MM-DD" (o dos <input type="date"> e o que a agenda
// grava em `data`), no fuso LOCAL. NÃO usar date.toISOString().split("T")[0]
// para isto: toISOString() converte para UTC, e em Portugal no horário de
// verão (UTC+1) a meia-noite local ainda é o dia anterior em UTC — a agenda
// mostrava as marcações um dia depois e gravava os cliques com o dia antes.
export const toDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

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
