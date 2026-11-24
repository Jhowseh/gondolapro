import type { Language } from './types'

export interface LanguageInfo {
  id: Language
  label: string
  printers: string
}

export const LANGUAGES: LanguageInfo[] = [
  { id: 'ppla', label: 'PPLA', printers: 'Argox OS-214, Elgin L42' },
  { id: 'epl', label: 'EPL / PPLB', printers: 'Zebra TLP 2844 e GC420t, Argox, Elgin, Honeywell' },
  { id: 'zpl', label: 'ZPL', printers: 'Zebra GC420t e S4M, Elgin L42, Honeywell' }
]

export const DPI_OPTIONS = [203, 300]

export function languageInfo(language: Language): LanguageInfo {
  return LANGUAGES.find((item) => item.id === language)!
}

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((item) => item.id === value)
}
