// src/utils/getInitials.js
// Devolve as iniciais (1-2 letras maiúsculas) de um nome de pessoa/cliente.
// Ex: "João Silva" -> "JS". Sem nome válido devolve "??".
export const getInitials = (name) =>
  name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";
