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
        titulo: 'PEDIDO DE SEPARAÇÃO E ENVIO AO CLIENTE',
        numOrcamento: 'Número do Orçamento:',
        data: 'Data:',
        cliente: 'Cliente:',
        endereco: 'Endereço:',
        telefone: 'Telefone:',
        valorTotal: 'Valor Total:',
        descricao: 'Descrição:',
        instrucoes: 'INSTRUÇÕES DE SEPARAÇÃO E ENVIO:',
        instrucoesLista: [
          '1. Verificar itens do orçamento',
          '2. Separar peças/equipamentos conforme especificado',
          '3. Embalar adequadamente',
          '4. Preparar documentação de envio',
          '5. Encaminhar para expedição'
        ],
        rodape: 'Documento gerado em'
      },
      'en': {
        titulo: 'SEPARATION AND SHIPPING REQUEST TO CUSTOMER',
        numOrcamento: 'Quote Number:',
        data: 'Date:',
        cliente: 'Customer:',
        endereco: 'Address:',
        telefone: 'Phone:',
        valorTotal: 'Total Amount:',
        descricao: 'Description:',
        instrucoes: 'SEPARATION AND SHIPPING INSTRUCTIONS:',
        instrucoesLista: [
          '1. Check quote items',
          '2. Separate parts/equipment as specified',
          '3. Package appropriately',
          '4. Prepare shipping documentation',
          '5. Forward to shipping'
        ],
        rodape: 'Document generated on'
      },
      'es': {
        titulo: 'SOLICITUD DE SEPARACIÓN Y ENVÍO AL CLIENTE',
        numOrcamento: 'Número del Presupuesto:',
        data: 'Fecha:',
        cliente: 'Cliente:',
        endereco: 'Dirección:',
        telefone: 'Teléfono:',
        valorTotal: 'Valor Total:',
        descricao: 'Descripción:',
        instrucoes: 'INSTRUCCIONES DE SEPARACIÓN Y ENVÍO:',
        instrucoesLista: [
          '1. Verificar artículos del presupuesto',
          '2. Separar piezas/equipos según especificado',
          '3. Embalar adecuadamente',
          '4. Preparar documentación de envío',
          '5. Enviar a expedición'
        ],
        rodape: 'Documento generado el'
      },
      'fr': {
        titulo: "DEMANDE DE SÉPARATION ET D'EXPÉDITION AU CLIENT",
        numOrcamento: 'Numéro du Devis:',
        data: 'Date:',
        cliente: 'Client:',
        endereco: 'Adresse:',
        telefone: 'Téléphone:',
        valorTotal: 'Montant Total:',
        descricao: 'Description:',
        instrucoes: "INSTRUCTIONS DE SÉPARATION ET D'EXPÉDITION:",
        instrucoesLista: [
          "1. Vérifier les articles du devis",
          "2. Séparer les pièces/équipements selon les spécifications",
          "3. Emballer correctement",
          "4. Préparer la documentation d'expédition",
          "5. Transmettre à l'expédition"
        ],
        rodape: 'Document généré le'
      },
      'de': {
        titulo: 'ANFRAGE FÜR TRENNUNG UND VERSAND AN DEN KUNDEN',
        numOrcamento: 'Angebotsnummer:',
        data: 'Datum:',
        cliente: 'Kunde:',
        endereco: 'Adresse:',
        telefone: 'Telefon:',
        valorTotal: 'Gesamtbetrag:',
        descricao: 'Beschreibung:',
        instrucoes: 'ANWEISUNGEN FÜR TRENNUNG UND VERSAND:',
        instrucoesLista: [
          '1. Angebotsposten überprüfen',
          '2. Teile/Ausrüstung wie angegeben trennen',
          '3. Angemessen verpacken',
          '4. Versanddokumentation vorbereiten',
          '5. An Versand weiterleiten'
        ],
        rodape: 'Dokument erstellt am'
      },
      'it': {
        titulo: 'RICHIESTA DI SEPARAZIONE E SPEDIZIONE AL CLIENTE',
        numOrcamento: 'Numero Preventivo:',
        data: 'Data:',
        cliente: 'Cliente:',
        endereco: 'Indirizzo:',
        telefone: 'Telefono:',
        valorTotal: 'Importo Totale:',
        descricao: 'Descrizione:',
        instrucoes: 'ISTRUZIONI DI SEPARAZIONE E SPEDIZIONE:',
        instrucoesLista: [
          '1. Verificare gli articoli del preventivo',
          '2. Separare parti/attrezzature come specificato',
          '3. Imballare adeguatamente',
          '4. Preparare la documentazione di spedizione',
          '5. Inoltrare alla spedizione'
        ],
        rodape: 'Documento generato il'
      }
    }

    const t = translations[lang] || translations['pt-BR']
    const dataFormatada = new Date().toLocaleString('pt-BR')
    const dadosCliente = orcamento.dadosCliente || {}
    const enderecoCompleto = [dadosCliente.morada, dadosCliente.conselho || dadosCliente.localidade, dadosCliente.codigoPostal].filter(Boolean).join(', ')

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
    .instrucoes {
      margin-top: 30px;
      padding: 15px;
      background-color: #f9f9f9;
      border: 1px solid #000;
    }
    .instrucoes h3 {
      margin-top: 0;
      color: #000;
    }
    .instrucoes ul {
      margin: 10px 0;
      padding-left: 20px;
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
    <tr><th>${t.data}</th><td>${new Date(orcamento.data).toLocaleDateString('pt-BR')}</td></tr>
    <tr><th>${t.cliente}</th><td>${orcamento.clienteNome || 'N/A'}</td></tr>
    <tr><th>${t.endereco}</th><td>${enderecoCompleto || 'N/A'}</td></tr>
    <tr><th>${t.telefone}</th><td>${dadosCliente.telefones || 'N/A'}</td></tr>
    <tr><th>${t.valorTotal}</th><td>€ ${orcamento.total?.toFixed(2) || '0.00'}</td></tr>
    ${orcamento.descricao ? `<tr><th>${t.descricao}</th><td>${orcamento.descricao}</td></tr>` : ''}
  </table>
  
  <div class="instrucoes">
    <h3>${t.instrucoes}</h3>
    <ul>
      ${t.instrucoesLista.map((item: string) => `<li>${item}</li>`).join('')}
    </ul>
  </div>
  
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
