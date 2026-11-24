import { stripStx } from '../controlCodes'
import { fontOverrideFor } from '../fonts'
import { partitionByInversion } from '../layout'
import { PPLA_TRANSPARENT_COMMAND, PPLA_XOR_COMMAND } from '../printModes'
import { elementBox, measureText, sanitizeContent, wideBarDots } from '../measure'
import { renderTemplate, templateFor } from '../templates'
import type { BarcodeElement, BoxElement, LabelElement, LabelLayout, LineElement, Rotation, TextElement } from '../types'
import { clamp, MM_PER_INCH, pad } from '../units'
import { cornerOf, type Corner } from './anchor'

export const PPLA_ROTATION_CODE: Record<Rotation, string> = { 0: '1', 90: '4', 180: '3', 270: '2' }

export const PPLA_ROTATION_ANCHOR: Record<Rotation, Corner> = {
  0: 'bottom-left',
  90: 'top-left',
  180: 'top-right',
  270: 'bottom-right'
}

const PPLA_INCH_UNIT_MM = MM_PER_INCH / 100

const PPLA_METRIC_UNIT_MM = 0.1

const EAN13_WIDE_FACTOR = 3

const MAX_MULTIPLIER = 24

export function pplaUnitMm(headerLines: string[]): number {
  return headerLines.some((line) => stripStx(line).trim() === 'm') ? PPLA_METRIC_UNIT_MM : PPLA_INCH_UNIT_MM
}

export function multiplierCode(value: number): string {
  const bounded = clamp(Math.round(value), 1, MAX_MULTIPLIER)
  return bounded <= 9 ? String(bounded) : String.fromCharCode(55 + bounded)
}

interface PplaContext {
  layout: LabelLayout
  unitMm: number
}

function units(mm: number, context: PplaContext): number {
  return Math.round(mm / context.unitMm)
}

function visibleUnits(mm: number, context: PplaContext): number {
  return Math.max(1, units(mm, context))
}

function position(element: LabelElement, context: PplaContext, corner: Corner): string {
  const point = cornerOf(elementBox(element, context.layout), corner)
  return `${pad(units(context.layout.heightMm - point.y, context), 4)}${pad(units(point.x, context), 4)}`
}

function textLine(element: TextElement, context: PplaContext): string {
  const override = fontOverrideFor(element, 'ppla')
  const { font } = measureText(element, context.layout)
  return [
    PPLA_ROTATION_CODE[element.rotation],
    font.fontId,
    override ? override.width : multiplierCode(font.hMult),
    override ? override.height : multiplierCode(font.vMult),
    override?.extra ?? '000',
    position(element, context, PPLA_ROTATION_ANCHOR[element.rotation]),
    sanitizeContent(element.content)
  ].join('')
}

function barcodeLine(element: BarcodeElement, context: PplaContext): string {
  const narrow = element.moduleDots
  const wide = element.wideDots ?? (element.symbology === 'ean13' ? narrow * EAN13_WIDE_FACTOR : wideBarDots(element))
  const letter = element.symbology === 'ean13' ? 'F' : 'D'
  return [
    PPLA_ROTATION_CODE[element.rotation],
    element.showText ? letter : letter.toLowerCase(),
    multiplierCode(wide),
    multiplierCode(narrow),
    pad(units(element.heightMm, context), 3),
    position(element, context, PPLA_ROTATION_ANCHOR[element.rotation]),
    sanitizeContent(element.content)
  ].join('')
}

function lineLine(element: LineElement, context: PplaContext): string {
  const width = visibleUnits(element.widthMm, context)
  const height = visibleUnits(element.heightMm, context)
  return `1X11000${position(element, context, 'bottom-left')}L${pad(width, 3)}${pad(height, 3)}`
}

function boxLine(element: BoxElement, context: PplaContext): string {
  const width = visibleUnits(element.widthMm, context)
  const height = visibleUnits(element.heightMm, context)
  const thickness = visibleUnits(element.thicknessMm, context)
  return `1X11000${position(element, context, 'bottom-left')}B${pad(width, 3)}${pad(height, 3)}${pad(thickness, 3)}${pad(thickness, 3)}`
}

export function pplaBody(layout: LabelLayout, headerLines = renderTemplate(templateFor(layout).header, layout)): string[] {
  const context: PplaContext = { layout, unitMm: pplaUnitMm(headerLines) }
  const emit = (element: LabelElement) => pplaLines(element, context)
  const { normal, inverted } = partitionByInversion(layout.elements)
  const normalLines = normal.flatMap(emit)
  return inverted.length > 0 ? [...normalLines, PPLA_XOR_COMMAND, ...inverted.flatMap(emit), PPLA_TRANSPARENT_COMMAND] : normalLines
}

function pplaLines(element: LabelElement, context: PplaContext): string[] {
  switch (element.type) {
    case 'text':
      return [textLine(element, context)]
    case 'barcode':
      return [barcodeLine(element, context)]
    case 'line':
      return [lineLine(element, context)]
    case 'box':
      return [boxLine(element, context)]
    case 'raw':
      return [element.content]
  }
}
