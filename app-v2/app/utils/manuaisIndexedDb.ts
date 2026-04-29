/**
 * Armazenamento dos manuais em IndexedDB — o localStorage (~5MB) enche com PDFs em base64.
 */

const DB_NAME = 'nonato-gestao-tecnica-v1'
const STORE = 'kv'
const KEY = 'nonato-manuais-familias-grupos'
/** Versão 2: garante onupgradeneeded em instalações antigas com base corrompida */
const DB_VERSION = 2

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB indisponível'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('IDB open failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
  })
}

export async function loadManuaisFamiliasGruposFromIdb(): Promise<any | null> {
  try {
    const db = await openDb()
    return await new Promise<any | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const r = tx.objectStore(STORE).get(KEY)
      r.onsuccess = () => resolve(r.result ?? null)
      r.onerror = () => reject(r.error)
    })
  } catch {
    return null
  }
}

/** Chaves genéricas no mesmo object store (ex.: nonato-clientes quando localStorage enche). */
export async function getKv(key: string): Promise<any | null> {
  try {
    const db = await openDb()
    return await new Promise<any | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const r = tx.objectStore(STORE).get(key)
      r.onsuccess = () => resolve(r.result ?? null)
      r.onerror = () => reject(r.error)
    })
  } catch {
    return null
  }
}

export async function saveKv(key: string, value: unknown): Promise<void> {
  let safe: any
  try {
    safe = JSON.parse(JSON.stringify(value))
  } catch {
    throw new Error('Valor não serializável para IndexedDB')
  }
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).put(safe, key)
    req.onerror = () => reject(req.error ?? new Error('IDB put falhou'))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('transação IDB falhou'))
    tx.onabort = () => reject(tx.error ?? new Error('transação IDB abortada'))
  })
}

/** Remove do IndexedDB todas as entradas cuja chave começa por `nonato-` (dados espillados do localStorage). */
export async function deleteAllNonatoKvFromIdb(): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      const req = store.openCursor()
      req.onerror = () => reject(req.error ?? new Error('cursor'))
      req.onsuccess = () => {
        const c = req.result as IDBCursorWithValue | null
        if (!c) {
          return
        }
        const key = c.key
        if (typeof key === 'string' && key.startsWith('nonato-')) {
          c.delete()
        }
        c.continue()
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('tx'))
    })
  } catch {
    /* ignorar */
  }
}

export async function saveManuaisFamiliasGruposToIdb(data: any): Promise<void> {
  /** Garante valor clonável pelo motor do IndexedDB (evita falhas silenciosas) */
  let safe: any
  try {
    safe = JSON.parse(JSON.stringify(data))
  } catch (e) {
    throw new Error('Dados dos manuais não são serializáveis para guardar.')
  }
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req = store.put(safe, KEY)
    req.onerror = () => reject(req.error ?? new Error('IDB put falhou'))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('transação IDB falhou'))
    tx.onabort = () => reject(tx.error ?? new Error('transação IDB abortada'))
  })
}
