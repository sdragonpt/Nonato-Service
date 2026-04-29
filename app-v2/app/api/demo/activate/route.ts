import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { DATA_DIR, ensureDataDir } from '../../data/shared'

const DEMO_DAYS = 15
const COOKIE_MAX_AGE = DEMO_DAYS * 24 * 60 * 60
const RECIPIENTS_FILE = 'nonato-demo-link-recipients.json'

export const dynamic = 'force-dynamic'

function encodeDemoModules(value: Record<string, string> | undefined): string {
  if (!value || typeof value !== 'object') return ''
  return Buffer.from(JSON.stringify(value), 'utf-8').toString('base64url')
}

function getDemoModulesByRecipient(recipientId: string): Record<string, string> | undefined {
  try {
    ensureDataDir()
    const filePath = path.join(DATA_DIR, RECIPIENTS_FILE)
    if (!fs.existsSync(filePath)) return undefined
    const raw = fs.readFileSync(filePath, 'utf-8')
    if (!raw.trim()) return undefined
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return undefined
    const recipient = list.find((item: any) => item && item.id === recipientId)
    return recipient?.demoModules && typeof recipient.demoModules === 'object' ? recipient.demoModules : undefined
  } catch (error) {
    console.error('Erro ao carregar módulos da demo:', error)
    return undefined
  }
}

function markDemoRecipientAccess(recipientId: string, accessDateIso: string) {
  try {
    ensureDataDir()
    const filePath = path.join(DATA_DIR, RECIPIENTS_FILE)
    if (!fs.existsSync(filePath)) return
    const raw = fs.readFileSync(filePath, 'utf-8')
    if (!raw.trim()) return
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return
    const updated = list.map((item: any) => {
      if (!item || item.id !== recipientId) return item
      const baseDate = item.firstAccessAt || accessDateIso
      const expirationDate = new Date(new Date(baseDate).getTime() + DEMO_DAYS * 24 * 60 * 60 * 1000).toISOString()
      return {
        ...item,
        firstAccessAt: item.firstAccessAt || accessDateIso,
        lastAccessAt: accessDateIso,
        activationCount: Number(item.activationCount || 0) + 1,
        dataExpiracao: expirationDate,
      }
    })
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8')
  } catch (error) {
    console.error('Erro ao marcar acesso da demo:', error)
  }
}

export async function GET(request: NextRequest) {
  const startDate = new Date().toISOString()
  const origin = request.nextUrl.origin
  const recipientId = request.nextUrl.searchParams.get('rid')?.trim()
  const response = NextResponse.redirect(origin + '/', 302)
  response.cookies.set('nonato_demo', '1', {
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
  })
  // Valor em ISO (ex: 2026-03-02T12:00:00.000Z) é seguro para cookie; evitar encode para parse correto no servidor
  response.cookies.set('nonato_demo_start', startDate, {
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
  })
  if (recipientId) {
    const demoModules = getDemoModulesByRecipient(recipientId)
    response.cookies.set('nonato_demo_recipient', recipientId, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
    })
    if (demoModules) {
      response.cookies.set('nonato_demo_modules', encodeDemoModules(demoModules), {
        path: '/',
        maxAge: COOKIE_MAX_AGE,
        sameSite: 'lax',
      })
    }
    markDemoRecipientAccess(recipientId, startDate)
  }
  return response
}
