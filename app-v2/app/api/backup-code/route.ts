import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getDemoContext } from '../data/demo-context'
import { getProjectRoot } from './project-root'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { isDemo } = getDemoContext(request)
    if (isDemo) {
      return NextResponse.json(
        { error: 'Backup do código desativado no modo demonstração.' },
        { status: 403 }
      )
    }
    const projectRoot = path.resolve(getProjectRoot())
    const backupsBase = path.join(projectRoot, 'backups')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupDir = path.join(backupsBase, `code-backup-${timestamp}`)

    // Ficheiro de diagnóstico: onde o backup está a ser gravado (na raiz do projeto)
    try {
      const diagnosticPath = path.join(projectRoot, 'backups', 'ONDE-GUARDAMOS-BACKUPS.txt')
      const diagnosticDir = path.dirname(diagnosticPath)
      if (!fs.existsSync(diagnosticDir)) {
        fs.mkdirSync(diagnosticDir, { recursive: true })
      }
      fs.writeFileSync(
        diagnosticPath,
        'Pasta onde os backups do código são guardados:\n' + path.resolve(backupsBase) + '\n\nRaiz do projeto detectada: ' + projectRoot + '\nData: ' + new Date().toISOString(),
        'utf-8'
      )
    } catch (_) {}

    // Criar diretório de backup (garantir que a pasta backups existe)
    try {
      if (!fs.existsSync(backupsBase)) {
        fs.mkdirSync(backupsBase, { recursive: true })
      }
      fs.mkdirSync(backupDir, { recursive: true })
    } catch (dirError: any) {
      console.error('Erro ao criar pasta backups:', dirError)
      return NextResponse.json(
        { error: 'Não foi possível criar a pasta "backups". Verifique permissões de escrita em: ' + backupsBase + ' — ' + (dirError?.message || String(dirError)) },
        { status: 500 }
      )
    }

    // Lista de arquivos e pastas importantes
    const itemsToBackup = [
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

    const backedUpFiles: string[] = []
    const backedUpHistoryFiles: string[] = []

    // Função recursiva para copiar arquivos
    const copyRecursive = (src: string, dest: string) => {
      const stat = fs.statSync(src)
      if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true })
        }
        const files = fs.readdirSync(src)
        files.forEach(file => {
          // Ignorar node_modules, .next, backups
          if (file === 'node_modules' || file === '.next' || file === 'backups' || file === '.git') {
            return
          }
          copyRecursive(path.join(src, file), path.join(dest, file))
        })
      } else {
        fs.copyFileSync(src, dest)
        backedUpFiles.push(src)
      }
    }

    // Função para copiar arquivo de histórico (se existir)
    const copyHistoryFile = (sourcePath: string, description: string) => {
      try {
        if (fs.existsSync(sourcePath)) {
          const historyDir = path.join(backupDir, '_command-history')
          if (!fs.existsSync(historyDir)) {
            fs.mkdirSync(historyDir, { recursive: true })
          }
          const fileName = path.basename(sourcePath)
          const destFile = path.join(historyDir, fileName)
          fs.copyFileSync(sourcePath, destFile)
          backedUpHistoryFiles.push(`${description}: ${sourcePath}`)
          return true
        }
      } catch (error) {
        console.error(`Erro ao copiar histórico ${description}:`, error)
      }
      return false
    }

    // Fazer backup de cada item
    itemsToBackup.forEach(item => {
      const sourcePath = path.join(projectRoot, item)
      const destPath = path.join(backupDir, item)
      
      if (fs.existsSync(sourcePath)) {
        try {
          copyRecursive(sourcePath, destPath)
        } catch (error) {
          console.error(`Erro ao copiar ${item}:`, error)
        }
      }
    })

    // Se nenhum ficheiro de código foi copiado, a raiz do projeto está errada
    if (backedUpFiles.length === 0) {
      try {
        fs.rmSync(backupDir, { recursive: true, force: true })
      } catch (_) {}
      return NextResponse.json(
        {
          error: 'Nenhum ficheiro foi copiado. A pasta "app" não foi encontrada na raiz usada. Raiz do projeto: ' + projectRoot + ' — Verifique se está a correr o servidor a partir da pasta do projeto (ex: npm run dev na pasta gestao-tecnica-nonato-service).'
        },
        { status: 500 }
      )
    }

    // Fazer backup do histórico de comandos
    const historyDir = path.join(backupDir, '_command-history')
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true })
    }

    // Detectar sistema operacional e caminhos do usuário
    const os = process.platform
    const homeDir = os === 'win32' ? process.env.USERPROFILE : process.env.HOME
    const appDataDir = os === 'win32' ? process.env.APPDATA : process.env.HOME

    if (homeDir) {
      // Histórico do PowerShell (Windows)
      if (os === 'win32') {
        const powershellHistory = path.join(
          homeDir,
          'AppData',
          'Roaming',
          'Microsoft',
          'Windows',
          'PowerShell',
          'PSReadLine',
          'ConsoleHost_history.txt'
        )
        copyHistoryFile(powershellHistory, 'Histórico do PowerShell')
      }

      // Histórico do Bash (Linux/Mac)
      if (os === 'linux' || os === 'darwin') {
        const bashHistory = path.join(homeDir, '.bash_history')
        copyHistoryFile(bashHistory, 'Histórico do Bash')
        
        const zshHistory = path.join(homeDir, '.zsh_history')
        copyHistoryFile(zshHistory, 'Histórico do Zsh')
      }
    }

    // Função recursiva para encontrar arquivos de histórico do VS Code
    const findHistoryFiles = (dir: string, fileList: string[] = [], maxFiles: number = 10): string[] => {
      try {
        const files = fs.readdirSync(dir)
        for (const file of files) {
          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)
          if (stat.isDirectory()) {
            findHistoryFiles(filePath, fileList, maxFiles)
          } else if (file.toLowerCase().includes('terminal') && fileList.length < maxFiles) {
            fileList.push(filePath)
          }
        }
      } catch (error) {
        // Ignorar erros de acesso
      }
      return fileList
    }

    // Histórico do VS Code Terminal (se disponível)
    if (appDataDir) {
      if (os === 'win32') {
        const vscodeHistoryDir = path.join(appDataDir, 'Code', 'User', 'History')
        if (fs.existsSync(vscodeHistoryDir)) {
          try {
            const vscodeHistoryBackup = path.join(historyDir, 'vscode-terminal-history')
            if (!fs.existsSync(vscodeHistoryBackup)) {
              fs.mkdirSync(vscodeHistoryBackup, { recursive: true })
            }
            // Encontrar arquivos de histórico do VS Code
            const historyFiles = findHistoryFiles(vscodeHistoryDir, [], 10)
            
            historyFiles.forEach((sourceFile: string) => {
              const relativePath = path.relative(vscodeHistoryDir, sourceFile)
              const destFile = path.join(vscodeHistoryBackup, relativePath)
              const destDir = path.dirname(destFile)
              try {
                if (!fs.existsSync(destDir)) {
                  fs.mkdirSync(destDir, { recursive: true })
                }
                fs.copyFileSync(sourceFile, destFile)
                backedUpHistoryFiles.push(`VS Code Terminal: ${sourceFile}`)
              } catch (error) {
                console.error(`Erro ao copiar histórico VS Code:`, error)
              }
            })
          } catch (error) {
            console.error('Erro ao acessar histórico do VS Code:', error)
          }
        }
      }
    }

    // Criar arquivo README no diretório de histórico
    if (backedUpHistoryFiles.length > 0) {
      const historyReadme = `HISTÓRICO DE COMANDOS
=====================
Este diretório contém o histórico de comandos do terminal.

Arquivos incluídos:
${backedUpHistoryFiles.map(f => `- ${f}`).join('\n')}

Total de arquivos de histórico: ${backedUpHistoryFiles.length}

NOTA: Estes arquivos contêm o histórico de comandos executados no terminal.
Para restaurar, copie os arquivos para seus locais originais.
`
      fs.writeFileSync(path.join(historyDir, 'README-HISTORY.txt'), historyReadme, 'utf-8')
    }

    // Criar arquivo de informações
    const infoContent = `BACKUP DO CÓDIGO FONTE
=======================
Data/Hora: ${new Date().toLocaleString('pt-BR')}
Sistema: Gestão Técnica Nonato Service
Versão: 1.0.0

Arquivos incluídos:
${backedUpFiles.map(f => `- ${f}`).join('\n')}

Total de arquivos de código: ${backedUpFiles.length}

${backedUpHistoryFiles.length > 0 ? `\nHISTÓRICO DE COMANDOS:
${backedUpHistoryFiles.map(f => `- ${f}`).join('\n')}

