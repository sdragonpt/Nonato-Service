/**
 * Avalia se «atualizar deste aparelho com o servidor» pode apagar ou empobrecer dados locais.
 * Usado imediatamente antes de aceitar a revisão remota e recarregar.
 */

import { SYNC_KEY_LABELS } from './syncDiff'

/** Listas de entidades onde perder linhas é crítico (comparar contagens / ids). */
const ARRAY_RISK_KEYS: string[] = [
  'nonato-clientes',
  'nonato-equipamentos',
  'nonato-relatorios-servico',
  'nonato-gestores',
  'nonato-tecnicos',
  'nonato-usuarios',
  'nonato-fornecedores',
  'nonato-servicos',
  'nonato-pecas-biblioteca',
  'nonato-biblioteca-pecas',
  'nonato-faturas-pecas',
  'nonato-mensagens-comunicacao',
  'nonato-agenda',
  'nonato-checklists',
  'nonato-pre-checks',
  'nonato-desmontados',
  'nonato-solicitacoes-servico-tecnico',
  'nonato-pecas-solicitadas-armazem',
  'nonato-pedidos-separacao',
  'nonato-passwords',
  'nonato-tipos-gestores',
]

function label(key: string): string {
  return SYNC_KEY_LABELS[key] || key.replace(/^nonato-/, '').replace(/-/g, ' ')
}

function countLocalOnlyById(serverArr: unknown[], localArr: unknown[]): number {
  const sid = new Set(
    serverArr
      .map((x) => (x && typeof x === 'object' && x !== null && 'id' in x ? String((x as { id: unknown }).id) : ''))
      .filter(Boolean)
  )
  const allLocalHaveId =
    localArr.length > 0 &&
    localArr.every((x) => x && typeof x === 'object' && x !== null && 'id' in x && String((x as { id: unknown }).id))

  if (sid.size > 0 && allLocalHaveId) {
    let c = 0
    for (const x of localArr) {
      const id = String((x as { id: unknown }).id)
      if (id && !sid.has(id)) c++
    }
    return c
  }
  if (serverArr.length === 0 && localArr.length > 0) return localArr.length
  return Math.max(0, localArr.length - serverArr.length)
}

export type PullRiskSeverity = 'none' | 'caution' | 'severe'

export type PullRiskAssessment = {
  severity: PullRiskSeverity
  lines: string[]
}

/**
 * Compara cópia atual do servidor com o que está neste aparelho (localStorage).
 * `severe` → exige dupla confirmação; `caution` → uma confirmação extra.
 */
export function assessPullServerRisk(
  server: Record<string, unknown>,
  local: Record<string, unknown>
): PullRiskAssessment {
  const lines: string[] = []
  let severity: PullRiskSeverity = 'none'

  const bump = (next: PullRiskSeverity) => {
    if (next === 'severe') severity = 'severe'
    else if (next === 'caution' && severity !== 'severe') severity = 'caution'
  }

  for (const key of ARRAY_RISK_KEYS) {
    const l = local[key]
    const s = server[key]
    if (!Array.isArray(l) || l.length === 0) continue
    const sArr = Array.isArray(s) ? s : []

    if (sArr.length === 0) {
      lines.push(
        `• ${label(key)}: no servidor há 0 registos e neste aparelho há ${l.length}. Atualizar pode APAGAR toda esta lista aqui.`
      )
      bump('severe')
      continue
    }

    const onlyLocal = countLocalOnlyById(sArr, l)
    if (onlyLocal >= 1 && sArr.length < l.length) {
      if (onlyLocal >= 3 || sArr.length <= Math.floor(l.length * 0.5)) {
        lines.push(
          `• ${label(key)}: servidor ${sArr.length} registo(s), aparelho ${l.length}; cerca de ${onlyLocal} existem só aqui e deixariam de aparecer.`
        )
        bump('severe')
      } else {
        lines.push(
          `• ${label(key)}: o servidor tem menos entradas (${sArr.length}) que este aparelho (${l.length}); pode perder dados.`
        )
        bump('caution')
      }
    } else if (l.length >= 8 && sArr.length < Math.floor(l.length * 0.75)) {
      lines.push(
        `• ${label(key)}: o servidor tem cerca de ${Math.round((100 * sArr.length) / l.length)}% do número de registos deste aparelho.`
      )
      bump('caution')
    }
  }

  const lLogo = local['nonato-logo']
  const sLogo = server['nonato-logo']
  if (typeof lLogo === 'string' && lLogo.length > 2000) {
    if (typeof sLogo !== 'string' || sLogo.length < 200) {
      lines.push('• Logo: no servidor não parece existir o mesmo ficheiro grande que está neste aparelho.')
      bump('caution')
    }
  }

  const lMan = local['nonato-manuais-familias-grupos']
  const sMan = server['nonato-manuais-familias-grupos']
  if (lMan && typeof lMan === 'object' && !Array.isArray(lMan)) {
    const lm = (lMan as { modelos?: unknown[] }).modelos
    if (Array.isArray(lm) && lm.length > 0) {
      if (sMan === undefined || sMan === null) {
        lines.push(
          '• Manuais: não há dados de manuais no servidor e este aparelho tem — atualizar pode apagar modelos/anexos locais.'
        )
        bump('severe')
      } else if (typeof sMan === 'object' && !Array.isArray(sMan)) {
        const sm = (sMan as { modelos?: unknown[] }).modelos
        const smLen = Array.isArray(sm) ? sm.length : 0
        if (smLen === 0) {
          lines.push(
            '• Manuais: o servidor não tem modelos guardados e este aparelho tem — risco de perder anexos/PDFs locais ao substituir tudo.'
          )
          bump('severe')
        } else if (smLen < Math.floor(lm.length * 0.5)) {
          lines.push(`• Manuais: servidor tem menos modelos (${smLen}) que este aparelho (${lm.length}).`)
          bump('caution')
        }
      }
    }
  }

  return { severity, lines: lines.slice(0, 12) }
}
