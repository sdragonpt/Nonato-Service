import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getDemoContext } from '../../data/demo-context'

export const dynamic = 'force-dynamic'

type FichaCadastral = {
  nomeEmpresa?: string
  nif?: string
  nib?: string
  iban?: string
  swift?: string
  nomeBanco?: string
  telefone?: string
  email?: string
  morada?: string
  logo?: string
}

function escapeHtml(s: string | undefined): string {
  if (s == null || s === '') return '—'
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildDepositoHtml(data: FichaCadastral, isDemo: boolean): string {
  const nomeEmpresa = escapeHtml(data.nomeEmpresa)
  const nif = escapeHtml(data.nif)
  const nib = escapeHtml(data.nib)
  const iban = escapeHtml(data.iban)
  const swift = escapeHtml(data.swift)
  const nomeBanco = escapeHtml(data.nomeBanco)
  const telefone = escapeHtml(data.telefone)
  const email = escapeHtml(data.email)
  const morada = escapeHtml(data.morada)
  const logo = data.logo && data.logo.startsWith('data:') ? data.logo : ''

  const titulo = 'Dados para depósito / transferência de pagamento'
  const subtitulo = 'Utilize os dados abaixo para efetuar o pagamento à Nonato Service.'
  const rodape = `Documento gerado em ${new Date().toLocaleString('pt-PT')}${isDemo ? ' — Modo demonstração' : ''}.`

  return `
<!DOCTYPE html>
<html lang="pt-PT">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo} - Nonato Service</title>
  <style>
    @media print {
      body { margin: 0; padding: 16px; }
      .no-print { display: none !important; }
      .print-only { display: block !important; }
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 24px;
      color: #1a1a1a;
      background: #fff;
      line-height: 1.5;
      max-width: 700px;
      margin-left: auto;
      margin-right: auto;
    }
    .no-print {
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .no-print button {
      padding: 10px 20px;
      font-size: 14px;
      background: #00a650;
      color: #fff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    }
    .no-print button:hover { background: #008c44; }
    .no-print .secondary {
      background: #333;
    }
    .no-print .secondary:hover { background: #555; }
    .header {
      text-align: center;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 2px solid #00a650;
    }
    .header img {
      max-width: 180px;
      max-height: 80px;
      object-fit: contain;
      margin-bottom: 12px;
    }
    .header h1 {
      margin: 0 0 6px 0;
      font-size: 22px;
      color: #00a650;
      font-weight: 700;
    }
    .header p {
      margin: 0;
      font-size: 14px;
      color: #555;
    }
    .section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #666;
      margin-bottom: 10px;
      font-weight: 600;
    }
    .card {
      background: #f8f9fa;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      padding: 18px 20px;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px 24px;
      margin-bottom: 12px;
    }
    .row:last-child { margin-bottom: 0; }
    .field {
      flex: 1;
      min-width: 200px;
    }
    .field-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 4px;
    }
    .field-value {
      font-size: 15px;
      font-weight: 600;
      color: #1a1a1a;
      word-break: break-all;
    }
    .field-value.highlight {
      font-size: 16px;
      color: #00a650;
      font-family: 'Consolas', 'Monaco', monospace;
    }
    .notice {
      background: #e8f5e9;
      border-left: 4px solid #00a650;
      padding: 14px 16px;
      margin-top: 24px;
      font-size: 13px;
      color: #2e7d32;
      border-radius: 0 8px 8px 0;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #eee;
      text-align: center;
      font-size: 11px;
      color: #888;
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button type="button" onclick="window.print()">Imprimir / Guardar como PDF</button>
    <button type="button" class="secondary" onclick="window.close()">Fechar</button>
  </div>

  <div class="header">
    ${logo ? `<img src="${logo}" alt="Logo" />` : ''}
    <h1>${nomeEmpresa || 'Nonato Service'}</h1>
    <p>${subtitulo}</p>
  </div>

  <div class="section">
    <div class="section-title">Dados bancários</div>
    <div class="card">
      ${nomeBanco !== '—' ? `
      <div class="row">
        <div class="field">
          <div class="field-label">Banco</div>
          <div class="field-value">${nomeBanco}</div>
        </div>
      </div>` : ''}
      ${nib !== '—' ? `
      <div class="row">
        <div class="field">
          <div class="field-label">NIB (conta nacional)</div>
          <div class="field-value highlight">${nib}</div>
        </div>
      </div>` : ''}
      ${iban !== '—' ? `
      <div class="row">
        <div class="field">
          <div class="field-label">IBAN (transferências internacionais)</div>
          <div class="field-value highlight">${iban}</div>
        </div>
      </div>` : ''}
      ${swift !== '—' ? `
      <div class="row">
        <div class="field">
          <div class="field-label">Código SWIFT / BIC</div>
          <div class="field-value highlight">${swift}</div>
        </div>
      </div>` : ''}
      ${nif !== '—' ? `
      <div class="row">
        <div class="field">
          <div class="field-label">NIF (titular da conta)</div>
          <div class="field-value">${nif}</div>
        </div>
      </div>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Contacto</div>
    <div class="card">
      ${(morada !== '—' || telefone !== '—' || email !== '—') ? `
      ${morada !== '—' ? `
      <div class="row">
        <div class="field">
          <div class="field-label">Morada</div>
          <div class="field-value">${morada}</div>
        </div>
      </div>` : ''}
      ${telefone !== '—' ? `
      <div class="row">
        <div class="field">
          <div class="field-label">Telefone</div>
          <div class="field-value">${telefone}</div>
        </div>
      </div>` : ''}
      ${email !== '—' ? `
      <div class="row">
        <div class="field">
          <div class="field-label">E-mail</div>
          <div class="field-value">${email}</div>
        </div>
      </div>` : ''}` : '<div class="row"><div class="field-value">—</div></div>'}
    </div>
  </div>

  <div class="notice">
    Utilize exatamente os dados acima para efetuar o depósito ou transferência do seu pagamento. Em caso de dúvida, contacte-nos pelo telefone ou e-mail indicados.
  </div>

  <div class="footer">
    ${rodape}
  </div>
</body>
</html>
  `.trim()
}

export async function POST(request: NextRequest) {
  try {
    const { isDemo, expired } = getDemoContext(request)
    if (isDemo && expired) {
      return new NextResponse('Demonstração expirada.', { status: 403 })
    }
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return new NextResponse('JSON inválido.', { status: 400 })
    }
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return new NextResponse('Corpo inválido.', { status: 400 })
    }
    const data = body as FichaCadastral
    const html = buildDepositoHtml(data, isDemo)
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error: unknown) {
    console.error('Erro ao gerar PDF dados depósito (POST):', error)
    return new NextResponse('Erro ao gerar documento.', { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { isDemo, expired, dataDir } = getDemoContext(request)
    if (isDemo && expired) {
      return new NextResponse('Demonstração expirada.', { status: 403 })
    }

    const filePath = path.join(dataDir, 'nonato-ficha-cadastral.json')
    let data: FichaCadastral = {}

    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8')
        if (raw && raw.trim()) data = JSON.parse(raw) as FichaCadastral
      } catch {
        // manter data vazio
      }
    }

    const html = buildDepositoHtml(data, isDemo)

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error: unknown) {
    console.error('Erro ao gerar PDF dados depósito:', error)
    return new NextResponse('Erro ao gerar documento.', { status: 500 })
  }
}
