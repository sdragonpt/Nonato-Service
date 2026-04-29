import fs from 'fs'
import path from 'path'

/**
 * Raiz do projeto (onde está package.json e a pasta app).
 * Usado por backup-code, list e restore para gravar/ler na mesma pasta "backups".
 */
export function getProjectRoot(): string {
  const envRoot = process.env.BACKUP_PROJECT_ROOT || process.env.PROJECT_ROOT
  if (envRoot && fs.existsSync(path.join(envRoot, 'package.json')) && fs.existsSync(path.join(envRoot, 'app'))) {
    return path.resolve(envRoot)
  }
  if (typeof __dirname !== 'undefined') {
    const dir = path.resolve(__dirname)
    const fromCompiled = path.resolve(dir, '..', '..', '..', '..', '..')
    if (fs.existsSync(path.join(fromCompiled, 'package.json')) && fs.existsSync(path.join(fromCompiled, 'app'))) {
      return fromCompiled
    }
    const fromSource = path.resolve(dir, '..', '..', '..')
    if (fs.existsSync(path.join(fromSource, 'package.json')) && fs.existsSync(path.join(fromSource, 'app'))) {
      return fromSource
    }
    let current = dir
    for (let i = 0; i < 10; i++) {
      if (fs.existsSync(path.join(current, 'package.json')) && fs.existsSync(path.join(current, 'app'))) {
        return current
      }
      const parent = path.join(current, '..')
      if (parent === current) break
      current = parent
    }
  }
  const cwd = path.resolve(process.cwd())
  if (fs.existsSync(path.join(cwd, 'package.json')) && fs.existsSync(path.join(cwd, 'app'))) {
    return cwd
  }
  return cwd
}
