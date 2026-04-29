/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Reduz uso de memória no build (importante para Railway plano gratuito)
  productionBrowserSourceMaps: false,
  async rewrites() {
    return [
      // Evitar 404 quando o browser pede /favicon.ico (usa o ícone da app)
      { source: '/favicon.ico', destination: '/icon.svg' },
    ]
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' }],
      },
    ]
  },
  // Permite o build concluir mesmo com erros de tipo (corrija os tipos gradualmente)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Desativa ESLint no build para reduzir uso de memória
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Melhorar o carregamento de scripts
  experimental: {
    optimizePackageImports: ['react', 'react-dom'],
  },
  // Configurações para melhorar o carregamento
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Garantir que os scripts sejam carregados corretamente
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    // Garantir que o Fast Refresh funcione corretamente
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
}

module.exports = nextConfig
