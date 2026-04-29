// Funções para salvar e carregar dados do servidor (com suporte offline)

import { mergeManuaisFamiliasGrupos } from './manuaisMerge'
import { applyRevisionFromSaveResponse, fetchSyncStatus } from './syncRevision'
import {
  saveManuaisFamiliasGruposToIdb,
  loadManuaisFamiliasGruposFromIdb,
  saveKv,
  getKv,
} from './manuaisIndexedDb'

const API_BASE = '/api/data'
const SYNC_QUEUE_KEY = 'nonato-sync-queue'

/** Durante a carga inicial da página: não enviar migrações «só servidor» (saveToLocalStorage=false) nem pushes implícitos em loadData — evita revisões e payloads diferentes por aparelho. */
let blockImplicitServerPushDuringBootstrap = false

export function setBlockImplicitServerPushDuringBootstrap(block: boolean): void {
  blockImplicitServerPushDuringBootstrap = block
}

function shouldDeferImplicitServerPush(): boolean {
  // Durante bootstrap queremos 100% "read-only" no servidor:
  // evitar que ações automáticas (backups/migrações/marcas) mudem a revisão do servidor
  // enquanto o ecrã do utilizador ainda está a carregar.
  return blockImplicitServerPushDuringBootstrap
}
/** Backups automáticos em localStorage — podem ser reduzidos se a quota estourar ao gravar dados críticos */
const AUTO_BACKUP_STORAGE_KEY = 'nonato-auto-backups'

function isQuotaExceededError(e: unknown): boolean {
  if (typeof DOMException !== 'undefined' && e instanceof DOMException && e.name === 'QuotaExceededError') {
    return true
  }
  if (e !== null && typeof e === 'object' && 'name' in e && (e as { name?: string }).name === 'QuotaExceededError') {
    return true
  }
  const msg = e instanceof Error ? e.message : String(e)
  return /quota|exceeded|storage is full|not enough space/i.test(msg)
}

/** Remove o backup automático mais antigo (ou todos) para libertar espaço no localStorage. */
function trimAutoBackupsForQuota(removeAll: boolean): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(AUTO_BACKUP_STORAGE_KEY)
    if (!raw) return
    const backups = JSON.parse(raw) as unknown
    if (!Array.isArray(backups) || backups.length === 0) return
    if (removeAll) {
      localStorage.removeItem(AUTO_BACKUP_STORAGE_KEY)
      return
    }
    backups.pop()
    if (backups.length === 0) {
      localStorage.removeItem(AUTO_BACKUP_STORAGE_KEY)
    } else {
      try {
        localStorage.setItem(AUTO_BACKUP_STORAGE_KEY, JSON.stringify(backups))
      } catch {
        localStorage.removeItem(AUTO_BACKUP_STORAGE_KEY)
      }
    }
  } catch {
    try {
      localStorage.removeItem(AUTO_BACKUP_STORAGE_KEY)
    } catch {
      /* ignorar */
    }
  }
}

/**
 * Grava string no localStorage; se falhar por quota, tenta libertar espaço (backups automáticos) e repetir.
 */
function setItemWithQuotaRecovery(key: string, serialized: string): void {
  try {
    localStorage.setItem(key, serialized)
    return
  } catch (error) {
    if (!isQuotaExceededError(error)) throw error
  }
  for (let i = 0; i < 24; i++) {
    trimAutoBackupsForQuota(false)
    try {
      localStorage.setItem(key, serialized)
      return
    } catch (error) {
      if (!isQuotaExceededError(error)) throw error
    }
  }
  trimAutoBackupsForQuota(true)
  try {
    localStorage.setItem(key, serialized)
    return
  } catch (error) {
    if (!isQuotaExceededError(error)) throw error
  }
  console.warn(
    '[saveData] localStorage sem espaço após libertar backups automáticos; a tentar fila de sync e código.'
  )
  try {
    localStorage.removeItem('nonato-code-backups')
  } catch {
    /* ignorar */
  }
  try {
    const q = getSyncQueue()
    if (q.length > 0) {
      setSyncQueue(q.slice(Math.floor(q.length / 2)))
    }
  } catch {
    /* ignorar */
  }
  try {
    localStorage.removeItem(SYNC_QUEUE_KEY)
  } catch {
    /* ignorar */
  }
  localStorage.setItem(key, serialized)
}

