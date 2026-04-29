import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { ensureDataDir } from '../shared'
import { getDemoContext, ensureDemoDataDir } from '../demo-context'

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

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { error: 'Chave (key) é obrigatória' },
        { status: 400 }
      )
    }

    // Tentar carregar como .txt primeiro (para vídeos/imagens grandes)
    const txtPath = path.join(dataDir, `${key}.txt`)
    if (fs.existsSync(txtPath)) {
      try {
        // Para arquivos grandes, usar readFileSync com encoding correto
        const stats = fs.statSync(txtPath)
        if (stats.size > 0) {
          const content = fs.readFileSync(txtPath, 'utf-8')
          if (content && content.trim() !== '') {
            // Verificar se o conteúdo parece estar completo
            if (key === 'nonato-logo' && content.startsWith('data:video/')) {
              const base64Part = content.split(',')[1]
              if (base64Part && base64Part.length > 1000) {
                return NextResponse.json({ success: true, data: content })
              } else {
                console.warn(`Vídeo ${key} parece estar incompleto (${base64Part?.length || 0} caracteres)`)
              }
            } else {
              return NextResponse.json({ success: true, data: content })
            }
          }
        }
      } catch (e) {
        console.error(`Erro ao ler arquivo ${key}.txt:`, e)
      }
    }

    // Fallback para .json (mas apenas se não for logo - logos devem ser .txt)
    if (key !== 'nonato-logo') {
      const jsonPath = path.join(dataDir, `${key}.json`)
      if (fs.existsSync(jsonPath)) {
        try {
          const content = fs.readFileSync(jsonPath, 'utf-8')
          if (content && content.trim() !== '') {
            try {
              const data = JSON.parse(content)
              // Se for uma string, retornar diretamente
              if (typeof data === 'string') {
                return NextResponse.json({ success: true, data })
              }
              return NextResponse.json({ success: true, data })
            } catch (e) {
              // Se não for JSON válido, retornar como texto
              return NextResponse.json({ success: true, data: content })
            }
          }
        } catch (e) {
          console.error(`Erro ao ler arquivo ${key}.json:`, e)
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: null,
      message: `Arquivo ${key} não encontrado` 
    })
  } catch (error: any) {
    console.error('Erro ao carregar dados:', error)
    const msg = process.env.NODE_ENV === 'development' ? error.message : 'Erro ao carregar dados'
    return NextResponse.json(
      { error: 'Erro ao carregar dados', details: msg },
      { status: 500 }
    )
  }
}

