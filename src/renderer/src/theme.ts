export type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'gondolapro.theme'

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
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (isTheme(stored)) return stored
  } catch {
    return systemTheme()
  }
  return systemTheme()
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    return
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  window.api?.setTheme(theme)
}
