'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { translateWithMyMemory } from '../lib/mymemory-translate'

const STORAGE_NATIVE = 'nonato-writing-native-lang'

export type WritingAssistLangOption = { code: string; name: string; flag: string }

type Labels = {
  title: string
  subtitle: string
  yourText: string
  placeholder: string
  wroteIn: string
  alsoNeed: string
  uiHint: string
  sameLang: string
  generate: string
  translating: string
  resultBase: string
  resultTranslated: string
  rememberNative: string
  close: string
  copyToClipboard: string
  copiedToClipboard: string
  fabTitle: string
  shortcutHint: string
  applyOriginalInField: string
  applyTranslatedInField: string
  fieldModeHint: string
}

type Props = {
  open: boolean
  onClose: () => void
  selectedLanguage: string
  languageOptions: WritingAssistLangOption[]
  labels: Labels
  translationError: string
  /** Quando definido, o modal abre com este texto e pode devolver ao campo */
  fieldInitialText?: string
  onApplyToField?: (text: string) => void
}

export function WritingLanguageAssistModal({
  open,
  onClose,
  selectedLanguage,
  languageOptions,
  labels,
  translationError,
  fieldInitialText = '',
  onApplyToField,
}: Props) {
  const [draft, setDraft] = useState('')
  const [wroteIn, setWroteIn] = useState('pt-BR')
  const [needIn, setNeedIn] = useState(selectedLanguage)
  const [rememberNative, setRememberNative] = useState(true)
  const [translated, setTranslated] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!open) return
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_NATIVE) : null
      if (saved && languageOptions.some((o) => o.code === saved)) {
        setWroteIn(saved)
      } else {
        setWroteIn('pt-BR')
      }
    } catch {
      setWroteIn('pt-BR')
    }
    setNeedIn(selectedLanguage)
    setDraft(typeof fieldInitialText === 'string' ? fieldInitialText : '')
    setTranslated('')
    setLoading(false)
    setToast('')
  }, [open, selectedLanguage, languageOptions, fieldInitialText])

  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [open, onClose])

  const samePair = wroteIn === needIn

  const doTranslate = useCallback(async () => {
    const src = draft.trim()
    if (!src || samePair) return
    setLoading(true)
    setTranslated('')
    try {
      const out = await translateWithMyMemory(src, wroteIn, needIn, translationError)
      setTranslated(out)
    } finally {
      setLoading(false)
    }
  }, [draft, wroteIn, needIn, samePair, translationError])

  const copyText = useCallback(async (text: string) => {
    const t = text.trim()
    if (!t) return
    try {
      await navigator.clipboard.writeText(t)
      setToast(labels.copiedToClipboard)
      setTimeout(() => setToast(''), 2200)
    } catch {
      setToast(labels.copyToClipboard)
    }
  }, [labels.copiedToClipboard, labels.copyToClipboard])

  const baseLabel = useMemo(() => {
    const o = languageOptions.find((x) => x.code === wroteIn)
    return `${labels.resultBase}${o ? ` (${o.flag} ${o.name})` : ''}`
  }, [languageOptions, wroteIn, labels.resultBase])

  const targetLabel = useMemo(() => {
    const o = languageOptions.find((x) => x.code === needIn)
    return `${labels.resultTranslated}${o ? ` (${o.flag} ${o.name})` : ''}`
  }, [languageOptions, needIn, labels.resultTranslated])

  if (!open) return null

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="writing-assist-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.88)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10200,
        padding: 'max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))',
      }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 720,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '2px solid rgba(74, 222, 128, 0.35)',
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #151a17 0%, #0d100e 100%)',
          borderRadius: 12,
          padding: '18px 20px 20px',
        }}
      >
        <h2 id="writing-assist-title" style={{ margin: '0 0 8px', fontSize: '18px', color: '#d8ffe8', letterSpacing: '0.02em' }}>
          {labels.title}
        </h2>
        <p style={{ margin: '0 0 6px', fontSize: '13px', color: 'rgba(220, 235, 225, 0.82)', lineHeight: 1.5 }}>
          {labels.subtitle}
        </p>
        <p style={{ margin: '0 0 16px', fontSize: '11px', color: 'rgba(154, 176, 162, 0.88)', lineHeight: 1.5 }}>
          {labels.shortcutHint}
          {onApplyToField ? (
            <>
              <br />
              <span style={{ color: 'rgba(134, 239, 172, 0.95)' }}>{labels.fieldModeHint}</span>
            </>
          ) : null}
        </p>

        <label style={{ display: 'block', fontSize: '12px', color: '#9ab0a2', marginBottom: '6px' }}>{labels.yourText}</label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={labels.placeholder}
          rows={5}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            marginBottom: '14px',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(74, 222, 128, 0.25)',
            background: '#0a0c0b',
            color: '#f0fff4',
            fontSize: '14px',
            resize: 'vertical',
            minHeight: '100px',
          }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#9ab0a2', marginBottom: '6px' }}>{labels.wroteIn}</label>
            <select
              value={wroteIn}
              onChange={(e) => {
                const v = e.target.value
                setWroteIn(v)
                if (rememberNative) {
                  try {
                    localStorage.setItem(STORAGE_NATIVE, v)
                  } catch {
                    // ignore
                  }
                }
              }}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid rgba(74, 222, 128, 0.25)',
                background: '#141816',
                color: '#fff',
                fontSize: '13px',
              }}
            >
              {languageOptions.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#9ab0a2', marginBottom: '6px' }}>
              {labels.alsoNeed}
              <span style={{ display: 'block', fontSize: '10px', color: 'rgba(154,176,162,0.75)', marginTop: '2px', fontWeight: 400 }}>
                {labels.uiHint}
              </span>
            </label>
            <select
              value={needIn}
              onChange={(e) => setNeedIn(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid rgba(74, 222, 128, 0.25)',
                background: '#141816',
                color: '#fff',
                fontSize: '13px',
              }}
            >
              {languageOptions.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {samePair && (
          <p style={{ fontSize: '12px', color: '#ffb86c', margin: '0 0 10px' }}>{labels.sameLang}</p>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#c5d4ca', marginBottom: '14px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={rememberNative}
            onChange={(e) => {
              const on = e.target.checked
              setRememberNative(on)
              if (on) {
                try {
                  localStorage.setItem(STORAGE_NATIVE, wroteIn)
                } catch {
                  // ignore
                }
              }
            }}
          />
          {labels.rememberNative}
        </label>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => void doTranslate()}
            disabled={loading || !draft.trim() || samePair}
            style={{
              padding: '12px 20px',
              fontWeight: 700,
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid rgba(74, 222, 128, 0.45)',
              background: loading ? 'rgba(40,60,48,0.5)' : 'linear-gradient(180deg, rgba(52,120,72,0.95) 0%, rgba(24,56,36,0.98) 100%)',
              color: '#fff',
              cursor: loading || !draft.trim() || samePair ? 'not-allowed' : 'pointer',
              opacity: loading || !draft.trim() || samePair ? 0.55 : 1,
            }}
          >
            {loading ? labels.translating : labels.generate}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '12px 18px',
              fontWeight: 600,
              fontSize: '13px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.06)',
              color: '#eee',
              cursor: 'pointer',
            }}
          >
            {labels.close}
          </button>
        </div>

        {(draft.trim() || translated) && (
          <div className="writing-assist-results-grid">
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#86efac', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {baseLabel}
                </span>
                <button
                  type="button"
                  onClick={() => void copyText(draft)}
                  disabled={!draft.trim()}
                  style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent',
                    color: '#ddd',
                    cursor: draft.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  {labels.copyToClipboard}
                </button>
              </div>
              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: '13px',
                  color: '#e8fff0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  minHeight: '80px',
                }}
              >
                {draft.trim() || '—'}
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#86efac', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {targetLabel}
                </span>
                <button
                  type="button"
                  onClick={() => void copyText(translated)}
                  disabled={!translated.trim()}
                  style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent',
                    color: '#ddd',
                    cursor: translated.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  {labels.copyToClipboard}
                </button>
              </div>
              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(20,40,28,0.45)',
                  border: '1px solid rgba(74, 222, 128, 0.22)',
                  fontSize: '13px',
                  color: '#e8fff0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  minHeight: '80px',
                }}
              >
                {translated.trim() || (loading ? '…' : '—')}
              </div>
            </div>
          </div>
        )}

        {onApplyToField && (draft.trim() || translated.trim()) && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              marginTop: '14px',
              paddingTop: '14px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={() => {
                onApplyToField(draft)
                onClose()
              }}
              style={{
                padding: '10px 14px',
                fontWeight: 600,
                fontSize: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.22)',
                background: 'rgba(255,255,255,0.06)',
                color: '#eef6f0',
                cursor: draft.trim() ? 'pointer' : 'not-allowed',
                opacity: draft.trim() ? 1 : 0.5,
              }}
            >
              {labels.applyOriginalInField}
            </button>
            <button
              type="button"
              disabled={!translated.trim()}
              onClick={() => {
                onApplyToField(translated.trim())
                onClose()
              }}
              style={{
                padding: '10px 14px',
                fontWeight: 700,
                fontSize: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(74, 222, 128, 0.45)',
                background: 'linear-gradient(180deg, rgba(40,88,56,0.9) 0%, rgba(22,48,32,0.95) 100%)',
                color: '#fff',
                cursor: translated.trim() ? 'pointer' : 'not-allowed',
                opacity: translated.trim() ? 1 : 0.5,
              }}
            >
              {labels.applyTranslatedInField}
            </button>
          </div>
        )}

        {toast ? (
          <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#86efac' }} role="status">
            {toast}
          </p>
        ) : null}
      </div>
    </div>
  )
}

