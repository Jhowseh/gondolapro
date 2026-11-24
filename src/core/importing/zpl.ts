import { ZPL_ORIENTATION } from '../generators/zpl'
import { createBarcode, createBox, createLine, createRaw, createText } from '../layout'
import type { LabelElement, LabelLayout, Rotation } from '../types'
import { dotsToMm } from '../units'
import { baseLayout, invertRotationCodes, type ImportFrame, type ImportResult } from './shared'

interface Token {
  text: string
  command: string
  params: string
}

interface BarcodeDefaults {
  module: number
  ratio: number
  height: number
}

const TOKEN_PATTERN = /([\^~])([A-Za-z0-9@]{1,2})([^\^~]*)/g

const ROTATION_BY_CODE = invertRotationCodes(ZPL_ORIENTATION)

const FIELD_START = new Set(['FO', 'FT'])

const TYPESET_WARNING = 'Campos posicionados com ^FT foram convertidos para ^FO de forma aproximada. Confira as posições.'

function tokenize(script: string): Token[] {
  const tokens: Token[] = []
  for (const match of script.matchAll(TOKEN_PATTERN)) {
    const params = match[3].replace(/[\r\n]+/g, '')
    tokens.push({ text: `${match[1]}${match[2]}${params}`.trimEnd(), command: match[2].toUpperCase(), params })
  }
  return tokens
}

function numbers(params: string): number[] {
  return params.split(',').map((value) => Number(value.trim()))
}

function rotationOf(code: string | undefined): Rotation | null {
  const normalized = (code || 'N').toUpperCase()
  return normalized in ROTATION_BY_CODE ? ROTATION_BY_CODE[normalized] : null
}

function updateBarcodeDefaults(defaults: BarcodeDefaults, params: string): BarcodeDefaults {
  const [module, ratio, height] = numbers(params)
  return {
    module: Number.isFinite(module) && module > 0 ? module : defaults.module,
    ratio: Number.isFinite(ratio) && ratio > 0 ? ratio : defaults.ratio,
    height: Number.isFinite(height) && height > 0 ? height : defaults.height
  }
}

interface ParsedField {
  element: LabelElement | null
  defaults: BarcodeDefaults
  typeset: boolean
}

function parseField(tokens: Token[], layout: LabelLayout, initial: BarcodeDefaults): ParsedField {
  const toMm = (dots: number) => dotsToMm(dots, layout.dpi)
  let defaults = initial
  let origin: { x: number; y: number; typeset: boolean } | null = null
  let font: { id: string; rotation: Rotation | null; height: number; width: number } | null = null
  let barcode: { kind: 'BE' | 'B2'; rotation: Rotation | null; height: number; readable: boolean } | null = null
  let graphic: { width: number; height: number; thickness: number } | null = null
  let data: string | null = null
  let reversed = false
  let unknown = false

  for (const token of tokens) {
    const command = token.command
    if (FIELD_START.has(command)) {
      const [x, y] = numbers(token.params)
      origin = { x: x || 0, y: y || 0, typeset: command === 'FT' }
    } else if (command === 'FD') {
      data = token.params
    } else if (command === 'FS') {
      continue
    } else if (command === 'FR') {
      reversed = true
    } else if (command === 'BY') {
      defaults = updateBarcodeDefaults(defaults, token.params)
    } else if (command === 'BE' || command === 'B2') {
      const [orientation, height, readable] = token.params.split(',')
      barcode = {
        kind: command,
        rotation: rotationOf(orientation),
        height: Number(height) || defaults.height,
        readable: (readable || 'Y').trim().toUpperCase() !== 'N'
      }
    } else if (command === 'GB') {
      const [width, height, thickness] = numbers(token.params)
      graphic = { width: width || 1, height: height || 1, thickness: thickness || 1 }
    } else if (command.startsWith('A') && command.length === 2 && command[1] !== '@') {
      const [orientation, height, width] = token.params.split(',')
      const fontHeight = Number(height)
      font = { id: command[1], rotation: rotationOf(orientation), height: fontHeight, width: Number(width) || fontHeight }
    } else {
      unknown = true
    }
  }

  const typeset = origin?.typeset ?? false
  const none = { element: null, defaults, typeset }
  if (!origin || unknown) return none

  if (graphic && !barcode && data === null) {
    const y = typeset ? origin.y - graphic.height : origin.y
    const position = { x: toMm(origin.x), y: toMm(y) }
    const isLine = graphic.thickness >= Math.min(graphic.width, graphic.height)
    const element = isLine
      ? createLine({ ...position, widthMm: toMm(graphic.width), heightMm: toMm(graphic.height), invert: reversed })
      : createBox({ ...position, widthMm: toMm(graphic.width), heightMm: toMm(graphic.height), thicknessMm: toMm(graphic.thickness), invert: reversed })
    return { element, defaults, typeset }
  }

  if (reversed) return none

  if (barcode && data !== null && barcode.rotation !== null && !graphic) {
    if (typeset && barcode.rotation !== 0) return none
    const y = typeset ? origin.y - barcode.height : origin.y
    const element = createBarcode({
      x: toMm(origin.x),
      y: toMm(y),
      rotation: barcode.rotation,
      content: data,
      symbology: barcode.kind === 'BE' ? 'ean13' : 'i2of5',
      showText: barcode.readable,
      heightMm: toMm(barcode.height),
      moduleDots: defaults.module,
      wideDots: Math.round(defaults.module * defaults.ratio)
    })
    return { element, defaults, typeset }
  }

  if (font && font.rotation !== null && Number.isFinite(font.height) && font.height > 0 && data !== null && !barcode && !graphic) {
    if (typeset && font.rotation !== 0) return none
    const y = typeset ? origin.y - font.height : origin.y
    const element = createText({
      x: toMm(origin.x),
      y: toMm(y),
      rotation: font.rotation,
      content: data,
      heightMm: toMm(font.height),
      font: { language: 'zpl', id: font.id, width: String(font.width), height: String(font.height) }
    })
    return { element, defaults, typeset }
  }

  return none
}

