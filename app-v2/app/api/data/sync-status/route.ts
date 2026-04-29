import { NextRequest, NextResponse } from 'next/server'
import { ensureDataDir } from '../shared'
import { getDemoContext, ensureDemoDataDir } from '../demo-context'
import { readSyncMeta } from '../syncMeta'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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
    const meta = readSyncMeta(dataDir)
    return NextResponse.json({
      success: true,
      revision: meta.revision,
      updatedAt: meta.updatedAt
    })
  } catch (error: any) {
    console.error('sync-status:', error)
    return NextResponse.json(
      { error: 'Erro ao ler estado de sincronização' },
      { status: 500 }
    )
  }
}
