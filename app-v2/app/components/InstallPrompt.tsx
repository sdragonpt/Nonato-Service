'use client'

import { useEffect, useState, useRef } from 'react'

const STORAGE_KEY = 'nonato-install-prompt-dismissed'
const DISMISS_DAYS = 7

const texts: Record<string, { installApp: string; installDesc: string; installNow: string; addToHome: string; iosHint: string; iosSafariHint: string; androidHint: string; desktopHint: string; later: string; close: string }> = {
  pt: {
    installApp: 'Instalar a app',
    installDesc: 'Use no telemóvel, tablet ou computador. Funciona no Firefox, Chrome e Edge.',
    installNow: 'Instalar agora',
    addToHome: 'Adicionar ao ecrã inicial',
    iosHint: 'No iPhone/iPad: Safari → Partilhar (□↑) → "Adicionar ao Ecrã Inicial"',
    iosSafariHint: 'No iPhone/iPad, use o Safari para adicionar à tela inicial e ter a melhor compatibilidade.',
    androidHint: 'No Android: Firefox ou Chrome → Menu (⋮) → "Instalar app" ou "Adicionar ao ecrã inicial"',
    desktopHint: 'No computador: Firefox, Chrome ou Edge → menu (⋮) → "Instalar" ou "Guardar como"',
    later: 'Agora não',
    close: 'Fechar'
  },
  en: {
    installApp: 'Install the app',
    installDesc: 'Use on phone, tablet or computer. Works in Firefox, Chrome and Edge.',
    installNow: 'Install now',
    addToHome: 'Add to home screen',
    iosHint: 'On iPhone/iPad: Safari → Share (□↑) → "Add to Home Screen"',
    iosSafariHint: 'On iPhone/iPad, use Safari to add it to the home screen and get the best compatibility.',
    androidHint: 'On Android: Firefox or Chrome → Menu (⋮) → "Install app" or "Add to home screen"',
    desktopHint: 'On computer: Firefox, Chrome or Edge → menu (⋮) → "Install" or "Save as"',
    later: 'Not now',
    close: 'Close'
  },
  es: {
    installApp: 'Instalar la app',
    installDesc: 'Úsala en móvil, tablet o ordenador. Funciona en Firefox, Chrome y Edge.',
    installNow: 'Instalar ahora',
    addToHome: 'Añadir a la pantalla de inicio',
    iosHint: 'En iPhone/iPad: Safari → Compartir (□↑) → "Añadir a la pantalla de inicio"',
    iosSafariHint: 'En iPhone/iPad, usa Safari para añadirla a la pantalla de inicio y tener la mejor compatibilidad.',
    androidHint: 'En Android: Firefox o Chrome → Menú (⋮) → "Instalar aplicación" o "Añadir a la pantalla de inicio"',
    desktopHint: 'En ordenador: Firefox, Chrome o Edge → menú (⋮) → "Instalar" o "Guardar como"',
    later: 'Ahora no',
    close: 'Cerrar'
  },
  fr: {
    installApp: 'Installer l\'app',
    installDesc: 'Utilisez sur téléphone, tablette ou ordinateur. Fonctionne avec Firefox, Chrome et Edge.',
    installNow: 'Installer',
    addToHome: 'Ajouter à l\'écran d\'accueil',
    iosHint: 'Sur iPhone/iPad : Safari → Partager (□↑) → "Sur l\'écran d\'accueil"',
    iosSafariHint: 'Sur iPhone/iPad, utilisez Safari pour l’ajouter à l’écran d’accueil et obtenir la meilleure compatibilité.',
    androidHint: 'Sur Android : Firefox ou Chrome → Menu (⋮) → "Installer l\'application"',
    desktopHint: 'Sur ordinateur : Firefox, Chrome ou Edge → menu (⋮) → "Installer"',
    later: 'Plus tard',
    close: 'Fermer'
  },
  it: {
    installApp: 'Installa l\'app',
    installDesc: 'Usa su telefono, tablet o computer. Funziona con Firefox, Chrome e Edge.',
    installNow: 'Installa ora',
    addToHome: 'Aggiungi alla schermata Home',
    iosHint: 'Su iPhone/iPad: Safari → Condividi (□↑) → "Aggiungi a Home"',
    iosSafariHint: 'Su iPhone/iPad, usa Safari per aggiungerla alla schermata Home e avere la migliore compatibilità.',
    androidHint: 'Su Android: Firefox o Chrome → Menu (⋮) → "Installa app"',
    desktopHint: 'Su computer: Firefox, Chrome o Edge → menu (⋮) → "Installa"',
    later: 'Ora no',
    close: 'Chiudi'
  },
  de: {
    installApp: 'App installieren',
    installDesc: 'Auf Handy, Tablet oder Computer nutzen. Läuft in Firefox, Chrome und Edge.',
    installNow: 'Jetzt installieren',
    addToHome: 'Zum Startbildschirm',
    iosHint: 'Auf iPhone/iPad: Safari → Teilen (□↑) → "Zum Home-Bildschirm"',
    iosSafariHint: 'Auf iPhone/iPad Safari verwenden, um die App zum Startbildschirm hinzuzufügen und die beste Kompatibilität zu erhalten.',
    androidHint: 'Auf Android: Firefox oder Chrome → Menü (⋮) → "App installieren"',
    desktopHint: 'Am Computer: Firefox, Chrome oder Edge → Menü (⋮) → "Installieren"',
    later: 'Später',
    close: 'Schließen'
  }
}

