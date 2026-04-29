'use client'

import React, { useState, useMemo, useEffect } from 'react'

export type ClientePedido = {
  id: string
  nomeEmpresa: string
  morada?: string
  conselho?: string
  codigoPostal?: string
  pais?: string
  email?: string
  telefones?: string
  equipamentos: EquipamentoClientePedido[]
}

export type EquipamentoClientePedido = {
  tipoEquipamento: string
  modelo: string
  marca: string
  numeroSerie: string
  familia?: string
  grupo?: string
}

export type PecaPedido = {
  id: string
  codigo: string
  nome: string
  imagem?: string
  quantidade: number
  pecaId?: string
}

export type StatusPedidoAvulso = 'pendente' | 'cancelado' | 'concluido' | 'aprovado' | 'entregue'

export type PedidoAvulsoGuardado = {
  codigo: string
  dataGeracao: string
  clienteNomeReal: string
  emitirComoCliente: 'cliente' | 'nonato-service'
  equipamentoTexto: string
  pecas: PecaPedido[]
  status?: StatusPedidoAvulso
}

type Props = {
  clientes: ClientePedido[]
  pecasBiblioteca: Array<{ id: string; codigo: string; nome: string; imagem?: string }>
  safeT: Record<string, string | undefined>
  closeTab: (tabId: string) => void
  activeTabId: string
  voltarPaginaInicial: () => void
  LogoComponent: React.ComponentType<{ size?: 'small' | 'medium' | 'large' }>
  saveData?: (key: string, data: any) => Promise<void>
  loadData?: (key: string) => Promise<any>
  onGerarOrcamento?: () => void
}

const PEDIDOS_AVULSO_KEY = 'nonato-pedidos-orcamento-avulso'

const ORCAMENTOS_AVULSO_KEY = 'nonato-orcamentos-avulso'

