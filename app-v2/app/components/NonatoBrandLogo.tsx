'use client'

import React from 'react'

/** Variantes visuais derivadas do ficheiro original (filtros CSS — mesma identidade, cor por situação). */
export type NonatoBrandVariant =
  | 'original'
  | 'sucesso'
  | 'alerta'
  | 'devedor'
  | 'financeiro'
  | 'informacao'

const VARIANT_CLASS: Record<NonatoBrandVariant, string> = {
  original: 'ns-brand-logo ns-brand-logo--original',
  sucesso: 'ns-brand-logo ns-brand-logo--sucesso',
  alerta: 'ns-brand-logo ns-brand-logo--alerta',
  devedor: 'ns-brand-logo ns-brand-logo--devedor',
  financeiro: 'ns-brand-logo ns-brand-logo--financeiro',
  informacao: 'ns-brand-logo ns-brand-logo--informacao',
}

export function NonatoBrandLogo({
  variant = 'original',
  className = '',
  alt = 'NONATO SERVICE',
  ...rest
}: {
  variant?: NonatoBrandVariant
  className?: string
  alt?: string
} & React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      src="/brand/nonato-logo-original.png"
      alt={alt}
      className={`${VARIANT_CLASS[variant] ?? VARIANT_CLASS.original} ${className}`.trim()}
      loading="lazy"
      decoding="async"
      {...rest}
    />
  )
}
