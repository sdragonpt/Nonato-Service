/**
 * Contexto do modo DEMO: dados isolados e expiração em 15 dias.
 * Usado pelas APIs para decidir qual pasta de dados usar.
 */
import path from 'path'
import { NextRequest } from 'next/server'
import { DATA_DIR } from './shared'

const DEMO_DAYS = 15
const COOKIE_DEMO = 'nonato_demo'
const COOKIE_DEMO_START = 'nonato_demo_start'
const COOKIE_DEMO_RECIPIENT = 'nonato_demo_recipient'

function sanitizeDemoRecipient(recipientId?: string): string {
  const safe = String(recipientId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
  return safe || 'default'
}

export type DemoContext = {
  isDemo: boolean
  expired: boolean
  dataDir: string
  daysLeft?: number
}

export function getDemoContext(request: NextRequest): DemoContext {
  const demoCookie = request.cookies.get(COOKIE_DEMO)?.value
  const startCookie = request.cookies.get(COOKIE_DEMO_START)?.value
  const recipientCookie = request.cookies.get(COOKIE_DEMO_RECIPIENT)?.value

  if (!demoCookie || demoCookie !== '1' || !startCookie) {
    return { isDemo: false, expired: false, dataDir: DATA_DIR }
  }

  // Cookie pode ter sido guardado com encodeURIComponent (versões antigas); decodificar para parse correto
  let startStr = startCookie
  if (typeof startCookie === 'string' && startCookie.includes('%')) {
    try {
      startStr = decodeURIComponent(startCookie)
    } catch {
      startStr = startCookie
    }
  }
  const startDate = new Date(startStr)
  if (isNaN(startDate.getTime())) {
    return { isDemo: false, expired: false, dataDir: DATA_DIR }
  }

  const now = new Date()
  const diffMs = now.getTime() - startDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  const demoDataDir = path.join(DATA_DIR, 'demo', sanitizeDemoRecipient(recipientCookie))

  if (diffDays >= DEMO_DAYS) {
    return {
      isDemo: true,
      expired: true,
      dataDir: demoDataDir,
    }
  }

  const daysLeft = DEMO_DAYS - diffDays
  return {
    isDemo: true,
    expired: false,
    dataDir: demoDataDir,
    daysLeft,
  }
}

export function ensureDemoDataDir(dataDir: string): void {
  const fs = require('fs')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

export { COOKIE_DEMO, COOKIE_DEMO_START, COOKIE_DEMO_RECIPIENT, DEMO_DAYS }
