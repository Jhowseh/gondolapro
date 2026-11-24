import type { Theme } from '../../preload'
import { readSetting, STORAGE_KEYS, writeSetting } from './storage'

export type { Theme }

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

function systemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function readStoredTheme(): Theme {
  const stored = readSetting(STORAGE_KEYS.theme)
  return isTheme(stored) ? stored : systemTheme()
}

export function storeTheme(theme: Theme): void {
  writeSetting(STORAGE_KEYS.theme, theme)
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  window.api?.setTheme(theme)
}
