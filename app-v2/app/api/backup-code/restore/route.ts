import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getDemoContext } from '../../data/demo-context'
import { getProjectRoot } from '../project-root'

const itemsToRestore = [
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
  'globals.css'
]

export async function POST(request: NextRequest) {
  try {
    const { isDemo } = getDemoContext(request)
    if (isDemo) {
      return NextResponse.json(
        { error: 'Restauração desativada no modo demonstração.' },
        { status: 403 }
      )
    }
    const projectRoot = getProjectRoot()
    const backupsDir = path.join(projectRoot, 'backups')
    const body = await request.json()
    const { backupPath: rawBackupPath } = body || {}

    if (!rawBackupPath || typeof rawBackupPath !== 'string') {
      return NextResponse.json(
        { error: 'backupPath é obrigatório' },
        { status: 400 }
      )
    }

    // Normalizar caminho e garantir que está dentro de backups/
    const backupPath = path.resolve(rawBackupPath)
    if (!backupPath.startsWith(backupsDir) || !fs.existsSync(backupPath)) {
      return NextResponse.json(
        { error: 'Caminho do backup inválido ou não encontrado' },
        { status: 400 }
      )
    }

    const stat = fs.statSync(backupPath)
    if (!stat.isDirectory()) {
      return NextResponse.json(
        { error: 'O backup deve ser um diretório' },
        { status: 400 }
      )
    }

    const restoredFiles: string[] = []

    const copyRecursive = (src: string, dest: string) => {
      const stat = fs.statSync(src)
      if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true })
        }
        const files = fs.readdirSync(src)
        files.forEach(file => {
          if (file === 'node_modules' || file === '.next' || file === 'backups' || file === '.git') {
            return
          }
          copyRecursive(path.join(src, file), path.join(dest, file))
        })
      } else {
        const destDir = path.dirname(dest)
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true })
        }
        fs.copyFileSync(src, dest)
        restoredFiles.push(dest)
      }
    }

    for (const item of itemsToRestore) {
      const sourcePath = path.join(backupPath, item)
      const destPath = path.join(projectRoot, item)
      if (fs.existsSync(sourcePath)) {
        try {
          copyRecursive(sourcePath, destPath)
        } catch (error: any) {
          console.error(`Erro ao restaurar ${item}:`, error)
          return NextResponse.json(
            { error: `Erro ao restaurar ${item}: ${error.message}` },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({
      success: true,
      backupPath: rawBackupPath,
      filesCount: restoredFiles.length,
      message: `Restaurados ${restoredFiles.length} arquivo(s)`
    })
  } catch (error: any) {
    console.error('Erro ao restaurar backup:', error)
    return NextResponse.json(
      { error: 'Erro ao restaurar backup: ' + error.message },
      { status: 500 }
    )
  }
}
