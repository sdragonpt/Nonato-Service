'use client'

import { useEffect, useState, useRef } from 'react'
import { processSyncQueue } from './utils/dataStorage'

// Bumpar este número em cada deploy para forçar atualização no telemóvel
const SW_VERSION = 12

export function RegisterSW() {
  const [updateReady, setUpdateReady] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const reloadHandled = useRef(false)
  const updateTriggered = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker
        .register(`/sw.js?v=${SW_VERSION}`)
        .then((reg) => {
          setRegistration(reg)
          const activateWaitingWorker = () => {
            if (!reg.waiting || updateTriggered.current) return
            updateTriggered.current = true
            setUpdateReady(true)
            reg.waiting.postMessage({ type: 'SKIP_WAITING' })
          }

          if (reg.waiting) activateWaitingWorker()
          // Verificar atualizações imediatamente e quando voltar ao app (importante no mobile)
          reg.update()
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            if (!newWorker) return
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                activateWaitingWorker()
              }
            })
          })
        })
        .catch((err) => console.warn('PWA: Registo falhou:', err))
    }
    register()

    const onControllerChange = () => {
      if (reloadHandled.current) return
      reloadHandled.current = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        navigator.serviceWorker.ready.then((reg) => reg.update())
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const interval = window.setInterval(() => {
      if (navigator.onLine) {
        navigator.serviceWorker.ready.then((reg) => reg.update()).catch(() => {})
      }
    }, 60_000)

    if (navigator.onLine) {
      processSyncQueue().then(() => {})
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.clearInterval(interval)
    }
  }, [])

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      // Fallback para mobile: controllerchange pode não disparar em alguns telemóveis
      setTimeout(() => {
        if (!reloadHandled.current) window.location.reload()
      }, 1500)
    }
  }

  if (!updateReady) return null
  return (
    <div
      className="pwa-update-banner"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        background: 'linear-gradient(135deg, #00aa00 0%, #006600 100%)',
        color: '#fff',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        fontSize: 15,
        fontWeight: 600
      }}
    >
      <span>Atualização disponível</span>
      <button
        onClick={handleUpdate}
        style={{
          padding: '10px 24px',
          background: '#fff',
          color: '#006600',
          border: 'none',
          borderRadius: 8,
          fontWeight: 700,
          cursor: 'pointer',
          fontSize: 14
        }}
      >
        ATUALIZAR
      </button>
    </div>
  )
}
