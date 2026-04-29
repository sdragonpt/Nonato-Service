import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getDemoContext, ensureDemoDataDir } from '../../data/demo-context'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { dataDir } = getDemoContext(request)
    const logoVideoPath = path.join(dataDir, 'nonato-logo.mp4')
    // Verificar se o arquivo existe
    if (!fs.existsSync(logoVideoPath)) {
      return NextResponse.json(
        { error: 'Vídeo não encontrado' },
        { status: 404 }
      )
    }

    // Ler o arquivo
    const videoBuffer = fs.readFileSync(logoVideoPath)
    
    // Retornar o vídeo com os headers corretos
    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': videoBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
        'Accept-Ranges': 'bytes',
      },
    })
  } catch (error: any) {
    console.error('Erro ao servir vídeo:', error)
    const msg = process.env.NODE_ENV === 'development' ? error.message : 'Erro ao servir vídeo'
    return NextResponse.json(
      { error: 'Erro ao servir vídeo', details: msg },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { dataDir } = getDemoContext(request)
    const logoVideoPath = path.join(dataDir, 'nonato-logo.mp4')
    // Verificar se o arquivo existe
    if (fs.existsSync(logoVideoPath)) {
      fs.unlinkSync(logoVideoPath)
      return NextResponse.json({ 
        success: true, 
        message: 'Vídeo removido com sucesso' 
      })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Vídeo não encontrado' 
    })
  } catch (error: any) {
    console.error('Erro ao remover vídeo:', error)
    return NextResponse.json(
      { error: 'Erro ao remover vídeo: ' + error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { isDemo, expired, dataDir } = getDemoContext(request)
    if (isDemo && expired) {
      return NextResponse.json(
        { error: 'demo_expired', message: 'Período de demonstração expirado.' },
        { status: 403 }
      )
    }
    ensureDemoDataDir(dataDir)
    const formData = await request.formData()
    const file = formData.get('video') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo não fornecido' },
        { status: 400 }
      )
    }

    const logoVideoPath = path.join(dataDir, 'nonato-logo.mp4')

    // Converter File para Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Salvar o arquivo binário
    fs.writeFileSync(logoVideoPath, buffer)

    return NextResponse.json({ 
      success: true, 
      message: 'Vídeo salvo com sucesso',
      size: buffer.length
    })
  } catch (error: any) {
    console.error('Erro ao salvar vídeo:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar vídeo: ' + error.message },
      { status: 500 }
    )
  }
}

