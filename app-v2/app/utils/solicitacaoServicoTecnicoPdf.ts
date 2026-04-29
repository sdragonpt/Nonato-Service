/**

 * PDF / impressão — Solicitação de Serviço Técnico (documento para o cliente assinar e devolver).

 * Layout em secções (modelo tipo NSA): empresa, contacto, requisito, equipamento, disponibilidade, assinatura.

 */



export type SolicitacaoServicoTecnicoPdfData = {

  id: string

  nomeCliente: string

  identificacaoFiscal: string

  emailContato: string

  departamento: string

  tipoServico: string

  localServico: string

  problemasApresentados: string

  nivelUrgenciaLabel: string

  /** Valor interno: manha | tarde | dia | noite | livre | '' */

  horarioPreferidoKey: string

  tipoEquipamento: string

  marca: string

  modelo: string

  numeroSerie: string

  endereco: string

  telefone: string

  responsavel: string

  dataCriacao: string

  dataSolicitacaoStr: string

}



export type SolicitacaoServicoTecnicoPdfLabels = {

  docTitleLine1: string

  docTitleLine2: string

  docSubtitle: string

  emitidoEmLabel: string

  emitidoEmValue: string

  refLabel: string

  refValue: string

  secEmpresa: string

  secContato: string

  secRequisito: string

  secEquipamento: string

  secDisponibilidade: string

  /** Linha introdutória antes das opções de horário (ex.: «Horário preferido para serviço:») */
  horarioPreferidoParaServico: string

  dataSolicitacaoLabel: string

  nomeCliente: string

  identificacaoFiscal: string

  emailContato: string

  departamento: string

  tipoServico: string

  localServico: string

  tipoEquipamento: string

  marca: string

  modelo: string

  numeroSerie: string

  problemas: string

  nivelUrgencia: string

  endereco: string

  telefone: string

  responsavel: string

  horarioManha: string

  horarioTarde: string

  horarioDia: string

  horarioNoite: string

  horarioLivre: string

  secAssinatura: string

  textoLegal: string

  zonaAssinar: string

  nomeLegivel: string

  localData: string

  rodape: string

}



