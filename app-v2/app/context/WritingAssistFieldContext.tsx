'use client'

import React, { createContext, useContext } from 'react'

export type WritingAssistFieldApi = {
  openForField: (initial: string, apply: (s: string) => void) => void
}

export const WritingAssistFieldContext = createContext<WritingAssistFieldApi | null>(null)

export function useWritingAssistField(): WritingAssistFieldApi {
  const v = useContext(WritingAssistFieldContext)
  if (!v) {
    return { openForField: () => {} }
  }
  return v
}