/** Pedido em curso por chave — várias chamadas seguidas partilham a mesma Promise mas o valor enviado é sempre o último (coalesce). */
const pendingSaveByKey = new Map<string, Promise<boolean>>()
/** Enquanto um POST está em curso para `key`, guarda o último valor pedido para enviar a seguir (last-write-wins). */
const coalesceNextValueByKey = new Map<string, any>()

// Flag para detectar se o servidor está offline
let serverOffline = false
let lastServerCheck = 0
const SERVER_CHECK_INTERVAL = 30000 // 30 segundos

// Verificar se está online (rápido)
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

// Fila de sincronização (para quando estiver offline)
function getSyncQueue(): Array<{ key: string; value: any; timestamp: number }> {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setSyncQueue(queue: Array<{ key: string; value: any; timestamp: number }>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
  } catch {}
}

// Helper para criar AbortSignal com timeout (compatibilidade)
function createTimeoutSignal(timeoutMs: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    return AbortSignal.timeout(timeoutMs)
  }
  // Fallback para navegadores que não suportam AbortSignal.timeout
  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

// Verificar se o servidor está online
async function checkServerOnline(): Promise<boolean> {
  if (!isOnline()) {
    serverOffline = true
    return false
  }
  const now = Date.now()
  if (now - lastServerCheck < SERVER_CHECK_INTERVAL && serverOffline) {
    return false
  }
  lastServerCheck = now
  try {
    const response = await fetch(`${API_BASE}/load?key=__health_check__`, {
      method: 'GET',
      signal: createTimeoutSignal(3000)
    })
    serverOffline = false
    return true
  } catch {
    serverOffline = true
    return false
  }
}

// Processar fila de sincronização (quando voltar online)
export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  if (!isOnline()) return { synced: 0, failed: 0 }
  const queue = getSyncQueue()
  if (queue.length === 0) return { synced: 0, failed: 0 }
  let synced = 0
  let failed = 0
  const remaining: typeof queue = []
  for (const item of queue) {
    const ok = await _doSaveToServer(item.key, item.value)
    if (ok) synced++
    else {
      failed++
      remaining.push(item)
    }
  }
  setSyncQueue(remaining)
  serverOffline = false
  return { synced, failed }
}

// Quantidade de itens pendentes de sincronização
export function getPendingSyncCount(): number {
  return getSyncQueue().length
}

// Salvar diretamente no servidor (sem fila) - uso interno
const MANUAIS_KEY = 'nonato-manuais-familias-grupos'

async function _doSaveToServer(key: string, value: any): Promise<boolean> {
  try {
    const payloadStr = typeof value === 'string' ? value : JSON.stringify(value)
    const isLargeString =
      typeof value === 'string' &&
      value.length > 100000 &&
      (value.startsWith('data:image/') || value.startsWith('data:video/') || value.startsWith('data:application/pdf'))
    /** Manuais com PDFs em base64: JSON grande — usar save-text para não estourar limites do /save */
    const isLargeManuaisJson = key === MANUAIS_KEY && payloadStr.length > 80000
    const useTextEndpoint = isLargeString || isLargeManuaisJson
    const endpoint = useTextEndpoint ? `${API_BASE}/save-text` : `${API_BASE}/save`
    const body =
      isLargeManuaisJson && typeof value === 'object'
        ? JSON.stringify({ key, value: payloadStr })
        : JSON.stringify({ key, value })
    const payloadNeedsSlowUpload = isLargeManuaisJson || isLargeString
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: createTimeoutSignal(payloadNeedsSlowUpload ? 120000 : 5000)
    })
    if (response.ok) {
      serverOffline = false
      try {
        const json = await response.json()
        applyRevisionFromSaveResponse(json)
      } catch {
        /* resposta sem JSON */
      }
      return true
    }
    return false
  } catch {
    return false
  }
}

