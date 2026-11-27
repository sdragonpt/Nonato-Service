// emailTemplate.js — HTML dos e-mails para clientes.
//
// Os programas de e-mail (Gmail, Outlook…) só percebem HTML "à antiga":
// tabelas, estilos inline, sem CSS externo nem scripts. Por isso o e-mail é
// montado aqui a partir dos campos do formulário, com tudo escapado.
//
// Marcadores trocados pelo servidor para cada cliente (functions/index.js):
//   {{NOME}}          nome do cliente
//   {{CANCELAR_URL}}  link pessoal para deixar de receber e-mails

const LOGO_URL = "https://app.nonatoservice.pt/nonato2.png";
const SITE_URL = "https://nonatoservice.pt";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

/** Só links http(s); qualquer outra coisa (javascript:, data:…) é ignorada. */
export const safeUrl = (u) => {
  const s = String(u || "").trim();
  if (!s) return "";
  const withProto = /^https?:\/\//i.test(s) ? s : /^[\w-]+(\.[\w-]+)+/.test(s) ? `https://${s}` : "";
  try {
    const url = new URL(withProto);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
};

/** Texto simples → parágrafos (linha em branco) e quebras de linha. */
const paragraphs = (text) =>
  String(text || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#33383d;">${esc(p).replace(/\n/g, "<br>")}</p>`
    )
    .join("");

/**
 * @param {object} c campos da campanha:
 *   { preheader, titulo, saudacao (bool), texto, imagemUrl, botaoTexto, botaoUrl }
 */
export function buildEmailHtml(c) {
  const botaoUrl = safeUrl(c.botaoUrl);
  const imagemUrl = safeUrl(c.imagemUrl);
  const font = "Arial,Helvetica,sans-serif";

  return `<!doctype html>
<html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(c.titulo)}</title></head>
<body style="margin:0;padding:0;background:#eef0f2;font-family:${font};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f2;">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
    <tr><td align="center" style="background:#111416;padding:24px;">
      <a href="${SITE_URL}"><img src="${LOGO_URL}" alt="Nonato Service" height="48" style="display:block;height:48px;border:0;"></a>
    </td></tr>
    ${imagemUrl ? `<tr><td><img src="${esc(imagemUrl)}" alt="" width="600" style="display:block;width:100%;height:auto;border:0;"></td></tr>` : ""}
    <tr><td style="padding:32px 32px 8px;">
      <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:#111416;font-family:${font};">${esc(c.titulo)}</h1>
      ${c.saudacao ? `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#33383d;">Olá {{NOME}},</p>` : ""}
      ${paragraphs(c.texto)}
    </td></tr>
    ${
      botaoUrl && c.botaoTexto
        ? `<tr><td align="center" style="padding:8px 32px 32px;">
      <a href="${esc(botaoUrl)}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 28px;border-radius:8px;font-family:${font};">${esc(c.botaoTexto)}</a>
    </td></tr>`
        : `<tr><td style="padding:0 0 16px;"></td></tr>`
    }
    <tr><td style="background:#f6f7f8;padding:20px 32px;font-size:12px;line-height:1.6;color:#6b7177;text-align:center;font-family:${font};">
      <strong style="color:#33383d;">Nonato Service</strong> · Assistência técnica a máquinas<br>
      <a href="${SITE_URL}" style="color:#16a34a;">nonatoservice.pt</a><br><br>
      Recebe este e-mail por ser cliente da Nonato Service.<br>
      <a href="{{CANCELAR_URL}}" style="color:#6b7177;">Não quero receber mais e-mails</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

/** Primeira campanha pedida: o lançamento do novo website. */
export const PRESET_WEBSITE = {
  nome: "Lançamento do novo website",
  assunto: "O novo website da Nonato Service já está online",
  preheader: "Conheça o novo nonatoservice.pt: serviços, peças e contactos num só lugar.",
  titulo: "Temos um novo website!",
  saudacao: true,
  texto:
    "É com muito gosto que lhe apresentamos o novo website da Nonato Service.\n\n" +
    "Lá encontra os nossos serviços de assistência técnica, as peças que temos disponíveis e todas as formas de nos contactar, de forma simples e rápida, no computador ou no telemóvel.\n\n" +
    "Em breve vamos também partilhar por lá avisos, promoções e máquinas à venda.\n\n" +
    "Obrigado pela confiança de sempre.",
  imagemUrl: "",
  botaoTexto: "Visitar o novo website",
  botaoUrl: SITE_URL,
};

export const EMPTY_CAMPAIGN = {
  nome: "",
  assunto: "",
  preheader: "",
  titulo: "",
  saudacao: true,
  texto: "",
  imagemUrl: "",
  botaoTexto: "",
  botaoUrl: "",
};

/** Modelos rápidos para os próximos e-mails. */
export const PRESETS = [
  { label: "Novo website", data: PRESET_WEBSITE },
  {
    label: "Promoção",
    data: {
      ...EMPTY_CAMPAIGN,
      nome: "Promoção",
      assunto: "Promoção Nonato Service",
      titulo: "Promoção especial",
      texto: "Durante este mês temos condições especiais em …\n\nFale connosco para saber mais.",
      botaoTexto: "Saber mais",
      botaoUrl: SITE_URL,
    },
  },
  {
    label: "Máquina à venda",
    data: {
      ...EMPTY_CAMPAIGN,
      nome: "Máquina à venda",
      assunto: "Máquina à venda: …",
      titulo: "Máquina à venda",
      texto: "Temos disponível …\n\nEstado: …\nPreço: …\n\nResponda a este e-mail ou ligue-nos para mais informações.",
      botaoTexto: "Ver no website",
      botaoUrl: SITE_URL,
    },
  },
  {
    label: "Aviso",
    data: {
      ...EMPTY_CAMPAIGN,
      nome: "Aviso",
      assunto: "Aviso Nonato Service",
      titulo: "Aviso importante",
      texto: "Informamos que …",
    },
  },
];
