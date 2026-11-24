import type { EtiqApi } from '../../preload'

declare global {
  interface Window {
    api: EtiqApi
  }
}

export {}
