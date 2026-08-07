// Normaliza texto para pesquisa insensível a acentos e maiúsculas/minúsculas:
// "Sérgio" e "sergio" (ou "SERGIO") passam a bater certo. Usa a decomposição
// Unicode NFD para separar os acentos das letras e depois remove-os (bloco
// "Combining Diacritical Marks", U+0300-U+036F).
const DIACRITICS_REGEX = new RegExp("[̀-ͯ]", "g");

export const normalizeSearch = (value) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase();
};

// Atalho para o caso mais comum: "o texto normalizado contém o termo
// normalizado?"
export const searchIncludes = (text, term) =>
  normalizeSearch(text).includes(normalizeSearch(term));

export default normalizeSearch;
