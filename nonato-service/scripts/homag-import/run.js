#!/usr/bin/env node
// run.js - Importador local de peças da loja HOMAG (shop.homag.com)
//
// Porque isto existe:
// A loja HOMAG é uma Salesforce B2B Commerce (a app carrega tudo via
// JavaScript, atrás de login). Isso significa que não é possível "ir buscar"
// os dados a partir do browser da aplicação Nonato Service (fetch simples
// devolve só a shell da página, sem produtos) nem de um servidor sem sessão
// iniciada. A única forma fiável é um browser real, controlado por este
// script, onde é o Sérgio quem inicia sessão manualmente (este script nunca
// vê nem guarda a password — só a sessão do browser fica gravada localmente
// em .browser-session/ para não ter de fazer login todas as vezes).
//
// Como usar:
//   1) npm install (só na primeira vez, instala o Puppeteer)
//   2) cp scripts/homag-import/config.example.json scripts/homag-import/config.json
//      e ajuste startUrl + seletores (ver README.md nesta pasta)
//   3) HOMAG_MANUAL=1 npm run homag:import
//      -> abre um Chrome real; inicie sessão na HOMAG e prima ENTER no terminal
//   4) nas próximas vezes pode correr só "npm run homag:import" (sem manual)
//      enquanto a sessão guardada ainda for válida
//   5) o resultado fica em scripts/homag-import/out/export.json — carregue
//      esse ficheiro em "Biblioteca de Peças > Importar Peças" na aplicação

import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, "config.json");
const EXAMPLE_CONFIG_PATH = path.join(__dirname, "config.example.json");
const SESSION_DIR = path.join(__dirname, ".browser-session");

function loadConfig() {
  const configPath = fs.existsSync(CONFIG_PATH) ? CONFIG_PATH : EXAMPLE_CONFIG_PATH;
  if (!fs.existsSync(configPath)) {
    throw new Error(
      "Não foi encontrado config.json nem config.example.json em scripts/homag-import/."
    );
  }
  if (configPath === EXAMPLE_CONFIG_PATH) {
    console.warn(
      "⚠️  A usar config.example.json (ainda não criou o seu config.json). " +
        "Copie-o e ajuste startUrl + seletores antes de importar a sério.\n"
    );
  }
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

function askUser(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer); }));
}

async function scrapeListing(page, config) {
  const allItems = [];
  let currentUrl = config.startUrl;
  let pageCount = 0;
  const maxPages = config.maxPages || 20;

  while (currentUrl && pageCount < maxPages) {
    pageCount += 1;
    console.log(`📄 A carregar página ${pageCount}: ${currentUrl}`);
    await page.goto(currentUrl, { waitUntil: "networkidle2" });

    try {
      await page.waitForSelector(config.selectors.productItem, {
        timeout: config.waitForSelectorTimeoutMs || 15000,
      });
    } catch {
      console.warn(
        "⚠️  Não encontrei peças com o seletor configurado (productItem) nesta página. " +
          "Verifique os seletores no config.json (DevTools > Inspecionar). A parar aqui."
      );
      break;
    }

    const items = await page.evaluate((selectors) => {
      const nodes = Array.from(document.querySelectorAll(selectors.productItem));
      return nodes.map((node) => {
        const getText = (sel) => node.querySelector(sel)?.textContent?.trim() || "";
        const getImage = (sel) => node.querySelector(sel)?.getAttribute("src") || "";
        return {
          name: getText(selectors.name),
          code: getText(selectors.code),
          price: getText(selectors.price).replace(/[^\d.,]/g, "").replace(",", "."),
          image: getImage(selectors.image),
        };
      });
    }, config.selectors);

    console.log(`   ✅ ${items.length} peça(s) encontradas nesta página.`);
    allItems.push(...items);

    // Tentar avançar para a página seguinte (link com href ou botão para clicar)
    currentUrl = null;
    if (config.selectors.nextPage) {
      const nextHref = await page.evaluate((sel) => {
        const btn = document.querySelector(sel);
        if (!btn || btn.disabled || btn.getAttribute("aria-disabled") === "true") return null;
        return btn.getAttribute("href") || "__click__";
      }, config.selectors.nextPage);

      if (nextHref === "__click__") {
        try {
          await Promise.all([
            page.click(config.selectors.nextPage),
            page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15000 }),
          ]);
          currentUrl = page.url();
        } catch {
          currentUrl = null;
        }
      } else if (nextHref) {
        currentUrl = new URL(nextHref, page.url()).toString();
      }
    }
  }

  return allItems;
}

async function main() {
  const config = loadConfig();
  const manualLogin = process.env.HOMAG_MANUAL === "1";

  console.log(
    manualLogin
      ? "🧭 Modo manual: vai abrir um navegador para iniciar sessão na HOMAG.\n"
      : "🔁 Modo automático: a reutilizar a sessão guardada em .browser-session/ (se existir).\n"
  );

  const browser = await puppeteer.launch({
    headless: !manualLogin,
    userDataDir: SESSION_DIR,
    defaultViewport: { width: 1366, height: 900 },
  });

  const page = await browser.newPage();

  if (manualLogin) {
    await page.goto("https://shop.homag.com/s/?language=en_US", { waitUntil: "networkidle2" });
    await askUser(
      "\n👉 Inicie sessão na loja HOMAG na janela do navegador que abriu.\n" +
        "   Quando estiver com sessão iniciada, volte aqui e prima ENTER para continuar...\n"
    );
  }

  const rawItems = await scrapeListing(page, config);
  await browser.close();

  // Deduplicar por código (a HOMAG pode repetir o mesmo produto em vários pontos da listagem)
  const seen = new Set();
  const deduped = rawItems.filter((item) => {
    if (!item.code || seen.has(item.code)) return false;
    seen.add(item.code);
    return true;
  });

  const exportData = deduped.map((item) => ({
    name: item.name,
    code: item.code,
    price: item.price,
    description: "",
    category: config.category || "",
    subcategory: config.subcategory || "",
  }));

  const outputPath = path.isAbsolute(config.outputPath || "")
    ? config.outputPath
    : path.join(__dirname, config.outputPath || "out/export.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), "utf-8");

  console.log(`\n✅ Concluído: ${exportData.length} peça(s) única(s) guardadas em:\n   ${outputPath}`);
  console.log(
    '   Agora vá a "Biblioteca de Peças > Importar Peças" na aplicação e carregue esse ficheiro JSON.'
  );
}

main().catch((err) => {
  console.error("❌ Erro ao importar da HOMAG:", err);
  process.exit(1);
});
