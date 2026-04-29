import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { DATA_DIR, ensureDataDir, resolveDataDirForKey } from '../shared'
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
      // Retornar todos os dados disponíveis
      const jsonFiles = fs.existsSync(dataDir) ? fs.readdirSync(dataDir).filter((f: string) => f.endsWith('.json')) : []
      const txtFiles = fs.existsSync(dataDir) ? fs.readdirSync(dataDir).filter((f: string) => f.endsWith('.txt')) : []
      const allData: Record<string, any> = {}
      
      // Carregar arquivos JSON
      for (const file of jsonFiles) {
        const fileKey = file.replace('.json', '')
        const filePath = path.join(dataDir, file)
        try {
          const content = fs.readFileSync(filePath, 'utf-8')
          // Verificar se o conteúdo não está vazio
          if (content && content.trim() !== '') {
            allData[fileKey] = JSON.parse(content)
          }
        } catch (e) {
          console.error(`Erro ao ler arquivo ${file}:`, e)
          // Continuar mesmo se houver erro em um arquivo
        }
      }
      // Lista de destinatários demo: sempre a cópia global (mesma que /api/demo/activate usa)
      const globalRecipientsPath = path.join(DATA_DIR, 'nonato-demo-link-recipients.json')
      if (fs.existsSync(globalRecipientsPath)) {
        try {
          const gr = fs.readFileSync(globalRecipientsPath, 'utf-8')
          if (gr && gr.trim() !== '') {
            allData['nonato-demo-link-recipients'] = JSON.parse(gr)
          }
        } catch (e) {
          console.error('Erro ao ler nonato-demo-link-recipients global:', e)
        }
      }
      
      // Carregar arquivos TXT (para vídeos/imagens grandes)
      for (const file of txtFiles) {
        const fileKey = file.replace('.txt', '')
        // Só adicionar se não existir já no JSON (prioridade para JSON)
        if (!allData[fileKey]) {
          const filePath = path.join(dataDir, file)
          try {
            const content = fs.readFileSync(filePath, 'utf-8')
            if (content && content.trim() !== '') {
              allData[fileKey] = content
            }
          } catch (e) {
            console.error(`Erro ao ler arquivo ${file}:`, e)
          }
        }
      }
      
      return NextResponse.json({ success: true, data: allData })
    }

    // Carregar um arquivo específico
    const targetDir = resolveDataDirForKey(key, dataDir)
    const filePath = path.join(targetDir, `${key}.json`)
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ 
        success: true, 
        data: null,
        message: `Arquivo ${key} não encontrado` 
      })
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    // Verificar se o conteúdo não está vazio
    if (!content || content.trim() === '') {
      return NextResponse.json({ 
        success: true, 
        data: null,
        message: `Arquivo ${key} está vazio` 
      })
    }
    
    try {
      const data = JSON.parse(content)
      return NextResponse.json({ success: true, data })
    } catch (parseError: any) {
      console.error(`Erro ao fazer parse do arquivo ${key}:`, parseError)
      return NextResponse.json({ 
        success: true, 
        data: null,
        message: `Arquivo ${key} contém JSON inválido` 
      })
    }
  } catch (error: any) {
    console.error('Erro ao carregar dados:', error)
    const msg = process.env.NODE_ENV === 'development' ? error.message : 'Erro ao carregar dados'
    return NextResponse.json(
      { error: 'Erro ao carregar dados', details: msg },
      { status: 500 }
    )
  }
}

