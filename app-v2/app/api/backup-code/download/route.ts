import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { PassThrough } from 'stream'
import archiver from 'archiver'
import { getDemoContext } from '../../data/demo-context'
import { getProjectRoot } from '../project-root'

export const runtime = 'nodejs'

function nodeStreamToWebReadableStream(pass: PassThrough): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      pass.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)))
      pass.on('end', () => controller.close())
      pass.on('error', (err) => controller.error(err))
    },
  })
}

const ITEMS_TO_BACKUP = [
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

const IGNORE_IN_ZIP = ['**/node_modules/**', '**/.next/**', '**/backups/**', '**/.git/**']

export async function GET(request: NextRequest) {
  try {
    const { isDemo } = getDemoContext(request)
    if (isDemo) {
      return NextResponse.json(
        { error: 'Descarregar backup desativado no modo demonstração.' },
        { status: 403 }
      )
    }

    const projectRoot = path.resolve(getProjectRoot())
    const pass = new PassThrough()
    const archive = archiver('zip', { zlib: { level: 6 } })

    archive.on('error', (err) => {
      console.error('[backup-code/download] Erro no ZIP:', err)
      pass.destroy(err)
    })

    archive.pipe(pass)

    for (const item of ITEMS_TO_BACKUP) {
      const fullPath = path.join(projectRoot, item)
      if (!fs.existsSync(fullPath)) continue
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        archive.glob('**/*', { cwd: fullPath, dot: true, ignore: IGNORE_IN_ZIP }, { prefix: item })
      } else {
        archive.file(fullPath, { name: item })
      }
    }

    // Ficheiro de informação dentro do ZIP
    const info = `Backup do código - ${new Date().toISOString()}\nProjeto: gestao-tecnica-nonato-service\nDescompacte e use na pasta do projeto.`
    archive.append(info, { name: 'LEIA-ME-BACKUP.txt' })

    void archive.finalize()

    const filename = `backup-codigo-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`
    return new NextResponse(nodeStreamToWebReadableStream(pass), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('[backup-code/download]', error)
    return NextResponse.json(
      { error: 'Erro ao criar ZIP: ' + (error?.message || String(error)) },
      { status: 500 }
    )
  }
}
