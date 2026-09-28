// src/utils/contactsImport.js
// Lê ficheiros de contactos e converte-os em clientes da app
// ({ name, phone, company, address, postalCode, nif, type }).
//
// Formatos aceites:
// - .vcf (vCard) — o que o Android e o iPhone exportam ("Exportar contactos").
// - .csv — Google Contactos ("Exportar → Google CSV"), Outlook, ou uma folha
//   Excel guardada como CSV. As colunas são reconhecidas pelo nome do
//   cabeçalho (em português ou inglês), por isso a ordem não interessa.

import { normalizeSearch } from "./normalizeSearch.js";

export const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

/** Lê o ficheiro como texto; se não for UTF-8 válido (Excel/Outlook antigos), tenta Windows-1252. */
export async function readContactsFile(file) {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  // U+FFFD = carácter inválido (não era UTF-8); U+FEFF = marca BOM do Excel.
  if (!utf8.includes(String.fromCharCode(0xfffd))) {
    return utf8.charCodeAt(0) === 0xfeff ? utf8.slice(1) : utf8;
  }
  return new TextDecoder("windows-1252").decode(buffer);
}

// ─── CSV ────────────────────────────────────────────────────────────────

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const count = (ch) => firstLine.split(ch).length - 1;
  // O Excel em português usa ";" por omissão.
  return count(";") > count(",") ? ";" : count("\t") > count(",") ? "\t" : ",";
}

function parseCsv(text) {
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// Nomes de coluna reconhecidos (já normalizados: minúsculas, sem acentos).
// A primeira coluna que existir e tiver valor ganha.
const COLUMNS = {
  name: ["nome", "name", "nome completo", "full name", "display name", "cliente", "nome do cliente"],
  firstName: ["first name", "given name", "primeiro nome", "nome proprio"],
  middleName: ["middle name", "additional name", "nome do meio"],
  lastName: ["last name", "family name", "apelido", "sobrenome", "ultimo nome"],
  phone: [
    "telefone", "telemovel", "celular", "phone", "mobile", "mobile phone", "telefone movel",
    "phone 1 - value", "primary phone", "home phone", "business phone", "contacto", "whatsapp",
  ],
  company: [
    "empresa", "company", "organization", "organization name", "organization 1 - name",
    "organizacao", "nome da empresa",
  ],
  address: [
    "morada", "endereco", "address", "address 1 - formatted", "address 1 - street",
    "home address", "home street", "business street", "rua",
  ],
  postalCode: [
    "codigo postal", "cod postal", "cp", "postal code", "zip", "address 1 - postal code",
    "home postal code", "business postal code",
  ],
  nif: ["nif", "contribuinte", "numero de contribuinte", "vat", "nipc", "cpf", "cnpj"],
};

function firstPhone(value) {
  // O Google junta vários números com " ::: ".
  return String(value || "").split(":::")[0].trim();
}

function parseCsvContacts(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => normalizeSearch(h).trim());
  const colIndex = {};
  for (const [key, names] of Object.entries(COLUMNS)) {
    colIndex[key] = names.map((n) => headers.indexOf(n)).filter((i) => i >= 0);
  }
  // Colunas de telefone do Google para além da primeira ("Phone 2 - Value", ...).
  headers.forEach((h, i) => {
    if (/^phone \d+ - value$/.test(h) && !colIndex.phone.includes(i)) colIndex.phone.push(i);
  });

  const get = (row, key) => {
    for (const i of colIndex[key]) {
      const v = (row[i] || "").trim();
      if (v) return v;
    }
    return "";
  };

  return rows.slice(1).map((row) => {
    const composed = [get(row, "firstName"), get(row, "middleName"), get(row, "lastName")]
      .filter(Boolean)
      .join(" ");
    return {
      name: get(row, "name") || composed,
      phone: firstPhone(get(row, "phone")),
      company: get(row, "company"),
      address: get(row, "address").replace(/\s*\n\s*/g, ", "),
      postalCode: get(row, "postalCode"),
      nif: get(row, "nif"),
    };
  });
}

