'use client'

import React from 'react'

export type UiIconProps = {
  className?: string
  size?: number
  title?: string
}

const S = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.65,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function Shell({ size, className, title, children }: UiIconProps & { children: React.ReactNode }) {
  const hidden = !title
  return (
    <svg
      width={size ?? 20}
      height={size ?? 20}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden={hidden}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

export function IconHome({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-8H9v8H4a1 1 0 0 1-1-1v-9.5z" {...S} />
    </Shell>
  )
}

export function IconHelpCircle({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <circle cx="12" cy="12" r="9" {...S} />
      <path d="M9.5 9.3a2.6 2.6 0 0 1 5 .1c0 2-3 1.8-3 4.1M12 17.2h.01" {...S} strokeWidth={1.8} />
    </Shell>
  )
}

export function IconSettings({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <circle cx="12" cy="12" r="3" {...S} />
      <path
        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        {...S}
      />
    </Shell>
  )
}

export function IconSparkles({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M12 2 13.4 8.6 20 10l-6.6 1.4L12 18l-1.4-6.6L4 10l6.6-1.4L12 2z" {...S} />
    </Shell>
  )
}

export function IconUser({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <circle cx="12" cy="8" r="3.5" {...S} />
      <path d="M5.5 20.5c.8-4 3.6-6.5 6.5-6.5s5.7 2.5 6.5 6.5" {...S} />
    </Shell>
  )
}

export function IconUsers({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <circle cx="8" cy="8" r="2.8" {...S} />
      <circle cx="16" cy="8" r="2.8" {...S} />
      <path d="M3 20c.7-3.2 2.8-5 5-5m8 0c2.2 0 4.3 1.8 5 5" {...S} />
    </Shell>
  )
}

export function IconBuilding2({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M4 21V8l5-2v15M9 21V6l5 2v13M14 21V9l5-1v13M4 21h16" {...S} />
      <path d="M7 13h1M7 17h1M12 12h1M12 16h1M17 11h1M17 15h1" {...S} strokeWidth={1.2} />
    </Shell>
  )
}

export function IconClipboardList({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M9 4h6l1 2h2a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a1 1 0 0 1 1-1h2l1-2z" {...S} />
      <path d="M9 4a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1M9 12h6M9 16h4" {...S} />
    </Shell>
  )
}

export function IconTrendingUp({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M4 16 9 11l3 3 6-6M14 8h4v4" {...S} />
    </Shell>
  )
}

export function IconFileText({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5z" {...S} />
      <path d="M14 2v5h5M9 13h6M9 17h4" {...S} />
    </Shell>
  )
}

export function IconWrench({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path
        d="M14.7 6.3a4 4 0 0 0-5.6 5.6L5 16l2 2 4.1-4.1a4 4 0 0 0 5.6-5.6l-2.1 2.1-2-2 2.1-2.1z"
        {...S}
      />
    </Shell>
  )
}

export function IconPackage({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M12 22V12M12 12 3 7l9-5 9 5-9 5" {...S} />
      <path d="M3 7v10l9 5 9-5V7" {...S} />
    </Shell>
  )
}

export function IconCalendar({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <rect x="4" y="5" width="16" height="15" rx="2" {...S} />
      <path d="M8 3v4M16 3v4M4 11h16" {...S} />
    </Shell>
  )
}

export function IconListChecks({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M10 6h10M10 12h10M10 18h6" {...S} />
      <path d="M4 6l1.5 1.5L8 4M4 12l1.5 1.5L8 10M4 18l2-2" {...S} />
    </Shell>
  )
}

export function IconHardHat({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M6 15h12v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-2zM4 13c0-4 3.5-7 8-7s8 3 8 7" {...S} />
      <path d="M9 10h6" {...S} />
    </Shell>
  )
}

export function IconMessageCircle({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" {...S} />
    </Shell>
  )
}

export function IconGlobe({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <circle cx="12" cy="12" r="9" {...S} />
      <path d="M3 12h18M12 3a14 14 0 0 0 0 18M12 3a14 14 0 0 1 0 18" {...S} />
    </Shell>
  )
}

export function IconBookOpen({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M12 6V4.5 19M12 6c1.5-1 4-1.5 6-1 2 .5 3 2 3 3.5V19c-2 .5-4.5 0-6-1.5M12 6C10.5 5 8 4.5 6 5 4 5.5 3 7 3 8.5V19c2 .5 4.5 0 6-1.5" {...S} />
    </Shell>
  )
}

export function IconFiles({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M8 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2" {...S} />
      <path d="M10 4h6l3 3v9a2 2 0 0 1-2 2h-7V4z" {...S} />
    </Shell>
  )
}

export function IconRefreshCw({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" {...S} />
      <path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" {...S} />
      <path d="M16 21h5v-5" {...S} />
    </Shell>
  )
}

export function IconWarehouse({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M3 10 12 4l9 6v10H3V10z" {...S} />
      <path d="M9 22V12h6v10" {...S} />
    </Shell>
  )
}

export function IconIdCard({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <rect x="3" y="5" width="18" height="14" rx="2" {...S} />
      <circle cx="9" cy="12" r="2" {...S} />
      <path d="M14 10h4M14 14h4" {...S} />
    </Shell>
  )
}

export function IconUpload({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M12 16V4m0 0 4 4m-4-4L8 8M4 20h16" {...S} />
    </Shell>
  )
}

export function IconSend({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" {...S} />
    </Shell>
  )
}

export function IconScrollText({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M8 21h12a2 2 0 0 0 2-2v-9H8v11zM8 21H6a2 2 0 0 1-2-2v-9h4" {...S} />
      <path d="M10 9h8M10 13h8M10 17h5" {...S} />
    </Shell>
  )
}

export function IconFolderArchive({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.5L10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" {...S} />
      <path d="M10 11v6M7 14h6" {...S} />
    </Shell>
  )
}

export function IconLibrary({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" {...S} />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" {...S} />
      <path d="M8 7h8M8 11h6" {...S} />
    </Shell>
  )
}

export function IconFolderX({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.5L10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" {...S} />
      <path d="m14.5 12.5 3 3m0-3-3 3" {...S} />
    </Shell>
  )
}

export function IconCoins({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <ellipse cx="8" cy="8" rx="5" ry="3" {...S} />
      <path d="M3 11v4c0 1.7 2.2 3 5 3s5-1.3 5-3v-4" {...S} />
      <ellipse cx="16" cy="10" rx="5" ry="3" {...S} />
      <path d="M11 13v3c0 1.2 1.6 2.2 3.5 2.5" {...S} />
    </Shell>
  )
}

export function IconEye({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" {...S} />
      <circle cx="12" cy="12" r="3" {...S} />
    </Shell>
  )
}

export function IconMap({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M9 4 3 6v15l6-2 6 2 6-2V3l-6 2-6-2z" {...S} />
      <path d="M9 4v15M15 6v15" {...S} />
    </Shell>
  )
}

export function IconGrid3({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <rect x="4" y="4" width="6" height="6" rx="1" {...S} />
      <rect x="14" y="4" width="6" height="6" rx="1" {...S} />
      <rect x="4" y="14" width="6" height="6" rx="1" {...S} />
      <rect x="14" y="14" width="6" height="6" rx="1" {...S} />
    </Shell>
  )
}

export function IconBadgeCheck({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M12 22c5.5-2.5 8-7 8-11V5l-8-3-8 3v6c0 4 2.5 8.5 8 11z" {...S} />
      <path d="m9 12 2 2 4-4" {...S} />
    </Shell>
  )
}

export function IconFolderTree({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M4 20h16a1 1 0 0 0 1-1v-3a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3a1 1 0 0 0 1 1zM8 4h3l2 2h7v4" {...S} />
    </Shell>
  )
}

export function IconPlusCircle({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <circle cx="12" cy="12" r="9" {...S} />
      <path d="M12 8v8M8 12h8" {...S} />
    </Shell>
  )
}

export function IconBell({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M14 20a2 2 0 0 1-4 0M6 8a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7" {...S} />
    </Shell>
  )
}

export function IconInbox({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M22 12h-4l-2-4H8L6 12H2" {...S} />
      <path d="M2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6" {...S} />
      <path d="M12 3v5" {...S} />
    </Shell>
  )
}

export function IconLayers({ className, size = 20, title }: UiIconProps) {
  return (
    <Shell size={size} className={className} title={title}>
      <path d="M12 4 2 9l10 5 10-5-10-5zM2 14l10 5 10-5M2 19l10 5 10-5" {...S} />
    </Shell>
  )
}

type IconComp = React.FC<UiIconProps>

const TAB_ICONS: Record<string, IconComp> = {
  administrador: IconSettings,
  'gestao-demos': IconSparkles,
  clientes: IconUser,
  fornecedores: IconBuilding2,
  'relatorio-servico': IconClipboardList,
  'gestao-financeira': IconTrendingUp,
  'clientes-financeiro': IconTrendingUp,
  'comprovantes-despesas': IconFileText,
  'orcamentos-avulso': IconFileText,
  'pedido-orcamentos-avulso': IconInbox,
  'orcamento-servico-tecnico': IconWrench,
  'registro-despesas': IconTrendingUp,
  equipamentos: IconWrench,
  'biblioteca-pecas': IconPackage,
  agenda: IconCalendar,
  checklist: IconListChecks,
  'pre-checklist': IconListChecks,
  'checklist-hub': IconListChecks,
  'alerta-mensagens': IconBell,
  gestores: IconHardHat,
  'comunicacao-interna': IconMessageCircle,
  translator: IconGlobe,
  'manual-programa': IconBookOpen,
  'protocolos-servico': IconFiles,
  desmontados: IconRefreshCw,
  'almoxarifado-armazem': IconWarehouse,
  'fechamento-relatorios-servicos': IconFolderArchive,
  'biblioteca-relatorios': IconLibrary,
  'gestao-custos': IconCoins,
  'cadastro-nonato-service': IconBuilding2,
  'ficha-cadastral': IconIdCard,
  'pecas-substituicao': IconPackage,
  'importacao-pecas': IconUpload,
  'solicitacao-servico-tecnico': IconSend,
  'cadastro-servicos': IconScrollText,
  'estado-visual-tecnico': IconEye,
  'informacoes-conhecimento-tecnicos': IconBookOpen,
  'relatorios-excluidos-clientes': IconFolderX,
  'mapa-visual-separacao-pecas': IconMap,
  'ordem-preparacao': IconClipboardList,
  'formularios-checklist-tecnicos': IconGrid3,
  'verificacao-final-entrega': IconBadgeCheck,
  'hub-comunicacao': IconMessageCircle,
  'mensagens-internas': IconMessageCircle,
  'mensagens-internas-tecnicos': IconUsers,
  'tecnicos-internos': IconHardHat,
  'tecnicos-externos': IconHardHat,
  'familias-grupos': IconFolderTree,
  'familias-grupos-equipamentos': IconFolderTree,
  'gestao-grupos-checklist': IconClipboardList,
  users: IconUsers,
  extras: IconPlusCircle,
  'manuais-informacoes-tecnicas': IconBookOpen,
}

/** Ícone SVG por tipo de módulo (separador): traço único, escala com `size`, cor = `currentColor`. */
export function ModuleTabIcon({ tabType, size = 22, className }: { tabType: string; size?: number; className?: string }) {
  const Cmp = TAB_ICONS[tabType] ?? IconFileText
  return <Cmp size={size} className={className} />
}