function getLang(): string {
  if (typeof window === 'undefined') return 'pt'
  const lang = navigator.language || (navigator as any).userLanguage || ''
  if (lang.startsWith('pt')) return 'pt'
  if (lang.startsWith('es')) return 'es'
  if (lang.startsWith('fr')) return 'fr'
  if (lang.startsWith('it')) return 'it'
  if (lang.startsWith('de')) return 'de'
  return 'en'
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showCard, setShowCard] = useState(false)
  const [canShow, setCanShow] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [isSafari, setIsSafari] = useState(false)
  const mounted = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const check = () => setIsMobileOrTablet(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    mounted.current = true

    const standalone = (window.matchMedia('(display-mode: standalone)').matches) ||
      (navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    const ua = window.navigator.userAgent || ''
    const ios = /iPad|iPhone|iPod/.test(ua) || ((navigator.platform === 'MacIntel') && navigator.maxTouchPoints > 1)
    const safari = /^((?!chrome|android).)*safari/i.test(ua)
    setIsIos(ios)
    setIsSafari(safari)
    setIsStandalone(standalone)
    if (standalone) {
      setCanShow(false)
      setInstalled(true)
      return
    }

    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed) {
      const t = parseInt(dismissed, 10)
      if (Date.now() - t < DISMISS_DAYS * 24 * 60 * 60 * 1000) setCanShow(false)
    }
    setCanShow(true)

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      mounted.current = false
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
    setShowCard(false)
  }

  const handleDismiss = () => {
    setShowCard(false)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, Date.now().toString())
    setCanShow(false)
  }

  const t = texts[getLang()] || texts.pt

  if (!canShow || installed || isStandalone) return null

  return (
    <div data-ns-print-hide="1">
      {/* Botão flutuante "Instalar a app" */}
      <button
        type="button"
        onClick={() => setShowCard(true)}
        aria-label={t.installApp}
        style={{
          position: 'fixed',
          bottom: 80,
          right: 16,
          zIndex: 9998,
          padding: '12px 20px',
          background: 'linear-gradient(135deg, rgba(0, 200, 0, 0.9) 0%, rgba(0, 120, 0, 0.95) 100%)',
          color: '#fff',
          border: '2px solid rgba(0, 255, 0, 0.6)',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0, 255, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          touchAction: 'manipulation'
        }}
      >
        <span style={{ fontSize: 20 }}>📲</span>
        {t.installApp}
      </button>

      {/* Card / modal com instruções */}
      {showCard && (
        <div
          role="dialog"
          aria-label={t.installApp}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 16,
            paddingBottom: 100,
            boxSizing: 'border-box'
          }}
          onClick={() => setShowCard(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1a1a1a',
              borderRadius: 16,
              border: '2px solid rgba(0, 255, 0, 0.5)',
              padding: 24,
              maxWidth: 400,
              width: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: '#00ff00', fontSize: 18 }}>📲 {t.installApp}</h3>
              <button type="button" onClick={() => setShowCard(false)} aria-label={t.close} style={{ background: 'transparent', border: 'none', color: '#999', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <p style={{ color: '#ccc', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>{t.installDesc}</p>

            {deferredPrompt ? (
              <button
                type="button"
                onClick={handleInstall}
                style={{
                  width: '100%',
                  padding: 14,
                  background: '#00aa00',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: 'pointer',
                  marginBottom: 12
                }}
              >
                {t.installNow}
              </button>
            ) : (
              <>
                <p style={{ color: '#00ff00', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>{t.addToHome}</p>
                {isMobileOrTablet ? (
                  <>
                    {isIos ? (
                      <>
                        {!isSafari && (
                          <p style={{ color: '#ffd166', fontSize: 12, marginBottom: 8 }}>{t.iosSafariHint}</p>
                        )}
                        <p style={{ color: '#aaa', fontSize: 12, marginBottom: 16 }}>{t.iosHint}</p>
                      </>
                    ) : (
                      <p style={{ color: '#aaa', fontSize: 12, marginBottom: 16 }}>{t.androidHint}</p>
                    )}
                  </>
                ) : (
                  <p style={{ color: '#aaa', fontSize: 12, marginBottom: 16 }}>{t.desktopHint}</p>
                )}
              </>
            )}

            <button type="button" onClick={handleDismiss} style={{ width: '100%', padding: 10, background: 'transparent', color: '#888', border: '1px solid #555', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
              {t.later}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
