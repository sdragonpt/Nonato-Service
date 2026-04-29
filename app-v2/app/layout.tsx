import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AdicionarServicosStyle } from './AdicionarServicosStyle'
import { RegisterSW } from './RegisterSW'
import { OfflineIndicator } from './components/OfflineIndicator'
import { InstallPrompt } from './components/InstallPrompt'

// Evita pré-renderização pesada no build (reduz memória no Railway)
export const dynamic = 'force-dynamic'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  themeColor: '#00ff00',
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'NONATO SERVICE',
  description: 'Sistema de Gestão Técnica — funciona no telefone, tablet e notebook',
  manifest: '/manifest.json',
  /** Favicon / PWA: app/icon.svg + public/icon.svg (logo em public/brand/nonato-logo-original.png) */
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/brand/nonato-logo-original.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NONATO SERVICE',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/brand/nonato-logo-original.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="NONATO SERVICE" />
        <meta name="theme-color" content="#00ff00" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body suppressHydrationWarning>
        {children}
        <AdicionarServicosStyle />
        <RegisterSW />
        <InstallPrompt />
        <OfflineIndicator />
      </body>
    </html>
  )
}
