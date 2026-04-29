'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import '../papel-timbrado/papel-timbrado.css'
import { PapelTimbradoConfigurator } from '../papel-timbrado/PapelTimbradoConfigurator'
import {
  PAPEL_CHANGED_EVENT,
  PAPEL_STORAGE_KEY,
  FALLBACK_LOGO,
  loadPapelTimbradoState,
  type PapelTimbradoFullState,
} from '../papel-timbrado/papelTimbradoStorage'
import {
  loadOstPropostas,
  saveOstPropostas,
  OST_PROPOSTAS_STORAGE_KEY,
  type OstPropostaSalva,
  type OstPropostaPayload,
} from './orcamentoOstPropostas'
import { IconClipboardList, IconCoins, IconLayers } from './UiIcons'

export type ServicoOrcamentoLinha = {
  id: string
  cod?: string
  nome: string
  descricao?: string
  valor: number
  tipoCobranca: 'unidade' | 'km' | 'hora' | 'valor-fixo' | 'diarias' | 'extras'
  categoria: 'servico' | 'despesa'
}

export type ClienteOrcamentoLite = {
  id: string
  nomeEmpresa: string
  morada?: string
  localidade?: string
  codigoPostal?: string
  conselho?: string
  pais?: string
  telefones?: string
  email?: string
}

type LinhaOrcamento = {
  rowId: string
  servicoId: string
  quantidadeStr: string
}

const TEXTO_CLAUSULAS_PADRAO_PT = `1. Natureza do documento
O presente documento constitui proposta de orçamento para prestação de serviço técnico, sem valor fiscal, elaborada com base nas rubricas e preços constantes do cadastro de serviços / valores aplicáveis. Não substitui ordem de serviço, contrato ou documentos fiscais próprios.

2. Despesas de deslocação, alojamento, alimentação e transporte
Salvo menção expressa e por escrito em contrário nesta proposta ou em documento posterior assinado pelas partes, todas as despesas com deslocação da equipa (incluindo transporte rodoviário, combustível, portagens e, quando aplicável, passagens aéreas ou outros meios de transporte necessários à execução do serviço), alojamento (hotel ou equivalente) e alimentação da equipa técnica são sempre suportadas pela entidade contratante (empresa cliente).

3. Equipagem, horas extraordinárias e custos não previstos
Qualquer aumento do número de técnicos, prolongamento do período de intervenção, horas extraordinárias ou despesas fora do âmbito desta proposta carecem de autorização prévia e escrita da entidade contratante. Na ausência dessa autorização, não serão reconhecidos para efeitos de faturação.

4. Despesas pessoais e não relacionadas com o serviço
Não integram o presente orçamento despesas de natureza pessoal, social ou extra-profissional da equipa, nem quaisquer custos que não guardem relação direta e documentada com a execução do serviço técnico objeto da proposta.

5. Validade e aceitação
A aceitação desta proposta implica tomada de conhecimento das condições aqui descritas. Findo o prazo de validade indicado, valores, disponibilidades e condições poderão ser revistos.

6. Foro e litígios
Para a resolução de quaisquer litígios emergentes da interpretação ou execução da presente proposta, aplicável a legislação em vigor, com renúncia a qualquer outro, desde que legalmente admissível.`

function parseDecimalInput(raw: string): number {
  const s = String(raw ?? '').trim().replace(/\s/g, '').replace(',', '.')
  if (!s) return 0
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function formatMoneyEUR(n: number): string {
  try {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n)
  } catch {
    return `${n.toFixed(2)} €`
  }
}

function labelTipoCobranca(
  tipo: ServicoOrcamentoLinha['tipoCobranca'],
  t: Record<string, string | undefined>
): string {
  const m: Record<ServicoOrcamentoLinha['tipoCobranca'], string | undefined> = {
    hora: t.tipoCobrancaHora,
    km: t.tipoCobrancaKm,
    unidade: t.tipoCobrancaUnidade,
    'valor-fixo': t.tipoCobrancaValorFixo,
    diarias: t.tipoCobrancaDiarias,
    extras: t.tipoCobrancaExtras,
  }
  return m[tipo] || tipo
}

function unidadeQuantidade(tipo: ServicoOrcamentoLinha['tipoCobranca'], t: Record<string, string | undefined>): string {
  if (tipo === 'hora') return t.orcamentoServicoTecnicoUnidadeHora || 'h'
  if (tipo === 'km') return t.orcamentoServicoTecnicoUnidadeKm || 'km'
  if (tipo === 'diarias') return t.orcamentoServicoTecnicoUnidadeDiaria || 'dia(s)'
  if (tipo === 'unidade') return t.orcamentoServicoTecnicoUnidadeUnidade || 'un.'
  if (tipo === 'valor-fixo') return t.orcamentoServicoTecnicoUnidadeFixo || 'forfait'
  return t.orcamentoServicoTecnicoUnidadeExtra || 'qtd'
}

