'use client'

import React from 'react'
import { useWritingAssistField } from '../context/WritingAssistFieldContext'

const assistBtnStyle: React.CSSProperties = {
  flexShrink: 0,
  width: 44,
  minWidth: 44,
  height: 44,
  marginTop: 2,
  padding: 0,
  backgroundColor: 'rgba(18, 44, 28, 0.95)',
  border: '1px solid rgba(74, 222, 128, 0.35)',
  borderRadius: '8px',
  color: '#d8ffe8',
  fontSize: '20px',
  cursor: 'pointer',
  lineHeight: 1,
}

const assistBtnStyleInline: React.CSSProperties = {
  ...assistBtnStyle,
  marginTop: 0,
  height: 40,
  alignSelf: 'stretch',
}

type TextareaRest = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'onChange' | 'children'
>

export function AssistTextarea(
  props: TextareaRest & {
    value: string
    onValueChange: (v: string) => void
    /** false = sem botão (ex.: só leitura) */
    showAssist?: boolean
    assistButtonTitle?: string
  }
) {
  const { value, onValueChange, showAssist = true, assistButtonTitle = 'Tradução assistida para este campo', ...rest } =
    props
  const { openForField } = useWritingAssistField()

  if (showAssist === false || rest.readOnly) {
    return <textarea {...rest} value={value} onChange={(e) => onValueChange(e.target.value)} />
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-start',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <textarea
        {...rest}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        style={{
          ...(rest.style as React.CSSProperties),
          flex: 1,
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      />
      <button
        type="button"
        title={assistButtonTitle}
        aria-label={assistButtonTitle}
        onClick={() => openForField(value, onValueChange)}
        style={assistBtnStyle}
      >
        🌐
      </button>
    </div>
  )
}

type InputRest = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'children' | 'type'
> & {
  value: string
  onValueChange: (v: string) => void
  type?: 'text' | 'email' | 'search' | 'url' | 'tel' | 'password'
  showAssist?: boolean
  assistButtonTitle?: string
}

export function AssistInput(props: InputRest) {
  const {
    value,
    onValueChange,
    type = 'text',
    showAssist = true,
    assistButtonTitle = 'Tradução assistida para este campo',
    ...rest
  } = props
  const { openForField } = useWritingAssistField()

  /** Palavras-passe: nunca enviar conteúdo ao assistente por defeito. */
  const textLike =
    type !== 'password' &&
    (type === 'text' || type === 'email' || type === 'search' || type === 'url' || type === 'tel')

  if (showAssist === false || rest.readOnly || !textLike) {
    return <input {...rest} type={type} value={value} onChange={(e) => onValueChange(e.target.value)} />
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'stretch',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <input
        {...rest}
        type={type}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        style={{
          ...(rest.style as React.CSSProperties),
          flex: 1,
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      />
      <button
        type="button"
        title={assistButtonTitle}
        aria-label={assistButtonTitle}
        onClick={() => openForField(value, onValueChange)}
        style={assistBtnStyleInline}
      >
        🌐
      </button>
    </div>
  )
}
