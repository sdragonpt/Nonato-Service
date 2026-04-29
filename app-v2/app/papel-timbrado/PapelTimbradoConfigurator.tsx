'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { translations } from '../translations'
import { loadData } from '../utils/dataStorage'
import {
  PAPEL_DEFAULTS,
  PAPEL_MOSTRAR_DEFAULTS,
  PAPEL_STORAGE_KEY,
  FICHA_KEY,
  FALLBACK_LOGO,
  clearPapelTimbradoStorage,
  loadPapelTimbradoState,
  savePapelTimbradoState,
  type PapelTimbradoConfig,
  type PapelTimbradoFullState,
  type PapelTimbradoMostrar,
} from './papelTimbradoStorage'
import './papel-timbrado.css'

export type PapelTimbradoConfiguratorVariant = 'standalone' | 'embedded'

type FichaCadastralLite = {
  nomeEmpresa?: string
  telefone?: string
  morada?: string
  logo?: string
}

function getLang(): keyof typeof translations {
  if (typeof window === 'undefined') return 'pt-BR'
  const v = localStorage.getItem('nonato-language')
  if (v && v in translations) return v as keyof typeof translations
  return 'pt-BR'
}

function partialDesdeFichaCadastral(fc: FichaCadastralLite | null | undefined): Partial<PapelTimbradoConfig> | null {
  if (!fc || typeof fc !== 'object') return null
  const raw = (fc.morada || '').trim()
  const moradaBits: Partial<Pick<PapelTimbradoConfig, 'rua' | 'cep' | 'cidade' | 'freguesia'>> = {}
  if (raw) {
    const nl = raw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    const linhaMorada = nl.length >= 2 ? nl[0]! : raw
    const linhaLocal = nl.length >= 2 ? nl.slice(1).join(' — ') : ''
    if (linhaMorada) moradaBits.rua = linhaMorada
    if (linhaLocal) {
      const cepM = linhaLocal.match(/(\d{4}-\d{3})/)
      if (cepM) moradaBits.cep = cepM[1]
      const tail = linhaLocal
        .replace(cepM?.[0] || '', '')
        .trim()
        .replace(/^[-—,\s]+/, '')
      const chunks = tail
        .split(/[—–]/)
        .map((s) => s.trim())
        .filter(Boolean)
      if (chunks.length >= 2) {
        moradaBits.cidade = chunks[0]
        moradaBits.freguesia = chunks[chunks.length - 1]
      } else if (chunks.length === 1) {
        moradaBits.cidade = chunks[0]
      }
    }
  }

  const out: Partial<PapelTimbradoConfig> = {}
  const nome = (fc.nomeEmpresa || '').trim()
  const tel = (fc.telefone || '').trim()
  const logo = (fc.logo || '').trim()
  if (nome) out.nomeEmpresa = nome
  if (tel) out.telefone = tel
  if (moradaBits.rua) out.rua = moradaBits.rua
  if (moradaBits.cep) out.cep = moradaBits.cep
  if (moradaBits.cidade) out.cidade = moradaBits.cidade
  if (moradaBits.freguesia) out.freguesia = moradaBits.freguesia
  if (logo) out.logoUrl = logo
  if (!nome && !tel && !logo && !moradaBits.rua && !moradaBits.cidade && !moradaBits.freguesia && !moradaBits.cep) return null
  return out
}

