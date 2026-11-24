import { contextBridge, ipcRenderer } from 'electron'

export interface OpenedFile {
  path: string
  fileName: string
  bytes: Uint8Array
}

export interface SaveRequest {
  content: string
  path: string | null
  suggestedName: string
}

export interface ExportRequest {
  bytes: Uint8Array
  suggestedName: string
}

const api = {
  openFile: (): Promise<OpenedFile | null> => ipcRenderer.invoke('layout:open'),
  saveLayout: (request: SaveRequest): Promise<string | null> => ipcRenderer.invoke('layout:save', request),
  exportSyspdv: (request: ExportRequest): Promise<string | null> => ipcRenderer.invoke('layout:export-syspdv', request),
  listPrinters: (): Promise<string[]> => ipcRenderer.invoke('printers:list'),
  printRaw: (printer: string, payload: string): Promise<void> => ipcRenderer.invoke('printers:print-raw', printer, payload),
  setTheme: (theme: 'light' | 'dark'): void => ipcRenderer.send('theme:set', theme)
}

export type EtiqApi = typeof api

contextBridge.exposeInMainWorld('api', api)
