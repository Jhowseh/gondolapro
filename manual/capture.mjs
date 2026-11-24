import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [, , appUrl, outDir] = process.argv
if (!appUrl || !outDir) {
  console.error('uso: node capture.mjs <url do renderer> <pasta de saída>')
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PORT = 9351
const VIOLET = '#8B5CF6'
const ICONS = {
  tag: 'M12.6,2.6 H4 A1.4,1.4 0 0 0 2.6,4 V12.6 L11.4,21.4 A1.4,1.4 0 0 0 13.4,21.4 L21.4,13.4 A1.4,1.4 0 0 0 21.4,11.4 Z M7.5,6 A1.5,1.5 0 1 0 7.51,6 Z',
  monitor: 'M5,3.5 H19 A2,2 0 0 1 21,5.5 V15 A2,2 0 0 1 19,17 H5 A2,2 0 0 1 3,15 V5.5 A2,2 0 0 1 5,3.5 Z M8,21 H16 M12,17 V21',
  sliders: 'M21,4 H14 M10,4 H3 M21,12 H12 M8,12 H3 M21,20 H16 M12,20 H3 M14,2 V6 M8,10 V14 M16,18 V22',
  layers: 'M12,3 L2,8 L12,13 L22,8 Z M2,13 L12,18 L22,13 M2,17.5 L12,22.5 L22,17.5',
  move: 'M5,9 L2,12 L5,15 M9,5 L12,2 L15,5 M15,19 L12,22 L9,19 M19,9 L22,12 L19,15 M2,12 H22 M12,2 V22',
  check: 'M22,11.1 V12 A10,10 0 1 1 16.1,2.9 M22,4 L12,14 L9,11',
  printer: 'M6,9 V3 H18 V9 M6,18 H4 A2,2 0 0 1 2,16 V11 A2,2 0 0 1 4,9 H20 A2,2 0 0 1 22,11 V16 A2,2 0 0 1 20,18 H18 M6,14 H18 V21 H6 Z',
  upload: 'M21,15 V19 A2,2 0 0 1 19,21 H5 A2,2 0 0 1 3,19 V15 M17,8 L12,3 L7,8 M12,3 V15',
  folder: 'M4.5,5 H9 L11,7.5 H19.5 L21,9 V18.5 L19.5,20 H4.5 L3,18.5 V6.5 Z',
  save: 'M19,21 H5 A2,2 0 0 1 3,19 V5 A2,2 0 0 1 5,3 H16 L21,8 V19 A2,2 0 0 1 19,21 Z M17,21 V13 H7 V21 M7,3 V8 H15',
  keyboard: 'M4,5 H20 A2,2 0 0 1 22,7 V17 A2,2 0 0 1 20,19 H4 A2,2 0 0 1 2,17 V7 A2,2 0 0 1 4,5 Z M6,9.5 L6,9.51 M10,9.5 L10,9.51 M14,9.5 L14,9.51 M18,9.5 L18,9.51 M7,14.5 H17',
  code: 'M8,6 L2,12 L8,18 M16,6 L22,12 L16,18 M14,4 L10,20',
  barcode: 'M3,5 V19 M6.5,5 V19 M9,5 V19 M12.5,5 V19 M15,5 V19 M18.5,5 V19 M21,5 V19',
  document: 'M14,2 H6 A2,2 0 0 0 4,4 V20 A2,2 0 0 0 6,22 H18 A2,2 0 0 0 20,20 V8 Z M14,2 V8 H20 M8,13 H16 M8,17 H16 M8,9 H10',
  question: 'M8,8.5 A4,4 0 0 1 16,9 C16,11.8 12,12.3 12,15.2 M12,19.5 L12,19.51',
  alert: 'M12,4.5 V13.5 M12,19 L12,19.01',
  user: 'M19,21 V19 A4,4 0 0 0 15,15 H9 A4,4 0 0 0 5,19 V21 M12,11 A4,4 0 1 0 12,3 A4,4 0 1 0 12,11 Z',
  phone: 'M7,2 H17 A2,2 0 0 1 19,4 V20 A2,2 0 0 1 17,22 H7 A2,2 0 0 1 5,20 V4 A2,2 0 0 1 7,2 Z M12,18 L12,18.01'
}

const SAMPLE_ZPL = [
  '^XA',
  '^PW800',
  '^LL240',
  '^FO16,16^A0N,28,28^FD</3>^FS',
  '^FO16,72^BEN,64,Y,N^FD</1>^FS',
  '^FO360,150^A0N,32,32^FDR$^FS',
  '^FO420,90^A0N,80,80^FD</6>^FS',
  '^PQ</17>',
  '^XZ'
].join('\n')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const profile = mkdtempSync(join(tmpdir(), 'gondolapro-capture-'))
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], {
  stdio: 'ignore'
})

let targets = []
for (let attempt = 0; attempt < 150 && !targets.some((t) => t.type === 'page'); attempt++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  } catch {
    await sleep(200)
  }
}
const socket = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((resolve) => socket.addEventListener('open', resolve))

let lastId = 0
const pending = new Map()
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (!message.id || !pending.has(message.id)) return
  const { resolve, reject } = pending.get(message.id)
  pending.delete(message.id)
  if (message.error) reject(new Error(JSON.stringify(message.error)))
  else resolve(message.result)
})
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++lastId
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'erro no navegador')
  return result.result.value
}
const save = (name, data) => {
  writeFileSync(join(outDir, `${name}.png`), Buffer.from(data, 'base64'))
  console.log('image:', `${name}.png`)
}

