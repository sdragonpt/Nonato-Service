#!/usr/bin/env node
// build-catalog.js - Converte ficheiros de peças (CSV ou JSON, ex.: exports da HOMAG) num
// "lote" JSON dentro de public/pecas-data/, e atualiza o manifest.json que
// lista todos os lotes existentes.
//
// Porque isto existe:
// A Biblioteca de Peças pode passar a ler o catálogo a partir de ficheiros
// JSON estáticos em vez da Firestore (mais rápido e sem custo de leituras
// para um catálogo grande e que muda pouco, como o da HOMAG). Para isso
// suportar múltiplos lotes ao longo do tempo (novos CSVs, categorias
// diferentes, etc.) sem reescrever nada à mão, cada execução deste script
// cria/atualiza UM ficheiro de lote e regenera o manifest automaticamente.
//
// Como usar:
//   node scripts/parts-catalog/build-catalog.js <ficheiro-ou-pasta...> [--name=nome-do-lote]
//
// Exemplos:
//   node scripts/parts-catalog/build-catalog.js ~/Transferências/shop-homag-com-2026-08-05-2.csv --name=ferragens
//   node scripts/parts-catalog/build-catalog.js ~/Transferências/pecas-antigas.json --name=lote-3
//   node scripts/parts-catalog/build-catalog.js ~/Transferências --name=lote-agosto-2026
//   (passar uma pasta lê todos os .csv e .json diretamente dentro dela;
//    também podes misturar CSVs e JSONs no mesmo lote)
//
// Resultado:
//   public/pecas-data/<nome-do-lote>.json   <- peças deste lote (nome, codigo, imagem)
//   public/pecas-data/manifest.json          <- lista de todos os lotes existentes

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "..", "..", "public", "pecas-data");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");

// ─── Reconhecimento de colunas/campos: aceita os nomes mais comuns tanto em
// CSVs (cabeçalhos) como em JSONs (chaves), para o lote sair sempre no mesmo
// formato que a app já entende ───

const FIELD_ALIASES = {
  name: ["nome", "name", "descricao_curta", "designacao", "designação"],
  code: ["codigo", "código", "code", "ref", "referencia", "referência", "number", "número"],
  imageUrl: ["imagem", "imagemurl", "imagem_url", "urlimagem", "image", "imageurl", "image_url"],
};

function normalizeHeader(h) {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function resolveField(header) {
  const norm = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some((a) => normalizeHeader(a) === norm)) return field;
  }
  return null;
}

/** Parser CSV simples com suporte a campos entre aspas (vírgulas/quebras de linha dentro do campo). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function rowsFromCsvText(text) {
  // Remove BOM (comum em exports do Web Scraper / Excel)
  const clean = text.replace(/^﻿/, "");
  const parsed = parseCsv(clean);
  if (parsed.length === 0) return [];

  const headers = parsed[0].map(resolveField);
  return parsed.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((field, idx) => {
      if (field) obj[field] = (cells[idx] || "").trim();
    });
    return obj;
  });
}

/**
 * Lê um ficheiro .json com um array de peças. Aceita tanto um array à cabeça
 * como um objeto que embrulhe o array (ex.: { pecas: [...] }, { items: [...] }),
 * e reconhece os mesmos aliases de campos usados nos CSVs — por isso tanto
 * funciona um lote já no formato final ({ nome, codigo, imagem }) como um
 * export de outra ferramenta ({ name, code, imageUrl }).
 */
function rowsFromJsonText(text) {
  const data = JSON.parse(text.replace(/^\uFEFF/, ""));

  const list = Array.isArray(data)
    ? data
    : Object.values(data).find((v) => Array.isArray(v));

  if (!Array.isArray(list)) {
    throw new Error("JSON não contém nenhum array de peças.");
  }

  return list.map((item) => {
    const obj = {};
    for (const [key, value] of Object.entries(item || {})) {
      const field = resolveField(key);
      if (field && obj[field] === undefined && value != null) {
        obj[field] = String(value).trim();
      }
    }
    return obj;
  });
}

/** Escolhe o leitor certo a partir da extensão do ficheiro. */
function rowsFromFile(file) {
  const text = fs.readFileSync(file, "utf-8");
  return file.toLowerCase().endsWith(".json")
    ? rowsFromJsonText(text)
    : rowsFromCsvText(text);
}

