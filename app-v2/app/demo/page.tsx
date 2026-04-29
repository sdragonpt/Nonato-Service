'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'

export default function DemoWelcomePage() {
  const searchParams = useSearchParams()
  const rid = searchParams.get('rid')?.trim()
  const activateHref = rid ? `/api/demo/activate?rid=${encodeURIComponent(rid)}` : '/api/demo/activate'

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          background: '#1a1a1a',
          border: '1px solid rgba(0, 255, 0, 0.3)',
          borderRadius: '16px',
          padding: '40px 32px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 255, 0, 0.08)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '48px',
            marginBottom: '20px',
            lineHeight: 1,
          }}
        >
          🔒
        </div>
        <h1
          style={{
            color: '#00ff00',
            fontSize: '1.5rem',
            fontWeight: 700,
            marginBottom: '16px',
          }}
        >
          Acesso de demonstração
        </h1>
        <p
          style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: '1.1rem',
            lineHeight: 1.6,
            marginBottom: '24px',
          }}
        >
          O seu acesso é válido apenas por <strong style={{ color: '#00ff00' }}>15 dias</strong>.
        </p>
        <p
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.95rem',
            lineHeight: 1.5,
            marginBottom: '32px',
          }}
        >
          Os dados desta demonstração ficam isolados e não afetam outros utilizadores. Ao clicar em
          &quot;Aceitar e entrar&quot;, concorda com estes termos.
        </p>
        <div
          style={{
            marginBottom: '24px',
            padding: '16px 18px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(255,255,255,0.04) 100%)',
            border: '1px solid rgba(255,215,0,0.28)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
              padding: '6px 10px',
              borderRadius: '999px',
              background: 'rgba(255,215,0,0.12)',
              border: '1px solid rgba(255,215,0,0.25)',
              color: '#ffd76a',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <span>■</span>
            <span>Propriedade Intelectual Protegida</span>
          </div>
          <p style={{ margin: 0, color: '#fff', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Este programa pertence a <strong style={{ color: '#00ff00' }}>NONATO SERVICE</strong> e ao seu criador
            {' '}<strong style={{ color: '#00ff00' }}>Nonato</strong>. Todos os direitos reservados. A sua reprodução,
            cópia, distribuição, modificação, cedência ou utilização sem autorização expressa é proibida e poderá
            originar medidas legais.
          </p>
        </div>
        {/* Link direto para forçar pedido completo e gravação dos cookies no browser */}
        <a
          href={activateHref}
          style={{
            display: 'inline-block',
            padding: '14px 32px',
            background: '#00ff00',
            color: '#000',
            fontWeight: 700,
            fontSize: '1rem',
            borderRadius: '8px',
            textDecoration: 'none',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(0, 255, 0, 0.3)',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#00cc00'
            e.currentTarget.style.transform = 'scale(1.02)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#00ff00'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          Aceitar e entrar
        </a>
      </div>
    </div>
  )
}
