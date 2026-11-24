import { parseMultiplierCode } from '../fonts'
import { PPLA_ROTATION_ANCHOR, PPLA_ROTATION_CODE, pplaUnitMm } from '../generators/ppla'
import { createBarcode, createBox, createLine, createRaw } from '../layout'
import type { LabelElement, LabelLayout } from '../types'
import { baseLayout, importedText, invertRotationCodes, placeAtCorner as place, splitScriptLines, splitSections, type ImportFrame, type ImportResult } from './shared'

const ELEMENT_PATTERN = /^([1-4])([0-9A-Za-z])([0-9A-Za-z])([0-9A-Za-z])(\d{3})(\d{4})(\d{4})(.*)$/

const ROTATION_BY_CODE = invertRotationCodes(PPLA_ROTATION_CODE)

const TEXT_FONTS = /^[0-8]$/

const BARCODE_KINDS = /^[FfDd]$/

const LINE_PATTERN = /^L(\d{3})(\d{3})$/

const BOX_PATTERN = /^B(\d{3})(\d{3})(\d{3})(\d{3})$/

export function isPplaElementLine(line: string): boolean {
  return ELEMENT_PATTERN.test(line)
}

function parseElement(line: string, layout: LabelLayout, unitMm: number): LabelElement | null {
  const match = ELEMENT_PATTERN.exec(line)
  if (!match) return null

  const [, rotationCode, kind, first, second, size, row, column, content] = match
  const rotation = ROTATION_BY_CODE[rotationCode]
  const point = { x: Number(column) * unitMm, y: layout.heightMm - Number(row) * unitMm }

  if (TEXT_FONTS.test(kind)) {
    const text = importedText(rotation, content, { language: 'ppla', id: kind, width: first, height: second, extra: size }, layout)
    return place(text, layout, point, PPLA_ROTATION_ANCHOR[rotation])
  }

  if (BARCODE_KINDS.test(kind)) {
    const barcode = createBarcode({
      rotation,
      content,
      symbology: kind.toUpperCase() === 'F' ? 'ean13' : 'i2of5',
      showText: kind === kind.toUpperCase(),
      heightMm: Number(size) * unitMm,
      moduleDots: parseMultiplierCode(second),
      wideDots: parseMultiplierCode(first)
    })
    return place(barcode, layout, point, PPLA_ROTATION_ANCHOR[rotation])
  }

  if (kind === 'X' && rotation === 0 && first === '1' && second === '1' && size === '000') {
    const lineMatch = LINE_PATTERN.exec(content)
    if (lineMatch) {
      const line = createLine({ widthMm: Number(lineMatch[1]) * unitMm, heightMm: Number(lineMatch[2]) * unitMm, invert: false })
      return place(line, layout, point, 'bottom-left')
    }
    const boxMatch = BOX_PATTERN.exec(content)
    if (boxMatch && boxMatch[3] === boxMatch[4]) {
      const box = createBox({
        widthMm: Number(boxMatch[1]) * unitMm,
        heightMm: Number(boxMatch[2]) * unitMm,
        thicknessMm: Number(boxMatch[3]) * unitMm,
        invert: false
      })
      return place(box, layout, point, 'bottom-left')
    }
  }

  return null
}

export function parsePpla(script: string, frame: ImportFrame): ImportResult {
  const { header, body, footer } = splitSections(splitScriptLines(script), isPplaElementLine)
  const layout = baseLayout(frame, 'ppla', header, footer)
  const unitMm = pplaUnitMm(header)
  const elements = body.map((line) => parseElement(line, layout, unitMm) ?? createRaw('ppla', line))
  return { layout: { ...layout, elements }, warnings: [] }
}
