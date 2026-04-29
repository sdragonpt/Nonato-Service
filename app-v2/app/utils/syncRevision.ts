/**
 * Sincronização multi-dispositivo: revisão do servidor vs. última aceite neste aparelho.
 * Evita substituir dados locais pelos do servidor sem confirmação quando ambos divergem.
 */

const LS_LAST_ACCEPTED = 'nonato-sync-last-accepted-revision'

const SKIP_LOCAL_SCAN_KEYS = new Set([
  LS_LAST_ACCEPTED,
  'nonato-language',
  'nonato-last-code-backup-date',
  'nonato-protocolo-servico-draft',
  'nonato-sync-queue',
  'nonato-auto-backups',
  'nonato-code-backups'
])

export function getLastAcceptedRevision(): number {
  if (typeof window === 'undefined') return 0
  try {
    const v = localStorage.getItem(LS_LAST_ACCEPTED)
    const n = v ? parseInt(v, 10) : 0
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

export function setLastAcceptedRevision(rev: number): void {
  if (typeof window === 'undefined') return
  try {
    if (Number.isFinite(rev) && rev >= 0) {
      localStorage.setItem(LS_LAST_ACCEPTED, String(Math.floor(rev)))
    }
  } catch {
    /* ignorar */
  }
}

export async function fetchSyncStatus(): Promise<{ revision: number; updatedAt: string } | null> {
  if (typeof window === 'undefined') return null
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    const r = await fetch('/api/data/sync-status', { signal: ctrl.signal, cache: 'no-store' })
    clearTimeout(t)
    if (!r.ok) return null
    const j = (await r.json()) as { revision?: number; updatedAt?: string }
    if (typeof j.revision !== 'number' || j.revision < 0) return null
    return { revision: j.revision, updatedAt: typeof j.updatedAt === 'string' ? j.updatedAt : '' }
  } catch {
    return null
  }
}

/** True se este browser tem dados NONATO relevantes (evita bloquear primeiro arranque vazio). */
export function hasMeaningfulLocalData(): boolean {
  if (typeof window === 'undefined') return false
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith('nonato-') || SKIP_LOCAL_SCAN_KEYS.has(k)) continue
      const v = localStorage.getItem(k)
      if (!v || v.length < 3) continue
      try {
        const p = JSON.parse(v) as unknown
        if (Array.isArray(p) && p.length > 0) return true
        if (typeof p === 'object' && p !== null && Object.keys(p).length > 0) return true
        if (typeof p === 'string' && p.length > 20) return true
      } catch {
        if (v.length > 20) return true
      }
    }
  } catch {
    /* ignorar */
  }
  return false
}

export function applyRevisionFromSaveResponse(body: unknown): void {
  if (!body || typeof body !== 'object') return
  const r = (body as { revision?: number }).revision
  if (typeof r === 'number' && r >= 0) setLastAcceptedRevision(r)
}
