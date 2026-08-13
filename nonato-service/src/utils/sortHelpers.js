// src/utils/sortHelpers.js
// Comparador de strings usando o locale português de Portugal (pt-PT).
// Valores nulos/indefinidos são tratados como string vazia.
export const comparePtPt = (a, b) => (a || "").localeCompare(b || "", "pt-PT");

// Devolve uma cópia ordenada do array, comparando a chave string extraída
// por keyFn com o locale pt-PT.
export const sortByPtPt = (array, keyFn) =>
  [...array].sort((a, b) => comparePtPt(keyFn(a), keyFn(b)));