function newRowId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** No PDF: parágrafos separados por linha em branco — mais legível que um único bloco. */
function splitClausulasParagraphs(text: string): string[] {
  return String(text ?? '')
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

type OstSection = 'orcamento' | 'papel' | 'servicos'

type Props = {
  clientes: ClienteOrcamentoLite[]
  servicos: ServicoOrcamentoLinha[]
  safeT: Record<string, string | undefined>
  openTab: (type: string, title: string) => void
  getTabTitle: (type: string) => string
  /** Abre o modal global de cadastro de serviços sem sair deste separador. */
  onOpenCadastroServicosModal?: () => void
  saveData?: (key: string, value: unknown) => Promise<void>
  loadData?: (key: string, fromServer?: boolean) => Promise<unknown>
}

export function OrcamentoServicoTecnicoContent({
  clientes,
  servicos,
  safeT,
  openTab,
  getTabTitle,
  onOpenCadastroServicosModal,
  saveData,
  loadData,
}: Props) {
  const t = safeT
  const [papel, setPapel] = useState<PapelTimbradoFullState>(() => loadPapelTimbradoState())
  const [logoBroken, setLogoBroken] = useState(false)
  const cfg = papel.config
  const mostrar = papel.mostrar

  const [clienteId, setClienteId] = useState('')
  const [clienteManual, setClienteManual] = useState('')
  const [refDoc, setRefDoc] = useState('')
  const [localServico, setLocalServico] = useState('')
  const [dataDoc, setDataDoc] = useState(() => new Date().toISOString().slice(0, 10))
  const [validade, setValidade] = useState('')
  const [intro, setIntro] = useState(
    () =>
      t.orcamentoServicoTecnicoIntroDefault ||
      'Documento sem valor fiscal. Os valores apresentados constituem proposta comercial para serviço técnico.'
  )
  const [clausulas, setClausulas] = useState(() => t.orcamentoServicoTecnicoClausulasDefault || TEXTO_CLAUSULAS_PADRAO_PT)
  const [linhas, setLinhas] = useState<LinhaOrcamento[]>(() => [{ rowId: newRowId(), servicoId: '', quantidadeStr: '1' }])
  const [section, setSection] = useState<OstSection>('orcamento')
  const [propostas, setPropostas] = useState<OstPropostaSalva[]>([])
  const [propostaEditandoId, setPropostaEditandoId] = useState<string | null>(null)
  const [propostaNome, setPropostaNome] = useState('')

  useEffect(() => {
    let cancel = false
    void (async () => {
      const list = await loadOstPropostas(loadData)
      if (!cancel) setPropostas(list)
    })()
    return () => {
      cancel = true
    }
  }, [loadData])

  useEffect(() => {
    const reload = () => {
      setPapel(loadPapelTimbradoState())
      setLogoBroken(false)
    }
    const reloadPropostas = () => {
      void loadOstPropostas(loadData).then(setPropostas)
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === PAPEL_STORAGE_KEY || e.key === null) reload()
      if (e.key === OST_PROPOSTAS_STORAGE_KEY || e.key === null) reloadPropostas()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(PAPEL_CHANGED_EVENT, reload)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(PAPEL_CHANGED_EVENT, reload)
    }
  }, [loadData])

  const refreshPapel = useCallback(() => {
    setPapel(loadPapelTimbradoState())
    setLogoBroken(false)
  }, [])

  const servicosLista = useMemo(() => {
    return [...servicos].filter((s) => s && typeof s.nome === 'string' && s.nome.trim() !== '')
  }, [servicos])

  const clienteSelecionado = useMemo(() => clientes.find((c) => c.id === clienteId), [clientes, clienteId])
  const nomeClienteDoc = (clienteSelecionado?.nomeEmpresa || clienteManual || '').trim()

  const linhasResolvidas = useMemo(() => {
    return linhas.map((L) => {
      const svc = servicosLista.find((s) => s.id === L.servicoId)
      const q = parseDecimalInput(L.quantidadeStr)
      const unit = svc && Number.isFinite(svc.valor) ? svc.valor : 0
      const sub = unit * q
      return { L, svc, q, sub }
    })
  }, [linhas, servicosLista])

  const totalGeral = useMemo(() => linhasResolvidas.reduce((s, r) => s + r.sub, 0), [linhasResolvidas])

  const logoSrc = logoBroken ? FALLBACK_LOGO : cfg.logoUrl || FALLBACK_LOGO

  const imprimir = useCallback(() => {
    setPapel(loadPapelTimbradoState())
    setLogoBroken(false)
    requestAnimationFrame(() => window.print())
  }, [])

  const abrirCadastroServicos = useCallback(() => {
    openTab('cadastro-servicos', getTabTitle('cadastro-servicos'))
  }, [openTab, getTabTitle])

  const addLinha = useCallback(() => {
    setLinhas((prev) => [...prev, { rowId: newRowId(), servicoId: '', quantidadeStr: '1' }])
  }, [])

  const removeLinha = useCallback((rowId: string) => {
    setLinhas((prev) => (prev.length <= 1 ? prev : prev.filter((x) => x.rowId !== rowId)))
  }, [])

  const updateLinha = useCallback((rowId: string, patch: Partial<LinhaOrcamento>) => {
    setLinhas((prev) => prev.map((x) => (x.rowId === rowId ? { ...x, ...patch } : x)))
  }, [])

  const collectPayload = useCallback((): OstPropostaPayload => {
    return {
      clienteId,
      clienteManual,
      refDoc,
      localServico,
      dataDoc,
      validade,
      intro,
      clausulas,
      linhas: linhas.map(({ rowId, servicoId, quantidadeStr }) => ({ rowId, servicoId, quantidadeStr })),
    }
  }, [clienteId, clienteManual, refDoc, localServico, dataDoc, validade, intro, clausulas, linhas])

  const guardarProposta = useCallback(async () => {
    const nome = (propostaNome.trim() || refDoc.trim() || `OST ${dataDoc}`).trim().slice(0, 200)
    const payload = collectPayload()
    const now = new Date().toISOString()
    const id = propostaEditandoId || newRowId()
    setPropostas((prev) => {
      const ix = prev.findIndex((p) => p.id === id)
      const item: OstPropostaSalva = {
        id,
        nome,
        criadoEm: ix >= 0 ? prev[ix]!.criadoEm : now,
        atualizadoEm: now,
        payload,
      }
      const next = ix >= 0 ? prev.map((p, i) => (i === ix ? item : p)) : [...prev, item]
      void saveOstPropostas(next, saveData)
      return next
    })
    setPropostaEditandoId(id)
  }, [collectPayload, dataDoc, propostaEditandoId, propostaNome, refDoc, saveData])

  const carregarProposta = useCallback((p: OstPropostaSalva) => {
    const x = p.payload
    setClienteId(x.clienteId || '')
    setClienteManual(x.clienteManual || '')
    setRefDoc(x.refDoc || '')
    setLocalServico(x.localServico || '')
    setDataDoc(x.dataDoc || new Date().toISOString().slice(0, 10))
    setValidade(x.validade || '')
    setIntro(x.intro || t.orcamentoServicoTecnicoIntroDefault || '')
    setClausulas(x.clausulas || t.orcamentoServicoTecnicoClausulasDefault || TEXTO_CLAUSULAS_PADRAO_PT)
    setLinhas(
      x.linhas && x.linhas.length > 0
        ? x.linhas.map((L) => ({
            rowId: L.rowId && String(L.rowId).trim() ? L.rowId : newRowId(),
            servicoId: L.servicoId || '',
            quantidadeStr: L.quantidadeStr != null && String(L.quantidadeStr).trim() !== '' ? String(L.quantidadeStr) : '1',
          }))
        : [{ rowId: newRowId(), servicoId: '', quantidadeStr: '1' }]
    )
    setPropostaEditandoId(p.id)
    setPropostaNome(p.nome)
  }, [t])

  const novaProposta = useCallback(() => {
    setPropostaEditandoId(null)
    setPropostaNome('')
    setClienteId('')
    setClienteManual('')
    setRefDoc('')
    setLocalServico('')
    setDataDoc(new Date().toISOString().slice(0, 10))
    setValidade('')
    setIntro(t.orcamentoServicoTecnicoIntroDefault || 'Documento sem valor fiscal. Os valores apresentados constituem proposta comercial para serviço técnico.')
    setClausulas(t.orcamentoServicoTecnicoClausulasDefault || TEXTO_CLAUSULAS_PADRAO_PT)
    setLinhas([{ rowId: newRowId(), servicoId: '', quantidadeStr: '1' }])
  }, [t])

  const excluirProposta = useCallback(
    async (id: string) => {
      const msg = t.orcamentoServicoTecnicoPropostaConfirmExcluir || 'Eliminar esta proposta guardada?'
      if (typeof window !== 'undefined' && !window.confirm(msg)) return
      setPropostas((prev) => {
        const next = prev.filter((p) => p.id !== id)
        void saveOstPropostas(next, saveData)
        return next
      })
      if (propostaEditandoId === id) novaProposta()
    },
    [propostaEditandoId, saveData, t, novaProposta]
  )

  const tx = t as Record<string, string>

  const subNavBtn = (key: OstSection, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      key={key}
      role="tab"
      aria-selected={section === key}
      className={section === key ? 'primary' : 'secondary'}
      onClick={() => setSection(key)}
      style={{
        flex: '1 1 auto',
        minWidth: 120,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <span className="ost-subnav-svg" aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  )

  return (
    <div className="papel-timbrado-root">
      <div className="ost-subnav papel-timbrado-toolbar" role="tablist" aria-label={t.orcamentoServicoTecnicoSubnavAria || 'Secções'}>
        {subNavBtn('orcamento', t.orcamentoServicoTecnicoSecOrcamento || 'Orçamento', <IconClipboardList size={18} />)}
        {subNavBtn('papel', t.orcamentoServicoTecnicoSecPapel || 'Papel timbrado', <IconLayers size={18} />)}
        {subNavBtn('servicos', t.orcamentoServicoTecnicoSecServicos || 'Serviços / valores', <IconCoins size={18} />)}
      </div>

      {section === 'orcamento' ? (
        <>
          <div className="papel-timbrado-toolbar">
            <button type="button" className="secondary" onClick={refreshPapel}>
              {t.orcamentoServicoTecnicoAtualizarPapel || 'Atualizar papel timbrado'}
            </button>
            <button type="button" className="primary" onClick={imprimir}>
              {tx.papelTimbradoImprimir || t.orcamentoServicoTecnicoImprimir || 'Imprimir / PDF'}
            </button>
          </div>

          <div className="papel-timbrado-layout">
        <div className="papel-timbrado-form">
          <h1>{t.orcamentoServicoTecnicoTituloForm || t.orcamentoServicoTecnicoTitle || 'Orçamento de serviço técnico'}</h1>
          <p className="lead">{t.orcamentoServicoTecnicoSubtitle || ''}</p>
          <div className="orcamento-ost-form-callout" role="note">
            {t.orcamentoServicoTecnicoFormAvisoCliente ||
              'O PDF inclui condições claras sobre despesas de viagem, hotel, alimentação e transporte aéreo (normalmente à cargo da empresa contratante), equipagem extra e ciência do cliente. Edite o quadro «Condições» se o contrato for diferente.'}
          </div>

          <div
            className="papel-timbrado-field"
            style={{
              background: 'rgba(15,23,42,0.45)',
              borderRadius: 12,
              padding: 14,
              border: '1px solid rgba(148,163,184,0.25)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 10 }}>
              {t.orcamentoServicoTecnicoPropostasTitulo || 'Propostas guardadas'}
            </div>
            <p className="papel-timbrado-hint" style={{ marginTop: 0, marginBottom: 12 }}>
              {t.orcamentoServicoTecnicoPropostasHint ||
                'Guarde rascunhos ou propostas enviadas; pode reabrir, alterar e voltar a guardar. Os dados seguem a sincronização do sistema quando usa o servidor.'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginBottom: 12 }}>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
                  {t.orcamentoServicoTecnicoPropostaNome || 'Nome da proposta'}
                </label>
                <input
                  value={propostaNome}
                  onChange={(e) => setPropostaNome(e.target.value)}
                  placeholder={refDoc.trim() || `${t.orcamentoServicoTecnicoRef || 'Ref.'} / ${dataDoc}`}
                  style={{ width: '100%', boxSizing: 'border-box', borderRadius: 10, padding: '10px 12px', background: '#0b1220', color: '#f1f5f9', border: '1px solid rgba(148,163,184,0.28)' }}
                />
              </div>
              <button type="button" className="primary" onClick={() => void guardarProposta()}>
                {t.orcamentoServicoTecnicoPropostaGuardar || 'Guardar proposta'}
              </button>
              <button type="button" className="secondary" onClick={novaProposta}>
                {t.orcamentoServicoTecnicoPropostaNova || 'Nova proposta'}
              </button>
            </div>
            {propostaEditandoId ? (
              <p className="papel-timbrado-hint" style={{ marginBottom: 10, color: '#86efac' }}>
                {t.orcamentoServicoTecnicoPropostaEditando || 'A editar uma proposta guardada — «Guardar» atualiza a mesma entrada.'}
              </p>
            ) : null}
            {propostas.length === 0 ? (
              <p className="papel-timbrado-hint" style={{ marginBottom: 0 }}>
                {t.orcamentoServicoTecnicoPropostasVazio || 'Ainda não há propostas guardadas.'}
              </p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...propostas]
                  .sort((a, b) => (b.atualizadoEm || '').localeCompare(a.atualizadoEm || ''))
                  .map((p) => (
                    <li
                      key={p.id}
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: 'rgba(15,23,42,0.55)',
                        border: '1px solid rgba(148,163,184,0.2)',
                      }}
                    >
                      <span style={{ fontWeight: 700, flex: '1 1 160px', minWidth: 0 }}>{p.nome}</span>
                      <span className="papel-timbrado-hint" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                        {p.payload?.dataDoc || '—'}
                      </span>
                      <span style={{ flex: '1 1 8px' }} />
                      <button type="button" className="secondary" style={{ padding: '8px 12px' }} onClick={() => carregarProposta(p)}>
                        {t.orcamentoServicoTecnicoPropostaEditar || 'Abrir / editar'}
                      </button>
                      <button type="button" className="secondary" style={{ padding: '8px 12px' }} onClick={() => void excluirProposta(p.id)}>
                        {t.orcamentoServicoTecnicoPropostaExcluir || 'Excluir'}
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="papel-timbrado-field">
            <label>{t.orcamentoServicoTecnicoCliente || 'Cliente'}</label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', borderRadius: 10, padding: '10px 12px', background: '#0b1220', color: '#f1f5f9', border: '1px solid rgba(148,163,184,0.28)' }}
            >
              <option value="">{t.orcamentoServicoTecnicoClientePlaceholder || 'Selecione um cliente cadastrado (opcional)…'}</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nomeEmpresa}
                </option>
              ))}
            </select>
          </div>
          <div className="papel-timbrado-field">
            <label>{t.orcamentoServicoTecnicoClienteManual || 'Nome do cliente (se não estiver na lista)'}</label>
            <input value={clienteManual} onChange={(e) => setClienteManual(e.target.value)} placeholder={t.orcamentoServicoTecnicoClienteManualPh || ''} />
          </div>
          <div className="papel-timbrado-field">
            <label>{t.orcamentoServicoTecnicoRef || 'Referência / proposta n.º'}</label>
            <input value={refDoc} onChange={(e) => setRefDoc(e.target.value)} placeholder="ex.: OST-2026-0042" />
          </div>
          <div className="papel-timbrado-field">
            <label>{t.orcamentoServicoTecnicoLocal || 'Local de execução (opcional)'}</label>
            <input value={localServico} onChange={(e) => setLocalServico(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="papel-timbrado-field" style={{ marginBottom: 0 }}>
              <label>{t.orcamentoServicoTecnicoData || 'Data'}</label>
              <input type="date" value={dataDoc} onChange={(e) => setDataDoc(e.target.value)} />
            </div>
            <div className="papel-timbrado-field" style={{ marginBottom: 0 }}>
              <label>{t.orcamentoServicoTecnicoValidade || 'Validade (texto livre)'}</label>
              <input value={validade} onChange={(e) => setValidade(e.target.value)} placeholder={t.orcamentoServicoTecnicoValidadePh || 'ex.: 30 dias'} />
            </div>
          </div>

          <div className="papel-timbrado-field" style={{ marginTop: 14 }}>
            <label>{t.orcamentoServicoTecnicoIntro || 'Texto de abertura'}</label>
            <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={3} />
          </div>

          <div className="papel-timbrado-field">
            <label>{t.orcamentoServicoTecnicoItens || 'Itens (cadastro de serviços)'}</label>
            {servicosLista.length === 0 ? (
              <p className="papel-timbrado-hint" style={{ color: '#fbbf24' }}>
                {t.orcamentoServicoTecnicoSemServicos || 'Não há serviços cadastrados. Abra o cadastro de serviços e adicione horas, viagens, quilómetros, etc.'}
              </p>
            ) : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {linhas.map(({ rowId, servicoId, quantidadeStr }) => {
                const svc = servicosLista.find((s) => s.id === servicoId)
                return (
                  <div
                    key={rowId}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0,1.4fr) minmax(72px,0.5fr) auto',
                      gap: 8,
                      alignItems: 'end',
                      padding: 10,
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.22)',
                      background: 'rgba(15,23,42,0.5)',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {t.orcamentoServicoTecnicoServico || 'Serviço'}
                      </span>
                      <select
                        value={servicoId}
                        onChange={(e) => updateLinha(rowId, { servicoId: e.target.value })}
                        style={{
                          marginTop: 6,
                          width: '100%',
                          boxSizing: 'border-box',
                          borderRadius: 8,
                          padding: '8px 10px',
                          background: '#0b1220',
                          color: '#f1f5f9',
                          border: '1px solid rgba(148,163,184,0.28)',
                        }}
                      >
                        <option value="">{t.orcamentoServicoTecnicoEscolherServico || 'Escolher…'}</option>
                        {servicosLista.map((s) => (
                          <option key={s.id} value={s.id}>
                            {(s.cod ? `${s.cod} — ` : '') + s.nome} ({labelTipoCobranca(s.tipoCobranca, t)} — {formatMoneyEUR(Number(s.valor) || 0)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {(t.orcamentoServicoTecnicoQuantidade || 'Quantidade') + (svc ? ` (${unidadeQuantidade(svc.tipoCobranca, t)})` : '')}
                      </span>
                      <input
                        style={{ marginTop: 6 }}
                        value={quantidadeStr}
                        onChange={(e) => updateLinha(rowId, { quantidadeStr: e.target.value })}
                        inputMode="decimal"
                      />
                    </div>
                    <button type="button" className="secondary" onClick={() => removeLinha(rowId)} style={{ padding: '8px 10px' }} aria-label={t.orcamentoServicoTecnicoRemover || 'Remover'}>
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
            <button type="button" className="secondary" style={{ marginTop: 10 }} onClick={addLinha}>
              {t.orcamentoServicoTecnicoAdicionarLinha || '+ Adicionar linha'}
            </button>
          </div>

          <div className="papel-timbrado-field">
            <label>{t.orcamentoServicoTecnicoClausulas || 'Condições e exclusões (editável)'}</label>
            <textarea value={clausulas} onChange={(e) => setClausulas(e.target.value)} rows={14} />
          </div>

          <p className="papel-timbrado-hint">{tx.papelTimbradoDicaImpressao || ''}</p>
        </div>

        <div className="papel-timbrado-sheet-wrap">
          <div className="papel-timbrado-sheet" id="orcamento-servico-tecnico-print-area">
            <div className="papel-timbrado-sheet-inner">
              <header className="papel-timbrado-header">
                {mostrar.logo ? <img className="papel-timbrado-logo" src={logoSrc} alt="" onError={() => setLogoBroken(true)} /> : null}
                <div className="papel-timbrado-header-text">
                  {mostrar.nomeEmpresa ? <strong>{cfg.nomeEmpresa}</strong> : null}
                </div>
              </header>

              <section
                className="papel-timbrado-body-zone papel-timbrado-body-zone--flow"
                style={{
                  flex: '0 1 auto',
                  minHeight: 'auto',
                  borderStyle: 'solid',
                  borderColor: '#e2e8f0',
                  background: '#fff',
                  color: '#0f172a',
                  padding: '16px 14px',
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.14em', color: '#64748b', textTransform: 'uppercase' }}>
                    {t.orcamentoServicoTecnicoDocTitulo || 'Orçamento de serviço técnico'}
                  </div>
                  {refDoc.trim() ? (
                    <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700 }}>{refDoc.trim()}</div>
                  ) : null}
                </div>

                <div style={{ fontSize: 10.5, lineHeight: 1.45, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <span>
                      <strong>{t.orcamentoServicoTecnicoData || 'Data'}:</strong> {dataDoc}
                    </span>
                    {validade.trim() ? (
                      <span>
                        <strong>{t.orcamentoServicoTecnicoValidade || 'Validade'}:</strong> {validade.trim()}
                      </span>
                    ) : null}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <strong>{t.orcamentoServicoTecnicoCliente || 'Cliente'}:</strong> {nomeClienteDoc || '—'}
                  </div>
                  {localServico.trim() ? (
                    <div style={{ marginTop: 4 }}>
                      <strong>{t.orcamentoServicoTecnicoLocal || 'Local'}:</strong> {localServico.trim()}
                    </div>
                  ) : null}
                </div>

                {intro.trim() ? (
                  <p style={{ fontSize: 10.2, lineHeight: 1.5, margin: '0 0 12px', whiteSpace: 'pre-wrap' }}>{intro.trim()}</p>
                ) : null}

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, marginBottom: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #0f172a' }}>
                      <th style={{ textAlign: 'left', padding: '6px 4px' }}>{t.orcamentoServicoTecnicoColDescricao || 'Descrição'}</th>
                      <th style={{ textAlign: 'center', padding: '6px 4px', width: 72 }}>{t.orcamentoServicoTecnicoColTipo || 'Tipo'}</th>
                      <th style={{ textAlign: 'right', padding: '6px 4px', width: 56 }}>{t.orcamentoServicoTecnicoColQtd || 'Qtd'}</th>
                      <th style={{ textAlign: 'right', padding: '6px 4px', width: 72 }}>{t.orcamentoServicoTecnicoColPreco || 'Preço'}</th>
                      <th style={{ textAlign: 'right', padding: '6px 4px', width: 80 }}>{t.orcamentoServicoTecnicoColTotal || 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhasResolvidas.map(({ L, svc, q, sub }) => (
                      <tr key={L.rowId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 4px', verticalAlign: 'top' }}>
                          {svc ? (
                            <>
                              <div style={{ fontWeight: 700 }}>{svc.nome}</div>
                              {svc.descricao?.trim() ? <div style={{ color: '#475569', marginTop: 2 }}>{svc.descricao.trim()}</div> : null}
                            </>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'top' }}>
                          {svc ? labelTipoCobranca(svc.tipoCobranca, t) : '—'}
                        </td>
                        <td style={{ padding: '6px 4px', textAlign: 'right', verticalAlign: 'top' }}>{svc ? `${String(L.quantidadeStr).trim()} ${unidadeQuantidade(svc.tipoCobranca, t)}` : '—'}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'right', verticalAlign: 'top' }}>{svc ? formatMoneyEUR(svc.valor) : '—'}</td>
                        <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 700, verticalAlign: 'top' }}>{svc ? formatMoneyEUR(sub) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ textAlign: 'right', fontSize: 11.5, fontWeight: 800, marginBottom: 12 }}>
                  {t.orcamentoServicoTecnicoTotalGeral || 'Total'}: {formatMoneyEUR(totalGeral)}
                </div>

                {clausulas.trim() ? (
                  <div className="orcamento-ost-legal-wrap">
                    <div className="orcamento-ost-legal-title">
                      {t.orcamentoServicoTecnicoPdfCondicoesTitulo || 'CONDIÇÕES GERAIS E INFORMAÇÃO AO CONTRATANTE'}
                    </div>
                    <div style={{ fontSize: 9.2, lineHeight: 1.5, color: '#1e293b' }}>
                      {splitClausulasParagraphs(clausulas).map((para, idx) => (
                        <p key={idx} style={{ margin: idx === 0 ? '0 0 8px' : '0 0 8px', whiteSpace: 'pre-wrap' }}>
                          {para}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="orcamento-ost-cientificacao">
                  <div className="orcamento-ost-cientificacao-title">
                    {t.orcamentoServicoTecnicoPdfCientificacaoTitulo || 'ACEITAÇÃO DO ORÇAMENTO (cliente / contratante)'}
                  </div>
                  <p className="orcamento-ost-cientificacao-text">
                    {t.orcamentoServicoTecnicoPdfCientificacaoTexto ||
                      'A entidade contratante declara ter lido e compreendido a presente proposta, incluindo as condições relativas a despesas de deslocação, alojamento, alimentação e transporte aéreo, bem como limites de equipagem e trabalhos adicionais, nos termos acima.'}
                  </p>

                  <div className="orcamento-ost-concordo-box">
                    <p className="orcamento-ost-concordo-frase">
                      {t.orcamentoServicoTecnicoPdfConcordoFrase ||
                        'Ao assinar no espaço reservado abaixo, o cliente declara que CONCORDA com os valores, com a descrição dos serviços e com todas as condições constantes neste documento.'}
                    </p>
                    <p className="orcamento-ost-concordo-leitura">
                      {t.orcamentoServicoTecnicoPdfLeituraObrigatoria ||
                        'A assinatura vale como aceitação formal da proposta (sem prejuízo de contrato ou ordem de serviço posterior, se aplicável).'}
                    </p>
                  </div>

                  <div className="orcamento-ost-sign-row">
                    <span className="orcamento-ost-sign-label orcamento-ost-sign-label--emph">
                      {t.orcamentoServicoTecnicoPdfLinhaNomeCargo || 'Nome completo, cargo e empresa (cliente)'}
                    </span>
                    <span className="orcamento-ost-sign-line orcamento-ost-sign-line--large" aria-hidden />
                  </div>

                  <div className="orcamento-ost-sign-row orcamento-ost-sign-row--split">
                    <div className="orcamento-ost-sign-cell">
                      <span className="orcamento-ost-sign-label orcamento-ost-sign-label--emph">
                        {t.orcamentoServicoTecnicoPdfLinhaData || 'Data'}
                      </span>
                      <span className="orcamento-ost-sign-line orcamento-ost-sign-line--large" aria-hidden />
                    </div>
                    <div className="orcamento-ost-sign-cell">
                      <span className="orcamento-ost-sign-label orcamento-ost-sign-label--emph">
                        {t.orcamentoServicoTecnicoPdfLinhaAssinaturaConcordo ||
                          'Assinatura do cliente (concordo) — ou carimbo da empresa'}
                      </span>
                      <span className="orcamento-ost-sign-line orcamento-ost-sign-line--xlarge" aria-hidden />
                    </div>
                  </div>
                </div>
              </section>

              <footer className="papel-timbrado-footer" aria-label="Contactos">
                {(() => {
                  const items: { k: keyof typeof mostrar; label: string; val: string }[] = [
                    { k: 'cidade', label: tx.papelTimbradoLabelCidade, val: cfg.cidade },
                    { k: 'freguesia', label: tx.papelTimbradoLabelFreguesia, val: cfg.freguesia },
                    { k: 'rua', label: tx.papelTimbradoLabelRua, val: cfg.rua },
                    { k: 'cep', label: tx.papelTimbradoLabelCep, val: cfg.cep },
                    { k: 'telefone', label: tx.papelTimbradoLabelFone, val: cfg.telefone },
                  ]
                  const visible = items.filter((it) => mostrar[it.k])
                  if (visible.length === 0) return null
                  return (
                    <div className="papel-timbrado-footer-row">
                      {visible.map((it, i) => (
                        <React.Fragment key={it.k}>
                          {i > 0 ? (
                            <span className="papel-timbrado-footer-sep" aria-hidden="true">
                              |
                            </span>
                          ) : null}
                          <span className="papel-timbrado-footer-item">
                            <span className="papel-timbrado-footer-label">{it.label}</span>
                            <span className="papel-timbrado-footer-val">{it.val}</span>
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  )
                })()}
              </footer>
            </div>
          </div>
        </div>
      </div>
        </>
      ) : null}

      {section === 'papel' ? <PapelTimbradoConfigurator variant="embedded" /> : null}

      {section === 'servicos' ? (
        <div className="papel-timbrado-form" style={{ maxWidth: 920, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>{t.orcamentoServicoTecnicoServicosListaTitulo || 'Serviços e valores cadastrados'}</h2>
          <p className="papel-timbrado-hint" style={{ marginBottom: 16 }}>
            {t.orcamentoServicoTecnicoServicosListaHint ||
              'Para criar ou alterar rubricas use o editor completo. Pode voltar ao Orçamento quando quiser, sem fechar este separador.'}
          </p>
          {servicosLista.length === 0 ? (
            <p className="papel-timbrado-hint" style={{ color: '#fbbf24' }}>
              {t.orcamentoServicoTecnicoSemServicos || 'Não há serviços cadastrados.'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid rgba(148,163,184,0.22)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'rgba(15,23,42,0.85)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px' }}>{t.orcamentoServicoTecnicoColDescricao || 'Descrição'}</th>
                    <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{t.orcamentoServicoTecnicoColTipo || 'Tipo'}</th>
                    <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{t.orcamentoServicoTecnicoColPreco || 'Valor'}</th>
                  </tr>
                </thead>
                <tbody>
                  {servicosLista.map((s) => (
                    <tr key={s.id} style={{ borderTop: '1px solid rgba(148,163,184,0.15)' }}>
                      <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                        {(s.cod ? `${s.cod} — ` : '') + s.nome}
                        {s.descricao ? <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>{s.descricao}</div> : null}
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{labelTipoCobranca(s.tipoCobranca, t)}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{formatMoneyEUR(Number(s.valor) || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
            {onOpenCadastroServicosModal ? (
              <button type="button" className="primary" onClick={onOpenCadastroServicosModal}>
                {t.orcamentoServicoTecnicoServicosAbrirModal || 'Abrir editor completo (modal)'}
              </button>
            ) : null}
            <button type="button" className={onOpenCadastroServicosModal ? 'secondary' : 'primary'} onClick={abrirCadastroServicos}>
              {t.orcamentoServicoTecnicoServicosAbrirSeparador || 'Abrir cadastro no separador do sistema'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