function mergeCfg(base: PapelTimbradoConfig, partial: Partial<PapelTimbradoConfig>): PapelTimbradoConfig {
  const next = { ...base }
  ;(Object.keys(partial) as (keyof PapelTimbradoConfig)[]).forEach((k) => {
    const v = partial[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') (next as Record<string, string>)[k] = String(v).trim()
  })
  return next
}

function FooterPreview({
  cfg,
  mostrar,
  tx,
}: {
  cfg: PapelTimbradoConfig
  mostrar: PapelTimbradoMostrar
  tx: Record<string, string>
}) {
  const items: { k: keyof PapelTimbradoMostrar; label: string; val: string }[] = [
    { k: 'cidade', label: tx.papelTimbradoLabelCidade || '', val: cfg.cidade },
    { k: 'freguesia', label: tx.papelTimbradoLabelFreguesia || '', val: cfg.freguesia },
    { k: 'rua', label: tx.papelTimbradoLabelRua || '', val: cfg.rua },
    { k: 'cep', label: tx.papelTimbradoLabelCep || '', val: cfg.cep },
    { k: 'telefone', label: tx.papelTimbradoLabelFone || '', val: cfg.telefone },
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
}

type Props = { variant: PapelTimbradoConfiguratorVariant }

export function PapelTimbradoConfigurator({ variant }: Props) {
  const embedded = variant === 'embedded'
  const [lang, setLang] = useState<keyof typeof translations>('pt-BR')
  const [papel, setPapel] = useState<PapelTimbradoFullState>(() => loadPapelTimbradoState())
  const [logoBroken, setLogoBroken] = useState(false)
  const [salvoMsg, setSalvoMsg] = useState('')
  const formTouchedRef = useRef(false)

  const cfg = papel.config
  const mostrar = papel.mostrar

  const markFormTouched = useCallback(() => {
    formTouchedRef.current = true
  }, [])

  const patchConfig = useCallback(
    (patch: Partial<PapelTimbradoConfig>) => {
      markFormTouched()
      setPapel((p) => ({ ...p, config: { ...p.config, ...patch } }))
    },
    [markFormTouched]
  )

  const patchMostrar = useCallback((patch: Partial<PapelTimbradoMostrar>) => {
    setPapel((p) => ({ ...p, mostrar: { ...p.mostrar, ...patch } }))
  }, [])

  useEffect(() => {
    setLang(getLang())
    setPapel(loadPapelTimbradoState())
    setLogoBroken(false)
    formTouchedRef.current = false

    const semPapelSalvo = typeof window !== 'undefined' && !localStorage.getItem(PAPEL_STORAGE_KEY)
    let cancel = false

    ;(async () => {
      try {
        const fc = (await loadData(FICHA_KEY, true)) as FichaCadastralLite | null
        if (cancel) return
        if (formTouchedRef.current) return
        if (typeof window !== 'undefined' && localStorage.getItem(PAPEL_STORAGE_KEY)) return
        const partial = partialDesdeFichaCadastral(fc)
        if (!partial) return
        if (semPapelSalvo) {
          setPapel({
            config: mergeCfg({ ...PAPEL_DEFAULTS }, partial),
            mostrar: { ...PAPEL_MOSTRAR_DEFAULTS },
          })
          setLogoBroken(false)
        }
      } catch {
        /* ignorar */
      }
    })()

    return () => {
      cancel = true
    }
  }, [])

  const t = useMemo(() => translations[lang] || translations['pt-BR'], [lang])
  const tx = t as Record<string, string>

  const salvar = useCallback(() => {
    savePapelTimbradoState(papel)
    const msg = tx.papelTimbradoSalvoOk || 'Guardado.'
    setSalvoMsg(msg)
    window.setTimeout(() => setSalvoMsg(''), 2500)
  }, [papel, tx])

  const restaurar = useCallback(() => {
    formTouchedRef.current = false
    setPapel({ config: { ...PAPEL_DEFAULTS }, mostrar: { ...PAPEL_MOSTRAR_DEFAULTS } })
    setLogoBroken(false)
    clearPapelTimbradoStorage()
  }, [])

  const imprimir = useCallback(() => {
    window.print()
  }, [])

  const sincronizarComCadastro = useCallback(async () => {
    const cur = (translations[getLang()] || translations['pt-BR']) as Record<string, string>
    try {
      const fc = (await loadData(FICHA_KEY, true)) as FichaCadastralLite | null
      const partial = partialDesdeFichaCadastral(fc)
      if (!partial) {
        window.alert(cur.papelTimbradoSemFichaCadastro || 'Sem dados na ficha cadastral.')
        return
      }
      setPapel((p) => ({ ...p, config: mergeCfg(p.config, partial) }))
      setLogoBroken(false)
    } catch {
      window.alert(cur.papelTimbradoSemFichaCadastro || 'Sem dados na ficha cadastral.')
    }
  }, [])

  const logoSrc = logoBroken ? FALLBACK_LOGO : cfg.logoUrl || FALLBACK_LOGO
  const logoCampoMultilinha = cfg.logoUrl.length > 120

  const chk = (key: keyof PapelTimbradoMostrar, label: string) => (
    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8, fontSize: 13 }}>
      <input type="checkbox" checked={mostrar[key]} onChange={(e) => patchMostrar({ [key]: e.target.checked } as Partial<PapelTimbradoMostrar>)} />
      <span>{label}</span>
    </label>
  )

  const idPrefix = embedded ? 'pt-emb-' : 'pt-'

  return (
    <div className={`papel-timbrado-root${embedded ? ' papel-timbrado-root--embedded' : ''}`}>
      <div className="papel-timbrado-toolbar">
        {!embedded ? <Link href="/">← {tx.papelTimbradoVoltarSistema || 'Voltar ao sistema'}</Link> : null}
        {embedded ? (
          <button type="button" className="secondary" onClick={() => window.open('/papel-timbrado', '_blank', 'noopener,noreferrer')}>
            {tx.orcamentoServicoTecnicoPapelPaginaDedicada || 'Abrir página dedicada'}
          </button>
        ) : null}
        <button type="button" className="secondary" onClick={sincronizarComCadastro}>
          {tx.papelTimbradoSincronizarCadastro || 'Puxar dados do cadastro'}
        </button>
        <button type="button" className="secondary" onClick={salvar}>
          {tx.papelTimbradoSalvarConfig || 'Guardar'}
        </button>
        <button type="button" className="secondary" onClick={restaurar}>
          {tx.papelTimbradoRestaurarNonato || 'Restaurar'}
        </button>
        <button type="button" className="primary" onClick={imprimir}>
          {tx.papelTimbradoImprimir || 'Imprimir / PDF'}
        </button>
        {salvoMsg ? (
          <span className="papel-timbrado-hint" style={{ margin: 0, color: '#86efac' }}>
            {salvoMsg}
          </span>
        ) : null}
      </div>

      <div className="papel-timbrado-layout">
        <div className="papel-timbrado-form">
          <h1>{tx.papelTimbradoTitle || 'Papel timbrado'}</h1>
          <p className="lead">{tx.papelTimbradoSubtitle || ''}</p>
          <p className="papel-timbrado-hint" style={{ marginBottom: 14 }}>
            {tx.papelTimbradoSincronizarCadastroHint || ''}
          </p>

          <div className="papel-timbrado-field" style={{ marginBottom: 16 }}>
            <span
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#64748b',
                marginBottom: 8,
              }}
            >
              {tx.papelTimbradoMostrarSecao || 'Mostrar no modelo'}
            </span>
            {chk('logo', tx.papelTimbradoMostrarLogo || 'Logo')}
            {chk('nomeEmpresa', tx.papelTimbradoMostrarNome || 'Nome da empresa (cabeçalho)')}
            {chk('cidade', tx.papelTimbradoMostrarCidade || tx.papelTimbradoCampoCidade || 'Cidade')}
            {chk('freguesia', tx.papelTimbradoMostrarFreguesia || tx.papelTimbradoCampoFreguesia || 'Freguesia')}
            {chk('rua', tx.papelTimbradoMostrarRua || tx.papelTimbradoCampoRua || 'Rua')}
            {chk('cep', tx.papelTimbradoMostrarCep || tx.papelTimbradoCampoCep || 'CEP')}
            {chk('telefone', tx.papelTimbradoMostrarTelefone || tx.papelTimbradoTelefone || 'Telefone')}
          </div>

          <div className="papel-timbrado-field">
            <label htmlFor={`${idPrefix}nome`}>{tx.papelTimbradoNomeEmpresa || 'Nome'}</label>
            <input id={`${idPrefix}nome`} value={cfg.nomeEmpresa} onChange={(e) => patchConfig({ nomeEmpresa: e.target.value })} />
          </div>
          <div className="papel-timbrado-field">
            <label htmlFor={`${idPrefix}cid`}>{tx.papelTimbradoCampoCidade || 'Cidade'}</label>
            <input id={`${idPrefix}cid`} value={cfg.cidade} onChange={(e) => patchConfig({ cidade: e.target.value })} />
          </div>
          <div className="papel-timbrado-field">
            <label htmlFor={`${idPrefix}freg`}>{tx.papelTimbradoCampoFreguesia || 'Freguesia'}</label>
            <input id={`${idPrefix}freg`} value={cfg.freguesia} onChange={(e) => patchConfig({ freguesia: e.target.value })} />
          </div>
          <div className="papel-timbrado-field">
            <label htmlFor={`${idPrefix}rua`}>{tx.papelTimbradoCampoRua || 'Rua'}</label>
            <input id={`${idPrefix}rua`} value={cfg.rua} onChange={(e) => patchConfig({ rua: e.target.value })} />
          </div>
          <div className="papel-timbrado-field">
            <label htmlFor={`${idPrefix}cep`}>{tx.papelTimbradoCampoCep || 'CEP'}</label>
            <input id={`${idPrefix}cep`} value={cfg.cep} onChange={(e) => patchConfig({ cep: e.target.value })} />
          </div>
          <div className="papel-timbrado-field">
            <label htmlFor={`${idPrefix}tel`}>{tx.papelTimbradoTelefone || 'Telefone'}</label>
            <input id={`${idPrefix}tel`} value={cfg.telefone} onChange={(e) => patchConfig({ telefone: e.target.value })} />
          </div>
          <div className="papel-timbrado-field">
            <label htmlFor={`${idPrefix}logo`}>{tx.papelTimbradoLogoUrl || 'Logo URL'}</label>
            {logoCampoMultilinha ? (
              <textarea
                id={`${idPrefix}logo`}
                rows={4}
                value={cfg.logoUrl}
                onChange={(e) => {
                  setLogoBroken(false)
                  patchConfig({ logoUrl: e.target.value })
                }}
                placeholder="/brand/nonato-logo-papel-timbrado.png"
                className="papel-timbrado-textarea-logo"
              />
            ) : (
              <input
                id={`${idPrefix}logo`}
                value={cfg.logoUrl}
                onChange={(e) => {
                  setLogoBroken(false)
                  patchConfig({ logoUrl: e.target.value })
                }}
                placeholder="/brand/nonato-logo-papel-timbrado.png"
              />
            )}
          </div>
          <p className="papel-timbrado-hint">{tx.papelTimbradoLogoHint || ''}</p>
          <p className="papel-timbrado-hint">{tx.papelTimbradoDicaImpressao || ''}</p>
        </div>

        <div className="papel-timbrado-sheet-wrap">
          <div className="papel-timbrado-sheet" id={embedded ? 'papel-timbrado-embedded-print-area' : 'papel-timbrado-print-area'}>
            <div className="papel-timbrado-sheet-inner">
              <header className="papel-timbrado-header">
                {mostrar.logo ? <img className="papel-timbrado-logo" src={logoSrc} alt="" onError={() => setLogoBroken(true)} /> : null}
                <div className="papel-timbrado-header-text">
                  {mostrar.nomeEmpresa ? <h2>{cfg.nomeEmpresa}</h2> : null}
                </div>
              </header>
              <section className="papel-timbrado-body-zone">
                <span>{tx.papelTimbradoAreaCorpo || 'Área da correspondência'}</span>
              </section>
              <footer className="papel-timbrado-footer" aria-label="Contactos">
                <FooterPreview cfg={cfg} mostrar={mostrar} tx={tx} />
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
