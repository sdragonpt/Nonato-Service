/**
 * Compara cópia local (localStorage) vs dados carregados do servidor para explicar
 * ao utilizador o que mudou noutro aparelho antes de escolher carregar ou enviar.
 */

const SKIP_SNAPSHOT_KEYS = new Set([
  'nonato-sync-last-accepted-revision',
  'nonato-sync-queue',
  'nonato-auto-backups',
  'nonato-code-backups',
  'nonato-language',
  'nonato-last-code-backup-date',
  'nonato-protocolo-servico-draft',
  'nonato-manuais-familias-grupos--idb',
])

/** Etiquetas para chaves de dados (resumo de sync e aviso de risco). */
export const SYNC_KEY_LABELS: Record<string, string> = {
  'nonato-clientes': 'Clientes',
  'nonato-equipamentos': 'Equipamentos',
  'nonato-relatorios-servico': 'Relatórios de serviço',
  'nonato-gestores': 'Gestores',
  'nonato-tecnicos': 'Técnicos',
  'nonato-usuarios': 'Utilizadores',
  'nonato-sidebar-buttons': 'Menu lateral',
  'nonato-faturas-pecas': 'Faturas / peças',
  'nonato-pecas-biblioteca': 'Biblioteca de peças',
  /** Chave antiga (alguns ambientes / cópias locais) — mesmo rótulo para o resumo de sync. */
  'nonato-biblioteca-pecas': 'Biblioteca de peças',
  'nonato-mensagens-comunicacao': 'Mensagens internas',
  'nonato-agenda': 'Agenda',
  'nonato-manuais-familias-grupos': 'Manuais e informações técnicas',
  'nonato-fornecedores': 'Fornecedores',
  'nonato-servicos': 'Serviços',
  'nonato-logo': 'Logo',
  'nonato-logo-type': 'Tipo do logo',
  'nonato-ficha-cadastral': 'Ficha cadastral',
  'nonato-passwords': 'Gestor de senhas',
  'nonato-tipos-gestores': 'Tipos de gestores',
  'nonato-familias-grupos-equipamentos': 'Famílias e grupos (equipamentos)',
  'nonato-desmontados': 'Equipamentos desmontados',
  'nonato-solicitacoes-servico-tecnico': 'Solicitações de serviço',
  'nonato-solicitacao-sst-modelo-base': 'SST — modelo base (envio)',
  'nonato-pecas-solicitadas-armazem': 'Peças solicitadas (armazém)',
  'nonato-inventario-armazem': 'Inventário armazém',
  'nonato-checklists': 'Checklists',
  'nonato-pre-checks': 'Pré-checks',
  'nonato-pedidos-separacao': 'Pedidos de separação',
  'nonato-ost-propostas-tecnico-v1': 'Orçamentos serviço técnico (propostas)',
}

function friendlyKey(key: string): string {
  return SYNC_KEY_LABELS[key] || key.replace(/^nonato-/, '').replace(/-/g, ' ')
}

function isEmptyStored(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value as object).length === 0
  return false
}

/** Snapshot síncrono do localStorage (antes de fundir com o servidor no arranque). */
export function collectLocalNonatoSnapshot(): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (typeof window === 'undefined') return out
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k || !k.startsWith('nonato-') || SKIP_SNAPSHOT_KEYS.has(k)) continue
    const raw = localStorage.getItem(k)
    if (raw === null || raw === '' || raw.length < 2) continue
    try {
      out[k] = JSON.parse(raw) as unknown
    } catch {
      out[k] = raw
    }
  }
  return out
}

function arrayIdDiff(serverArr: unknown[], localArr: unknown[]): { added: number; removed: number; editedGuess: boolean } {
  const getIds = (arr: unknown[]) =>
    arr.map((x) => (x && typeof x === 'object' && 'id' in x ? String((x as { id: unknown }).id) : '')).filter(Boolean)
  const sid = getIds(serverArr)
  const lid = getIds(localArr)
  if (sid.length === serverArr.length && lid.length === localArr.length && sid.length > 0) {
    const setL = new Set(lid)
    const setS = new Set(sid)
    const added = sid.filter((id) => !setL.has(id)).length
    const removed = lid.filter((id) => !setS.has(id)).length
    return { added, removed, editedGuess: added === 0 && removed === 0 && serverArr.length > 0 }
  }
  const d = serverArr.length - localArr.length
  return {
    added: d > 0 ? d : 0,
    removed: d < 0 ? -d : 0,
    editedGuess: d === 0 && serverArr.length > 0,
  }
}

/**
 * Gera linhas legíveis para o modal de sincronização.
 */
export function summarizeDataDiff(server: Record<string, unknown>, local: Record<string, unknown>): string[] {
  const lines: string[] = []
  const keys = new Set([...Object.keys(server), ...Object.keys(local)])

  for (const key of keys) {
    if (!key.startsWith('nonato-')) continue
    if (SKIP_SNAPSHOT_KEYS.has(key)) continue
    if (key.endsWith('.json')) continue

    const s = server[key]
    const l = local[key]
    const hasS = !isEmptyStored(s)
    const hasL = !isEmptyStored(l)
    const label = friendlyKey(key)

    if (!hasS && hasL) {
      lines.push(`• ${label}: existe só neste aparelho (ainda não há equivalente no servidor).`)
      continue
    }
    if (hasS && !hasL) {
      lines.push(`• ${label}: há dados no servidor que este aparelho não tinha guardados (provavelmente noutro equipamento).`)
      continue
    }
    if (!hasS && !hasL) continue

    if (Array.isArray(s) && Array.isArray(l)) {
      const { added, removed, editedGuess } = arrayIdDiff(s, l)
      if (added > 0) lines.push(`• ${label}: +${added} registo(s) a mais no servidor (em relação ao que estava aqui).`)
      if (removed > 0) lines.push(`• ${label}: −${removed} registo(s) a menos no servidor (existiam aqui).`)
      if (added === 0 && removed === 0 && editedGuess) {
        try {
          if (JSON.stringify(s) !== JSON.stringify(l)) {
            lines.push(`• ${label}: alterações no conteúdo (mesmo número de registos).`)
          }
        } catch {
          lines.push(`• ${label}: conteúdo diferente entre servidor e este aparelho.`)
        }
      }
    } else if (typeof s === 'object' && typeof l === 'object' && s !== null && l !== null && !Array.isArray(s) && !Array.isArray(l)) {
      try {
        if (JSON.stringify(s) !== JSON.stringify(l)) {
          lines.push(`• ${label}: dados diferentes entre o servidor e este aparelho.`)
        }
      } catch {
        lines.push(`• ${label}: dados diferentes entre o servidor e este aparelho.`)
      }
    } else if (typeof s === 'string' && typeof l === 'string') {
      if (s !== l) {
        if (s.length > 200 || l.length > 200) {
          lines.push(`• ${label}: ficheiro ou texto grande foi alterado no servidor.`)
        } else {
          lines.push(`• ${label}: valor alterado no servidor.`)
        }
      }
    } else if (String(s) !== String(l)) {
      lines.push(`• ${label}: alteração detetada entre servidor e este aparelho.`)
    }
  }

  if (lines.length === 0) {
    lines.push('• O servidor tem uma revisão mais recente; a diferença pode estar em ficheiros grandes (ex.: logo, vídeo) ou dados já fundidos.')
  }

  return lines.slice(0, 14)
}
