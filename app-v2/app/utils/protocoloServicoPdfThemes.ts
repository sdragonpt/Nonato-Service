/**
 * Formatos visuais para impressão PDF dos Protocolos de Serviço (HTML → Imprimir / Guardar como PDF).
 * Cabeçalho único, alinhado como documento profissional; modelos diferem só em cor/accento e corpo.
 */

export const PROTOCOLO_SERVICO_PDF_MODELOS_MAX = 14

export function clampProtocoloPdfModelo(n: number | undefined): number {
  return Math.min(PROTOCOLO_SERVICO_PDF_MODELOS_MAX, Math.max(1, Number(n) || 1))
}

type HeaderOpts = {
  tituloProto: string
  dataDoc: string
  logoHtml: string
}

const PRINT_SAFE = `@page{size:A4;margin:12mm}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}`

function logoOrName(logoHtml: string): string {
  return logoHtml || '<span class="logo-fallback">NONATO SERVICE</span>'
}

function escAttr(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Layout do cabeçalho: tabela para impressão estável; visual tipo documento corporativo */
const HDR_LAYOUT_CSS = `
.pdf-header.hdr-doc{margin:0 0 24px;padding:0;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-sizing:border-box;box-shadow:0 4px 22px rgba(15,23,42,0.07);}
.hdr-table{width:100%;border-collapse:collapse;table-layout:fixed;margin:0;}
.hdr-table td{vertical-align:top;padding:0;}
.hdr-td-logo{width:34%;padding:20px 20px 20px 22px;border-right:1px solid #e2e8f0;box-sizing:border-box;}
.hdr-td-main{padding:20px 24px 20px 24px;box-sizing:border-box;}
.hdr-logo-box{min-height:50px;display:flex;align-items:center;justify-content:flex-start;}
.hdr-logo-box img{max-height:54px;max-width:200px;width:auto;height:auto;object-fit:contain;display:block;}
.logo-fallback{font-family:'Segoe UI',system-ui,sans-serif;font-size:12px;font-weight:800;color:#334155;letter-spacing:0.08em;line-height:1.25;display:block;}
.hdr-empresa{margin:10px 0 0;font-size:7.5pt;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#64748b;line-height:1.45;}
.hdr-etiq{margin:0 0 7px;font-size:7.5pt;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;}
.hdr-titulo{margin:0;font-size:16pt;font-weight:700;color:#0f172a;line-height:1.2;letter-spacing:-0.025em;}
.hdr-data{margin:11px 0 0;font-size:9.5pt;color:#475569;font-weight:500;}
.hdr-data .hdr-data-lbl{font-weight:600;color:#64748b;margin-right:6px;}
.hdr-linha{height:3px;margin:0;width:100%;clear:both;border:0;}
`

/** Por modelo: faixa superior, coluna do logo, linha inferior e acentos de texto */
const HDR_VARIANT_CSS: string[] = [
  '.hdr-v1.pdf-header.hdr-doc{border-color:#cbd5e1;border-top:4px solid #15803d;}.hdr-v1 .hdr-td-logo{background:linear-gradient(180deg,#f0fdf4 0%,#ecfdf5 100%);border-right-color:#86efac;}.hdr-v1 .hdr-linha{background:linear-gradient(90deg,#15803d,#22c55e,#15803d);}.hdr-v1 .hdr-etiq{color:#166534;}',
  '.hdr-v2.pdf-header.hdr-doc{border-color:#bfdbfe;border-top:4px solid #2563eb;}.hdr-v2 .hdr-td-logo{background:linear-gradient(180deg,#f8fafc 0%,#eff6ff 100%);border-right-color:#93c5fd;}.hdr-v2 .hdr-linha{background:linear-gradient(90deg,#1d4ed8,#3b82f6,#1d4ed8);}.hdr-v2 .hdr-titulo{color:#1e3a8a;}',
  '.hdr-v3.pdf-header.hdr-doc{border-color:#fed7aa;border-top:4px solid #ea580c;}.hdr-v3 .hdr-td-logo{background:linear-gradient(180deg,#fffbeb 0%,#ffedd5 100%);border-right-color:#fdba74;}.hdr-v3 .hdr-linha{background:linear-gradient(90deg,#9a3412,#ea580c,#9a3412);}.hdr-v3 .hdr-etiq{color:#9a3412;}',
  '.hdr-v4.pdf-header.hdr-doc{border-color:#99f6e4;border-top:4px solid #0d9488;}.hdr-v4 .hdr-td-logo{background:linear-gradient(180deg,#f0fdfa 0%,#ccfbf1 100%);border-right-color:#5eead4;}.hdr-v4 .hdr-linha{background:linear-gradient(90deg,#0f766e,#14b8a6,#0f766e);}.hdr-v4 .hdr-titulo{color:#115e59;}',
  '.hdr-v5.pdf-header.hdr-doc{border-color:#d1d5db;border-top:4px solid #374151;}.hdr-v5 .hdr-td-logo{background:#f3f4f6;border-right-color:#9ca3af;}.hdr-v5 .hdr-linha{background:#1f2937;}.hdr-v5 .hdr-titulo{font-family:Consolas,ui-monospace,monospace;font-size:13pt;letter-spacing:-0.03em;}',
  '.hdr-v6.pdf-header.hdr-doc{border-color:#e7d5c4;border-top:4px solid #b45309;}.hdr-v6 .hdr-td-logo{background:linear-gradient(180deg,#fffbeb 0%,#fef3c7 100%);border-right-color:#fcd34d;}.hdr-v6 .hdr-linha{background:linear-gradient(90deg,#92400e,#d97706,#92400e);}.hdr-v6 .hdr-titulo{font-family:Georgia,ui-serif,serif;color:#78350f;font-size:15pt;}',
  '.hdr-v7.pdf-header.hdr-doc{border-color:#cbd5e1;border-top:4px solid #475569;}.hdr-v7 .hdr-td-logo{background:linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%);border-right-color:#94a3b8;}.hdr-v7 .hdr-linha{background:#475569;}.hdr-v7 .hdr-etiq{color:#475569;}',
  '.hdr-v8.pdf-header.hdr-doc{border:2px solid #334155;border-top:6px solid #1e293b;border-radius:8px;}.hdr-v8 .hdr-td-logo{background:#fff;border-right:2px solid #1e293b;padding-left:18px;}.hdr-v8 .hdr-linha{background:#0f172a;height:4px;}.hdr-v8 .hdr-titulo{letter-spacing:-0.025em;}',
  '.hdr-v9.pdf-header.hdr-doc{border-color:#93c5fd;border-top:4px solid #1d4ed8;}.hdr-v9 .hdr-td-logo{background:linear-gradient(180deg,#eff6ff 0%,#dbeafe 100%);border-right-color:#60a5fa;}.hdr-v9 .hdr-linha{background:linear-gradient(90deg,#1e40af,#2563eb,#1e40af);}.hdr-v9 .hdr-titulo{color:#1e40af;}',
  '.hdr-v10.pdf-header.hdr-doc{border-color:#d4d4d8;border-top:4px solid #ca8a04;background:linear-gradient(180deg,#fafafa 0%,#fff 12%);}.hdr-v10 .hdr-td-logo{background:#f4f4f5;border-right-color:#a1a1aa;}.hdr-v10 .hdr-linha{background:linear-gradient(90deg,#713f12,#ca8a04,#713f12);height:4px;}.hdr-v10 .hdr-titulo{color:#18181b;}',
  '.hdr-v11.pdf-header.hdr-doc{border-color:#c7d2fe;border-top:4px solid #4f46e5;}.hdr-v11 .hdr-td-logo{background:linear-gradient(135deg,#eef2ff 0%,#e0e7ff 100%);border-right-color:#a5b4fc;}.hdr-v11 .hdr-linha{background:linear-gradient(90deg,#3730a3,#6366f1,#3730a3);}.hdr-v11 .hdr-titulo{color:#312e81;}',
  '.hdr-v12.pdf-header.hdr-doc{border-color:#9ca3af;border-top:4px solid #111827;border-radius:4px;}.hdr-v12 .hdr-td-logo{background:#f9fafb;border-right:1px solid #6b7280;}.hdr-v12 .hdr-linha{background:#111827;}.hdr-v12 .hdr-titulo,.hdr-v12 .hdr-data,.hdr-v12 .hdr-etiq,.hdr-v12 .hdr-empresa{font-family:Consolas,ui-monospace,monospace;}.hdr-v12 .hdr-titulo{font-size:12.5pt;}',
  /* 13 — Executive: cabeçalho escuro, faixa dourada, forte hierarquia */
  '.hdr-v13.pdf-header.hdr-doc{border-color:#1e293b;border-radius:14px;box-shadow:0 10px 40px rgba(15,23,42,0.18);border-top:none;}.hdr-v13 .hdr-td-logo{background:linear-gradient(165deg,#0f172a 0%,#1e293b 55%,#334155 100%);border-right:1px solid #475569;}.hdr-v13 .hdr-td-main{background:linear-gradient(180deg,#1e293b 0%,#0f172a 100%);}.hdr-v13 .hdr-logo-box img{filter:brightness(1.08) contrast(1.05);}.hdr-v13 .logo-fallback{color:#fbbf24;}.hdr-v13 .hdr-empresa{color:#94a3b8;}.hdr-v13 .hdr-etiq{color:#cbd5e1;}.hdr-v13 .hdr-titulo{color:#f8fafc;font-size:17pt;font-weight:750;letter-spacing:-0.03em;}.hdr-v13 .hdr-data{color:#94a3b8;}.hdr-v13 .hdr-data .hdr-data-lbl{color:#cbd5e1;}.hdr-v13 .hdr-linha{background:linear-gradient(90deg,#92400e 0%,#fbbf24 35%,#f59e0b 65%,#92400e 100%);height:4px;}',
  /* 14 — Moderno: clínico / SaaS, muito branco, acento teal */
  '.hdr-v14.pdf-header.hdr-doc{border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 2px 8px rgba(15,23,42,0.05);border-top:none;}.hdr-v14 .hdr-td-logo{background:linear-gradient(180deg,#fafbfc 0%,#f1f5f9 100%);border-right:1px solid #e2e8f0;}.hdr-v14 .hdr-td-main{background:#fff;}.hdr-v14 .hdr-etiq{color:#0d9488;letter-spacing:0.2em;}.hdr-v14 .hdr-titulo{color:#0f172a;font-size:16.5pt;font-weight:750;letter-spacing:-0.035em;}.hdr-v14 .hdr-data{color:#64748b;}.hdr-v14 .hdr-linha{background:linear-gradient(90deg,#0f766e 0%,#14b8a6 50%,#0d9488 100%);height:4px;border-radius:0 0 3px 3px;}',
]

function buildHeaderHtml(variantIndex: number, o: HeaderOpts): string {
  const t = escAttr(o.tituloProto)
  const d = escAttr(o.dataDoc)
  const L = logoOrName(o.logoHtml)
  const v = variantIndex + 1
  return `<header class="pdf-header hdr-doc hdr-v${v}" role="banner"><table class="hdr-table" role="presentation"><tr><td class="hdr-td-logo"><div class="hdr-logo-box">${L}</div><p class="hdr-empresa">Nonato Service</p></td><td class="hdr-td-main"><p class="hdr-etiq">Protocolo de serviço</p><h1 class="hdr-titulo">${t}</h1><p class="hdr-data"><span class="hdr-data-lbl">Emitido em</span>${d}</p></td></tr></table><div class="hdr-linha" aria-hidden="true"></div></header>`
}

function buildHeaderFragments(o: HeaderOpts): string[] {
  return Array.from({ length: PROTOCOLO_SERVICO_PDF_MODELOS_MAX }, (_, i) => buildHeaderHtml(i, o))
}

/** Estilos de blocos de texto / imagens no corpo */
export const PROTOCOLO_PDF_BLOCO_STYLES: string[] = [
  'margin:14px 0;padding:15px 18px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;color:#334155;font-size:11.5pt;line-height:1.5;',
  'margin:14px 0;padding:14px 16px;background:#f8fafc;border-radius:8px;border-left:4px solid #2563eb;color:#0f172a;font-size:11.5pt;line-height:1.5;',
  'margin:14px 0;padding:15px 17px;background:#fff;border-radius:10px;border:1px solid #cbd5e1;color:#1e293b;font-size:11.5pt;line-height:1.5;',
  'margin:14px 0;padding:16px 18px;background:#fff;border-radius:12px;border:1px solid #99f6e4;color:#134e4a;font-size:11.5pt;line-height:1.45;',
  'margin:14px 0;padding:12px 14px;background:#fafafa;border:1px dashed #64748b;border-radius:4px;font-family:Consolas,ui-monospace,monospace;font-size:10.5pt;line-height:1.55;color:#111827;',
  'margin:14px 0;padding:16px 18px;background:#fffbeb;border:1px solid #e7d5c4;border-radius:6px;font-family:Georgia,ui-serif,serif;font-size:11.5pt;line-height:1.55;color:#422006;',
  'margin:14px 0;padding:15px 18px;background:#f8fafc;border-radius:8px;border-left:5px solid #475569;color:#334155;font-size:11.5pt;line-height:1.5;',
  'margin:14px 0;padding:16px 20px;background:#fff;border:2px solid #1e293b;border-radius:2px;color:#0f172a;font-size:11.5pt;line-height:1.55;',
  'margin:14px 0;padding:15px 18px;background:#eff6ff;border-radius:12px;border:1px solid #bfdbfe;color:#1e3a5f;font-size:11.5pt;line-height:1.5;',
  'margin:14px 0;padding:16px 18px;background:#fafafa;border:1px solid #e4e4e7;border-radius:10px;color:#18181b;font-size:11.5pt;line-height:1.5;',
  'margin:14px 0;padding:14px 17px;background:#fff;border-radius:8px;border-left:6px solid #4f46e5;color:#1e1b4b;font-size:11.5pt;line-height:1.5;',
  'margin:14px 0;padding:13px 15px;background:#f9fafb;border:1px solid #d1d5db;border-radius:2px;font-family:ui-monospace,Consolas,monospace;font-size:10.5pt;line-height:1.55;color:#111827;',
  /* 13 — blocos tipo relatório executivo */
  'margin:16px 0;padding:17px 20px;background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%);border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(15,23,42,0.05);color:#1e293b;font-size:11.5pt;line-height:1.55;border-left:4px solid #1e293b;',
  /* 14 — blocos clean com acento */
  'margin:16px 0;padding:18px 20px;background:#fff;border-radius:14px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(15,23,42,0.04);color:#334155;font-size:11.5pt;line-height:1.58;border-top:3px solid #14b8a6;',
]

export const PROTOCOLO_PDF_IMG_RADIUS: number[] = [8, 8, 8, 10, 4, 6, 8, 2, 10, 8, 8, 3, 10, 12]

/** CSS do corpo + secções (sem cabeçalho) */
const BODY_CSS: string[] = [
  `body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:0;color:#1e293b;font-size:11pt;line-height:1.45;background:#fff;}.body-wrap{padding:0 0 24px;}.sec{margin:16px 0;padding:16px 18px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;}.sec-title{margin:0 0 12px;font-size:8.5pt;font-weight:700;letter-spacing:0.1em;color:#15803d;text-transform:uppercase;border-bottom:1px solid #e2e8f0;padding-bottom:8px;}.cl-table{width:100%;border-collapse:collapse;}.cl-table tr:not(:last-child){border-bottom:1px solid #f1f5f9;}.cl-table .cl-label{width:32%;padding:8px 12px 8px 0;vertical-align:top;font-weight:600;color:#64748b;font-size:8.5pt;text-transform:uppercase;letter-spacing:0.04em;}.cl-table .cl-value{padding:8px 0;color:#0f172a;font-size:10.5pt;}.texto-inicial{white-space:pre-wrap;margin:0;color:#334155;line-height:1.55;}.footer-bar{margin-top:22px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:10px;}.footer-date{font-size:9pt;color:#64748b;}.doc-ref{font-size:8pt;color:#94a3b8;font-family:Consolas,ui-monospace,monospace;}`,
  `body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:0;color:#0f172a;font-size:11pt;background:#fff;}.body-wrap{padding:0 0 24px;}.sec{margin:16px 0;padding:16px 18px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;border-left:3px solid #2563eb;}.sec-title{margin:0 0 11px;font-size:8.5pt;font-weight:700;letter-spacing:0.08em;color:#1d4ed8;text-transform:uppercase;border-bottom:1px solid #e2e8f0;padding-bottom:8px;}.cl-table{width:100%;border-collapse:collapse;}.cl-table tr{border-bottom:1px solid #f1f5f9;}.cl-table .cl-label{width:30%;padding:8px 10px 8px 0;font-weight:600;color:#475569;font-size:8.5pt;text-transform:uppercase;}.cl-table .cl-value{color:#0f172a;font-size:10.5pt;}.texto-inicial{white-space:pre-wrap;margin:0;}.footer-bar{margin-top:20px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;flex-wrap:wrap;}.footer-date{font-size:9pt;color:#64748b;}.doc-ref{font-size:8pt;color:#94a3b8;font-family:Consolas,monospace;}`,
  `body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:0;color:#1e293b;font-size:11pt;background:#fff;}.body-wrap{padding:0 0 24px;}.sec{margin:16px 0;padding:16px 18px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;}.sec-title{margin:0 0 11px;font-size:8.5pt;font-weight:700;color:#c2410c;text-transform:uppercase;letter-spacing:0.07em;border-bottom:1px solid #fed7aa;padding-bottom:8px;}.cl-table .cl-label{width:28%;font-weight:600;color:#64748b;font-size:8.5pt;text-transform:uppercase;}.cl-table .cl-value{color:#0f172a;}.texto-inicial{white-space:pre-wrap;margin:0;}.footer-bar{margin-top:20px;padding-top:12px;border-top:1px solid #cbd5e1;display:flex;justify-content:space-between;flex-wrap:wrap;}.footer-date{font-size:9pt;color:#64748b;}.doc-ref{font-size:8pt;color:#94a3b8;font-family:Consolas,monospace;}`,
  `body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:0;color:#134e4a;font-size:11pt;background:#fff;}.body-wrap{padding:0 0 24px;}.sec{margin:16px 0;padding:16px 18px;background:#fff;border:1px solid #99f6e4;border-radius:10px;}.sec-title{margin:0 0 11px;font-size:8.5pt;font-weight:700;color:#0f766e;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #ccfbf1;padding-bottom:8px;}.cl-table .cl-label{color:#0d9488;font-weight:600;width:30%;font-size:8.5pt;text-transform:uppercase;}.cl-table .cl-value{color:#134e4a;}.texto-inicial{white-space:pre-wrap;margin:0;}.footer-bar{margin-top:20px;padding-top:12px;border-top:1px solid #99f6e4;display:flex;justify-content:space-between;flex-wrap:wrap;}.footer-date{font-size:9pt;color:#0d9488;}.doc-ref{font-size:8pt;color:#64748b;font-family:Consolas,monospace;}`,
  `body{font-family:Consolas,ui-monospace,monospace;margin:0;padding:0;color:#111827;font-size:10.5pt;background:#fff;line-height:1.5;}.body-wrap{padding:0 0 20px;}.sec{margin:14px 0;padding:14px 16px;background:#fff;border:1px dashed #9ca3af;border-radius:2px;}.sec-title{margin:0 0 8px;color:#111827;font-size:8pt;font-weight:700;text-transform:uppercase;border-bottom:1px dashed #d1d5db;padding-bottom:6px;letter-spacing:0.06em;}.cl-table .cl-label{width:32%;font-weight:700;color:#4b5563;font-size:8pt;text-transform:uppercase;}.cl-table .cl-value{color:#111827;}.texto-inicial{white-space:pre-wrap;margin:0;}.footer-bar{margin-top:18px;padding-top:10px;border-top:1px dashed #6b7280;display:flex;justify-content:space-between;flex-wrap:wrap;}.footer-date{font-size:8.5pt;color:#6b7280;}.doc-ref{font-size:7.5pt;color:#9ca3af;}`,
  `body{font-family:Georgia,ui-serif,serif;margin:0;padding:0;color:#422006;font-size:11pt;background:#fff;}.body-wrap{padding:0 0 24px;}.sec{margin:16px 0;padding:16px 18px;background:#fffbf5;border:1px solid #e7d5c4;border-radius:2px;}.sec-title{margin:0 0 10px;color:#7f1d1d;font-size:8.5pt;font-weight:700;text-transform:uppercase;border-left:3px solid #ca8a04;padding-left:10px;letter-spacing:0.05em;}.cl-table .cl-label{width:30%;color:#78350f;font-weight:700;font-size:9pt;}.cl-table .cl-value{color:#422006;}.texto-inicial{white-space:pre-wrap;margin:0;line-height:1.55;}.footer-bar{margin-top:20px;padding-top:12px;border-top:1px solid #e7d5c4;display:flex;justify-content:space-between;flex-wrap:wrap;}.footer-date{font-size:9pt;color:#92400e;}.doc-ref{font-size:8pt;color:#a8a29e;}`,
  `body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:0;color:#334155;font-size:11pt;background:#fff;}.body-wrap{padding:0 0 24px;}.sec{margin:16px 0;padding:16px 18px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;}.sec-title{margin:0 0 11px;font-size:8.5pt;font-weight:700;letter-spacing:0.09em;color:#475569;text-transform:uppercase;border-bottom:2px solid #e2e8f0;padding-bottom:8px;}.cl-table{width:100%;border-collapse:collapse;}.cl-table tr{border-bottom:1px solid #f1f5f9;}.cl-table .cl-label{width:32%;padding:8px 12px 8px 0;font-weight:600;color:#64748b;font-size:8.5pt;text-transform:uppercase;}.cl-table .cl-value{color:#0f172a;}.texto-inicial{white-space:pre-wrap;margin:0;line-height:1.55;}.footer-bar{margin-top:20px;padding-top:12px;border-top:1px solid #cbd5e1;display:flex;justify-content:space-between;flex-wrap:wrap;}.footer-date{font-size:9pt;color:#64748b;}.doc-ref{font-size:8pt;color:#94a3b8;font-family:Consolas,monospace;}`,
  `body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:0;color:#0f172a;font-size:11pt;background:#fff;}.body-wrap{padding:0 0 24px;}.sec{margin:16px 0;padding:16px 18px;background:#fafafa;border:1px solid #cbd5e1;border-radius:2px;}.sec-title{margin:0 0 10px;font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#334155;border-bottom:1px solid #94a3b8;padding-bottom:8px;}.cl-table .cl-label{width:32%;font-weight:600;font-size:8.5pt;color:#475569;text-transform:uppercase;}.cl-table .cl-value{color:#0f172a;}.texto-inicial{white-space:pre-wrap;margin:0;}.footer-bar{margin-top:20px;padding-top:12px;border-top:2px solid #1e293b;display:flex;justify-content:space-between;flex-wrap:wrap;}.footer-date{font-size:9pt;color:#64748b;}.doc-ref{font-size:8pt;color:#94a3b8;font-family:Consolas,monospace;}`,
  `body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:0;color:#1e3a5f;font-size:11pt;background:#fff;}.body-wrap{padding:0 0 24px;}.sec{margin:16px 0;padding:16px 18px;background:#fff;border:1px solid #bfdbfe;border-radius:10px;}.sec-title{margin:0 0 11px;color:#1d4ed8;font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;border-bottom:1px solid #bfdbfe;padding-bottom:8px;}.cl-table .cl-label{color:#3b82f6;font-weight:600;width:30%;font-size:8.5pt;text-transform:uppercase;}.cl-table .cl-value{color:#1e293b;}.texto-inicial{white-space:pre-wrap;margin:0;line-height:1.55;}.footer-bar{margin-top:20px;padding-top:12px;border-top:1px solid #bfdbfe;display:flex;justify-content:space-between;flex-wrap:wrap;}.footer-date{font-size:9pt;color:#64748b;}.doc-ref{font-size:8pt;color:#94a3b8;font-family:Consolas,monospace;}`,
  `body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:0;color:#18181b;font-size:11pt;background:#fff;}.body-wrap{padding:0 0 24px;}.sec{margin:16px 0;padding:16px 18px;background:#fff;border:1px solid #e4e4e7;border-radius:10px;}.sec-title{margin:0 0 11px;font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;padding-bottom:8px;border-bottom:1px solid #e4e4e7;color:#18181b;}.cl-table{width:100%;border-collapse:collapse;}.cl-table tr{border-bottom:1px solid #f4f4f5;}.cl-table .cl-label{width:32%;padding:8px 12px 8px 0;font-weight:600;font-size:8.5pt;text-transform:uppercase;color:#52525b;}.cl-table .cl-value{color:#18181b;}.texto-inicial{white-space:pre-wrap;margin:0;line-height:1.55;}.footer-bar{margin-top:20px;padding-top:12px;border-top:1px solid #d4d4d8;display:flex;justify-content:space-between;flex-wrap:wrap;}.footer-date{font-size:9pt;color:#52525b;}.doc-ref{font-size:8pt;color:#71717a;font-family:Consolas,monospace;}`,
  `body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:0;color:#312e81;font-size:11pt;background:#fff;}.body-wrap{padding:0 0 24px;}.sec{margin:16px 0;padding:16px 18px;background:#fff;border:1px solid #e0e7ff;border-radius:10px;}.sec-title{margin:0 0 11px;color:#4338ca;font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #e0e7ff;padding-bottom:8px;}.cl-table .cl-label{width:31%;font-weight:700;color:#6366f1;font-size:8.5pt;text-transform:uppercase;}.cl-table .cl-value{color:#1e1b4b;}.texto-inicial{white-space:pre-wrap;margin:0;line-height:1.55;}.footer-bar{margin-top:20px;padding-top:12px;border-top:1px solid #c7d2fe;display:flex;justify-content:space-between;flex-wrap:wrap;}.footer-date{font-size:9pt;color:#64748b;}.doc-ref{font-size:8pt;color:#94a3b8;font-family:Consolas,monospace;}`,
  `body{font-family:Consolas,ui-monospace,monospace;margin:0;padding:0;color:#111827;font-size:10.5pt;background:#fff;}.body-wrap{padding:0 0 22px;}.sec{margin:14px 0;padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-left:3px solid #111827;}.sec-title{margin:0 0 9px;font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#111827;border-bottom:1px solid #d1d5db;padding-bottom:6px;}.cl-table .cl-label{width:30%;font-weight:700;color:#4b5563;font-size:7.5pt;text-transform:uppercase;}.cl-table .cl-value{color:#111827;}.texto-inicial{white-space:pre-wrap;margin:0;line-height:1.5;}.footer-bar{margin-top:18px;padding-top:10px;border-top:2px solid #111827;display:flex;justify-content:space-between;flex-wrap:wrap;}.footer-date{font-size:8.5pt;color:#6b7280;}.doc-ref{font-size:7.5pt;color:#9ca3af;}`,
  /* 13 — corpo: secções com sombra suave, rótulos navy */
  `body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:0;color:#1e293b;font-size:11pt;line-height:1.5;background:#f8fafc;}.body-wrap{padding:0 0 28px;}.sec{margin:18px 0;padding:18px 20px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 2px 12px rgba(15,23,42,0.06);}.sec-title{margin:0 0 14px;font-size:8pt;font-weight:800;letter-spacing:0.14em;color:#0f172a;text-transform:uppercase;border-bottom:2px solid #1e293b;padding-bottom:10px;}.cl-table{width:100%;border-collapse:collapse;}.cl-table tr{border-bottom:1px solid #f1f5f9;}.cl-table .cl-label{width:32%;padding:10px 14px 10px 0;font-weight:700;color:#475569;font-size:8pt;text-transform:uppercase;letter-spacing:0.05em;}.cl-table .cl-value{padding:10px 0;color:#0f172a;font-size:10.5pt;}.texto-inicial{white-space:pre-wrap;margin:0;color:#334155;line-height:1.62;}.footer-bar{margin-top:26px;padding-top:16px;border-top:1px solid #cbd5e1;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px;}.footer-date{font-size:9pt;color:#475569;font-weight:500;}.doc-ref{font-size:8pt;color:#94a3b8;font-family:ui-monospace,Consolas,monospace;}`,
  /* 14 — corpo: espaçamento generoso, títulos teal */
  `body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:0;color:#334155;font-size:11pt;line-height:1.55;background:#fff;}.body-wrap{padding:0 0 28px;}.sec{margin:18px 0;padding:20px 22px;background:#fafbfc;border:1px solid #e2e8f0;border-radius:16px;}.sec-title{margin:0 0 14px;font-size:8pt;font-weight:800;letter-spacing:0.16em;color:#0f766e;text-transform:uppercase;padding-bottom:10px;border-bottom:1px solid #ccfbf1;}.cl-table{width:100%;border-collapse:separate;border-spacing:0;}.cl-table tr td{padding:11px 0;border-bottom:1px solid #f1f5f9;}.cl-table tr:last-child td{border-bottom:none;}.cl-table .cl-label{width:30%;font-weight:700;color:#0d9488;font-size:8pt;text-transform:uppercase;letter-spacing:0.06em;}.cl-table .cl-value{color:#1e293b;font-size:10.5pt;padding-left:8px;}.texto-inicial{white-space:pre-wrap;margin:0;color:#475569;line-height:1.65;}.footer-bar{margin-top:26px;padding-top:14px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;}.footer-date{font-size:9pt;color:#64748b;}.doc-ref{font-size:8pt;color:#94a3b8;font-family:Consolas,monospace;}`,
]

function cssBlocks(): string[] {
  return BODY_CSS.map((body, i) => PRINT_SAFE + HDR_LAYOUT_CSS + HDR_VARIANT_CSS[i] + body)
}

let _cssCache: string[] | null = null
function getCssBlocks(): string[] {
  if (!_cssCache) _cssCache = cssBlocks()
  return _cssCache
}

export function buildProtocoloServicoPrintHtml(
  idx0: number,
  headerOpts: HeaderOpts,
  bodyInner: string
): string {
  const idx = Math.max(0, Math.min(PROTOCOLO_SERVICO_PDF_MODELOS_MAX - 1, idx0))
  const css = getCssBlocks()[idx]
  const header = buildHeaderFragments(headerOpts)[idx]
  const titleSafe = headerOpts.tituloProto.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${titleSafe}</title><style>${css}</style></head><body>${header}<div class="body-wrap">${bodyInner}</div></body></html>`
}
