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
    const orcamentoId = params.id

    // Carregar orçamentos
    const orcamentosPath = path.join(dataDir, 'nonato-orcamentos-avulso.json')
    if (!fs.existsSync(orcamentosPath)) {
      return new NextResponse('Orçamento não encontrado', { status: 404 })
    }

    const orcamentosData = JSON.parse(fs.readFileSync(orcamentosPath, 'utf-8'))
    const orcamento = Array.isArray(orcamentosData) 
      ? orcamentosData.find((o: any) => o.id === orcamentoId)
      : null

    if (!orcamento) {
      return new NextResponse('Orçamento não encontrado', { status: 404 })
    }

    // Traduções
    const translations: any = {
      'pt-BR': {
        titulo: `CONFIRMAÇÃO DE PEDIDO DA ORDEM DE SERVIÇO ${orcamento.relatorioNumero || 'N/A'}`,
        numOrcamento: 'Número do Orçamento:',
        ordemServico: 'Ordem de Serviço:',
        data: 'Data:',
        cliente: 'Cliente:',
        valorTotal: 'Valor Total:',
        status: 'Status:',
        descricao: 'Descrição:',
        rodape: 'Documento gerado em'
      },
      'en': {
        titulo: `ORDER CONFIRMATION FOR SERVICE ORDER ${orcamento.relatorioNumero || 'N/A'}`,
        numOrcamento: 'Quote Number:',
        ordemServico: 'Service Order:',
        data: 'Date:',
        cliente: 'Customer:',
        valorTotal: 'Total Amount:',
        status: 'Status:',
        descricao: 'Description:',
        rodape: 'Document generated on'
      },
      'es': {
        titulo: `CONFIRMACIÓN DE PEDIDO DE LA ORDEN DE SERVICIO ${orcamento.relatorioNumero || 'N/A'}`,
        numOrcamento: 'Número del Presupuesto:',
        ordemServico: 'Orden de Servicio:',
        data: 'Fecha:',
        cliente: 'Cliente:',
        valorTotal: 'Valor Total:',
        status: 'Estado:',
        descricao: 'Descripción:',
        rodape: 'Documento generado el'
      },
      'fr': {
        titulo: `CONFIRMATION DE COMMANDE DE L'ORDRE DE SERVICE ${orcamento.relatorioNumero || 'N/A'}`,
        numOrcamento: 'Numéro du Devis:',
        ordemServico: "Ordre de Service:",
        data: 'Date:',
        cliente: 'Client:',
        valorTotal: 'Montant Total:',
        status: 'Statut:',
        descricao: 'Description:',
        rodape: 'Document généré le'
      },
      'de': {
        titulo: `BESTÄTIGUNG DER BESTELLUNG FÜR SERVICEAUFTRAG ${orcamento.relatorioNumero || 'N/A'}`,
        numOrcamento: 'Angebotsnummer:',
        ordemServico: 'Serviceauftrag:',
        data: 'Datum:',
        cliente: 'Kunde:',
        valorTotal: 'Gesamtbetrag:',
        status: 'Status:',
        descricao: 'Beschreibung:',
        rodape: 'Dokument erstellt am'
      },
      'it': {
        titulo: `CONFERMA ORDINE DELL'ORDINE DI SERVIZIO ${orcamento.relatorioNumero || 'N/A'}`,
        numOrcamento: 'Numero Preventivo:',
        ordemServico: 'Ordine di Servizio:',
        data: 'Data:',
        cliente: 'Cliente:',
        valorTotal: 'Importo Totale:',
        status: 'Stato:',
        descricao: 'Descrizione:',
        rodape: 'Documento generato il'
      }
    }

    const t = translations[lang] || translations['pt-BR']
    const dataFormatada = new Date().toLocaleString('pt-BR')

    // Gerar HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${t.titulo}</title>
  <style>
    @media print {
      .no-print { display: none !important; }
    }
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      color: #000;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      color: #00ff00;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 10px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${t.titulo}</h1>
    <p><strong>NONATO SERVICE</strong></p>
  </div>
  
  <table>
    <tr><th style="width: 30%;">${t.numOrcamento}</th><td>${orcamento.numeroOrcamento}</td></tr>
    <tr><th>${t.ordemServico}</th><td>${orcamento.relatorioNumero || 'N/A'}</td></tr>
    <tr><th>${t.data}</th><td>${new Date(orcamento.data).toLocaleDateString('pt-BR')}</td></tr>
    <tr><th>${t.cliente}</th><td>${orcamento.clienteNome || 'N/A'}</td></tr>
    <tr><th>${t.valorTotal}</th><td>€ ${orcamento.total?.toFixed(2) || '0.00'}</td></tr>
    ${orcamento.descricao ? `<tr><th>${t.descricao}</th><td>${orcamento.descricao}</td></tr>` : ''}
  </table>
  
  <div class="footer">
    <p>${t.rodape} ${dataFormatada} - NONATO SERVICE${isDemo ? ' - DEMO' : ''}</p>
  </div>
</body>
</html>
    `

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error: any) {
    console.error('Erro ao gerar PDF:', error)
    return new NextResponse('Erro ao gerar documento', { status: 500 })
  }
}
