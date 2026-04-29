// Mapa das colecções Firestore actualmente em uso no projeto Nonato-Service.
//
// A app-v2 (baseada na versão do cliente) tinha originalmente um modelo
// de filesystem (ler/escrever JSON em disco). Aqui consolidamos o nome
// real das colecções, deduzido do código JSX da versão actual em
// produção (sergionunoribeiro/Nonato-Service, branch main, em
// nonato-service/src/features/...).
//
// Importante: os nomes estão em PORTUGUÊS, não em inglês.

export const COLLECTIONS = {
  CLIENTS: "clientes",
  PARTS: "pecas",
  CATEGORIES: "categorias",
  IMAGE_LIBRARY: "image_library",
  COUNTERS: "counters",

  // Funcionalidades existentes na app actual; a app-v2 vai
  // substituir/enriquecer estas.
  ORDERS: "ordens",
  BUDGETS: "orcamentos",
  SERVICES: "servicos",
  EQUIPMENTS: "equipamentos",
  AGENDA: "agendamentos",
  CHECKLISTS: "checklists",
  INSPECTIONS: "inspecoes",
  WORKDAYS: "workdays",

  // Nova: configuração da empresa / papel timbrado
  CONFIG: "config",
} as const;

// Shape conhecido (deduzido) de alguns documentos.
// Estes tipos servem de DOCUMENTAÇÃO; os componentes podem usar
// shapes mais ricos enquanto isto é validado no Firestore.

export type ClienteDoc = {
  // Identificação
  name: string;
  type: "individual" | "company";
  company?: string;
  nif?: string;
  // Contactos / endereço
  address?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  // Imagem (preferir imageHash com referência a image_library no futuro)
  profilePic?: string | null;
  imageHash?: string | null;
  // Timestamps
  createdAt?: import("firebase/firestore").Timestamp;
  lastUpdate?: import("firebase/firestore").Timestamp;
};

export type PecaDoc = {
  name: string;
  code?: string;
  price?: number;
  description?: string;
  categoryId?: string;
  subcategoryId?: string;
  categoryName?: string;
  subcategoryName?: string;
  image?: string | null; // legacy
  imageHash?: string | null; // novo modelo (referência a image_library)
  createdAt?: import("firebase/firestore").Timestamp;
  lastUpdate?: import("firebase/firestore").Timestamp;
};

export type CategoriaDoc = {
  name: string;
  parentId: string | null;
  createdAt?: import("firebase/firestore").Timestamp;
};
