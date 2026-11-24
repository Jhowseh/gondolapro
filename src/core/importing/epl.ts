import { EPL_ROTATION_ANCHOR, EPL_ROTATION_CODE } from '../generators/epl'
import type { Corner } from '../generators/anchor'
import { createBarcode, createBox, createLine, createRaw, createText } from '../layout'
import { elementBox, measureText } from '../measure'
import type { LabelElement, LabelLayout } from '../types'
import { dotsToMm } from '../units'
import { baseLayout, invertRotationCodes, splitScriptLines, splitSections, topLeftFromCorner, type ImportFrame, type ImportResult } from './shared'

const TEXT_PATTERN = /^A(\d+),(\d+),([0-3]),([1-5]),([1-9]),([1-9]),N,"(.*)"$/

const BARCODE_PATTERN = /^B(\d+),(\d+),([0-3]),(E30|2),(\d+),(\d+),(\d+),([BN]),"(.*)"$/

const LINE_PATTERN = /^L([OE])(\d+),(\d+),(\d+),(\d+)$/

const BOX_PATTERN = /^X(\d+),(\d+),(\d+),(\d+),(\d+)$/

const BODY_PATTERN = /^(?:[AB](?:\d|<)|L[OEW]\d|X\d)/

const WIDTH_PATTERN = /^q(\d+)$/

const HEIGHT_PATTERN = /^Q(\d+),B?(\d+)/

const ROTATION_BY_CODE = invertRotationCodes(EPL_ROTATION_CODE)

export function isEplElementLine(line: string): boolean {
  return BODY_PATTERN.test(line)
}

function unescape(content: string): string {
  return content.replace(/\\(["\\])/g, '$1')
}

function place<T extends LabelElement>(element: T, layout: LabelLayout, xDots: number, yDots: number, corner: Corner): T {
  const box = elementBox(element, layout)
  const point = { x: dotsToMm(xDots, layout.dpi), y: dotsToMm(yDots, layout.dpi) }
  return { ...element, ...topLeftFromCorner(point, corner, box.width, box.height) }
}

function parseElement(line: string, layout: LabelLayout): LabelElement | null {
  const toMm = (dots: string | number) => dotsToMm(Number(dots), layout.dpi)

  const text = TEXT_PATTERN.exec(line)
  if (text) {
    const [, x, y, rotationCode, font, width, height, content] = text
    const rotation = ROTATION_BY_CODE[rotationCode]
    const draft = createText({ rotation, content: unescape(content), heightMm: 1, font: { language: 'epl', id: font, width, height } })
    const heightMm = dotsToMm(measureText(draft, layout).height, layout.dpi)
    return place({ ...draft, heightMm }, layout, Number(x), Number(y), EPL_ROTATION_ANCHOR[rotation])
  }

  const barcode = BARCODE_PATTERN.exec(line)
  if (barcode) {
    const [, x, y, rotationCode, type, narrow, wide, height, readable, content] = barcode
    const rotation = ROTATION_BY_CODE[rotationCode]
    const element = createBarcode({
      rotation,
      content: unescape(content),
      symbology: type === 'E30' ? 'ean13' : 'i2of5',
      showText: readable === 'B',
      heightMm: toMm(height),
      moduleDots: Number(narrow),
      wideDots: Number(wide)
    })
    return place(element, layout, Number(x), Number(y), EPL_ROTATION_ANCHOR[rotation])
  }

  const lineMatch = LINE_PATTERN.exec(line)
  if (lineMatch) {
    const [, , x, y, width, height] = lineMatch.map(Number)
    return createLine({ x: toMm(x), y: toMm(y), widthMm: toMm(width), heightMm: toMm(height), invert: lineMatch[1] === 'E' })
  }

  const box = BOX_PATTERN.exec(line)
  if (box) {
    const [, x, y, thickness, x2, y2] = box.map(Number)
    return createBox({ x: toMm(x), y: toMm(y), widthMm: toMm(x2 - x), heightMm: toMm(y2 - y), thicknessMm: toMm(thickness), invert: false })
  }

  return null
}

export function inferEplFrame(script: string, dpi: number): { widthMm?: number; heightMm?: number; gapMm?: number } {
  const frame: { widthMm?: number; heightMm?: number; gapMm?: number } = {}
  for (const line of splitScriptLines(script)) {
    const width = WIDTH_PATTERN.exec(line)
    if (width) frame.widthMm = dotsToMm(Number(width[1]), dpi)
    const height = HEIGHT_PATTERN.exec(line)
    if (height) {
      frame.heightMm = dotsToMm(Number(height[1]), dpi)
      frame.gapMm = dotsToMm(Number(height[2]), dpi)
    }
  }
  return frame
}

export function parseEpl(script: string, frame: ImportFrame): ImportResult {
  const { header, body, footer } = splitSections(splitScriptLines(script), isEplElementLine)
  const layout = baseLayout(frame, 'epl', header, footer)
  const elements = body.map((line) => parseElement(line, layout) ?? createRaw('epl', line))
  return { layout: { ...layout, elements }, warnings: [] }
}
