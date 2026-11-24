import { useCallback, useEffect, useState } from 'react'
import { applyTheme, readStoredTheme, storeTheme, type Theme } from '../theme'

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(readStoredTheme)

  useEffect(() => {
    applyTheme(theme)
    storeTheme(theme)
  }, [theme])

  const toggleTheme = useCallback(() => setTheme((current) => (current === 'dark' ? 'light' : 'dark')), [])

  return { theme, toggleTheme }
}