/** Botão flutuante — exportado para usar no layout principal */
export function WritingAssistFab({
  onClick,
  title,
  hasBottomTabs,
  isCompact,
}: {
  onClick: () => void
  title: string
  hasBottomTabs?: boolean
  isCompact?: boolean
}) {
  const bottom = hasBottomTabs
    ? 'calc(88px + env(safe-area-inset-bottom, 0px))'
    : 'calc(22px + env(safe-area-inset-bottom, 0px))'
  return (
    <button
      type="button"
      data-ns-print-hide="1"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        position: 'fixed',
        zIndex: 10150,
        right: isCompact ? 12 : 18,
        bottom,
        width: 52,
        height: 52,
        borderRadius: '50%',
        border: '2px solid rgba(74, 222, 128, 0.45)',
        background: 'linear-gradient(165deg, rgba(28,52,38,0.95) 0%, rgba(12,22,16,0.98) 100%)',
        color: '#d8ffe8',
        fontSize: 22,
        cursor: 'pointer',
        boxShadow: '0 6px 24px rgba(0,0,0,0.45), 0 0 20px rgba(52, 211, 153, 0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        transition: 'transform 0.15s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)'
        e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.5), 0 0 26px rgba(52, 211, 153, 0.18)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.45), 0 0 20px rgba(52, 211, 153, 0.12)'
      }}
    >
      ✍️
    </button>
  )
}