// Salvar um item específico
export async function saveToServer(key: string, value: any): Promise<boolean> {
  const requestKey = `save:${key}`
  if (pendingSaveByKey.has(requestKey)) {
    coalesceNextValueByKey.set(key, value)
    return pendingSaveByKey.get(requestKey)!
  }

  if (serverOffline) {
    const ok = await checkServerOnline()
    if (!ok) return false
  }

  const requestPromise = (async (): Promise<boolean> => {
    let current: any = value
    let lastOk = false
    try {
      while (true) {
        if (!isOnline()) {
          serverOffline = true
          const queue = getSyncQueue()
          queue.push({ key, value: current, timestamp: Date.now() })
          setSyncQueue(queue)
          return false
        }
        try {
          lastOk = await _doSaveToServer(key, current)
          if (!lastOk) {
            serverOffline = true
            const queue = getSyncQueue()
            queue.push({ key, value: current, timestamp: Date.now() })
            setSyncQueue(queue)
          }
        } catch (error: any) {
          lastOk = false
          const isNetworkError = error instanceof TypeError || error?.name === 'AbortError' ||
            (error?.message && (error.message.includes('NetworkError') || error.message.includes('Failed to fetch') || error.message.includes('CONNECTION_REFUSED')))
          if (isNetworkError) {
            serverOffline = true
            const queue = getSyncQueue()
            queue.push({ key, value: current, timestamp: Date.now() })
            setSyncQueue(queue)
          }
        }
        const next = coalesceNextValueByKey.get(key)
        coalesceNextValueByKey.delete(key)
        if (next === undefined) break
        current = next
      }
      return lastOk
    } finally {
      pendingSaveByKey.delete(requestKey)
    }
  })()
  pendingSaveByKey.set(requestKey, requestPromise)
  return requestPromise
}

// Carregar um item específico
export async function loadFromServer(key: string): Promise<any | null> {
  if (!isOnline()) {
    serverOffline = true
    return null
  }
  if (serverOffline) {
    const ok = await checkServerOnline()
    if (!ok) return null
  }

  try {
    // Tentar carregar como texto primeiro (para vídeos/imagens grandes)
    const response = await fetch(`${API_BASE}/load-text?key=${encodeURIComponent(key)}`, {
      signal: createTimeoutSignal(5000) // Timeout de 5 segundos (compatível com todos os navegadores)
    })
    
    if (!response.ok) {
      serverOffline = true
      return null
    }

    const result = await response.json()
    serverOffline = false
    return result.data
  } catch (error: any) {
    // Detectar erros de conexão
    if (
      error instanceof TypeError && 
      (error.message.includes('NetworkError') || 
       error.message.includes('Failed to fetch') ||
       error.message.includes('CONNECTION_REFUSED') ||
       error.name === 'AbortError')
    ) {
      serverOffline = true
      return null
    }
    return null
  }
}

/** Resultado de carregar o bundle completo: `ok` distingue rede/HTTP bem-sucedidos de falha (timeout, offline). */
export type LoadAllFromServerResult = { data: Record<string, any>; ok: boolean }

const LOAD_ALL_TIMEOUT_MS = 25_000

async function loadAllFromServerOnce(): Promise<LoadAllFromServerResult> {
  if (!isOnline()) {
    serverOffline = true
    return { data: {}, ok: false }
  }

  try {
    // Não abortar aqui só porque `serverOffline` — evita ficar preso a `{}` durante ~30s após um timeout.
    const response = await fetch(`${API_BASE}/load`, {
      signal: createTimeoutSignal(LOAD_ALL_TIMEOUT_MS),
    })

    if (!response.ok) {
      serverOffline = true
      return { data: {}, ok: false }
    }

    const result = await response.json()
    serverOffline = false
    return { data: result?.data && typeof result.data === 'object' ? result.data : {}, ok: true }
  } catch (error: any) {
    if (
      error instanceof TypeError &&
      (error.message.includes('NetworkError') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('CONNECTION_REFUSED') ||
        error.name === 'AbortError')
    ) {
      serverOffline = true
    }
    return { data: {}, ok: false }
  }
}

