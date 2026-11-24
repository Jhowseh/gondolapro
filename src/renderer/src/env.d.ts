import type { GondolaApi } from '../../preload'

declare global {
  interface Window {
    api: GondolaApi
  }
}

export {}
