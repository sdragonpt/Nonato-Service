'use client'

import React from 'react'

/** Separador entre «para que serve» e «como fazer» (mesmo em todos os idiomas). */
export const HELP_COMO_DELIMITER = '\n---COMO---\n'

type Props = {
  text: string
  titlePara: string
  titleComo: string
  titleResumo: string
}

export function HelpModalBody({ text, titlePara, titleComo, titleResumo }: Props) {
  const raw = (text || '').trim()
  if (!raw) return null

  const idx = raw.indexOf(HELP_COMO_DELIMITER)
  if (idx === -1) {
    return (
      <div className="help-modal-body">
        <h3
          style={{
            color: '#00ff88',
            fontSize: 15,
            margin: '0 0 12px',
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          {titleResumo}
        </h3>
        <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{raw}</p>
      </div>
    )
  }

  const para = raw.slice(0, idx).trim()
  const comoBlock = raw.slice(idx + HELP_COMO_DELIMITER.length).trim()
  const lines = comoBlock
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  return (
    <div className="help-modal-body">
      <section style={{ marginBottom: 22 }}>
        <h3
          style={{
            color: '#00ff88',
            fontSize: 15,
            margin: '0 0 10px',
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          {titlePara}
        </h3>
        <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{para}</p>
      </section>
      <section>
        <h3
          style={{
            color: '#00ff88',
            fontSize: 15,
            margin: '0 0 10px',
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          {titleComo}
        </h3>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
          {lines.map((line, i) => (
            <li key={i} style={{ marginBottom: 8 }}>
              {line.replace(/^[•\-\*]\s*/, '')}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
