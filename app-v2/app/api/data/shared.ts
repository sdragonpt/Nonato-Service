/**
 * Configuração partilhada pelas rotas da API de dados.
 * Uma única fonte para DATA_DIR evita duplicação e facilita manutenção.
 */
import path from 'path'
import fs from 'fs'

// Railway: usa volume montado; local: pasta data
export const DATA_DIR =
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  process.env.DATA_DIR ||
  path.join(process.cwd(), 'data')

export function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
  } catch (e) {
    console.error('ensureDataDir:', e)
    throw e
  }
}

/**
 * Chaves guardadas sempre na raiz de DATA_DIR (não em data/demo/*).
 * `nonato-demo-link-recipients` tem de coincidir com o ficheiro que `/api/demo/activate` lê para aplicar módulos e contagem por `rid`.
 */
export const DATA_KEYS_ALWAYS_GLOBAL = new Set<string>(['nonato-demo-link-recipients'])

export function resolveDataDirForKey(key: string, sessionDataDir: string): string {
  if (DATA_KEYS_ALWAYS_GLOBAL.has(key)) return DATA_DIR
  return sessionDataDir
}