// ─── Leitura de argumentos da linha de comandos ───

function parseArgs(argv) {
  const inputs = [];
  let name = null;

  for (const arg of argv) {
    if (arg.startsWith("--name=")) {
      name = arg.slice("--name=".length).trim();
    } else {
      inputs.push(arg);
    }
  }

  return { inputs, name };
}

const SUPPORTED_EXTENSIONS = [".csv", ".json"];

const isSupported = (f) =>
  SUPPORTED_EXTENSIONS.some((ext) => f.toLowerCase().endsWith(ext));

function collectInputFiles(inputPaths) {
  const files = [];
  for (const inputPath of inputPaths) {
    const resolved = path.resolve(inputPath);
    if (!fs.existsSync(resolved)) {
      console.warn(`Aviso: caminho não encontrado, a ignorar: ${resolved}`);
      continue;
    }
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      const entries = fs
        .readdirSync(resolved)
        .filter(isSupported)
        .map((f) => path.join(resolved, f));
      files.push(...entries);
    } else if (isSupported(resolved)) {
      files.push(resolved);
    } else {
      console.warn(`Aviso: não é um .csv nem um .json, a ignorar: ${resolved}`);
    }
  }
  return files;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function defaultBatchName(files) {
  if (files.length === 1) {
    return slugify(path.basename(files[0], path.extname(files[0])));
  }
  const stamp = new Date().toISOString().slice(0, 10);
  return `lote-${stamp}`;
}

function regenerateManifest() {
  const files = fs
    .readdirSync(OUTPUT_DIR)
    .filter((f) => f.toLowerCase().endsWith(".json") && f !== "manifest.json");

  const manifest = files
    .map((file) => {
      const filePath = path.join(OUTPUT_DIR, file);
      let count = 0;
      try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        count = Array.isArray(data) ? data.length : 0;
      } catch {
        // ficheiro inválido - ainda assim entra no manifest, count fica 0
      }
      return {
        file,
        count,
        updatedAt: fs.statSync(filePath).mtime.toISOString(),
      };
    })
    .sort((a, b) => a.file.localeCompare(b.file));

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf-8");
  return manifest;
}

function main() {
  const { inputs, name } = parseArgs(process.argv.slice(2));

  if (inputs.length === 0) {
    console.error(
      "Uso: node scripts/parts-catalog/build-catalog.js <ficheiro-ou-pasta...> [--name=nome-do-lote]"
    );
    process.exit(1);
  }

  const inputFiles = collectInputFiles(inputs);
  if (inputFiles.length === 0) {
    console.error("Nenhum ficheiro .csv ou .json encontrado nos caminhos indicados.");
    process.exit(1);
  }

  console.log(`A ler ${inputFiles.length} ficheiro(s)...`);

  const seen = new Map(); // codigo -> peça (último a aparecer vence)
  let totalRowsRead = 0;

  for (const file of inputFiles) {
    let rows;
    try {
      rows = rowsFromFile(file);
    } catch (err) {
      console.warn(`Aviso: falhou a leitura de ${file} (${err.message}), a ignorar.`);
      continue;
    }
    totalRowsRead += rows.length;

    for (const row of rows) {
      const codigo = (row.code || "").trim();
      const nome = (row.name || "").trim();
      if (!codigo || !nome) continue; // linha sem código ou nome não é utilizável

      seen.set(codigo, {
        nome,
        codigo,
        imagem: (row.imageUrl || "").trim(),
      });
    }
  }

  const pecas = Array.from(seen.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-PT"));

  if (pecas.length === 0) {
    console.error("Não foi possível extrair nenhuma peça válida (nome + código) dos ficheiros indicados.");
    process.exit(1);
  }

  const batchName = slugify(name || defaultBatchName(csvFiles));
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, `${batchName}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(pecas, null, 2) + "\n", "utf-8");

  const manifest = regenerateManifest();
  const totalCatalog = manifest.reduce((sum, entry) => sum + entry.count, 0);

  console.log("");
  console.log(`Linhas lidas nos ficheiros: ${totalRowsRead}`);
  console.log(`Peças únicas neste lote (por código): ${pecas.length}`);
  console.log(`Lote guardado em: public/pecas-data/${batchName}.json`);
  console.log(`Manifest atualizado: public/pecas-data/manifest.json (${manifest.length} lote(s), ${totalCatalog} peças no total)`);
}

main();
