// Configuração do Papel Timbrado / Perfil da Empresa
// Documento único em Firestore: config/companyProfile
//
// A ideia deste módulo: fornecer os defaults e os tipos de visibilidade usados
// tanto pelo formulário de configuração como pelos geradores de PDF.

export const COMPANY_PROFILE_COLLECTION = "config";
export const COMPANY_PROFILE_DOC = "companyProfile";

/** Campos editáveis do perfil da empresa. */
export const COMPANY_PROFILE_DEFAULTS = Object.freeze({
  // Identificação
  name: "",
  nif: "",

  // Morada (estruturada)
  street: "",
  postalCode: "",
  city: "",
  locality: "",
  country: "Portugal",

  // Contactos
  phone: "",
  email: "",

  // Dados bancários (usados pelo PDF de dados de depósito)
  bankName: "",
  iban: "",
  nib: "",
  swift: "",

  // Logo
  logoUrl: "",
  logoStoragePath: "",

  // Toggles de visibilidade para o papel timbrado
  // (permite ao utilizador esconder campos no cabeçalho/rodapé dos PDFs)
  show: {
    logo: true,
    name: true,
    street: true,
    postalCode: true,
    city: true,
    locality: true,
    phone: true,
    email: true,
  },
});

/**
 * Normaliza um documento vindo do Firestore, garantindo todos os campos.
 * Usado tanto pelo formulário como pelos consumidores (geradores de PDF).
 */
export function normalizeCompanyProfile(raw) {
  const base = { ...COMPANY_PROFILE_DEFAULTS };
  const show = { ...COMPANY_PROFILE_DEFAULTS.show };
  if (!raw || typeof raw !== "object") {
    return { ...base, show };
  }
  for (const key of Object.keys(base)) {
    if (key === "show") continue;
    if (typeof raw[key] === "string") base[key] = raw[key];
  }
  if (raw.show && typeof raw.show === "object") {
    for (const key of Object.keys(show)) {
      if (typeof raw.show[key] === "boolean") show[key] = raw.show[key];
    }
  }
  return { ...base, show };
}
