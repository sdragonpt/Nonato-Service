import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type ComprovantePayload = {
  id: string
  tipo: 'cliente' | 'pessoal'
  cliente: string
  data: string
  valorUnitario: number
  quantidade: number
  valorTotal: number
  descricao?: string
}

type Body = {
  comprovantes: ComprovantePayload[]
  totalGeral: number
  totalPorCliente: Record<string, number>
  modelo: 1 | 2 | 3 | 4 | 5
  tecnicoNome?: string
  periodo?: string
  labelPessoal?: string
  tituloRelatorio?: string
}

function getClienteOuPessoal(c: ComprovantePayload, labelPessoal: string): string {
  return c.tipo === 'pessoal' ? labelPessoal : (c.cliente || '—')
}

function buildHtml(body: Body): string {
  const {
    comprovantes,
    totalGeral,
    totalPorCliente,
    modelo,
    tecnicoNome,
    periodo = '',
    labelPessoal = 'Despesas Pessoais',
    tituloRelatorio = 'REGISTRO DE DESPESAS PAGAS COM O CARTÃO PARA DECLARAÇÃO DE IRS'
  } = body

  const dataGeracao = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const totalPorClienteEntries = Object.entries(totalPorCliente).sort((a, b) => b[1] - a[1])

  const style = `
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; color: #1a1a1a; line-height: 1.5; font-size: 11pt; }
    .header { background: linear-gradient(135deg, #000 0%, #1a2a1a 50%, #0d1a0d 100%); border-bottom: 3px solid #00ff00; padding: 20px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22pt; font-weight: 700; color: #00ff00; letter-spacing: 2px; }
    .header .subtitle { margin: 6px 0 0 0; font-size: 11pt; color: rgba(255,255,255,0.9); }
    .info-block { background: #f5f5f5; padding: 16px 20px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #00ff00; }
    .info-block p { margin: 4px 0; }
    .info-block strong { color: #006600; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 10pt; }
    th, td { border: 1px solid #ccc; padding: 10px 12px; text-align: left; }
    th { background: #e8f5e8; color: #1a5a1a; font-weight: 600; }
    .total-row { background: #e8f5e8; font-weight: bold; font-size: 12pt; }
    .footer { margin-top: 28px; text-align: center; font-size: 9pt; color: #666; padding: 12px; border-top: 1px solid #ddd; }
    .tecnico-line { background: #f0f8f0; padding: 10px 16px; border-radius: 6px; margin: 12px 0; border-left: 4px solid #00aa00; }
    @media print { .header { position: fixed; top: 0; left: 0; right: 0; } body { padding-top: 100px; } .footer { position: fixed; bottom: 0; left: 0; right: 0; } }
  `

  let mainContent = ''

  if (modelo === 1) {
    mainContent = `
      <div class="info-block">
        <p><strong>Total geral:</strong> ${totalGeral.toFixed(2)} €</p>
        ${periodo ? `<p><strong>Período:</strong> ${periodo}</p>` : ''}
      </div>
      <table>
        <thead><tr><th>Cliente / Beneficiário</th><th>Total (€)</th></tr></thead>
        <tbody>
          ${totalPorClienteEntries.map(([nome, tot]) => `<tr><td>${nome}</td><td>${tot.toFixed(2)}</td></tr>`).join('')}
          <tr class="total-row"><td>Total geral</td><td>${totalGeral.toFixed(2)} €</td></tr>
        </tbody>
      </table>
    `
  } else if (modelo === 2) {
    mainContent = `
      <table>
        <thead><tr><th>Data</th><th>Cliente / Beneficiário</th><th>Valor (€)</th><th>Descrição</th></tr></thead>
        <tbody>
          ${comprovantes.map(c => `<tr><td>${c.data}</td><td>${getClienteOuPessoal(c, labelPessoal)}</td><td>${c.valorTotal.toFixed(2)}</td><td>${(c.descricao || '').replace(/</g, '&lt;')}</td></tr>`).join('')}
          <tr class="total-row"><td colspan="2">Total</td><td>${totalGeral.toFixed(2)} €</td><td></td></tr>
        </tbody>
      </table>
    `
  } else if (modelo === 3) {
    mainContent = `
      <div class="info-block">
        <p><strong>Período:</strong> ${periodo || '—'}</p>
        <p><strong>Total do período:</strong> ${totalGeral.toFixed(2)} €</p>
      </div>
      <table>
        <thead><tr><th>Cliente / Beneficiário</th><th>Total (€)</th></tr></thead>
        <tbody>
          ${totalPorClienteEntries.map(([nome, tot]) => `<tr><td>${nome}</td><td>${tot.toFixed(2)}</td></tr>`).join('')}
          <tr class="total-row"><td>Total</td><td>${totalGeral.toFixed(2)} €</td></tr>
        </tbody>
      </table>
    `
  } else if (modelo === 4) {
    mainContent = `
      <div class="info-block">
        <p><strong>Data do relatório:</strong> ${dataGeracao}</p>
        <p><strong>Total geral:</strong> ${totalGeral.toFixed(2)} €</p>
      </div>
      <p><strong>Por cliente / beneficiário:</strong></p>
      <table>
        <thead><tr><th>Cliente / Beneficiário</th><th>Total (€)</th></tr></thead>
        <tbody>
          ${totalPorClienteEntries.map(([nome, tot]) => `<tr><td>${nome}</td><td>${tot.toFixed(2)}</td></tr>`).join('')}
          <tr class="total-row"><td>Total geral</td><td>${totalGeral.toFixed(2)} €</td></tr>
        </tbody>
      </table>
      <p style="margin-top: 20px; font-size: 9pt; color: #666;">Fim do relatório.</p>
    `
  } else {
    mainContent = `
      <div class="info-block">
        <p><strong>Total:</strong> ${totalGeral.toFixed(2)} €</p>
      </div>
      <table>
        <tbody>
          ${totalPorClienteEntries.map(([nome, tot]) => `<tr><td>${nome}</td><td>${tot.toFixed(2)} €</td></tr>`).join('')}
        </tbody>
      </table>
    `
  }

  const tecnicoBlock = tecnicoNome
    ? `<div class="tecnico-line"><strong>Técnico:</strong> ${tecnicoNome.replace(/</g, '&lt;')}</div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="pt-PT">
<head>
  <meta charset="UTF-8">
  <title>${tituloRelatorio} - PDF</title>
  <style>${style}</style>
</head>
<body>
  <header class="header">
    <h1>${tituloRelatorio}</h1>
    <p class="subtitle">NONATO SERVICE — Relatório para impressão / guardar como PDF</p>
  </header>
  ${tecnicoBlock}
  ${mainContent}
  <div class="footer">
    <p>Documento gerado em ${dataGeracao} — NONATO SERVICE</p>
    <p style="font-size: 8pt; margin-top: 6px;">Use Ctrl+P (ou Cmd+P) para imprimir ou guardar como PDF.</p>
  </div>
</body>
</html>`

  return html
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body
    if (!body.comprovantes || !Array.isArray(body.comprovantes) || typeof body.totalGeral !== 'number') {
      return new NextResponse(JSON.stringify({ error: 'Dados inválidos' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }
    const html = buildHtml(body)
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  } catch (e) {
    console.error('Erro ao gerar PDF comprovantes:', e)
    return new NextResponse(JSON.stringify({ error: 'Erro ao gerar documento' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
