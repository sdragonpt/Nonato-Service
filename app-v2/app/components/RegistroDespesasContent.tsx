'use client'

import React, { useState, useRef, useEffect } from 'react'

export type DespesaRegistro = {
  id: string
  tipoId: string
  tipoNome: string
  valor: number
  descricao: string
  codigoBarras?: string
  fotos: string[]
  data: string
}

export type DespesaDocumento = {
  id: string
  clienteId: string
  clienteNome: string
  relatorioId?: string
  relatorioNumero?: string
  data: string
  despesas: DespesaRegistro[]
  dataCriacao: string
}

type Cliente = { id: string; nomeEmpresa: string }
type RelatorioServico = { id: string; numero: string; cliente: string; clienteId?: string; data: string }
type Servico = { id: string; nome: string; categoria: string }

type Props = {
  clientes: Cliente[]
  relatoriosServico: RelatorioServico[]
  servicos: Servico[]
  saveData: (key: string, data: any) => Promise<void>
  loadData: (key: string) => Promise<any>
  safeT: any
  openTab: (tab: string, title: string) => void
  closeTab: (tab: string) => void
  activeTabId?: string
}

export function RegistroDespesasContent({
  clientes,
  relatoriosServico,
  servicos,
  saveData,
  loadData,
  safeT,
  openTab,
  closeTab,
  activeTabId
}: Props) {
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
  const [relatorioSelecionado, setRelatorioSelecionado] = useState<RelatorioServico | null>(null)
  const [documentos, setDocumentos] = useState<DespesaDocumento[]>([])
  const [docAtual, setDocAtual] = useState<DespesaDocumento | null>(null)
  const [showDespesaForm, setShowDespesaForm] = useState(false)
  const [despesaForm, setDespesaForm] = useState<Partial<DespesaRegistro>>({
    tipoId: '',
    tipoNome: '',
    valor: 0,
    descricao: '',
    codigoBarras: '',
    fotos: [],
    data: new Date().toISOString().split('T')[0]
  })
  const [buscaCliente, setBuscaCliente] = useState('')
  const [buscaRelatorio, setBuscaRelatorio] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const despesasCadastradas = servicos.filter(s => s.categoria === 'despesa')
  const clientesFiltrados = clientes.filter(c =>
    c.nomeEmpresa?.toLowerCase().includes(buscaCliente?.toLowerCase())
  )
  const relatoriosFiltrados = relatoriosServico.filter(r =>
    (r.numero?.toLowerCase().includes(buscaRelatorio?.toLowerCase()) ||
     r.cliente?.toLowerCase().includes(buscaRelatorio?.toLowerCase()))
  )

  const loadDocumentos = async () => {
    try {
      const data = await loadData('nonato-despesas-documentos')
      setDocumentos(Array.isArray(data) ? data : [])
    } catch {
      setDocumentos([])
    }
  }

  useEffect(() => {
    loadDocumentos()
  }, [activeTabId])

  const iniciarNovoDocumento = () => {
    if (!clienteSelecionado) {
      alert(safeT?.selecioneClientePrimeiro || safeT?.selecioneCliente || 'Selecione um cliente primeiro.')
      return
    }
    const doc: DespesaDocumento = {
      id: 'doc-' + Date.now(),
      clienteId: clienteSelecionado.id,
      clienteNome: clienteSelecionado.nomeEmpresa,
      relatorioId: relatorioSelecionado?.id,
      relatorioNumero: relatorioSelecionado?.numero,
      data: new Date().toISOString().split('T')[0],
      despesas: [],
      dataCriacao: new Date().toISOString()
    }
    setDocAtual(doc)
  }

  const adicionarDespesa = () => {
    if (!docAtual) return
    const tipo = despesasCadastradas.find(s => s.id === despesaForm.tipoId)
    if (!tipo && despesasCadastradas.length > 0) {
      alert(safeT?.selecioneTipoDespesa || 'Selecione o tipo de despesa.')
      return
    }
    const nova: DespesaRegistro = {
      id: 'd-' + Date.now(),
      tipoId: despesaForm.tipoId || '',
      tipoNome: despesaForm.tipoNome || tipo?.nome || 'Outros',
      valor: despesaForm.valor ?? 0,
      descricao: despesaForm.descricao || '',
      codigoBarras: despesaForm.codigoBarras,
      fotos: despesaForm.fotos || [],
      data: despesaForm.data || new Date().toISOString().split('T')[0]
    }
    setDocAtual({
      ...docAtual,
      despesas: [...docAtual.despesas, nova]
    })
    setDespesaForm({
      tipoId: '',
      tipoNome: '',
      valor: 0,
      descricao: '',
      codigoBarras: '',
      fotos: [],
      data: new Date().toISOString().split('T')[0]
    })
    setShowDespesaForm(false)
  }

  const removerDespesa = (id: string) => {
    if (!docAtual) return
    setDocAtual({
      ...docAtual,
      despesas: docAtual.despesas.filter(d => d.id !== id)
    })
  }

  const salvarDocumento = async (eGerarPDF?: boolean) => {
    if (!docAtual || docAtual.despesas.length === 0) {
      alert(safeT?.adicionePeloMenosUmaDespesa || 'Adicione pelo menos uma despesa.')
      return
    }
    const atualizados = documentos.filter(d => d.id !== docAtual.id)
    atualizados.push(docAtual)
    await saveData('nonato-despesas-documentos', atualizados)
    setDocumentos(atualizados)
    if (eGerarPDF) {
      gerarPDF(docAtual.id)
    }
    setDocAtual(null)
    alert(safeT?.documentoSalvo || 'Documento salvo com sucesso!')
  }

  const capturarFoto = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setDespesaForm(prev => ({
        ...prev,
        fotos: [...(prev.fotos || []), base64]
      }))
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const removerFoto = (index: number) => {
    setDespesaForm(prev => ({
      ...prev,
      fotos: (prev.fotos || []).filter((_, i) => i !== index)
    }))
  }

  const gerarPDF = (docId: string) => {
    window.open(`/api/pdf/despesas-documento/${docId}?lang=pt-BR`, '_blank')
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        marginBottom: '24px',
        padding: '24px',
        background: 'linear-gradient(135deg, rgba(0, 255, 0, 0.06) 0%, rgba(0, 0, 0, 0.9) 100%)',
        borderRadius: '12px',
        border: '2px solid rgba(0, 255, 0, 0.3)'
      }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', color: '#00ff00', letterSpacing: '2px' }}>
          {safeT?.registroDespesasTitle || 'REGISTRO DE DESPESAS'}
        </h1>
        <p style={{ margin: 0, opacity: 0.9, color: '#ccc' }}>
          {safeT?.registroDespesasDesc || 'Escaneie códigos de barras, tire fotos e vincule despesas a relatórios de serviço e clientes.'}
        </p>
      </div>

      {!docAtual ? (
        <div style={{ backgroundColor: '#2a2a2a', borderRadius: '8px', padding: '24px', border: '1px solid rgba(0, 255, 0, 0.2)' }}>
          <h3 style={{ marginTop: 0, color: '#00ff00' }}>{safeT?.cliente || 'Cliente'} *</h3>
          <input
            type="text"
            placeholder={safeT?.buscarCliente || 'Buscar cliente...'}
            value={buscaCliente}
            onChange={(e) => setBuscaCliente(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '12px', backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid rgba(0, 255, 0, 0.3)', borderRadius: '4px' }}
          />
          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>
            {clientesFiltrados.map(c => (
              <div
                key={c.id}
                onClick={() => setClienteSelecionado(c)}
                style={{
                  padding: '10px 12px',
                  marginBottom: '4px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: clienteSelecionado?.id === c.id ? 'rgba(0, 255, 0, 0.2)' : '#1a1a1a',
                  border: clienteSelecionado?.id === c.id ? '2px solid #00ff00' : '1px solid #444'
                }}
              >
                {c.nomeEmpresa}
              </div>
            ))}
          </div>

          <h3 style={{ color: '#00ff00' }}>{safeT?.relatorioServico || 'Relatório de Serviço'} ({safeT?.opcional || 'opcional'})</h3>
          <input
            type="text"
            placeholder={safeT?.buscarRelatorio || 'Buscar relatório...'}
            value={buscaRelatorio}
            onChange={(e) => setBuscaRelatorio(e.target.value)}
            style={{ width: '100%', padding: '10px', marginBottom: '12px', backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid rgba(0, 255, 0, 0.3)', borderRadius: '4px' }}
          />
          <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '20px' }}>
            <div
              onClick={() => setRelatorioSelecionado(null)}
              style={{
                padding: '10px 12px',
                marginBottom: '4px',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: !relatorioSelecionado ? 'rgba(0, 255, 0, 0.2)' : '#1a1a1a',
                border: !relatorioSelecionado ? '2px solid #00ff00' : '1px solid #444'
              }}
            >
              {safeT?.nenhumRelatorio || 'Nenhum relatório'}
            </div>
            {relatoriosFiltrados.filter(r => !clienteSelecionado || r.clienteId === clienteSelecionado.id).map(r => (
              <div
                key={r.id}
                onClick={() => setRelatorioSelecionado(r)}
                style={{
                  padding: '10px 12px',
                  marginBottom: '4px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: relatorioSelecionado?.id === r.id ? 'rgba(0, 255, 0, 0.2)' : '#1a1a1a',
                  border: relatorioSelecionado?.id === r.id ? '2px solid #00ff00' : '1px solid #444'
                }}
              >
                {r.numero} - {r.cliente} ({new Date(r.data).toLocaleDateString('pt-BR')})
              </div>
            ))}
          </div>

          <button
            className="btn-primary"
            onClick={iniciarNovoDocumento}
            style={{ padding: '12px 24px', fontSize: '16px' }}
          >
            {safeT?.iniciarRegistroDespesas || 'Iniciar registo de despesas'}
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: '#2a2a2a', borderRadius: '8px', padding: '24px', border: '1px solid rgba(0, 255, 0, 0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <strong style={{ color: '#00ff00' }}>{docAtual.clienteNome}</strong>
              {docAtual.relatorioNumero && <span style={{ marginLeft: '12px', color: '#aaa' }}>| Relatório: {docAtual.relatorioNumero}</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={() => setDocAtual(null)}>{safeT?.cancelar || 'Cancelar'}</button>
              <button className="btn-primary" onClick={() => salvarDocumento(false)}>{safeT?.salvar || 'Salvar'}</button>
              <button className="btn-primary" onClick={() => salvarDocumento(true)}>
                {safeT?.salvarEGerarPDF || 'Salvar e Gerar PDF'}
              </button>
            </div>
          </div>

          {!showDespesaForm ? (
            <button
              className="btn-primary"
              onClick={() => setShowDespesaForm(true)}
              style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>+</span> {safeT?.adicionarDespesa || 'Adicionar Despesa'}
            </button>
          ) : (
            <div style={{
              padding: '20px',
              marginBottom: '20px',
              backgroundColor: '#1a1a1a',
              borderRadius: '8px',
              border: '1px solid rgba(0, 255, 0, 0.3)'
            }}>
              <h4 style={{ marginTop: 0, color: '#00ff00' }}>{safeT?.novaDespesa || 'Nova Despesa'}</h4>

              <div style={{ marginBottom: '12px' }}>
                <label>{safeT?.tipoDespesa || 'Tipo'}</label>
                <select
                  value={despesaForm.tipoId}
                  onChange={(e) => {
                    const s = despesasCadastradas.find(x => x.id === e.target.value)
                    setDespesaForm(prev => ({ ...prev, tipoId: e.target.value, tipoNome: s?.nome || '' }))
                  }}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid rgba(0, 255, 0, 0.3)', borderRadius: '4px' }}
                >
                  <option value="">{safeT?.selecione || 'Selecione...'}</option>
                  {despesasCadastradas.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                  {despesasCadastradas.length === 0 && <option value="outros">Outros</option>}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label>{safeT?.valor || 'Valor (€)'}</label>
                <input
                  type="number"
                  step="0.01"
                  value={despesaForm.valor || ''}
                  onChange={(e) => setDespesaForm(prev => ({ ...prev, valor: parseFloat(e.target.value) || 0 }))}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid rgba(0, 255, 0, 0.3)', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label>{safeT?.descricao || 'Descrição'}</label>
                <input
                  type="text"
                  value={despesaForm.descricao || ''}
                  onChange={(e) => setDespesaForm(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder={safeT?.descricaoPlaceholder || 'Ex: Combustível, refeição, peças...'}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid rgba(0, 255, 0, 0.3)', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label>{safeT?.codigoBarras || 'Código de Barras'}</label>
                <input
                  type="text"
                  value={despesaForm.codigoBarras || ''}
                  onChange={(e) => setDespesaForm(prev => ({ ...prev, codigoBarras: e.target.value }))}
                  placeholder={safeT?.escanearOuDigitar || 'Digite o código...'}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#2a2a2a', color: '#fff', border: '1px solid rgba(0, 255, 0, 0.3)', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label>{safeT?.fotosComprovante || 'Fotos do Comprovante'}</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={capturarFoto}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'rgba(0, 150, 255, 0.3)',
                    border: '1px solid #0096ff',
                    color: '#fff',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginBottom: '8px'
                  }}
                >
                  📷 {safeT?.tirarFoto || 'Tirar Foto / Anexar'}
                </button>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                  {(despesaForm.fotos || []).map((foto, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={foto} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #444' }} />
                      <button
                        type="button"
                        onClick={() => removerFoto(i)}
                        style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: '#c00',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '14px',
                          lineHeight: 1
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button className="btn-primary" onClick={adicionarDespesa}>{safeT?.adicionar || 'Adicionar'}</button>
                <button className="btn-secondary" onClick={() => setShowDespesaForm(false)}>{safeT?.cancelar || 'Cancelar'}</button>
              </div>
            </div>
          )}

          <h4 style={{ color: '#00ff00', marginBottom: '12px' }}>{safeT?.despesasAdicionadas || 'Despesas adicionadas'}</h4>
          {docAtual.despesas.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic' }}>{safeT?.nenhumaDespesaAinda || 'Nenhuma despesa ainda.'}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {docAtual.despesas.map(d => (
                <div
                  key={d.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '6px',
                    border: '1px solid #444'
                  }}
                >
                  <div>
                    <strong>{d.tipoNome}</strong> — € {d.valor.toFixed(2)} — {d.descricao}
                    {d.codigoBarras && <span style={{ marginLeft: '8px', color: '#888', fontSize: '12px' }}>| {d.codigoBarras}</span>}
                    {d.fotos.length > 0 && <span style={{ marginLeft: '8px', color: '#00ff00' }}>📷 {d.fotos.length}</span>}
                  </div>
                  <button className="btn-danger" onClick={() => removerDespesa(d.id)} style={{ padding: '4px 8px', fontSize: '12px' }}>
                    {safeT?.delete || 'Excluir'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {documentos.length > 0 && (
        <div style={{ marginTop: '32px', padding: '20px', backgroundColor: '#2a2a2a', borderRadius: '8px', border: '1px solid rgba(0, 255, 0, 0.2)' }}>
          <h3 style={{ marginTop: 0, color: '#00ff00' }}>{safeT?.documentosSalvos || 'Documentos salvos'}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {documentos.map(doc => (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  backgroundColor: '#1a1a1a',
                  borderRadius: '6px',
                  border: '1px solid #444'
                }}
              >
                <div>
                  <strong>{doc.clienteNome}</strong> {doc.relatorioNumero && `| Relatório ${doc.relatorioNumero}`} — {doc.despesas.length} despesa(s) — € {doc.despesas.reduce((s, x) => s + x.valor, 0).toFixed(2)}
                </div>
                <button className="btn-primary" onClick={() => gerarPDF(doc.id)} style={{ padding: '6px 12px', fontSize: '13px' }}>
                  {safeT?.gerarPDF || 'Gerar PDF'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