export function PedidoOrcamentosAvulsoContent({
  clientes,
  pecasBiblioteca,
  safeT,
  closeTab,
  activeTabId,
  voltarPaginaInicial,
  LogoComponent,
  saveData,
  loadData,
  onGerarOrcamento
}: Props) {
  const [clienteSelecionado, setClienteSelecionado] = useState<ClientePedido | null>(null)
  const [clienteNomeManual, setClienteNomeManual] = useState('')
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<EquipamentoClientePedido | null>(null)
  const [equipamentoManual, setEquipamentoManual] = useState('')
  const [pecasPedido, setPecasPedido] = useState<PecaPedido[]>([])
  const [buscaCliente, setBuscaCliente] = useState('')
  const [buscaPeca, setBuscaPeca] = useState('')
  const [codigoManualPeca, setCodigoManualPeca] = useState('')
  const [nomeManualPeca, setNomeManualPeca] = useState('')
  const [quantidadeNovaPeca, setQuantidadeNovaPeca] = useState(1)
  const [mostrarFormPeca, setMostrarFormPeca] = useState(false)
  const [modoPeca, setModoPeca] = useState<'biblioteca' | 'manual' | null>(null)
  const [emitirComoCliente, setEmitirComoCliente] = useState<'cliente' | 'nonato-service'>('cliente')
  const [pedidosGerados, setPedidosGerados] = useState<PedidoAvulsoGuardado[]>([])
  const [codigoUltimoGerado, setCodigoUltimoGerado] = useState<string | null>(null)

  useEffect(() => {
    if (!loadData) return
    loadData(PEDIDOS_AVULSO_KEY).then((data) => {
      if (data && Array.isArray(data)) setPedidosGerados(data as PedidoAvulsoGuardado[])
    }).catch(() => {})
  }, [loadData])

  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente.trim()) return clientes
    const b = buscaCliente.toLowerCase()
    return clientes.filter(
      (c) =>
        c.nomeEmpresa?.toLowerCase().includes(b) ||
        c.email?.toLowerCase().includes(b) ||
        c.telefones?.toLowerCase().includes(b) ||
        c.morada?.toLowerCase().includes(b) ||
        c.codigoPostal?.toLowerCase().includes(b) ||
        c.conselho?.toLowerCase().includes(b) ||
        c.pais?.toLowerCase().includes(b)
    )
  }, [clientes, buscaCliente])

  const pecasFiltradas = useMemo(() => {
    if (!buscaPeca.trim()) return pecasBiblioteca.slice(0, 50)
    const b = buscaPeca.toLowerCase()
    return pecasBiblioteca.filter(
      (p) =>
        (p.codigo || '').toLowerCase().includes(b) ||
        (p.nome || '').toLowerCase().includes(b)
    )
  }, [pecasBiblioteca, buscaPeca])

  const nomeClienteExibido = clienteSelecionado ? clienteSelecionado.nomeEmpresa : clienteNomeManual || '—'
  const equipamentosDoCliente = clienteSelecionado?.equipamentos || []

  const adicionarPecaDaBiblioteca = (peca: { id: string; codigo: string; nome: string; imagem?: string }) => {
    const existente = pecasPedido.find((p) => p.codigo === peca.codigo)
    if (existente) {
      setPecasPedido((prev) =>
        prev.map((p) => (p.codigo === peca.codigo ? { ...p, quantidade: p.quantidade + 1 } : p))
      )
    } else {
      setPecasPedido((prev) => [
        ...prev,
        {
          id: peca.id + '-' + Date.now(),
          codigo: peca.codigo,
          nome: peca.nome,
          imagem: peca.imagem,
          quantidade: 1,
          pecaId: peca.id
        }
      ])
    }
    setBuscaPeca('')
    setMostrarFormPeca(false)
    setModoPeca(null)
  }

  const adicionarPecaManual = () => {
    const codigo = (codigoManualPeca || '').trim()
    const nome = (nomeManualPeca || '').trim() || codigo || 'Peça manual'
    if (!codigo && !nome) return
    const existente = pecasPedido.find((p) => p.codigo === codigo && codigo)
    if (existente && codigo) {
      setPecasPedido((prev) =>
        prev.map((p) => (p.codigo === codigo ? { ...p, quantidade: p.quantidade + quantidadeNovaPeca } : p))
      )
    } else {
      setPecasPedido((prev) => [
        ...prev,
        {
          id: 'manual-' + Date.now(),
          codigo: codigo || nome.slice(0, 20),
          nome,
          imagem: undefined,
          quantidade: quantidadeNovaPeca
        }
      ])
    }
    setCodigoManualPeca('')
    setNomeManualPeca('')
    setQuantidadeNovaPeca(1)
    setMostrarFormPeca(false)
    setModoPeca(null)
  }

  const removerPeca = (id: string) => {
    setPecasPedido((prev) => prev.filter((p) => p.id !== id))
  }

  const alterarQuantidadePeca = (id: string, delta: number) => {
    setPecasPedido((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        const nova = p.quantidade + delta
        return { ...p, quantidade: nova < 1 ? 1 : nova }
      })
    )
  }

  const gerarProximoCodigo = (): string => {
    const ano = new Date().getFullYear()
    const prefix = `POA-${ano}-`
    const mesmosAno = pedidosGerados.filter((p) => p.codigo.startsWith(prefix))
    const nums = mesmosAno.map((p) => {
      const n = parseInt(p.codigo.replace(prefix, ''), 10)
      return isNaN(n) ? 0 : n
    })
    const next = (nums.length ? Math.max(...nums) : 0) + 1
    return `${prefix}${String(next).padStart(4, '0')}`
  }

  const handleGerarPedido = async () => {
    const nomeReal = nomeClienteExibido
    if (!nomeReal || nomeReal === '—') {
      alert(safeT?.selecioneOuDigiteCliente || 'Selecione ou digite o nome do cliente.')
      return
    }
    if (pecasPedido.length === 0) {
      alert(safeT?.adicionePeloMenosUmaPeca || 'Adicione pelo menos uma peça ao pedido.')
      return
    }
    const equipamentoTexto = equipamentoSelecionado
      ? `${equipamentoSelecionado.tipoEquipamento} ${equipamentoSelecionado.modelo || ''} - ${equipamentoSelecionado.marca}`
      : equipamentoManual || '—'
    const codigo = gerarProximoCodigo()
    const novo: PedidoAvulsoGuardado = {
      codigo,
      dataGeracao: new Date().toISOString(),
      clienteNomeReal: nomeReal,
      emitirComoCliente,
      equipamentoTexto,
      pecas: [...pecasPedido]
    }
    const atualizados = [...pedidosGerados, novo]
    setPedidosGerados(atualizados)
    setCodigoUltimoGerado(codigo)
    if (saveData) {
      try {
        await saveData(PEDIDOS_AVULSO_KEY, atualizados)
      } catch (_) {}
    }

    // Gravar também em Orçamentos Gerados (barra lateral > Orçamentos > Orçamentos Gerados)
    const nomeNoDoc = emitirComoCliente === 'nonato-service'
      ? (safeT?.nomeNonatoService || 'NONATO SERVICE')
      : nomeReal
    if (saveData && loadData) {
      try {
        const existentes: any[] = (await loadData(ORCAMENTOS_AVULSO_KEY)) || []
        const listaOrcamentos = Array.isArray(existentes) ? existentes : []
        const orcamentoGerado = {
          id: 'avulso-' + codigo,
          numeroOrcamento: codigo,
          data: new Date().toISOString().split('T')[0],
          validade: '',
          descricao: equipamentoTexto,
          observacoes: '',
          tipo: 'pedido-avulso' as const,
          clienteNome: nomeNoDoc,
          itens: pecasPedido.map((p) => ({
            descricao: p.nome,
            quantidade: p.quantidade,
            precoUnitario: 0,
            total: 0,
            codigo: p.codigo,
            tipoItem: 'sem-valor' as const,
            iva: 0,
            pecaId: p.pecaId,
            imagem: p.imagem
          })),
          total: 0,
          totalSemIva: 0,
          totalIva: 0,
          dataCriacao: new Date().toISOString()
        }
        await saveData(ORCAMENTOS_AVULSO_KEY, [...listaOrcamentos, orcamentoGerado])
      } catch (_) {}
    }

    alert(
      (safeT?.pedidoGeradoComSucesso || 'Pedido gerado com sucesso!') + '\n\n' +
      (safeT?.codigoOrcamento || 'Código do orçamento') + ': ' + codigo + '\n\n' +
      (safeT?.nomeNoDocumento || 'Nome no documento') + ': ' + nomeNoDoc + '\n\n' +
      (safeT?.guardeCodigoParaLocalizar || 'Guarde este código para localizar o orçamento depois.')
    )
    onGerarOrcamento?.()
  }

  const containerStyle = {
    padding: '30px',
    maxWidth: '1600px',
    margin: '0 auto' as const
  }
  const headerStyle = {
    marginBottom: '40px',
    padding: '30px',
    background: 'linear-gradient(135deg, rgba(0, 255, 0, 0.05) 0%, rgba(0, 0, 0, 0.8) 100%)',
    borderRadius: '12px',
    border: '1px solid rgba(0, 255, 0, 0.3)',
    boxShadow: '0 4px 20px rgba(0, 255, 0, 0.08)'
  }
  const blockStyle = {
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: '#141414',
    borderRadius: '12px',
    border: '1px solid rgba(0, 255, 0, 0.2)'
  }
  const inputStyle = {
    width: '100%' as const,
    padding: '12px',
    marginBottom: '15px',
    backgroundColor: '#222222',
    border: '1px solid rgba(0, 255, 0, 0.3)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px'
  }
  const labelStyle = { color: '#66b3ff', marginBottom: '10px', fontSize: '16px', display: 'block' as const, textTransform: 'uppercase' as const }

  return (
    <div style={containerStyle}>
      {/* Cabeçalho */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <LogoComponent size="small" />
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#66b3ff', letterSpacing: '2px', marginBottom: '8px', textTransform: 'uppercase' }}>
              {safeT?.pedidoOrcamentosAvulsoTitle || 'PEDIDO DE ORÇAMENTOS AVULSO'}
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#ccc', opacity: 0.8, textTransform: 'uppercase' }}>
              {safeT?.pedidoOrcamentoAvulsoDesc || 'Cliente, equipamento e peças para orçamento'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              className="btn-primary"
              onClick={() => closeTab(activeTabId)}
              style={{ padding: '8px 12px', fontSize: '14px', minWidth: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title={safeT?.voltar || 'Voltar'}
            >
              ↶
            </button>
            <button
              onClick={voltarPaginaInicial}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(0, 150, 255, 0.5)',
                borderRadius: '4px',
                color: '#66b3ff',
                cursor: 'pointer',
                minWidth: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={safeT?.voltarInicio || 'Voltar ao Início'}
            >
              🏠
            </button>
          </div>
        </div>
      </div>

      {/* Cliente */}
      <div style={blockStyle}>
        <h3 style={labelStyle}>{safeT?.cliente || 'Cliente'}</h3>
        <p style={{ color: '#999', fontSize: '13px', marginBottom: '12px' }}>
          {safeT?.buscarClienteOuDigitar || 'Selecione um cliente cadastrado ou digite o nome manualmente.'}
        </p>
        <input
          type="text"
          placeholder={safeT?.buscarCliente || 'Buscar cliente por nome ou email...'}
          value={buscaCliente}
          onChange={(e) => setBuscaCliente(e.target.value)}
          style={inputStyle}
        />
        <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '15px' }}>
          {clientesFiltrados.length === 0 ? (
            <p style={{ color: '#ccc', textAlign: 'center', padding: '15px' }}>
              {safeT?.nenhumClienteEncontrado || 'Nenhum cliente encontrado'}
            </p>
          ) : (
            clientesFiltrados.map((cliente) => (
              <div
                key={cliente.id}
                onClick={() => {
                  setClienteSelecionado(cliente)
                  setClienteNomeManual('')
                  setEquipamentoSelecionado(null)
                }}
                style={{
                  padding: '12px 15px',
                  marginBottom: '8px',
                  backgroundColor: clienteSelecionado?.id === cliente.id ? 'rgba(0, 100, 255, 0.2)' : '#2a2a2a',
                  border: `1px solid ${clienteSelecionado?.id === cliente.id ? 'rgba(0, 100, 255, 0.5)' : 'rgba(0, 255, 0, 0.2)'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontWeight: 'bold', color: '#66b3ff' }}>{cliente.nomeEmpresa}</div>
                {(cliente.morada || cliente.codigoPostal || cliente.conselho || cliente.email) && (
                  <div style={{ fontSize: '12px', color: '#ccc' }}>
                    {[cliente.morada, cliente.codigoPostal, cliente.conselho, cliente.email].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div style={{ marginTop: '10px' }}>
          <label style={{ color: '#999', fontSize: '13px', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
            {safeT?.ouNomeManualCliente || 'Ou nome do cliente (avulso)'}
          </label>
          <input
            type="text"
            placeholder={safeT?.nomeClienteManual || 'Digite o nome do cliente'}
            value={clienteNomeManual}
            onChange={(e) => {
              setClienteNomeManual(e.target.value)
              if (e.target.value) setClienteSelecionado(null)
            }}
            style={inputStyle}
          />
        </div>
        {(clienteSelecionado || clienteNomeManual) && (
          <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#222', borderRadius: '8px', border: '1px solid rgba(0, 255, 0, 0.2)' }}>
            <strong style={{ color: '#00ff00' }}>{safeT?.clienteSelecionado || 'Cliente'}:</strong> {nomeClienteExibido}
          </div>
        )}
      </div>

      {/* Equipamento */}
      <div style={blockStyle}>
        <h3 style={labelStyle}>{safeT?.equipamento || 'Equipamento'}</h3>
        <p style={{ color: '#999', fontSize: '13px', marginBottom: '12px', textTransform: 'uppercase' }}>
          {safeT?.equipamentoDescPedido || 'Se o cliente for cadastrado, escolha um equipamento ou descreva manualmente.'}
        </p>
        {equipamentosDoCliente.length > 0 && (
          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '15px' }}>
            {equipamentosDoCliente.map((eq, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setEquipamentoSelecionado(eq)
                  setEquipamentoManual('')
                }}
                style={{
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: equipamentoSelecionado === eq ? 'rgba(0, 255, 0, 0.15)' : '#2a2a2a',
                  border: `1px solid ${equipamentoSelecionado === eq ? 'rgba(0, 255, 0, 0.5)' : 'rgba(0, 255, 0, 0.2)'}`,
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <div style={{ color: '#00ff00', fontWeight: 'bold' }}>
                  {eq.tipoEquipamento} {eq.modelo && `- ${eq.modelo}`}
                </div>
                <div style={{ fontSize: '12px', color: '#ccc' }}>
                  {eq.marca} {eq.numeroSerie && `· Nº Série: ${eq.numeroSerie}`}
                </div>
              </div>
            ))}
          </div>
        )}
        <label style={{ color: '#999', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
          {safeT?.descricaoManualEquipamento || 'Descrição manual do equipamento (opcional)'}
        </label>
        <input
          type="text"
          placeholder={safeT?.equipamentoManualPlaceholder || 'Ex: Seccionadora HPP 250'}
          value={equipamentoManual}
          onChange={(e) => {
            setEquipamentoManual(e.target.value)
            if (e.target.value) setEquipamentoSelecionado(null)
          }}
          style={inputStyle}
        />
        {(equipamentoSelecionado || equipamentoManual) && (
          <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#222', borderRadius: '8px', border: '1px solid rgba(0, 255, 0, 0.2)' }}>
            <strong style={{ color: '#00ff00' }}>{safeT?.equipamento || 'Equipamento'}:</strong>{' '}
            {equipamentoSelecionado
              ? `${equipamentoSelecionado.tipoEquipamento} ${equipamentoSelecionado.modelo || ''} - ${equipamentoSelecionado.marca}`
              : equipamentoManual}
          </div>
        )}
      </div>

      {/* Adicionar peças */}
      <div style={blockStyle}>
        <h3 style={labelStyle}>{safeT?.adicionarPecas || 'Adicionar peças'}</h3>
        <p style={{ color: '#999', fontSize: '13px', marginBottom: '12px', textTransform: 'uppercase' }}>
          {safeT?.adicionarPecasDesc || 'Busque na Biblioteca de Peças por código/nome ou digite o código manualmente.'}
        </p>
        {!mostrarFormPeca ? (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => { setMostrarFormPeca(true); setModoPeca('biblioteca'); setBuscaPeca(''); }}
              style={{
                padding: '10px 18px',
                backgroundColor: 'rgba(0, 255, 0, 0.15)',
                border: '1px solid rgba(0, 255, 0, 0.5)',
                borderRadius: '8px',
                color: '#00ff00',
                cursor: 'pointer',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}
            >
              📚 {safeT?.buscarBibliotecaPecas || 'Buscar na Biblioteca de Peças'}
            </button>
            <button
              type="button"
              onClick={() => { setMostrarFormPeca(true); setModoPeca('manual'); setCodigoManualPeca(''); setNomeManualPeca(''); setQuantidadeNovaPeca(1); }}
              style={{
                padding: '10px 18px',
                backgroundColor: 'rgba(0, 100, 255, 0.15)',
                border: '1px solid rgba(0, 100, 255, 0.5)',
                borderRadius: '8px',
                color: '#66b3ff',
                cursor: 'pointer',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}
            >
              ✏️ {safeT?.digitarCodigoManual || 'Digitar código / peça manual'}
            </button>
          </div>
        ) : (
          <div style={{ padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid rgba(0, 255, 0, 0.3)', marginBottom: '15px' }}>
            {modoPeca === 'biblioteca' && (
              <>
                <label style={{ color: '#ccc', display: 'block', marginBottom: '8px' }}>{safeT?.buscarPorCodigo || 'Buscar por código ou nome'}</label>
                <input
                  type="text"
                  value={buscaPeca}
                  onChange={(e) => setBuscaPeca(e.target.value)}
                  placeholder={safeT?.codigoPecaBiblioteca || 'Código'}
                  style={inputStyle}
                  autoFocus
                />
                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {pecasFiltradas.length === 0 ? (
                    <p style={{ color: '#888', padding: '10px', textTransform: 'uppercase' }}>{safeT?.nenhumaPecaEncontrada || 'Nenhuma peça encontrada'}</p>
                  ) : (
                    pecasFiltradas.map((peca) => (
                      <div
                        key={peca.id}
                        onClick={() => adicionarPecaDaBiblioteca(peca)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 12px',
                          borderBottom: '1px solid #333',
                          cursor: 'pointer'
                        }}
                      >
                        {peca.imagem ? (
                          <img src={peca.imagem} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }} />
                        ) : (
                          <div style={{ width: 48, height: 48, backgroundColor: '#333', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>—</div>
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#fff', fontWeight: 'bold' }}>{peca.nome}</div>
                          <div style={{ color: '#999', fontSize: '12px' }}>{peca.codigo}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
            {modoPeca === 'manual' && (
              <>
                <input
                  type="text"
                  value={codigoManualPeca}
                  onChange={(e) => setCodigoManualPeca(e.target.value)}
                  placeholder={safeT?.codigoPecaBiblioteca || 'Código'}
                  style={inputStyle}
                />
                <input
                  type="text"
                  value={nomeManualPeca}
                  onChange={(e) => setNomeManualPeca(e.target.value)}
                  placeholder={safeT?.nomePecaBiblioteca || 'Nome da peça'}
                  style={inputStyle}
                />
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ color: '#ccc', marginRight: '8px', textTransform: 'uppercase' }}>{safeT?.quantidade || 'Quantidade'}</label>
                  <input
                    type="number"
                    min={1}
                    value={quantidadeNovaPeca}
                    onChange={(e) => setQuantidadeNovaPeca(parseInt(e.target.value, 10) || 1)}
                    style={{ ...inputStyle, width: '80px', marginBottom: 0 }}
                  />
                </div>
                <button
                  type="button"
                  onClick={adicionarPecaManual}
                  style={{ padding: '8px 16px', backgroundColor: 'rgba(0, 255, 0, 0.2)', border: '1px solid rgba(0, 255, 0, 0.5)', borderRadius: '6px', color: '#00ff00', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {safeT?.adicionar || 'Adicionar'}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => { setMostrarFormPeca(false); setModoPeca(null); }}
              style={{ marginTop: '12px', padding: '8px 14px', backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid #555', borderRadius: '6px', color: '#ccc', cursor: 'pointer', textTransform: 'uppercase' }}
            >
              {safeT?.cancel || 'Cancelar'}
            </button>
          </div>
        )}

        {/* Lista de peças do pedido */}
        {pecasPedido.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ color: '#00ff00', marginBottom: '12px', fontSize: '15px', textTransform: 'uppercase' }}>{safeT?.pecasNoPedido || 'Peças no pedido'}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pecasPedido.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    padding: '12px 15px',
                    backgroundColor: '#222',
                    borderRadius: '8px',
                    border: '1px solid rgba(0, 255, 0, 0.2)'
                  }}
                >
                  {p.imagem ? (
                    <img src={p.imagem} alt={p.nome} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6 }} />
                  ) : (
                    <div style={{ width: 56, height: 56, backgroundColor: '#333', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '11px' }}>—</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontWeight: 'bold' }}>{p.nome}</div>
                    <div style={{ color: '#999', fontSize: '12px' }}>{p.codigo}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => alterarQuantidadePeca(p.id, -1)}
                      style={{ width: 28, height: 28, padding: 0, fontSize: '16px', backgroundColor: '#333', border: '1px solid #555', borderRadius: 4, color: '#fff', cursor: 'pointer' }}
                    >
                      −
                    </button>
                    <span style={{ minWidth: 28, textAlign: 'center', color: '#00ff00', fontWeight: 'bold' }}>{p.quantidade}</span>
                    <button
                      type="button"
                      onClick={() => alterarQuantidadePeca(p.id, 1)}
                      style={{ width: 28, height: 28, padding: 0, fontSize: '16px', backgroundColor: '#333', border: '1px solid #555', borderRadius: 4, color: '#fff', cursor: 'pointer' }}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removerPeca(p.id)}
                    style={{ padding: '6px 10px', backgroundColor: 'rgba(255,0,0,0.2)', border: '1px solid rgba(255,0,0,0.5)', borderRadius: 4, color: '#ff6666', cursor: 'pointer', fontSize: '12px', textTransform: 'uppercase' }}
                  >
                    {safeT?.delete || 'Remover'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opção: Gerar com nome do cliente ou NONATO SERVICE + Gerar pedido + Código */}
        <div style={{ ...blockStyle, marginTop: '24px', borderColor: 'rgba(0, 255, 0, 0.35)' }}>
          <h3 style={labelStyle}>{safeT?.gerarDocumentoComo || 'Ao gerar documento'}</h3>
          <p style={{ color: '#999', fontSize: '13px', marginBottom: '16px', textTransform: 'uppercase' }}>
            {safeT?.desejaGerarComNomeClienteOuNonato || 'Deseja gerar com o nome do cliente ou com o nome da NONATO SERVICE? Se escolher NONATO SERVICE, no documento enviado ao revendedor aparecerá apenas o nome NONATO SERVICE; o resto mantém-se (equipamento, peças).'}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#ccc' }}>
              <input
                type="radio"
                name="emitirComo"
                checked={emitirComoCliente === 'cliente'}
                onChange={() => setEmitirComoCliente('cliente')}
                style={{ accentColor: '#00ff00' }}
              />
              <span style={{ textTransform: 'uppercase' }}>{safeT?.gerarComNomeCliente || 'Com nome do cliente'}</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#ccc' }}>
              <input
                type="radio"
                name="emitirComo"
                checked={emitirComoCliente === 'nonato-service'}
                onChange={() => setEmitirComoCliente('nonato-service')}
                style={{ accentColor: '#00ff00' }}
              />
              <span style={{ textTransform: 'uppercase' }}>{safeT?.gerarComNomeNonatoService || 'Com nome da NONATO SERVICE'}</span>
            </label>
          </div>
          <button
            type="button"
            onClick={handleGerarPedido}
            style={{
              padding: '14px 24px',
              backgroundColor: 'rgba(0, 255, 0, 0.2)',
              border: '1px solid rgba(0, 255, 0, 0.6)',
              borderRadius: '8px',
              color: '#00ff00',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '15px',
              textTransform: 'uppercase'
            }}
          >
            {safeT?.gerarPedido || 'Gerar pedido'}
          </button>
          {codigoUltimoGerado && (
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#1a2a1a', borderRadius: '8px', border: '1px solid rgba(0, 255, 0, 0.3)' }}>
              <div style={{ color: '#00ff00', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>
                {safeT?.codigoOrcamento || 'Código do orçamento'}: {codigoUltimoGerado}
              </div>
              <div style={{ fontSize: '12px', color: '#aaa', textTransform: 'uppercase' }}>
                {safeT?.guardeCodigoParaLocalizar || 'Guarde este código para localizar o orçamento depois.'}
              </div>
            </div>
          )}
          {pedidosGerados.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ color: '#66b3ff', marginBottom: '12px', fontSize: '14px', textTransform: 'uppercase' }}>
                {safeT?.ultimosPedidosGerados || 'Últimos pedidos (localizar por código)'}
              </h4>
              <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[...pedidosGerados].reverse().slice(0, 50).map((p) => (
                  <div
                    key={p.codigo}
                    style={{
                      padding: '14px 16px',
                      backgroundColor: '#1a1a1a',
                      borderRadius: '8px',
                      border: '1px solid rgba(0, 255, 0, 0.25)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#00ff00', fontWeight: '600', fontSize: '13px' }}>{p.codigo}</span>
                        <span style={{ color: '#ccc', fontSize: '13px' }}>{p.emitirComoCliente === 'nonato-service' ? (safeT?.nomeNonatoService || 'NONATO SERVICE') : p.clienteNomeReal}</span>
                        <span style={{ color: '#999', fontSize: '12px' }}>{new Date(p.dataGeracao).toLocaleDateString('pt-BR')}</span>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor: p.status === 'entregue' ? 'rgba(0, 255, 0, 0.2)' : p.status === 'aprovado' ? 'rgba(0, 200, 100, 0.2)' : p.status === 'concluido' ? 'rgba(0, 150, 255, 0.2)' : p.status === 'cancelado' ? 'rgba(255, 68, 68, 0.2)' : 'rgba(150, 150, 150, 0.2)',
                            border: p.status === 'entregue' ? '1px solid rgba(0, 255, 0, 0.6)' : p.status === 'aprovado' ? '1px solid rgba(0, 200, 100, 0.6)' : p.status === 'concluido' ? '1px solid rgba(0, 150, 255, 0.6)' : p.status === 'cancelado' ? '1px solid rgba(255, 68, 68, 0.6)' : '1px solid rgba(150, 150, 150, 0.4)',
                            color: p.status === 'cancelado' ? '#ff8888' : '#fff'
                          }}
                        >
                          {p.status === 'cancelado' ? (safeT?.pedidoCancelado || 'Pedido Cancelado') : p.status === 'concluido' ? (safeT?.concluido || 'Concluído') : p.status === 'aprovado' ? (safeT?.aprovado || 'Aprovado') : p.status === 'entregue' ? (safeT?.entregue || 'Entregue') : (safeT?.pendente || 'Pendente')}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={async () => {
                          if (saveData) await saveData(PEDIDOS_AVULSO_KEY, pedidosGerados)
                          alert(safeT?.orcamentoSalvo || 'Orçamento salvo com sucesso!')
                        }}
                        style={{ padding: '6px 12px', backgroundColor: 'rgba(0, 255, 0, 0.2)', border: '1px solid rgba(0, 255, 0, 0.6)', borderRadius: '6px', color: '#00ff00', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                      >
                        💾 {safeT?.guardar || 'Guardar'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm(safeT?.confirmarExcluirOrcamento || 'Deseja realmente excluir este pedido?')) return
                          const atualizados = pedidosGerados.filter((x) => x.codigo !== p.codigo)
                          setPedidosGerados(atualizados)
                          if (saveData) await saveData(PEDIDOS_AVULSO_KEY, atualizados)
                          if (loadData && saveData) {
                            try {
                              const orcamentos: any[] = (await loadData(ORCAMENTOS_AVULSO_KEY)) || []
                              const lista = Array.isArray(orcamentos) ? orcamentos : []
                              const semEste = lista.filter((o: any) => o.id !== 'avulso-' + p.codigo)
                              await saveData(ORCAMENTOS_AVULSO_KEY, semEste)
                            } catch (_) {}
                          }
                        }}
                        style={{ padding: '6px 12px', backgroundColor: 'rgba(255, 68, 68, 0.2)', border: '1px solid rgba(255, 68, 68, 0.6)', borderRadius: '6px', color: '#ff6666', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                      >
                        🗑️ {safeT?.deletar || 'Deletar'}
                      </button>
                      {(['cancelado', 'concluido', 'aprovado', 'entregue'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={async () => {
                            const atualizados = pedidosGerados.map((x) => (x.codigo === p.codigo ? { ...x, status } : x))
                            setPedidosGerados(atualizados)
                            if (saveData) await saveData(PEDIDOS_AVULSO_KEY, atualizados)
                            if (loadData && saveData) {
                              try {
                                const orcamentos: any[] = (await loadData(ORCAMENTOS_AVULSO_KEY)) || []
                                const lista = Array.isArray(orcamentos) ? orcamentos : []
                                const atualizadosOrc = lista.map((o: any) => (o.id === 'avulso-' + p.codigo ? { ...o, status } : o))
                                await saveData(ORCAMENTOS_AVULSO_KEY, atualizadosOrc)
                              } catch (_) {}
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            backgroundColor: p.status === status ? (status === 'entregue' ? 'rgba(0, 255, 0, 0.35)' : status === 'aprovado' ? 'rgba(0, 200, 100, 0.35)' : status === 'concluido' ? 'rgba(0, 150, 255, 0.35)' : 'rgba(255, 68, 68, 0.35)') : 'rgba(100, 100, 100, 0.2)',
                            border: p.status === status ? (status === 'entregue' ? '1px solid rgba(0, 255, 0, 0.8)' : status === 'aprovado' ? '1px solid rgba(0, 200, 100, 0.8)' : status === 'concluido' ? '1px solid rgba(0, 150, 255, 0.8)' : '1px solid rgba(255, 68, 68, 0.8)') : '1px solid rgba(150, 150, 150, 0.5)',
                            color: p.status === status ? '#fff' : '#aaa'
                          }}
                        >
                          {status === 'cancelado' ? (safeT?.pedidoCancelado || 'Pedido Cancelado') : status === 'concluido' ? (safeT?.concluido || 'Concluído') : status === 'aprovado' ? (safeT?.aprovado || 'Aprovado') : (safeT?.entregue || 'Entregue')}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
