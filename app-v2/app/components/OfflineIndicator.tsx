'use client'

import { useState, useEffect } from 'react'
import { isOnline, processSyncQueue, getPendingSyncCount } from '../utils/dataStorage'

export function OfflineIndicator() {
  const [online, setOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<number | null>(null)

  useEffect(() => {
    setOnline(isOnline())
    setPendingCount(getPendingSyncCount())

    const handleOnline = () => {
      setOnline(true)
      setSyncing(true)
      processSyncQueue().then(({ synced }) => {
        setPendingCount(getPendingSyncCount())
        setSyncing(false)
        if (synced > 0) setLastSync(Date.now())
      })
    }

    const handleOffline = () => {
      setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [online])

  useEffect(() => {
    if (!online) return
    const interval = setInterval(() => setPendingCount(getPendingSyncCount()), 5000)
    return () => clearInterval(interval)
  }, [online])

  // Esconder "Sincronizado" após 3 segundos
  useEffect(() => {
    if (lastSync && online && pendingCount === 0 && !syncing) {
      const t = setTimeout(() => setLastSync(null), 3000)
      return () => clearTimeout(t)
    }
  }, [lastSync, online, pendingCount, syncing])

  if (online && pendingCount === 0 && !syncing && !lastSync) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        padding: '10px 16px',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        ...(online
          ? {
              backgroundColor: syncing ? 'rgba(0, 150, 255, 0.9)' : 'rgba(0, 200, 100, 0.9)',
              color: '#fff',
            }
          : {
              backgroundColor: 'rgba(200, 80, 80, 0.95)',
              color: '#fff',
            }),
      }}
    >
      {!online ? (
        <>Modo offline — dados salvos localmente</>
      ) : syncing ? (
        <>Sincronizando...</>
      ) : pendingCount > 0 ? (
        <>{pendingCount} alteração(ões) a sincronizar</>
      ) : lastSync ? (
        <>Sincronizado</>
      ) : null}
    </div>
  )
}
