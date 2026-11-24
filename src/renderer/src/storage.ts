export const STORAGE_KEYS = {
  theme: 'gondolapro.theme',
  printer: 'gondolapro.printer',
  codePanel: 'gondolapro.codePanel'
} as const

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

export function readSetting(key: StorageKey): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeSetting(key: StorageKey, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    return
  }
}
