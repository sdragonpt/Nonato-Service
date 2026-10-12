// scripts/deploy.mjs — build + deploy pela ordem certa.
//
//   npm run deploy                 → só o site (hosting)
//   npm run deploy -- regras       → site + regras da Firestore e do Storage
//   npm run deploy -- <alvos>      → o que se passaria a "firebase deploy --only"
//   npm run deploy -- --mesmo-assim  (em qualquer das formas) ignora o aviso abaixo
//
// Porquê: cada build fica carimbado com o commit do GitHub (ver
// vite.config.js). Se houver alterações ainda sem commit, o carimbo aponta
// para o commit ANTERIOR e deixa de se saber que código está publicado — por
// isso o script pára e pede o commit primeiro.

import { execSync, spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const force = args.includes("--mesmo-assim");
const targetArg = args.find((a) => !a.startsWith("--"));
const targets =
  targetArg === "regras" ? "hosting,firestore:rules,storage" : targetArg || "hosting";

const run = (cmd) => {
  console.log(`\n> ${cmd}\n`);
  const result = spawnSync(cmd, { stdio: "inherit", shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

let pending = "";
try {
  pending = execSync("git status --porcelain -- src public scripts firestore.rules storage.rules firebase.json package.json vite.config.js")
    .toString()
    .trim();
} catch {
  // Sem git disponível: segue sem a verificação.
}

if (pending && !force) {
  console.error("\n⚠  Há alterações ainda sem commit:\n");
  console.error(pending.split("\n").slice(0, 15).join("\n"));
  console.error(
    "\nFaça o commit no GitHub Desktop e corra de novo `npm run deploy`, para a versão publicada" +
      "\nficar ligada ao commit certo. (Para publicar já assim: npm run deploy -- --mesmo-assim)\n"
  );
  process.exit(1);
}

run("npm run build");
run(`firebase deploy --only ${targets}`);

console.log("\n✓ Publicado. Quem tiver a app aberta vê o aviso \"Nova versão disponível\".\n");
