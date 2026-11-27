// functions/index.js — Cloud Functions da Nonato Service.
//
// E-mails para clientes (avisos, promoções, máquinas à venda):
// - enviarCampanhaEmail (callable): envia uma campanha da coleção
//   "campanhasEmail" a todos os clientes com e-mail que não pediram para
//   deixar de receber (ou só a um grupo). Um e-mail por cliente, pelo Brevo,
//   cada um com o seu link para deixar de receber. Só administradores e gestores.
//   Com { teste: true } envia só para o e-mail de quem pediu.
// - cancelarEmails (HTTP): o link "deixar de receber" de cada e-mail
//   (servido em https://app.nonatoservice.pt/cancelar-emails pela regra de
//   hosting em firebase.json). Marca o cliente com emailOptOut = true.
//
// Segredos (definir uma vez, ver README dos e-mails na conversa):
//   firebase functions:secrets:set BREVO_API_KEY
//   firebase functions:secrets:set EMAIL_UNSUB_SECRET

import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createHmac, timingSafeEqual } from "node:crypto";

initializeApp();
const db = getFirestore();

const BREVO_API_KEY = defineSecret("BREVO_API_KEY");
const EMAIL_UNSUB_SECRET = defineSecret("EMAIL_UNSUB_SECRET");

const REGION = "europe-west1";
const APP_URL = "https://app.nonatoservice.pt";
const SENDER = { name: "Nonato Service", email: "info@nonatoservice.pt" };
// Mesmas contas "dono" das regras da Firestore.
const OWNERS = ["sergionunoribeiro@gmail.com", "service.nonato@gmail.com"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Permissões ──────────────────────────────────────────────────────────

/** Só contas autorizadas na app com papel de administrador ou gestor (ou os donos). */
const SEND_ROLES = ["admin", "gestor"];
async function assertCanSend(auth) {
  if (!auth?.token?.email) throw new HttpsError("unauthenticated", "Sessão necessária.");
  const email = auth.token.email.toLowerCase();
  if (OWNERS.includes(email)) return email;
  const allowed = (await db.doc("config/authorizedEmails").get()).data()?.emails || [];
  if (!allowed.map((e) => String(e).toLowerCase()).includes(email)) {
    throw new HttpsError("permission-denied", "Conta sem acesso à app.");
  }
  const role = (await db.doc(`users/${auth.uid}`).get()).data()?.role;
  if (!SEND_ROLES.includes(role)) {
    throw new HttpsError("permission-denied", "Só administradores e gestores podem enviar e-mails.");
  }
  return email;
}

// ── Link para deixar de receber ─────────────────────────────────────────

const unsubToken = (clientId) =>
  createHmac("sha256", EMAIL_UNSUB_SECRET.value()).update(String(clientId)).digest("hex").slice(0, 32);

const unsubUrl = (clientId) =>
  `${APP_URL}/cancelar-emails?c=${encodeURIComponent(clientId)}&t=${unsubToken(clientId)}`;

const escapeHtml = (s) =>
  String(s || "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

// ── Envio (Brevo) ───────────────────────────────────────────────────────

async function sendOne({ to, name, subject, html, unsubscribe }) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY.value(),
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: SENDER,
      replyTo: SENDER,
      to: [{ email: to, ...(name ? { name } : {}) }],
      subject,
      htmlContent: html,
      headers: unsubscribe
        ? { "List-Unsubscribe": `<${unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
        : undefined,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Brevo ${res.status}: ${text.slice(0, 200)}`);
  }
}

