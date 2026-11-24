import { readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, nativeTheme, type IpcMainInvokeEvent, type OpenDialogOptions, type SaveDialogOptions } from 'electron'
import { LAYOUT_FILE_EXTENSION } from '../core/serialization'
import type { ExportRequest, SaveRequest, Theme } from '../preload'
import { printRaw, stopRawPrinter } from './rawPrinter'
import { resourcePath } from './resources'

const LAYOUT_FILTER = { name: 'Layout GôndolaPro', extensions: [LAYOUT_FILE_EXTENSION] }

const SYSPDV_FILTER = { name: 'XML do SysPDV', extensions: ['xml'] }

const PRINTER_CODE_FILTER = { name: 'Código de impressora', extensions: ['txt', 'prn', 'zpl', 'epl', 'ppla'] }

const OPEN_FILTERS = [
  { name: 'Layouts e códigos de etiqueta', extensions: [...LAYOUT_FILTER.extensions, ...SYSPDV_FILTER.extensions, ...PRINTER_CODE_FILTER.extensions] },
  LAYOUT_FILTER,
  SYSPDV_FILTER,
  PRINTER_CODE_FILTER,
  { name: 'Todos os arquivos', extensions: ['*'] }
]

const APP_USER_MODEL_ID = 'br.com.pbtec.gondolapro'

const WINDOW_BACKGROUND: Record<Theme, string> = { light: '#eef0f4', dark: '#12151c' }

function showOpenDialog(event: IpcMainInvokeEvent, options: OpenDialogOptions) {
  const owner = BrowserWindow.fromWebContents(event.sender)
  return owner ? dialog.showOpenDialog(owner, options) : dialog.showOpenDialog(options)
}

function showSaveDialog(event: IpcMainInvokeEvent, options: SaveDialogOptions) {
  const owner = BrowserWindow.fromWebContents(event.sender)
  return owner ? dialog.showSaveDialog(owner, options) : dialog.showSaveDialog(options)
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'GôndolaPro',
    icon: resourcePath('icon.ico'),
    backgroundColor: WINDOW_BACKGROUND.light,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true
    }
  })

  window.once('ready-to-show', () => window.show())

  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && devServerUrl) {
    window.loadURL(devServerUrl)
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpc(): void {
  ipcMain.handle('layout:open', async (event) => {
    const result = await showOpenDialog(event, { title: 'Abrir layout', filters: OPEN_FILTERS, properties: ['openFile'] })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    const path = result.filePaths[0]
    return { path, fileName: basename(path), bytes: new Uint8Array(await readFile(path)) }
  })

  ipcMain.handle('layout:save', async (event, request: SaveRequest) => {
    let path = request.path
    if (!path) {
      const result = await showSaveDialog(event, { title: 'Salvar layout', defaultPath: request.suggestedName, filters: [LAYOUT_FILTER] })
      if (result.canceled || !result.filePath) {
        return null
      }
      path = result.filePath
    }
    await writeFile(path, request.content, 'utf8')
    return path
  })

  ipcMain.handle('layout:export-syspdv', async (event, request: ExportRequest) => {
    const result = await showSaveDialog(event, { title: 'Exportar para o SysPDV', defaultPath: request.suggestedName, filters: [SYSPDV_FILTER] })
    if (result.canceled || !result.filePath) {
      return null
    }
    await writeFile(result.filePath, request.bytes)
    return result.filePath
  })

  ipcMain.handle('printers:list', async (event) => {
    const printers = await event.sender.getPrintersAsync()
    return printers.map((printer) => printer.name)
  })

  ipcMain.handle('printers:print-raw', (_event, printer: string, payload: string) => printRaw(printer, payload))

  ipcMain.on('theme:set', (event, theme: Theme) => {
    if (!Object.hasOwn(WINDOW_BACKGROUND, theme)) return
    nativeTheme.themeSource = theme
    BrowserWindow.fromWebContents(event.sender)?.setBackgroundColor(WINDOW_BACKGROUND[theme])
  })
}

app.setAppUserModelId(APP_USER_MODEL_ID)

app.whenReady().then(() => {
  registerIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('will-quit', stopRawPrinter)