/** Carrega todos os ficheiros do servidor com retry (payload grande pode exceder 5s). */
export async function loadAllFromServer(): Promise<LoadAllFromServerResult> {
  const delays = [0, 700, 1800]
  let last: LoadAllFromServerResult = { data: {}, ok: false }
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]! > 0) {
      await new Promise((r) => setTimeout(r, delays[i]))
    }
    last = await loadAllFromServerOnce()
    if (last.ok) return last
  }
  return last
}

const SKIP_KEYS_PUSH_SYNC = new Set([
  'nonato-sync-last-accepted-revision',
  'nonato-sync-queue',
  'nonato-auto-backups',
  'nonato-code-backups'
])

/**
 * Junta tudo o que está neste browser (localStorage nonato-* + manuais no IndexedDB) para enviar ao servidor numa única operação.
 */
export async function collectAllLocalNonatoDataForSync(): Promise<Record<string, any>> {
  const out: Record<string, any> = {}
  if (typeof window === 'undefined') return out

  const keys = new Set<string>()
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('nonato-') && !SKIP_KEYS_PUSH_SYNC.has(k)) keys.add(k)
  }

  let manuaisMerged: any = null
  if (keys.has(MANUAIS_KEY)) {
    keys.delete(MANUAIS_KEY)
    try {
      const idb = await loadManuaisFamiliasGruposFromIdb()
      const raw = localStorage.getItem(MANUAIS_KEY)
      if (raw) {
        const local = JSON.parse(raw) as { familias?: string[]; grupos?: unknown[]; modelos?: unknown[] }
        manuaisMerged = idb && typeof idb === 'object' ? mergeManuaisFamiliasGrupos(idb as any, local) : local
      } else if (idb && typeof idb === 'object') {
        manuaisMerged = idb
      }
    } catch {
      const raw = localStorage.getItem(MANUAIS_KEY)
      if (raw) {
        try {
          manuaisMerged = JSON.parse(raw)
        } catch {
          /* ignorar */
        }
      }
    }
    if (manuaisMerged !== null && typeof manuaisMerged === 'object') {
      out[MANUAIS_KEY] = manuaisMerged
    }
  }

  for (const key of keys) {
    const raw = localStorage.getItem(key)
    if (raw === null || raw === '') continue
    try {
      out[key] = JSON.parse(raw)
    } catch {
      out[key] = raw
    }
  }
  return out
}

/** Envia toda a cópia local para o servidor (substitui ficheiros no servidor pelos deste aparelho). Uma revisão. */
export async function pushAllLocalStorageToServer(): Promise<{ ok: boolean; error?: string }> {
  try {
    const data = await collectAllLocalNonatoDataForSync()
    if (Object.keys(data).length === 0) {
      return { ok: false, error: 'empty' }
    }
    const ok = await saveAllToServer(data, { timeoutMs: 180000 })
    if (!ok) return { ok: false, error: 'network_or_server' }
    const st = await fetchSyncStatus()
    if (st) applyRevisionFromSaveResponse({ revision: st.revision })
    return { ok: true }
  } catch (e) {
    console.error('[pushAllLocalStorageToServer]', e)
    return { ok: false, error: 'exception' }
  }
}