/** Corre `fn` sobre a lista com no máximo `limit` envios ao mesmo tempo. */
async function pool(items, limit, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const item = items[i++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

/** Personaliza o HTML guardado na campanha para um destinatário. */
const personalise = (html, { name, unsubscribe }) =>
  html
    .replaceAll("{{NOME}}", escapeHtml(name || "Cliente"))
    .replaceAll("{{CANCELAR_URL}}", unsubscribe || APP_URL);

export const enviarCampanhaEmail = onCall(
  { region: REGION, secrets: [BREVO_API_KEY, EMAIL_UNSUB_SECRET], timeoutSeconds: 540, memory: "256MiB" },
  async (request) => {
    const senderEmail = await assertCanSend(request.auth);
    const { campanhaId, teste } = request.data || {};
    if (!campanhaId) throw new HttpsError("invalid-argument", "Falta a campanha.");

    const ref = db.doc(`campanhasEmail/${campanhaId}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "Campanha não encontrada.");
    const campanha = snap.data();
    if (!campanha.assunto || !campanha.html) {
      throw new HttpsError("failed-precondition", "A campanha não tem assunto ou conteúdo.");
    }

    // Teste: só para quem pediu, sem link de cancelamento real.
    if (teste) {
      await sendOne({
        to: senderEmail,
        name: "Teste",
        subject: `[TESTE] ${campanha.assunto}`,
        html: personalise(campanha.html, { name: "Cliente de teste", unsubscribe: APP_URL }),
      });
      return { enviados: 1, teste: true, para: senderEmail };
    }

    // Trava contra envios repetidos (dois cliques, duas pessoas ao mesmo tempo).
    await db.runTransaction(async (tx) => {
      const cur = (await tx.get(ref)).data();
      if (cur.estado === "a_enviar" || cur.estado === "enviada") {
        throw new HttpsError("failed-precondition", "Esta campanha já foi enviada (ou está a ser enviada).");
      }
      tx.update(ref, { estado: "a_enviar", envioIniciadoEm: FieldValue.serverTimestamp(), enviadaPor: senderEmail });
    });

    // Destinatários: clientes com e-mail válido, que não pediram para sair,
    // não apagados; opcionalmente só um grupo. Um e-mail por endereço.
    const clientsSnap = await db.collection("clientes").get();
    const seen = new Set();
    const recipients = [];
    for (const d of clientsSnap.docs) {
      const c = d.data();
      const email = String(c.email || "").trim().toLowerCase();
      if (!EMAIL_RE.test(email) || c.emailOptOut || c.eliminadoEm) continue;
      if (campanha.grupoId && !(c.grupoIds || []).includes(campanha.grupoId)) continue;
      if (seen.has(email)) continue;
      seen.add(email);
      recipients.push({ id: d.id, email, name: c.name || "" });
    }

    let enviados = 0;
    const erros = [];
    await pool(recipients, 5, async (r) => {
      const unsubscribe = unsubUrl(r.id);
      try {
        await sendOne({
          to: r.email,
          name: r.name,
          subject: campanha.assunto,
          html: personalise(campanha.html, { name: r.name, unsubscribe }),
          unsubscribe,
        });
        enviados += 1;
      } catch (err) {
        erros.push({ email: r.email, erro: String(err.message || err).slice(0, 200) });
      }
    });

    await ref.update({
      estado: "enviada",
      enviadaEm: FieldValue.serverTimestamp(),
      destinatarios: recipients.length,
      enviados,
      falhados: erros.length,
      erros: erros.slice(0, 25),
    });
    return { enviados, falhados: erros.length, destinatarios: recipients.length };
  }
);

// ── Página "deixou de receber" ──────────────────────────────────────────

const page = (title, text) => `<!doctype html><html lang="pt"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Nonato Service</title>
<style>body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#0f1113;color:#e8e8e8;display:grid;place-items:center;min-height:100vh}
.box{max-width:440px;margin:24px;padding:32px;border-radius:16px;background:#1a1d20;text-align:center}
h1{font-size:20px;margin:0 0 12px;color:#fff}p{line-height:1.6;color:#b9bdc1}a{color:#22c55e}</style></head>
<body><div class="box"><h1>${title}</h1><p>${text}</p><p><a href="https://nonatoservice.pt">nonatoservice.pt</a></p></div></body></html>`;

export const cancelarEmails = onRequest(
  { region: REGION, secrets: [EMAIL_UNSUB_SECRET] },
  async (req, res) => {
    const clientId = String(req.query.c || "");
    const token = String(req.query.t || "");
    const expected = clientId ? unsubToken(clientId) : "";
    const valid =
      clientId &&
      token.length === expected.length &&
      timingSafeEqual(Buffer.from(token), Buffer.from(expected));
    if (!valid) {
      res.status(400).send(page("Link inválido", "Este link para deixar de receber e-mails não é válido."));
      return;
    }
    const ref = db.doc(`clientes/${clientId}`);
    if ((await ref.get()).exists) {
      await ref.update({ emailOptOut: true, emailOptOutEm: FieldValue.serverTimestamp() });
    }
    res
      .status(200)
      .send(page("Pedido registado", "Deixou de receber os nossos e-mails de avisos e promoções. Obrigado."));
  }
);
