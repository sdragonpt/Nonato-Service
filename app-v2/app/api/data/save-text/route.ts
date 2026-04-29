import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { ensureDataDir } from '../shared'
import { getDemoContext, ensureDemoDataDir } from '../demo-context'
import { bumpSyncMeta, readSyncMeta } from '../syncMeta'
import { textFileContentUnchanged } from '../writeIfChanged'

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
    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json(
        { error: 'Chave (key) é obrigatória' },
        { status: 400 }
      )
    }

    const filePath = path.join(dataDir, `${key}.txt`)
    const textPayload = typeof value === 'string' ? value : String(value)

    let revision: number | undefined
    let updatedAt: string | undefined
    try {
      if (textFileContentUnchanged(filePath, textPayload)) {
        const meta = readSyncMeta(dataDir)
        revision = meta.revision
        updatedAt = meta.updatedAt
      } else {
        fs.writeFileSync(filePath, textPayload, 'utf-8')
        const meta = bumpSyncMeta(dataDir)
        revision = meta.revision
        updatedAt = meta.updatedAt
      }
    } catch (e) {
      console.error('bumpSyncMeta (save-text):', e)
    }

    return NextResponse.json({ 
      success: true, 
      message: `Dados salvos com sucesso: ${key}`,
      ...(revision !== undefined ? { revision, updatedAt } : {})
    })
  } catch (error: any) {
    console.error('Erro ao salvar dados:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar dados: ' + error.message },
      { status: 500 }
    )
  }
}


