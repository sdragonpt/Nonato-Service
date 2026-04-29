import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'
import AdmZip from 'adm-zip'
import { getDemoContext } from '../../data/demo-context'
import { getProjectRoot } from '../project-root'

export const runtime = 'nodejs'

const ALLOWED_RESTORE_ITEMS = [
  'app',
  'public',
  'next.config.js',
  'next.config.mjs',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'next-env.d.ts',
  '.gitignore',
  'README.md',
  'tailwind.config.js',
  'tailwind.config.ts',
  'postcss.config.js',
  'globals.css',
  'LEIA-ME-BACKUP.txt', // ignorado ao copiar, só pode existir no ZIP
]

function copyRecursive(src: string, dest: string, restoredFiles: string[]): void {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }
    const files = fs.readdirSync(src)
    for (const file of files) {
      if (file === 'node_modules' || file === '.next' || file === 'backups' || file === '.git') {
        continue
      }
      copyRecursive(path.join(src, file), path.join(dest, file), restoredFiles)
    }
  } else {
    const destDir = path.dirname(dest)
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }
    fs.copyFileSync(src, dest)
    restoredFiles.push(dest)
  }
}

export async function POST(request: NextRequest) {
  let tempDir: string | null = null
  try {
    const { isDemo } = getDemoContext(request)
    if (isDemo) {
      return NextResponse.json(
        { error: 'Restaurar a partir de ZIP desativado no modo demonstração.' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'Envie um ficheiro ZIP (campo "file").' },
        { status: 400 }
      )
    }
    const fileName = (file as File).name?.toLowerCase() || ''
    if (!fileName.endsWith('.zip')) {
      return NextResponse.json(
        { error: 'O ficheiro deve ser um .zip (backup do código).' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.length === 0) {
      return NextResponse.json(
        { error: 'O ficheiro está vazio.' },
        { status: 400 }
      )
    }

    const zip = new AdmZip(buffer)
    tempDir = path.join(os.tmpdir(), `restore-zip-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    zip.extractAllTo(tempDir, true)

    const projectRoot = path.resolve(getProjectRoot())
    const restoredFiles: string[] = []

    for (const item of ALLOWED_RESTORE_ITEMS) {
      if (item === 'LEIA-ME-BACKUP.txt') continue
      const sourcePath = path.join(tempDir, item)
      const destPath = path.join(projectRoot, item)
      if (fs.existsSync(sourcePath)) {
        try {
          const stat = fs.statSync(sourcePath)
          if (stat.isDirectory()) {
            if (fs.existsSync(destPath)) {
              // Remover destino existente para substituir pela pasta do ZIP
              fs.rmSync(destPath, { recursive: true, force: true })
            }
            copyRecursive(sourcePath, destPath, restoredFiles)
          } else {
            const destDir = path.dirname(destPath)
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true })
            }
            fs.copyFileSync(sourcePath, destPath)
            restoredFiles.push(destPath)
          }
        } catch (err: any) {
          console.error(`[restore-from-zip] Erro ao restaurar ${item}:`, err)
          if (tempDir && fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true })
          }
          return NextResponse.json(
            { error: `Erro ao restaurar "${item}": ${err?.message || String(err)}` },
            { status: 500 }
          )
        }
      }
    }

    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }

    return NextResponse.json({
      success: true,
      filesCount: restoredFiles.length,
      message: `Restaurados ${restoredFiles.length} ficheiro(s) a partir do ZIP. Recarregue a aplicação para ver as alterações.`,
    })
  } catch (error: any) {
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true })
      } catch (_) {}
    }
    console.error('[restore-from-zip]', error)
    return NextResponse.json(
      { error: 'Erro ao restaurar a partir do ZIP: ' + (error?.message || String(error)) },
      { status: 500 }
    )
  }
}