// ─── vCard ──────────────────────────────────────────────────────────────

function decodeQuotedPrintable(value) {
  const bytes = [];
  const str = value.replace(/=\r?\n/g, "");
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "=" && /^[0-9A-F]{2}$/i.test(str.slice(i + 1, i + 3))) {
      bytes.push(parseInt(str.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(str.charCodeAt(i));
    }
  }
  return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
}

const unescapeVcard = (v) => v.replace(/\\n/gi, ", ").replace(/\\([,;\\])/g, "$1").trim();

function parseVcfContacts(text) {
  // Junta linhas "dobradas" (continuação começa por espaço/tab).
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const contacts = [];
  let card = null;

  for (const line of lines) {
    if (/^BEGIN:VCARD/i.test(line)) {
      card = { name: "", n: "", phone: "", company: "", address: "", postalCode: "", nif: "" };
      continue;
    }
    if (/^END:VCARD/i.test(line)) {
      if (card) {
        contacts.push({
          name: card.name || card.n,
          phone: card.phone,
          company: card.company,
          address: card.address,
          postalCode: card.postalCode,
          nif: card.nif,
        });
      }
      card = null;
      continue;
    }
    if (!card) continue;

    const sep = line.indexOf(":");
    if (sep < 0) continue;
    const head = line.slice(0, sep);
    let value = line.slice(sep + 1);
    // "item1.TEL;TYPE=CELL" → propriedade "TEL"
    const prop = head.split(";")[0].split(".").pop().toUpperCase();
    if (/ENCODING=QUOTED-PRINTABLE/i.test(head)) value = decodeQuotedPrintable(value);

    if (prop === "FN") card.name = unescapeVcard(value);
    else if (prop === "N" && !card.n) {
      const [last, first, middle] = value.split(";").map(unescapeVcard);
      card.n = [first, middle, last].filter(Boolean).join(" ");
    } else if (prop === "TEL" && !card.phone) card.phone = value.trim();
    else if (prop === "ORG" && !card.company) card.company = unescapeVcard(value.split(";")[0]);
    else if (prop === "ADR" && !card.address) {
      // ADR: caixa postal; extra; rua; localidade; região; código postal; país
      const parts = value.split(";").map(unescapeVcard);
      card.address = [parts[2], parts[3], parts[4]].filter(Boolean).join(", ");
      card.postalCode = parts[5] || "";
    }
  }
  return contacts;
}

// ─── Entrada ────────────────────────────────────────────────────────────

/**
 * Converte o texto do ficheiro numa lista de clientes. Descarta linhas sem
 * nome nem empresa. Se só houver empresa, o cliente fica como "company".
 */
export function parseContacts(text, fileName = "") {
  const isVcf = /\.vcf$/i.test(fileName) || /^\s*BEGIN:VCARD/i.test(text);
  const raw = isVcf ? parseVcfContacts(text) : parseCsvContacts(text);

  return raw
    .map((c) => {
      const name = c.name.trim() || c.company.trim();
      return {
        name,
        phone: c.phone.trim(),
        company: c.company.trim(),
        address: c.address.trim(),
        postalCode: c.postalCode.trim(),
        nif: onlyDigits(c.nif) ? c.nif.trim() : "",
        type: !c.name.trim() && c.company.trim() ? "company" : "individual",
      };
    })
    .filter((c) => c.name);
}

/** Chave para detetar o mesmo contacto: últimos 9 dígitos do telefone, ou o nome. */
export function contactKeys(c) {
  const digits = onlyDigits(c.phone);
  return {
    phone: digits.length >= 6 ? digits.slice(-9) : "",
    name: normalizeSearch(c.name).replace(/\s+/g, " ").trim(),
  };
}