// Salvar todos os dados de uma vez
export async function saveAllToServer(
  data: Record<string, any>,
  opts?: { timeoutMs?: number }
): Promise<boolean> {
  const timeoutMs = opts?.timeoutMs ?? 10000
  if (!isOnline()) {
    serverOffline = true
    for (const [key, value] of Object.entries(data)) {
      const queue = getSyncQueue()
      queue.push({ key, value, timestamp: Date.now() })
      setSyncQueue(queue)
    }
    return false
  }
  if (serverOffline) {
    const ok = await checkServerOnline()
    if (!ok) return false
  }

  try {
    const response = await fetch(`${API_BASE}/save-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: createTimeoutSignal(timeoutMs)
    })

    if (!response.ok) {
      serverOffline = true
      return false
    }

    serverOffline = false
    try {
      const json = await response.json()
      applyRevisionFromSaveResponse(json)
    } catch {
      /* ignorar */
    }
    return true
  } catch (error: any) {
    // Detectar erros de conexão
    if (
      error instanceof TypeError && 
      (error.message.includes('NetworkError') || 
       error.message.includes('Failed to fetch') ||
       error.message.includes('CONNECTION_REFUSED') ||
       error.name === 'AbortError')
    ) {
      serverOffline = true
      return false
    }
    return false
  }
}

// Função híbrida: salva no localStorage E no servidor
export async function saveData(key: string, value: any, saveToLocalStorage = true): Promise<void> {
  /** Manuais: IndexedDB primeiro (PDFs grandes); localStorage é opcional; não falhar se quota estourar */
  if (key === MANUAIS_KEY && typeof window !== 'undefined') {
    /** IndexedDB é a fonte de verdade local; o servidor pode ser lento ou falhar (413, rede) — não bloquear a UI */
    await saveManuaisFamiliasGruposToIdb(value)
    if (saveToLocalStorage) {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (e) {
        console.warn(`localStorage cheio para ${key}; dados em IndexedDB`, e)
        try {
          localStorage.setItem(`${key}--idb`, '1')
        } catch {
          /* ignorar */
        }
      }
    }
    if (!shouldDeferImplicitServerPush()) {
      void saveToServer(key, value).catch(() => {})
    }
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('nonato-data-local-changed', { detail: { key } }))
      } catch {
        /* ignorar */
      }
    }
    return
  }

  // Salvar no localStorage (para acesso rápido) — quota: libertar backups automáticos e voltar a tentar; último recurso: IndexedDB
  if (saveToLocalStorage && typeof window !== 'undefined') {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value)
    try {
      setItemWithQuotaRecovery(key, serialized)
    } catch (error) {
      console.error(`Erro ao salvar no localStorage (${key}):`, error)
      if (key === MANUAIS_KEY) {
        throw error
      }
      try {
        await saveKv(key, value)
        console.warn(`[saveData] ${key} guardado em IndexedDB (localStorage sem espaço).`)
      } catch (idbErr) {
        console.error(`Erro ao salvar no IndexedDB (${key}):`, idbErr)
        throw idbErr
      }
    }
  }

  // Servidor em segundo plano — o localStorage/IndexedDB já foi gravado; não bloquear a UI se a rede falhar
  if (!shouldDeferImplicitServerPush()) {
    void saveToServer(key, value).catch(() => {})
  }

  if (typeof window !== 'undefined' && saveToLocalStorage) {
    try {
      window.dispatchEvent(new CustomEvent('nonato-data-local-changed', { detail: { key } }))
    } catch {
      /* ignorar */
    }
  }
}

// Função híbrida: carrega do servidor primeiro, depois do localStorage como fallback
export async function loadData(key: string, parseJson = true): Promise<any | null> {
  // Tentar carregar do servidor primeiro (apenas se não estiver offline)
  if (!serverOffline) {
    let serverData = await loadFromServer(key)
    if (serverData !== null) {
      // Manuais guardados como JSON em .txt (payload grande)
      if (key === MANUAIS_KEY && typeof serverData === 'string' && parseJson) {
        try {
          serverData = JSON.parse(serverData)
        } catch {
          serverData = null
        }
      }
      // Manuais: nunca substituir o local só pelo servidor — fundir para não perder PDFs
      if (key === MANUAIS_KEY && parseJson && typeof serverData === 'object' && serverData !== null && !Array.isArray(serverData)) {
        const localRaw = typeof window !== 'undefined' ? localStorage.getItem(key) : null
        let idbLocal: any = null
        try {
          idbLocal = await loadManuaisFamiliasGruposFromIdb()
        } catch {
          /* ignorar */
        }
        if (localRaw !== null && localRaw !== '') {
          try {
            const local = JSON.parse(localRaw)
            const merged = mergeManuaisFamiliasGrupos(
              mergeManuaisFamiliasGrupos(serverData, idbLocal || {}),
              local
            )
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem(key, JSON.stringify(merged))
              } catch (error) {
                console.error(`Erro ao atualizar localStorage (${key}):`, error)
              }
            }
            saveManuaisFamiliasGruposToIdb(merged).catch(() => {})
            if (!blockImplicitServerPushDuringBootstrap) {
              saveToServer(key, merged).catch(() => {})
            }
            return merged
          } catch {
            /* fallback abaixo */
          }
        } else if (idbLocal && typeof idbLocal === 'object') {
          const merged = mergeManuaisFamiliasGrupos(serverData, idbLocal)
          saveManuaisFamiliasGruposToIdb(merged).catch(() => {})
          if (!blockImplicitServerPushDuringBootstrap) {
            saveToServer(key, merged).catch(() => {})
          }
          return merged
        }
      }
      if (serverData !== null) {
        // Se encontrou no servidor, também atualizar o localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(key, typeof serverData === 'string' ? serverData : JSON.stringify(serverData))
          } catch (error) {
            console.error(`Erro ao atualizar localStorage (${key}):`, error)
          }
        }
        return serverData
      }
    }
  }

  // Se não encontrou no servidor ou servidor está offline, tentar localStorage
  if (typeof window !== 'undefined') {
    try {
      const localData = localStorage.getItem(key)
      if (localData !== null && localData !== '') {
        if (parseJson) {
          // Tentar fazer parse do JSON
          try {
            const parsed = JSON.parse(localData)
            if (key === MANUAIS_KEY && typeof parsed === 'object' && parsed !== null) {
              try {
                const idb = await loadManuaisFamiliasGruposFromIdb()
                const merged = mergeManuaisFamiliasGrupos(parsed, idb || {})
                saveManuaisFamiliasGruposToIdb(merged).catch(() => {})
                if (!serverOffline && !blockImplicitServerPushDuringBootstrap) {
                  saveToServer(key, merged).catch(() => {})
                }
                return merged
              } catch {
                /* fallback ao parsed só com localStorage */
              }
            }
            // Se encontrou no localStorage e servidor está online, também salvar no servidor (migração)
            // Mas não bloquear se o servidor estiver offline
            if (!serverOffline && !blockImplicitServerPushDuringBootstrap) {
              saveToServer(key, parsed).catch(() => {
                // Ignorar erros de salvamento no servidor
              })
            }
            return parsed
          } catch (parseError) {
            console.error(`Erro ao fazer parse do JSON (${key}):`, parseError)
            return null
          }
        } else {
          // Se encontrou no localStorage e servidor está online, também salvar no servidor (migração)
          if (!serverOffline && !blockImplicitServerPushDuringBootstrap) {
            saveToServer(key, localData).catch(() => {
              // Ignorar erros de salvamento no servidor
            })
          }
          return localData
        }
      }
    } catch (error) {
      console.error(`Erro ao carregar do localStorage (${key}):`, error)
    }
  }

  if (key === MANUAIS_KEY && typeof window !== 'undefined') {
    try {
      const idb = await loadManuaisFamiliasGruposFromIdb()
      if (idb !== null && typeof idb === 'object') {
        return idb
      }
    } catch {
      /* ignorar */
    }
  }

  // Dados gravados só em IndexedDB quando o localStorage encheu (saveData → saveKv)
  try {
    const fromKv = await getKv(key)
    if (fromKv !== null && fromKv !== undefined) {
      return fromKv
    }
  } catch {
    /* ignorar */
  }

  return null
}

