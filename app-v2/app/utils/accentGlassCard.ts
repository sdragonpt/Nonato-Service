/**
 * Mesmo padrão visual dos cartões «Recursos que Fazem a Diferença» na tela inicial
 * (page.tsx: fundo rgba(30,35,30,0.9), borda 1px rgba(0,255,0,0.2), hover borda 0.45).
 * Para outras cores (âmbar, etc.): mesma lógica de contraste, sem blur — como na splash.
 */

import type { CSSProperties } from 'react'

export type AccentRgb = { r: number; g: number; b: number }

export const ACCENT_GREEN: AccentRgb = { r: 0, g: 255, b: 0 }
export const ACCENT_AMBER: AccentRgb = { r: 255, g: 170, b: 0 }

/** Valores literais da tela inicial — cartões verdes */
export const SPLASH_CARD_BG_GREEN = 'rgba(30, 35, 30, 0.9)'
export const SPLASH_BORDER_GREEN = 'rgba(0, 255, 0, 0.2)'
export const SPLASH_BORDER_GREEN_HOVER = 'rgba(0, 255, 0, 0.45)'

function isNeonGreen(a: AccentRgb): boolean {
  return a.r === 0 && a.g === 255 && a.b === 0
}

function isAmber(a: AccentRgb): boolean {
  return a.r === 255 && a.g === 170 && a.b === 0
}

/** Âmbar: fundo escuro quente + borda âmbar (cartão despesas) */
const SPLASH_CARD_BG_AMBER = 'rgba(38, 32, 22, 0.92)'

export type GlassCardOpts = {
  padding?: string
  radius?: string
  borderAlpha?: number
  borderWidth?: string
}

export function glassCardStyle(accent: AccentRgb, opts?: GlassCardOpts): CSSProperties {
  const bw = opts?.borderWidth ?? '1px'
  const radius = opts?.radius ?? '12px'
  const pad = opts?.padding ?? '18px'

  if (isNeonGreen(accent)) {
    const ba = opts?.borderAlpha ?? 0.2
    return {
      padding: pad,
      borderRadius: radius,
      backgroundColor: SPLASH_CARD_BG_GREEN,
      border: `${bw} solid rgba(0, 255, 0, ${ba})`,
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      boxShadow: 'none',
    }
  }

  if (isAmber(accent)) {
    const ba = opts?.borderAlpha ?? 0.25
    return {
      padding: pad,
      borderRadius: radius,
      backgroundColor: SPLASH_CARD_BG_AMBER,
      border: `${bw} solid rgba(255, 170, 0, ${ba})`,
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      boxShadow: 'none',
    }
  }

  const { r, g, b } = accent
  const ba = opts?.borderAlpha ?? 0.22
  return {
    padding: pad,
    borderRadius: radius,
    backgroundColor: `rgba(${Math.round(28 + r * 0.03)}, ${Math.round(28 + g * 0.03)}, ${Math.round(26 + b * 0.03)}, 0.9)`,
    border: `${bw} solid rgba(${r}, ${g}, ${b}, ${ba})`,
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxShadow: 'none',
  }
}

/** Equipamento — interior; um pouco mais transparente, mesma borda verde da splash */
export function glassNestedStyle(accent: AccentRgb): CSSProperties {
  if (isNeonGreen(accent)) {
    return {
      padding: '12px',
      borderRadius: '10px',
      backgroundColor: 'rgba(30, 35, 30, 0.82)',
      border: `1px solid ${SPLASH_BORDER_GREEN}`,
      transition: 'border-color 0.2s ease',
      boxShadow: 'none',
    }
  }
  return glassCardStyle(accent, { padding: '12px', radius: '10px', borderAlpha: 0.22 })
}

/** Linha de relatório — compacto; mesmo esquema de borda */
export function glassInnerRowStyle(accent: AccentRgb): CSSProperties {
  if (isNeonGreen(accent)) {
    return {
      padding: '10px',
      borderRadius: '8px',
      backgroundColor: 'rgba(30, 35, 30, 0.72)',
      border: `1px solid ${SPLASH_BORDER_GREEN}`,
      transition: 'border-color 0.2s ease, background-color 0.2s ease',
      boxShadow: 'none',
    }
  }
  return glassCardStyle(accent, { padding: '10px', radius: '8px', borderAlpha: 0.2 })
}

/** Hover igual ao onMouseEnter dos cartões da splash: só borda; sem sombra */
export function glassCardHover(el: HTMLElement, accent: AccentRgb, hover: boolean, borderLo?: number, borderHi?: number) {
  if (isNeonGreen(accent)) {
    el.style.borderColor = hover ? SPLASH_BORDER_GREEN_HOVER : SPLASH_BORDER_GREEN
    el.style.boxShadow = 'none'
    return
  }
  if (isAmber(accent)) {
    const lo = borderLo ?? 0.25
    const hi = borderHi ?? 0.48
    el.style.borderColor = hover ? `rgba(255, 170, 0, ${hi})` : `rgba(255, 170, 0, ${lo})`
    el.style.boxShadow = 'none'
    return
  }
  const { r, g, b } = accent
  const lo = borderLo ?? 0.22
  const hi = borderHi ?? 0.45
  el.style.borderColor = hover ? `rgba(${r}, ${g}, ${b}, ${hi})` : `rgba(${r}, ${g}, ${b}, ${lo})`
  el.style.boxShadow = 'none'
}

export function glassInnerRowHover(el: HTMLElement, accent: AccentRgb, hover: boolean) {
  if (isNeonGreen(accent)) {
    el.style.borderColor = hover ? SPLASH_BORDER_GREEN_HOVER : SPLASH_BORDER_GREEN
    el.style.backgroundColor = hover ? 'rgba(30, 35, 30, 0.92)' : 'rgba(30, 35, 30, 0.72)'
    return
  }
  const { r, g, b } = accent
  el.style.borderColor = hover ? `rgba(${r}, ${g}, ${b}, 0.45)` : `rgba(${r}, ${g}, ${b}, 0.22)`
  el.style.backgroundColor = hover ? 'rgba(42, 36, 28, 0.95)' : 'rgba(38, 32, 22, 0.85)'
}
