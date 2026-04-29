/** Propostas de orçamento de serviço técnico (guardadas com saveData / servidor). */

export const OST_PROPOSTAS_STORAGE_KEY = 'nonato-ost-propostas-tecnico-v1'

export type OstPropostaLinha = { rowId: string; servicoId: string; quantidadeStr: string }

export type OstPropostaPayload = {
  clienteId: string
  clienteManual: string
  refDoc: string
  localServico: string
  dataDoc: string
  validade: string
  intro: string
  clausulas: string
  linhas: OstPropostaLinha[]
}

export type OstPropostaSalva = {
  id: string
  nome: string
  criadoEm: string
  atualizadoEm: string
  payload: OstPropostaPayload
}

function parseLista(raw: unknown): OstPropostaSalva[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.filter((x) => x && typeof (x as OstPropostaSalva).id === 'string' && (x as OstPropostaSalva).payload) as OstPropostaSalva[]
  }
  return []
}

export async function loadOstPropostas(loadData?: (key: string, fromServer?: boolean) => Promise<unknown>): Promise<OstPropostaSalva[]> {
  if (loadData) {
    try {
      const v = await loadData(OST_PROPOSTAS_STORAGE_KEY, true)
      return parseLista(v)
    } catch {
      return []
    }
  }
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(OST_PROPOSTAS_STORAGE_KEY)
    if (!raw) return []
    return parseLista(JSON.parse(raw))
  } catch {
    return []
  }
}

export async function saveOstPropostas(
  lista: OstPropostaSalva[],
  saveData?: (key: string, value: unknown) => Promise<void>
): Promise<void> {
  if (saveData) {
    await saveData(OST_PROPOSTAS_STORAGE_KEY, lista)
    return
  }
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(OST_PROPOSTAS_STORAGE_KEY, JSON.stringify(lista))
  } catch {
    /* ignore */
  }
}
