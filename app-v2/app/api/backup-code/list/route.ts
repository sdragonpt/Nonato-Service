import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getDemoContext } from '../../data/demo-context'
import { getProjectRoot } from '../project-root'

export async function GET(request: NextRequest) {
  try {
    const { isDemo } = getDemoContext(request)
    if (isDemo) {
      return NextResponse.json({ backups: [] }, { status: 200 })
    }
    const projectRoot = getProjectRoot()
    const backupsDir = path.join(projectRoot, 'backups')
    const backupsFolder = path.resolve(backupsDir)

    // Garantir que a pasta backups existe (criar se não existir)
    if (!fs.existsSync(backupsDir)) {
      try {
        fs.mkdirSync(backupsDir, { recursive: true })
      } catch (e) {
        console.error('[backup-code/list] Erro ao criar pasta backups:', e)
      }
    }

    if (!fs.existsSync(backupsDir)) {
      return NextResponse.json({ backups: [], backupsFolder })
    }

    const backups = fs.readdirSync(backupsDir)
      .filter(item => item.startsWith('code-backup-'))
      .map(item => {
        const backupPath = path.join(backupsDir, item)
        const stat = fs.statSync(backupPath)
        const metadataPath = path.join(backupPath, 'metadata.json')
        let metadata: { timestamp?: string; filesCount?: number } | null = null
        if (fs.existsSync(metadataPath)) {
          try {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'))
          } catch (e) {
            // Ignorar erro
          }
        }
        return {
          name: item,
          path: backupPath,
          created: stat.birthtime.toISOString(),
          modified: stat.mtime.toISOString(),
          timestamp: metadata?.timestamp || stat.birthtime.toISOString(),
          filesCount: metadata?.filesCount ?? 0,
          metadata
        }
      })
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())

    return NextResponse.json({
      backups,
      backupsFolder
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro ao listar backups: ' + error.message },
      { status: 500 }
    )
  }
}
