/**
 * Evita gravar e evitar bump de revisão quando o payload é idêntico ao ficheiro existente.
 * Reduz ciclos de «sincronização pendente» entre notebook/tablet por saves automáticos sem alteração real.
 */
import fs from 'fs'

export function serializeJsonForDisk(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

export function jsonFileContentUnchanged(filePath: string, value: unknown): boolean {
  const next = serializeJsonForDisk(value)
  try {
    if (!fs.existsSync(filePath)) return false
    const prev = fs.readFileSync(filePath, 'utf-8')
    return prev === next
  } catch {
    return false
  }
}

export function textFileContentUnchanged(filePath: string, nextText: string): boolean {
  try {
    if (!fs.existsSync(filePath)) return false
    const prev = fs.readFileSync(filePath, 'utf-8')
    return prev === nextText
  } catch {
    return false
  }
}