Total de arquivos de histórico: ${backedUpHistoryFiles.length}
\nOs arquivos de histórico estão na pasta: _command-history/\n` : '\nNenhum histórico de comandos encontrado.\n'}

Para restaurar:
1. Copie os arquivos deste backup de volta para o diretório do projeto
2. Execute: npm install
3. Execute: npm run dev

Para restaurar o histórico de comandos:
- Os arquivos estão na pasta _command-history/
- Copie-os para seus locais originais conforme indicado no README-HISTORY.txt
`

    fs.writeFileSync(path.join(backupDir, 'INFO-BACKUP.txt'), infoContent, 'utf-8')

    // Criar arquivo JSON com metadados
    const metadata = {
      timestamp: new Date().toISOString(),
      backupPath: backupDir,
      filesCount: backedUpFiles.length,
      files: backedUpFiles.map(f => path.relative(projectRoot, f)),
      historyFilesCount: backedUpHistoryFiles.length,
      historyFiles: backedUpHistoryFiles,
      includesCommandHistory: backedUpHistoryFiles.length > 0
    }
    fs.writeFileSync(path.join(backupDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8')

    // Verificar se algo foi realmente gravado (pasta do backup existe e tem conteúdo)
    const backupDirExists = fs.existsSync(backupDir)
    const backupDirContents = backupDirExists ? fs.readdirSync(backupDir) : []
    if (!backupDirExists || backupDirContents.length === 0) {
      return NextResponse.json(
        {
          error: 'O backup foi criado mas nenhum ficheiro foi gravado. Raiz do projeto usada: ' + projectRoot + ' — Pasta de destino: ' + backupDir
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Backup criado com sucesso!',
      backupPath: backupDir,
      backupsFolder: backupsBase,
      backupsFolderAbsolute: path.resolve(backupsBase),
      filesCount: backedUpFiles.length,
      historyFilesCount: backedUpHistoryFiles.length,
      includesCommandHistory: backedUpHistoryFiles.length > 0
    })
  } catch (error: any) {
    console.error('Erro ao criar backup:', error)
    return NextResponse.json(
      { error: 'Erro ao criar backup: ' + error.message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const projectRoot = path.resolve(getProjectRoot())
    const backupsDir = path.join(projectRoot, 'backups')
    
    if (!fs.existsSync(backupsDir)) {
      return NextResponse.json({ backups: [] })
    }

    const backups = fs.readdirSync(backupsDir)
      .filter(item => item.startsWith('code-backup-'))
      .map(item => {
        const backupPath = path.join(backupsDir, item)
        const stat = fs.statSync(backupPath)
        const metadataPath = path.join(backupPath, 'metadata.json')
        let metadata = null
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
          metadata
        }
      })
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())

    return NextResponse.json({ backups })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro ao listar backups: ' + error.message },
      { status: 500 }
    )
  }
}

