import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getDemoContext } from '../../../data/demo-context'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isDemo, expired, dataDir } = getDemoContext(request)
    if (isDemo && expired) {
      return new NextResponse('Demonstração expirada.', { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const lang = searchParams.get('lang') || 'pt-BR'
    const docId = params.id

    const filePath = path.join(dataDir, 'nonato-despesas-documentos.json')
    if (!fs.existsSync(filePath)) {
      return new NextResponse('Documento não encontrado', { status: 404 })
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const documentos = JSON.parse(content || '[]')
    const doc = Array.isArray(documentos) ? documentos.find((d: any) => d.id === docId) : null

    if (!doc) {
      return new NextResponse('Documento não encontrado', { status: 404 })
    }

    const t: Record<string, Record<string, string>> = {
      'pt-BR': {
        titulo: 'REGISTRO DE DESPESAS',
        subtitulo: 'Documento para envio',
        cliente: 'Cliente',
        relatorio: 'Relatório de Serviço',
        data: 'Data',
        tipo: 'Tipo',
        valor: 'Valor',
        descricao: 'Descrição',
        codigoBarras: 'Código de Barras',
        comprovantes: 'Comprovantes',
        total: 'Total',
        rodape: 'Documento gerado em',
        nonato: 'NONATO SERVICE'
      },
      'es': {
        titulo: 'REGISTRO DE GASTOS PAGADOS CON TARJETA PARA DECLARACIÓN DEL IRPF',
        subtitulo: 'Documento para envío / IRPF',
        cliente: 'Cliente',
        relatorio: 'Informe de servicio',
        data: 'Fecha',
        tipo: 'Tipo',
        valor: 'Importe',
        descricao: 'Descripción',
        codigoBarras: 'Código de barras',
        comprovantes: 'Justificantes',
        total: 'Total',
        rodape: 'Documento generado el',
        nonato: 'NONATO SERVICE'
      },
      'fr': {
        titulo: 'REGISTRE DES DÉPENSES',
        subtitulo: "Document d'envoi",
        cliente: 'Client',
        relatorio: 'Rapport de service',
        data: 'Date',
        tipo: 'Type',
        valor: 'Montant',
        descricao: 'Description',
        codigoBarras: 'Code-barres',
        comprovantes: 'Justificatifs',
        total: 'Total',
        rodape: 'Document généré le',
        nonato: 'NONATO SERVICE'
      },
      'it': {
        titulo: 'REGISTRO SPESE',
        subtitulo: 'Documento per invio',
        cliente: 'Cliente',
        relatorio: 'Rapporto di servizio',
        data: 'Data',
        tipo: 'Tipo',
        valor: 'Importo',
        descricao: 'Descrizione',
        codigoBarras: 'Codice a barre',
        comprovantes: 'Giustificativi',
        total: 'Totale',
        rodape: 'Documento generato il',
        nonato: 'NONATO SERVICE'
      },
      'de': {
        titulo: 'KARTENZAHLUNGEN FÜR DIE STEUERERKLÄRUNG (AUSGABEN)',
        subtitulo: 'Dokument zur Übergabe / Steuer',
        cliente: 'Kunde',
        relatorio: 'Servicebericht',
        data: 'Datum',
        tipo: 'Typ',
        valor: 'Betrag',
        descricao: 'Beschreibung',
        codigoBarras: 'Barcode',
        comprovantes: 'Belege',
        total: 'Gesamt',
        rodape: 'Dokument erstellt am',
        nonato: 'NONATO SERVICE'
      },
      'en': {
        titulo: 'EXPENSE RECORD',
        subtitulo: 'Document for submission',
        cliente: 'Customer',
        relatorio: 'Service Report',
        data: 'Date',
        tipo: 'Type',
        valor: 'Amount',
        descricao: 'Description',
        codigoBarras: 'Barcode',
        comprovantes: 'Attachments',
        total: 'Total',
        rodape: 'Document generated on',
        nonato: 'NONATO SERVICE'
      }
    }
    const labels = t[lang] || t['pt-BR']

    const totalGeral = (doc.despesas || []).reduce((s: number, d: any) => s + (d.valor || 0), 0)
    const dataFormatada = new Date().toLocaleString('pt-BR')

    const despesasHtml = (doc.despesas || []).map((d: any, i: number) => {
      const fotosHtml = (d.fotos || []).map((f: string) =>
        `<img src="${f}" alt="Comprovante" style="max-width: 100%; max-height: 200px; margin: 4px; border: 1px solid #ddd; border-radius: 4px;" />`
      ).join('')
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${d.tipoNome || '-'}</td>
          <td>€ ${(d.valor || 0).toFixed(2)}</td>
          <td>${(d.descricao || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
          <td>${d.codigoBarras || '-'}</td>
        </tr>
        ${d.fotos?.length ? `
        <tr>
          <td colspan="5" style="padding: 12px; background: #f9f9f9;">
            <strong>${labels.comprovantes}:</strong><br/>
            <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px;">${fotosHtml}</div>
          </td>
        </tr>
        ` : ''}
      `
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${labels.titulo} - ${doc.clienteNome}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; color: #1a1a1a; line-height: 1.5; font-size: 11pt; }
    .header { background: linear-gradient(135deg, #000 0%, #1a2a1a 50%, #0d1a0d 100%); border-bottom: 3px solid #00ff00; padding: 20px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22pt; font-weight: 700; color: #00ff00; letter-spacing: 2px; }
    .header .subtitle { margin: 6px 0 0 0; font-size: 11pt; color: rgba(255,255,255,0.9); }
    .info-block { background: #f5f5f5; padding: 16px 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #00ff00; }
    .info-block strong { color: #006600; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10pt; }
    th, td { border: 1px solid #ccc; padding: 10px 12px; text-align: left; }
    th { background: #e8f5e8; color: #1a5a1a; font-weight: 600; }
    .total-row { background: #e8f5e8; font-weight: bold; font-size: 12pt; }
    .footer { margin-top: 30px; text-align: center; font-size: 9pt; color: #666; padding: 12px; border-top: 1px solid #ddd; }
    @media print { .header { position: fixed; top: 0; left: 0; right: 0; } body { padding-top: 100px; } }
  </style>
</head>
<body>
  <header class="header">
    <h1>${labels.titulo}</h1>
    <p class="subtitle">${labels.subtitulo} — ${labels.nonato}</p>
  </header>

  <div class="info-block">
    <p><strong>${labels.cliente}:</strong> ${doc.clienteNome}</p>
    ${doc.relatorioNumero ? `<p><strong>${labels.relatorio}:</strong> ${doc.relatorioNumero}</p>` : ''}
    <p><strong>${labels.data}:</strong> ${new Date(doc.data || doc.dataCriacao).toLocaleDateString('pt-BR')}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>${labels.tipo}</th>
        <th>${labels.valor}</th>
        <th>${labels.descricao}</th>
        <th>${labels.codigoBarras}</th>
      </tr>
    </thead>
    <tbody>
      ${despesasHtml}
      <tr class="total-row">
        <td colspan="2">${labels.total}</td>
        <td>€ ${totalGeral.toFixed(2)}</td>
        <td colspan="2"></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>${labels.rodape} ${dataFormatada} — ${labels.nonato}${isDemo ? ' — DEMO' : ''}</p>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  } catch (error: any) {
    console.error('Erro ao gerar PDF despesas:', error)
    return new NextResponse('Erro ao gerar documento', { status: 500 })
  }
}
