import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { ensureDataDir, resolveDataDirForKey } from '../shared'
import { getDemoContext, ensureDemoDataDir } from '../demo-context'
import { bumpSyncMeta, readSyncMeta } from '../syncMeta'
import { jsonFileContentUnchanged, serializeJsonForDisk } from '../writeIfChanged'

export async function POST(request: NextRequest) {
  try {
    const { isDemo, expired, dataDir } = getDemoContext(request)
    if (isDemo && expired) {
      return NextResponse.json(
        { error: 'demo_expired', message: 'Período de demonstração expirado (15 dias).' },
        { status: 403 }
      )
    }
    ensureDataDir()
    ensureDemoDataDir(dataDir)
    const allData = await request.json()

    if (!allData || typeof allData !== 'object') {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    const saved: string[] = []
    const errors: string[] = []

    /** Pastas onde pelo menos um ficheiro .json mudou de conteúdo (uma revisão por pasta). */
    const dirsWithContentChange = new Set<string>()

    // Salvar cada item
    for (const [key, value] of Object.entries(allData)) {
      try {
        const targetDir = resolveDataDirForKey(key, dataDir)
        ensureDemoDataDir(targetDir)
        const filePath = path.join(targetDir, `${key}.json`)
        if (jsonFileContentUnchanged(filePath, value)) {
          continue
        }
        fs.writeFileSync(filePath, serializeJsonForDisk(value), 'utf-8')
        saved.push(key)
        dirsWithContentChange.add(targetDir)
      } catch (error: any) {
        console.error(`Erro ao salvar ${key}:`, error)
        errors.push(`${key}: ${error.message}`)
      }
    }

    let revision: number | undefined
    let updatedAt: string | undefined
    try {
      for (const dir of Array.from(dirsWithContentChange)) {
        bumpSyncMeta(dir)
      }
      const metaOut = readSyncMeta(dataDir)
      revision = metaOut.revision
      updatedAt = metaOut.updatedAt
    } catch (e) {
      console.error('bumpSyncMeta (save-all):', e)
    }

    return NextResponse.json({ 
      success: true, 
      saved,
      errors: errors.length > 0 ? errors : undefined,
      message:
        saved.length > 0
          ? `Salvos ${saved.length} arquivo(s)`
          : 'Nenhum ficheiro alterado (dados já iguais ao servidor)',
      ...(revision !== undefined ? { revision, updatedAt } : {})
    })
  } catch (error: any) {
    console.error('Erro ao salvar todos os dados:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar dados: ' + error.message },
      { status: 500 }
    )
  }
}


