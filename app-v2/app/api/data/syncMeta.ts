/**
 * Revisão global dos dados no servidor (para multi-dispositivo).
 * Cada gravação incrementa a revisão; os clientes comparam com a última aceite localmente.
 */
import fs from 'fs'
import path from 'path'

const META_FILE = '_sync-meta.json'

export type SyncMeta = { revision: number; updatedAt: string }

export function readSyncMeta(dataDir: string): SyncMeta {
  const p = path.join(dataDir, META_FILE)
  if (!fs.existsSync(p)) {
    try {
      if (fs.existsSync(dataDir)) {
        const files = fs.readdirSync(dataDir)
        const hasData = files.some(
          f =>
            (f.endsWith('.json') && !f.startsWith('_')) ||
            (f.endsWith('.txt') && !f.startsWith('_'))
        )
        if (hasData) {
          return { revision: 1, updatedAt: new Date(0).toISOString() }
        }
      }
    } catch {
      /* ignorar */
    }
    return { revision: 0, updatedAt: '' }
  }
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf-8')) as Partial<SyncMeta>
    const revision = typeof j.revision === 'number' && j.revision >= 0 ? j.revision : 0
    const updatedAt = typeof j.updatedAt === 'string' ? j.updatedAt : ''
    return { revision, updatedAt }
  } catch {
    return { revision: 0, updatedAt: '' }
  }
}

export function bumpSyncMeta(dataDir: string): SyncMeta {
  const cur = readSyncMeta(dataDir)
  const next: SyncMeta = {
    revision: cur.revision + 1,
    updatedAt: new Date().toISOString()
  }
  const p = path.join(dataDir, META_FILE)
  fs.writeFileSync(p, JSON.stringify(next, null, 2), 'utf-8')
  return next
}
