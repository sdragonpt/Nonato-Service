import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { ensureDataDir, resolveDataDirForKey } from '../shared'
import { getDemoContext, ensureDemoDataDir } from '../demo-context'
import { bumpSyncMeta, readSyncMeta } from '../syncMeta'
import { jsonFileContentUnchanged, serializeJsonForDisk } from '../writeIfChanged'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json(
        { error: 'Chave (key) é obrigatória' },
        { status: 400 }
      )
    }

    const targetDir = resolveDataDirForKey(key, dataDir)
    ensureDemoDataDir(targetDir)
    const filePath = path.join(targetDir, `${key}.json`)

    let revision: number | undefined
    let updatedAt: string | undefined
    try {
      if (jsonFileContentUnchanged(filePath, value)) {
        const meta = readSyncMeta(targetDir)
        revision = meta.revision
        updatedAt = meta.updatedAt
      } else {
        fs.writeFileSync(filePath, serializeJsonForDisk(value), 'utf-8')
        const meta = bumpSyncMeta(targetDir)
        revision = meta.revision
        updatedAt = meta.updatedAt
      }
    } catch (e) {
      console.error('bumpSyncMeta (save):', e)
    }

    return NextResponse.json({ 
      success: true, 
      message: `Dados salvos com sucesso: ${key}`,
      ...(revision !== undefined ? { revision, updatedAt } : {})
    })
  } catch (error: any) {
    console.error('Erro ao salvar dados:', error)
    const msg = process.env.NODE_ENV === 'development' ? error.message : 'Erro ao salvar dados'
    return NextResponse.json(
      { error: 'Erro ao salvar dados', details: msg },
      { status: 500 }
    )
  }
}


