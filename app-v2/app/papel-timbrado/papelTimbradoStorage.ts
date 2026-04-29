/** Estado do papel timbrado (localStorage `nonato-papel-timbrado-v1`) — partilhado entre /papel-timbrado e orçamento OST. */

export const PAPEL_STORAGE_KEY = 'nonato-papel-timbrado-v1'
export const FICHA_KEY = 'nonato-ficha-cadastral'
export const PAPEL_CHANGED_EVENT = 'nonato-papel-timbrado-changed'

export type PapelTimbradoConfig = {
  nomeEmpresa: string
  cidade: string
  freguesia: string
  rua: string
  cep: string
  telefone: string
  logoUrl: string
}

/** O que incluir no cabeçalho / rodapé do boneco e do PDF. */
export type PapelTimbradoMostrar = {
  logo: boolean
  nomeEmpresa: boolean
  cidade: boolean
  freguesia: boolean
  rua: boolean
  cep: boolean
  telefone: boolean
}

export type PapelTimbradoFullState = {
  config: PapelTimbradoConfig
  mostrar: PapelTimbradoMostrar
}

type PapelTimbradoStored = Partial<PapelTimbradoConfig> & {
  linhaMorada?: string
  linhaLocal?: string
  mostrar?: Partial<PapelTimbradoMostrar>
}

export const PAPEL_DEFAULTS: PapelTimbradoConfig = {
  nomeEmpresa: 'NONATO SERVICE',
  cidade: 'Viana do Castelo',
  freguesia: 'Vila de Punhe',
  rua: 'Rua das Mimosas, 303',
  cep: '4905-642',
  telefone: '+351-91111-5479',
  logoUrl: '/brand/nonato-logo-papel-timbrado.png',
}

export const PAPEL_MOSTRAR_DEFAULTS: PapelTimbradoMostrar = {
  logo: true,
  nomeEmpresa: true,
  cidade: true,
  freguesia: true,
  rua: true,
  cep: true,
  telefone: true,
}

export const FALLBACK_LOGO = '/brand/nonato-letterhead-logo.svg'

function moradaParaDuasLinhas(morada: string | undefined): { linhaMorada: string; linhaLocal: string } {
  const raw = (morada || '').trim()
  if (!raw) return { linhaMorada: '', linhaLocal: '' }
  const nl = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (nl.length >= 2) return { linhaMorada: nl[0], linhaLocal: nl.slice(1).join(' — ') }
  return { linhaMorada: raw, linhaLocal: '' }
}

function moradaStringParaPartial(morada: string): Partial<Pick<PapelTimbradoConfig, 'rua' | 'cep' | 'cidade' | 'freguesia'>> {
  const { linhaMorada, linhaLocal } = moradaParaDuasLinhas(morada)
  const out: Partial<Pick<PapelTimbradoConfig, 'rua' | 'cep' | 'cidade' | 'freguesia'>> = {}
  if (linhaMorada) out.rua = linhaMorada
  if (linhaLocal) {
    const cepM = linhaLocal.match(/(\d{4}-\d{3})/)
    if (cepM) out.cep = cepM[1]
    const tail = linhaLocal
      .replace(cepM?.[0] || '', '')
      .trim()
      .replace(/^[-—,\s]+/, '')
    const chunks = tail
      .split(/[—–]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (chunks.length >= 2) {
      out.cidade = chunks[0]
      out.freguesia = chunks[chunks.length - 1]
    } else if (chunks.length === 1) {
      out.cidade = chunks[0]
    }
  }
  return out
}

function temCamposMoradaEstruturados(j: PapelTimbradoStored): boolean {
  return (
    (typeof j.rua === 'string' && j.rua.trim() !== '') ||
    (typeof j.cidade === 'string' && j.cidade.trim() !== '') ||
    (typeof j.freguesia === 'string' && j.freguesia.trim() !== '') ||
    (typeof j.cep === 'string' && j.cep.trim() !== '')
  )
}

function parseMostrar(raw: PapelTimbradoStored['mostrar']): PapelTimbradoMostrar {
  const m = raw && typeof raw === 'object' ? raw : {}
  const keys: (keyof PapelTimbradoMostrar)[] = ['logo', 'nomeEmpresa', 'cidade', 'freguesia', 'rua', 'cep', 'telefone']
  const out = { ...PAPEL_MOSTRAR_DEFAULTS }
  for (const k of keys) {
    if (typeof m[k] === 'boolean') (out as Record<string, boolean>)[k] = m[k]
  }
  return out
}

/** Lê e normaliza configuração + visibilidade a partir do localStorage (e migração de formato antigo). */
export function loadPapelTimbradoState(): PapelTimbradoFullState {
  if (typeof window === 'undefined') {
    return { config: { ...PAPEL_DEFAULTS }, mostrar: { ...PAPEL_MOSTRAR_DEFAULTS } }
  }
  try {
    const raw = localStorage.getItem(PAPEL_STORAGE_KEY)
    if (!raw) return { config: { ...PAPEL_DEFAULTS }, mostrar: { ...PAPEL_MOSTRAR_DEFAULTS } }
    const j = JSON.parse(raw) as PapelTimbradoStored
    const migrated = temCamposMoradaEstruturados(j)
      ? {}
      : moradaStringParaPartial(`${j.linhaMorada || ''}\n${j.linhaLocal || ''}`)

    const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v.trim() : fallback)
    const strOrMigrated = (key: keyof Pick<PapelTimbradoConfig, 'rua' | 'cep' | 'cidade' | 'freguesia'>, fallback: string) => {
      const v = j[key]
      if (typeof v === 'string') return v.trim()
      const mig = migrated[key]
      if (typeof mig === 'string' && mig.trim()) return mig.trim()
      return fallback
    }

    const config: PapelTimbradoConfig = {
      nomeEmpresa: typeof j.nomeEmpresa === 'string' ? j.nomeEmpresa.trim() : PAPEL_DEFAULTS.nomeEmpresa,
      cidade: strOrMigrated('cidade', PAPEL_DEFAULTS.cidade),
      freguesia: strOrMigrated('freguesia', PAPEL_DEFAULTS.freguesia),
      rua: strOrMigrated('rua', PAPEL_DEFAULTS.rua),
      cep: strOrMigrated('cep', PAPEL_DEFAULTS.cep),
      telefone: str(j.telefone, PAPEL_DEFAULTS.telefone),
      logoUrl: str(j.logoUrl, PAPEL_DEFAULTS.logoUrl) || PAPEL_DEFAULTS.logoUrl,
    }

    return { config, mostrar: parseMostrar(j.mostrar) }
  } catch {
    return { config: { ...PAPEL_DEFAULTS }, mostrar: { ...PAPEL_MOSTRAR_DEFAULTS } }
  }
}

/** Compat: só a config (comportamento antigo dos consumidores que ignoram mostrar). */
export function loadPapelTimbradoConfig(): PapelTimbradoConfig {
  return loadPapelTimbradoState().config
}

export function savePapelTimbradoState(state: PapelTimbradoFullState): void {
  if (typeof window === 'undefined') return
  const { config, mostrar } = state
  const payload = { ...config, mostrar }
  try {
    localStorage.setItem(PAPEL_STORAGE_KEY, JSON.stringify(payload))
    window.dispatchEvent(new Event(PAPEL_CHANGED_EVENT))
  } catch {
    /* ignore */
  }
}

export function clearPapelTimbradoStorage(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(PAPEL_STORAGE_KEY)
    window.dispatchEvent(new Event(PAPEL_CHANGED_EVENT))
  } catch {
    /* ignore */
  }
}
