/**
 * Funde dados do servidor com os do localStorage para a secção Manuais e Informações Técnicas.
 * Evita perder PDFs/anexos quando o servidor ainda não sincronizou ou tem versão antiga.
 */
export function mergeManuaisFamiliasGrupos(server: any, local: any): any {
  const famSet = new Set<string>([...(server?.familias || []), ...(local?.familias || [])])
  const familias = Array.from(famSet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))

  const gruposMap = new Map<string, any>()
  for (const g of server?.grupos || []) gruposMap.set(g.id, { ...g })
  for (const g of local?.grupos || []) gruposMap.set(g.id, { ...g })
  const grupos = Array.from(gruposMap.values())

  const mergeTexto = (a?: string, b?: string) => {
    const A = a?.trim() ?? ''
    const B = b?.trim() ?? ''
    if (B.length >= A.length) return B || A
    return A || B
  }

  const mergeModelo = (s: any, l: any): any => {
    const docMap = new Map<string, any>()
    for (const d of s.documentos || []) docMap.set(d.id, d)
    for (const d of l.documentos || []) docMap.set(d.id, d)
    const imgMap = new Map<string, any>()
    for (const i of s.imagens || []) imgMap.set(i.id, i)
    for (const i of l.imagens || []) imgMap.set(i.id, i)
    return {
      ...s,
      ...l,
      nome: l.nome || s.nome,
      grupoId: l.grupoId || s.grupoId,
      documentos: Array.from(docMap.values()),
      imagens: Array.from(imgMap.values()),
      infoTecnicas: mergeTexto(s.infoTecnicas, l.infoTecnicas),
      infoMecanicas: mergeTexto(s.infoMecanicas, l.infoMecanicas),
      infoEletricas: mergeTexto(s.infoEletricas, l.infoEletricas)
    }
  }

  const modelosMap = new Map<string, any>()
  for (const m of server?.modelos || []) modelosMap.set(m.id, m)
  for (const m of local?.modelos || []) {
    const existing = modelosMap.get(m.id)
    modelosMap.set(m.id, existing ? mergeModelo(existing, m) : m)
  }
  return { familias, grupos, modelos: Array.from(modelosMap.values()) }
}
