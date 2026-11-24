import { readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, nativeTheme } from 'electron'
import type { ExportRequest, SaveRequest } from '../preload'
import { printRaw } from './rawPrinter'
import { resourcePath } from './resources'

const FILE_FILTERS = [{ name: 'Layout GôndolaPro', extensions: ['etq'] }]

const OPEN_FILTERS = [
  { name: 'Layouts e códigos de etiqueta', extensions: ['etq', 'xml', 'txt', 'prn', 'zpl', 'epl', 'ppla'] },
  { name: 'Layout GôndolaPro', extensions: ['etq'] },
  { name: 'XML do SysPDV', extensions: ['xml'] },
  { name: 'Código de impressora', extensions: ['txt', 'prn', 'zpl', 'epl', 'ppla'] },
  { name: 'Todos os arquivos', extensions: ['*'] }
]

const SYSPDV_FILTERS = [{ name: 'XML do SysPDV', extensions: ['xml'] }]

const APP_USER_MODEL_ID = 'br.com.pbtec.gondolapro'

const WINDOW_BACKGROUND ={ light: '#eef0f4', dark: '#12151c' } as const

type Theme = keyof typeof WINDOW_BACKGROUND

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
    const owner = BrowserWindow.fromWebContents(event.sender)
    const options = { title: 'Abrir layout', filters: OPEN_FILTERS, properties: ['openFile' as const] }
    const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    const path = result.filePaths[0]
    return { path, fileName: basename(path), bytes: new Uint8Array(await readFile(path)) }
  })

  ipcMain.handle('layout:save', async (event, request: SaveRequest) => {
    let path = request.path
    if (!path) {
      const owner = BrowserWindow.fromWebContents(event.sender)
      const options = { title: 'Salvar layout', defaultPath: request.suggestedName, filters: FILE_FILTERS }
      const result = owner ? await dialog.showSaveDialog(owner, options) : await dialog.showSaveDialog(options)
      if (result.canceled || !result.filePath) {
        return null
      }
      path = result.filePath
    }
    await writeFile(path, request.content, 'utf8')
    return path
  })

  ipcMain.handle('layout:export-syspdv', async (event, request: ExportRequest) => {
    const owner = BrowserWindow.fromWebContents(event.sender)
    const options = { title: 'Exportar para o SysPDV', defaultPath: request.suggestedName, filters: SYSPDV_FILTERS }
    const result = owner ? await dialog.showSaveDialog(owner, options) : await dialog.showSaveDialog(options)
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
    if (theme !== 'light' && theme !== 'dark') return
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
