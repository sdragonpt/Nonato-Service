/** Códigos da interface → códigos da API MyMemory (mesmo mapa que em `page.tsx`). */
const APP_TO_API: Record<string, string> = {
  'pt-BR': 'pt',
  es: 'es',
  fr: 'fr',
  it: 'it',
  de: 'de',
  en: 'en',
  'en-US': 'en',
}

export async function translateWithMyMemory(
  text: string,
  fromAppCode: string,
  toAppCode: string,
  errorMessage: string
): Promise<string> {
  const q = text.trim()
  if (!q) return ''
  if (fromAppCode === toAppCode) return q

  const fromCode = APP_TO_API[fromAppCode] || fromAppCode
  const toCode = APP_TO_API[toAppCode] || toAppCode

  const response = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${fromCode}|${toCode}`,
    { method: 'GET', headers: { Accept: 'application/json' } }
  )

  if (response.ok) {
    const data = await response.json()
    if (data.responseData?.translatedText) {
      return data.responseData.translatedText as string
    }
  }

  return errorMessage
}