export function inferZplFrame(script: string, dpi: number): { widthMm?: number; heightMm?: number } {
  const frame: { widthMm?: number; heightMm?: number } = {}
  for (const token of tokenize(script)) {
    if (token.command === 'PW') frame.widthMm = dotsToMm(Number(token.params), dpi)
    if (token.command === 'LL') frame.heightMm = dotsToMm(Number(token.params), dpi)
  }
  return frame
}

export function parseZpl(script: string, frame: ImportFrame): ImportResult {
  const tokens = tokenize(script)
  const firstField = tokens.findIndex((token) => FIELD_START.has(token.command))
  const lastEnd = tokens.map((token) => token.command).lastIndexOf('FS')

  if (firstField === -1 || lastEnd < firstField) {
    const layout = baseLayout(frame, 'zpl', tokens.map((token) => token.text), [])
    return { layout, warnings: [] }
  }

  const header = tokens.slice(0, firstField)
  const footer = tokens.slice(lastEnd + 1)
  const layout = baseLayout(frame, 'zpl', header.map((token) => token.text), footer.map((token) => token.text))

  let defaults: BarcodeDefaults = { module: 2, ratio: 3, height: 10 }
  for (const token of header) {
    if (token.command === 'BY') defaults = updateBarcodeDefaults(defaults, token.params)
  }

  const elements: LabelElement[] = []
  let usedTypeset = false
  let index = firstField

  while (index <= lastEnd) {
    const token = tokens[index]
    if (!FIELD_START.has(token.command)) {
      if (token.command === 'BY') defaults = updateBarcodeDefaults(defaults, token.params)
      elements.push(createRaw('zpl', token.text))
      index++
      continue
    }
    const end = tokens.findIndex((candidate, position) => position > index && candidate.command === 'FS')
    const fieldEnd = end === -1 ? lastEnd : end
    const fieldTokens = tokens.slice(index, fieldEnd + 1)
    const parsed = parseField(fieldTokens, layout, defaults)
    defaults = parsed.defaults
    usedTypeset ||= parsed.typeset && parsed.element !== null
    elements.push(parsed.element ?? createRaw('zpl', fieldTokens.map((item) => item.text).join('')))
    index = fieldEnd + 1
  }

  return { layout: { ...layout, elements }, warnings: usedTypeset ? [TYPESET_WARNING] : [] }
}
