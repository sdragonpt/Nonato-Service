'use client'

import React from 'react'
import Link from 'next/link'

export default function PaginaEmpresa() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#121212',
        color: '#fff',
        padding: '24px 20px 48px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Link voltar */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '32px',
            color: '#00ff00',
            textDecoration: 'none',
            fontSize: '14px',
            border: '1px solid rgba(0, 255, 0, 0.5)',
            padding: '8px 16px',
            borderRadius: '8px',
          }}
        >
          ← Voltar ao sistema
        </Link>

        {/* Título principal */}
        <h1
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            fontWeight: 700,
            color: '#00ff00',
            marginBottom: '8px',
            textShadow: '0 0 20px rgba(0, 255, 0, 0.3)',
          }}
        >
          NONATO SERVICE
        </h1>
        <p
          style={{
            fontSize: '1.1rem',
            color: '#aaa',
            marginBottom: '32px',
          }}
        >
          Assistência técnica em equipamentos do grupo HOMAG — CNC, Orladoras e Seccionadoras
        </p>

        {/* Blocos de serviços */}
        <section
          style={{
            background: '#1a1a1a',
            border: '1px solid rgba(0, 255, 0, 0.25)',
            borderRadius: '12px',
            padding: '20px 24px',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ color: '#00ff00', fontSize: '1.1rem', marginBottom: '12px', fontWeight: 600 }}>
            Vendas de equipamentos de segunda mão
          </h2>
          <p style={{ color: '#ddd', lineHeight: 1.7, margin: 0 }}>
            Equipamentos usados com duas opções: <strong style={{ color: '#fff' }}>venda no estado em que se encontram</strong> ou <strong style={{ color: '#fff' }}>com revisão feita nas instalações do cliente</strong>, conforme a sua necessidade.
          </p>
        </section>

        <section
          style={{
            background: '#1a1a1a',
            border: '1px solid rgba(0, 255, 0, 0.25)',
            borderRadius: '12px',
            padding: '20px 24px',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ color: '#00ff00', fontSize: '1.1rem', marginBottom: '12px', fontWeight: 600 }}>
            Venda, manutenção e instalação
          </h2>
          <p style={{ color: '#ddd', lineHeight: 1.7, margin: 0 }}>
            Serviço completo: venda de equipamentos, instalação e manutenção contínua para garantir o melhor desempenho do seu parque industrial.
          </p>
        </section>

        <section
          style={{
            background: '#1a1a1a',
            border: '1px solid rgba(0, 255, 0, 0.25)',
            borderRadius: '12px',
            padding: '20px 24px',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ color: '#00ff00', fontSize: '1.1rem', marginBottom: '12px', fontWeight: 600 }}>
            Manutenção corretiva e preventiva
          </h2>
          <p style={{ color: '#ddd', lineHeight: 1.7, margin: 0 }}>
            Manutenção corretiva e preventiva acompanhada de um <strong style={{ color: '#fff' }}>sistema de checklist</strong>. O cliente fica sempre a par de tudo o que acontece com o seu equipamento através de um <strong style={{ color: '#fff' }}>histórico completo e transparente</strong>.
          </p>
        </section>

        {/* Visita a trabalhos executados */}
        <section
          style={{
            background: 'linear-gradient(135deg, #1a1a1a 0%, #0f1a0f 100%)',
            border: '2px solid rgba(0, 255, 0, 0.4)',
            borderRadius: '12px',
            padding: '24px 24px',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ color: '#00ff00', fontSize: '1.2rem', marginBottom: '12px', fontWeight: 700 }}>
            Visita a trabalhos executados
          </h2>
          <p style={{ color: '#ddd', lineHeight: 1.7, margin: 0 }}>
            Espaço dedicado à divulgação dos trabalhos realizados: intervenções, revisões e instalações. Em breve poderá consultar aqui uma seleção de projetos e intervenções concluídas.
          </p>
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              background: 'rgba(0, 255, 0, 0.06)',
              border: '1px dashed rgba(0, 255, 0, 0.35)',
              borderRadius: '8px',
              color: '#aaa',
              fontSize: '0.95rem',
            }}
          >
            Esta secção será preenchida com casos de estudo e registos de trabalhos executados.
          </div>
        </section>

        <p style={{ textAlign: 'center', color: '#666', fontSize: '13px', marginTop: '32px' }}>
          BOA TRADE — Gestão Técnica
        </p>
      </div>
    </div>
  )
}