await send('Page.enable')
await send('Runtime.enable')

async function captureIcons() {
  await send('Emulation.setDeviceMetricsOverride', { width: 48, height: 48, deviceScaleFactor: 2, mobile: false })
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
  await send('Page.navigate', { url: 'about:blank' })
  await sleep(300)
  for (const [name, path] of Object.entries(ICONS)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${VIOLET}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`
    await evaluate(`(() => { document.documentElement.style.background = 'transparent'; document.body.style.margin = '0'; document.body.style.background = 'transparent'; document.body.innerHTML = ${JSON.stringify(svg)}; return true })()`)
    const { data } = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 48, height: 48, scale: 1 } })
    save(`ic_${name}`, data)
  }
  await send('Emulation.setDefaultBackgroundColorOverride', {})
}

const stub = `
  try { localStorage.setItem('gondolapro.theme', 'light'); localStorage.setItem('gondolapro.codePanel', 'closed') } catch {}
  window.api = {
    openFile: async () => null,
    saveLayout: async () => null,
    exportSyspdv: async () => null,
    listPrinters: async () => ['ELGIN L42PRO FULL', 'Microsoft Print to PDF'],
    printRaw: async () => {},
    setTheme: () => {}
  }
`

async function load() {
  await send('Page.navigate', { url: appUrl })
  for (let attempt = 0; attempt < 100; attempt++) {
    await sleep(200)
    const ready = await evaluate(`Boolean(document.querySelector('.properties') && document.querySelector('.konvajs-content'))`).catch(() => false)
    if (ready) break
    if (attempt === 99) throw new Error('o app não carregou em ' + appUrl)
  }
  await sleep(800)
}

async function shot(name, options = {}) {
  let clip
  if (options.selector) {
    const rect = await evaluate(
      `(() => { const r = document.querySelector(${JSON.stringify(options.selector)}).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } })()`
    )
    const pad = options.pad ?? 0
    clip = { x: Math.max(0, rect.x - pad), y: Math.max(0, rect.y - pad), width: rect.width + pad * 2, height: Math.min(rect.height + pad * 2, options.maxHeight ?? Infinity), scale: 1 }
  } else if (options.clip) {
    clip = { ...options.clip, scale: 1 }
  }
  const { data } = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) })
  save(name, data)
}

const clickButton = (text, scope = 'document') =>
  evaluate(
    `(() => { const t = ${JSON.stringify(text)}; const b = [...${scope}.querySelectorAll('button')].find((b) => { const s = b.textContent.trim(); return s.startsWith(t) || s.endsWith(t) }); if (!b) throw new Error('botão não encontrado: ' + t); b.click(); return true })()`
  ).then(() => sleep(400))

async function clickLabelMm(xMm, yMm, zoom = 7, padding = 28) {
  const origin = await evaluate(`(() => { const r = document.querySelector('.konvajs-content').getBoundingClientRect(); return { x: r.x, y: r.y } })()`)
  const x = origin.x + padding + xMm * zoom
  const y = origin.y + padding + yMm * zoom
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
  await sleep(400)
}

async function press(key, code, keyCode, modifiers = 0) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, modifiers })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode, modifiers })
  await sleep(250)
}

async function captureScreens() {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 860, deviceScaleFactor: 2, mobile: false })
  await send('Page.addScriptToEvaluateOnNewDocument', { source: stub })

  await load()
  await shot('main')
  await shot('label', { selector: '.properties', maxHeight: 262 })

  await clickLabelMm(52, 14)
  await shot('selected')
  await shot('text', { selector: '.properties', maxHeight: 568 })
  await clickLabelMm(10, 13)
  await shot('barcode', { selector: '.properties', maxHeight: 568 })
  await press('Escape', 'Escape', 27)

  await evaluate(`(() => { [...document.querySelectorAll('.palette .section-toggle')].slice(1, 3).forEach((b) => b.click()); return true })()`)
  await sleep(300)
  await shot('palette', { selector: '.palette', maxHeight: 700 })

  await load()
  await clickButton('Código')
  await shot('code', { selector: '.code-panel' })
  await clickButton('Cabeçalho e rodapé')
  await shot('templates', { selector: '.code-panel' })
  await clickButton('Cabeçalho e rodapé')

  await clickButton('Texto', "document.querySelector('.palette')")
  for (let i = 0; i < 6; i++) await press('ArrowDown', 'ArrowDown', 40, 8)
  await press('Escape', 'Escape', 27)
  await shot('issues')

  await load()
  await clickButton('Exportar XML')
  await shot('export', { selector: '.modal' })
  await press('Escape', 'Escape', 27)

  await evaluate(
    `(() => { const dt = new DataTransfer(); dt.setData('text/plain', ${JSON.stringify(SAMPLE_ZPL)}); window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true })); return true })()`
  )
  await sleep(700)
  await shot('import', { selector: '.modal' })
  await press('Escape', 'Escape', 27)

  await load()
  await evaluate(`(() => { document.querySelector('.toolbar button[title="Mais opções"]').click(); return true })()`)
  await sleep(400)
  await shot('menu', { clip: { x: 740, y: 0, width: 700, height: 110 } })
}

try {
  await captureIcons()
  await captureScreens()
} finally {
  socket.close()
  edge.kill()
  await sleep(500)
  try {
    rmSync(profile, { recursive: true, force: true })
  } catch {}
}
process.exit(0)