function esc(s: string): string {

  return String(s || '')

    .replace(/&/g, '&amp;')

    .replace(/</g, '&lt;')

    .replace(/>/g, '&gt;')

    .replace(/"/g, '&quot;')

}



function row(label: string, value: string): string {

  return `<tr><td class="sl-label">${esc(label)}</td><td class="sl-val">${esc(value)}</td></tr>`

}



function chk(selected: boolean): string {

  return selected ? '&#9745;' : '&#9744;'

}



export function buildSolicitacaoServicoTecnicoPrintHtml(

  d: SolicitacaoServicoTecnicoPdfData,

  L: SolicitacaoServicoTecnicoPdfLabels,

  logoHtml: string,

  htmlLang = 'pt'

): string {

  const logo = logoHtml || '<span class="sl-fallback">NONATO SERVICE</span>'

  const title1 = esc(L.docTitleLine1)

  const title2 = esc(L.docTitleLine2)

  const hk = String(d.horarioPreferidoKey || '')

  const showPill = String(L.docSubtitle || '').trim().length > 0

  const showMeta =
    String(L.emitidoEmLabel || '').trim().length > 0 || String(L.refLabel || '').trim().length > 0

  const secEmpresaTit = String(L.secEmpresa || '').trim()



  const css = `@page{size:A4;margin:12mm}

@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}

*{box-sizing:border-box}

body{margin:0;padding:0;font-family:'Segoe UI',system-ui,sans-serif;font-size:10pt;color:#0f172a;background:#fff;line-height:1.45}

.sl-wrap{max-width:720px;margin:0 auto;padding:0 2px}

.sl-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding-bottom:12px;border-bottom:3px solid #0f766e;margin-bottom:14px}

.sl-logo{flex-shrink:0}

.sl-head-text{flex:1;min-width:0}

.sl-doc-pill{display:inline-block;font-size:7.2pt;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#0f766e;background:#ecfdf5;border:1px solid #99f6e4;padding:4px 10px;border-radius:999px;margin-bottom:6px}

.sl-title{margin:0;font-size:15pt;font-weight:800;letter-spacing:-0.02em;color:#0f172a;line-height:1.12}

.sl-title span{display:block}

.sl-sub{margin:6px 0 0;font-size:9pt;color:#64748b;line-height:1.35}

.sl-meta{display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:8px;font-size:8.8pt;color:#475569}

.sl-meta strong{color:#0f172a;font-weight:700}

.sl-sec{margin:0 0 12px}

.sl-sec h2{margin:0 0 8px;font-size:8pt;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#0f766e;border-bottom:1px solid #ccfbf1;padding-bottom:6px}

.sl-page-break-before{page-break-before:always}

.sl-horario-intro{margin:0 0 8px;font-size:9.5pt;font-weight:700;color:#334155}

.sl-table{width:100%;border-collapse:collapse}

.sl-table tr{border-bottom:1px solid #f1f5f9}

.sl-table tr:last-child{border-bottom:none}

.sl-label{width:32%;padding:7px 10px 7px 0;vertical-align:top;font-weight:700;font-size:7.6pt;text-transform:uppercase;letter-spacing:0.04em;color:#475569}

.sl-val{padding:7px 0;color:#0f172a;font-size:10pt;white-space:pre-wrap}

.sl-horarios{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;margin-top:4px;font-size:9.2pt;color:#334155}

.sl-horarios div{display:flex;align-items:flex-start;gap:8px}

.sl-legal{margin:10px 0 12px;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #0f766e;border-radius:10px;font-size:9pt;color:#334155;line-height:1.5}

.sl-sign-box{margin-top:6px;padding:12px 14px;border:2px dashed #94a3b8;border-radius:12px;background:#fafbfc;page-break-inside:avoid}

.sl-sign-hint{font-size:8pt;color:#64748b;margin:0 0 8px;font-weight:600}

.sl-sign-area{min-height:88px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;margin-bottom:10px}

.sl-lines{display:grid;gap:8px;margin-top:10px}

.sl-line{display:flex;align-items:flex-end;gap:8px;font-size:9pt;color:#334155}

.sl-line span{flex:1;border-bottom:1px solid #334155;min-height:20px}

.sl-footer{margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:8pt;color:#64748b;text-align:center}

.sl-fallback{font-weight:800;letter-spacing:0.1em;color:#0f766e;font-size:11px}`



  const body = `<div class="sl-wrap">

<header class="sl-header">

  <div class="sl-logo">${logo}</div>

  <div class="sl-head-text">

    ${showPill ? `<div class="sl-doc-pill">${esc(L.docSubtitle)}</div>` : ''}

    <h1 class="sl-title"><span>${title1}</span><span>${title2}</span></h1>

    ${showMeta ? `<div class="sl-meta">

      <span><strong>${esc(L.emitidoEmLabel)}</strong> ${esc(L.emitidoEmValue)}</span>

      <span><strong>${esc(L.refLabel)}</strong> ${esc(L.refValue)}</span>

    </div>` : ''}

  </div>

</header>



<section class="sl-sec">

  ${secEmpresaTit ? `<h2>${esc(L.secEmpresa)}</h2>` : ''}

  <table class="sl-table" role="presentation">

    ${row(L.nomeCliente, d.nomeCliente)}

    ${row(L.identificacaoFiscal, d.identificacaoFiscal)}

    ${row(L.dataSolicitacaoLabel, d.dataSolicitacaoStr)}

  </table>

</section>



<section class="sl-sec">

  <h2>${esc(L.secContato)}</h2>

  <table class="sl-table" role="presentation">

    ${row(L.responsavel, d.responsavel)}

    ${row(L.departamento, d.departamento)}

    ${row(L.emailContato, d.emailContato)}

    ${row(L.telefone, d.telefone)}

    ${row(L.endereco, d.endereco)}

  </table>

</section>



<section class="sl-sec">

  <h2>${esc(L.secRequisito)}</h2>

  <table class="sl-table" role="presentation">

    ${row(L.tipoServico, d.tipoServico)}

    ${row(L.localServico, d.localServico)}

    ${row(L.problemas, d.problemasApresentados)}

    ${row(L.nivelUrgencia, d.nivelUrgenciaLabel)}

  </table>

</section>



<section class="sl-sec">

  <h2>${esc(L.secEquipamento)}</h2>

  <table class="sl-table" role="presentation">

    ${row(L.tipoEquipamento, d.tipoEquipamento)}

    ${row(L.marca, d.marca)}

    ${row(L.modelo, d.modelo)}

    ${row(L.numeroSerie, d.numeroSerie)}

  </table>

</section>



<section class="sl-sec sl-page-break-before">

  <h2>${esc(L.secDisponibilidade)}</h2>

  <p class="sl-horario-intro">${esc(L.horarioPreferidoParaServico)}</p>

  <div class="sl-horarios">

    <div><span class="sl-chk">${chk(hk === 'manha')}</span><span>${esc(L.horarioManha)}</span></div>

    <div><span class="sl-chk">${chk(hk === 'tarde')}</span><span>${esc(L.horarioTarde)}</span></div>

    <div><span class="sl-chk">${chk(hk === 'dia')}</span><span>${esc(L.horarioDia)}</span></div>

    <div><span class="sl-chk">${chk(hk === 'noite')}</span><span>${esc(L.horarioNoite)}</span></div>

    <div style="grid-column:1/-1"><span class="sl-chk">${chk(hk === 'livre')}</span><span>${esc(L.horarioLivre)}</span></div>

  </div>

</section>



<p class="sl-legal">${esc(L.textoLegal)}</p>



<section class="sl-sec">

  <h2>${esc(L.secAssinatura)}</h2>

  <div class="sl-sign-box">

    <p class="sl-sign-hint">${esc(L.zonaAssinar)}</p>

    <div class="sl-sign-area" aria-hidden="true"></div>

    <div class="sl-lines">

      <div class="sl-line"><span></span><span style="flex:0 0 auto;padding-left:8px;font-weight:600">${esc(L.nomeLegivel)}</span></div>

      <div class="sl-line"><span></span><span style="flex:0 0 auto;padding-left:8px;font-weight:600">${esc(L.localData)}</span></div>

    </div>

  </div>

</section>



<footer class="sl-footer">${esc(L.rodape)}</footer>

</div>`



  const langEsc = esc(htmlLang || 'pt')

  return `<!DOCTYPE html><html lang="${langEsc}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${title1} ${title2}</title><style>${css}</style></head><body>${body}</body></html>`

}



/** Nome de ficheiro seguro (Windows / anexos). */

export function safeSolicitacaoFilenameSegment(name: string): string {

  const t = String(name || 'cliente')

    .trim()

    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')

    .replace(/\s+/g, '_')

  return (t.slice(0, 48) || 'cliente').replace(/_+$/g, '') || 'cliente'

}



/**

 * Nome canónico para guardar/descarregar o documento devolvido pelo cliente

 * (referência SST + nome do cliente + data + extensão do ficheiro original).

 */

export function buildSolicitacaoDocDevolvidoCanonicalFilename(params: {

  solicitacaoId: string

  nomeCliente: string

  nomeOriginal?: string

  dataUploadIso?: string

}): string {

  const id = String(params.solicitacaoId || '')

  const ref = `SST-${id.replace(/[^a-zA-Z0-9]/g, '').slice(-10).toUpperCase() || 'DOC'}`

  const seg = safeSolicitacaoFilenameSegment(params.nomeCliente || 'cliente')

  const d = params.dataUploadIso ? new Date(params.dataUploadIso) : new Date()

  const ymd = Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10)

  const orig = String(params.nomeOriginal || 'documento').trim()

  const m = orig.match(/\.([a-zA-Z0-9]{1,8})$/i)

  let ext = (m ? m[1] : '').toLowerCase()

  if (!ext) ext = 'pdf'

  if (ext === 'jpeg') ext = 'jpg'

  return `Solicitacao_assinada_${ref}_${seg}_${ymd}.${ext}`

}



/** Descarrega o HTML oficial (mesmo conteúdo que «Imprimir / Guardar como PDF» no browser). */

export function downloadSolicitacaoServicoTecnicoHtmlFile(html: string, filename: string): void {

  if (typeof document === 'undefined') return

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })

  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')

  a.href = url

  a.download = filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')

  document.body.appendChild(a)

  a.click()

  document.body.removeChild(a)

  setTimeout(() => URL.revokeObjectURL(url), 2500)

}


