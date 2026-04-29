'use client'

import { useEffect } from 'react'

/**
 * Desloca o botão "Adicionar serviços" (Criação de Checklist por Grupos) para baixo.
 * Como o CSS por seletor pode não bater no DOM do React, aplicamos o estilo via JS.
 */
export function AdicionarServicosStyle() {
  useEffect(() => {
    const apply = () => {
      document.querySelectorAll('button').forEach((btn) => {
        const text = (btn.textContent || '').trim()
        if (text === 'Adicionar serviços' || text.includes('Adicionar serviços')) {
          const el = btn as HTMLElement
          el.style.marginTop = '70px'
          el.style.display = 'block'
        }
      })
    }

    apply()
    const t1 = setTimeout(apply, 500)
    const t2 = setTimeout(apply, 1500)
    const t3 = setTimeout(apply, 3000)

    const observer = new MutationObserver(() => apply())
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      observer.disconnect()
    }
  }, [])

  return null
}
