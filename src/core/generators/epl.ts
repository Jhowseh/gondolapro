import { emissionOrder } from '../layout'
import { elementBox, measureBarcode, measureText, sanitizeContent, wideBarDots } from '../measure'
import type { BarcodeElement, BoxElement, LabelElement, LabelLayout, LineElement, Rotation, TextElement } from '../types'
import { mmToDots } from '../units'
import { cornerOf, type Corner } from './anchor'

export const EPL_ROTATION_CODE: Record<Rotation, string> = { 0: '0', 90: '1', 180: '2', 270: '3' }

export const EPL_ROTATION_ANCHOR: Record<Rotation, Corner> = {
  0: 'top-left',
  90: 'top-right',
  180: 'bottom-right',
  270: 'bottom-left'
}

export function escapeEpl(content: string): string {
  return sanitizeContent(content).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function anchor(element: LabelElement, layout: LabelLayout, corner: Corner): string {
  const point = cornerOf(elementBox(element, layout), corner)
  return `${mmToDots(point.x, layout.dpi)},${mmToDots(point.y, layout.dpi)}`
}

function textLine(element: TextElement, layout: LabelLayout): string {
  const override = element.font?.language === 'epl' ? element.font : undefined
  const { font } = measureText(element, layout)
  const multipliers = override ? `${override.width},${override.height}` : `${font.hMult},${font.vMult}`
  return `A${anchor(element, layout, EPL_ROTATION_ANCHOR[element.rotation])},${EPL_ROTATION_CODE[element.rotation]},${font.fontId},${multipliers},N,"${escapeEpl(element.content)}"`
}

function barcodeLine(element: BarcodeElement, layout: LabelLayout): string {
  const { barHeight } = measureBarcode(element, layout)
  const narrow = element.moduleDots
  const isEan = element.symbology === 'ean13'
  const wide = element.wideDots ?? (isEan ? narrow : wideBarDots(element))
  return `B${anchor(element, layout, EPL_ROTATION_ANCHOR[element.rotation])},${EPL_ROTATION_CODE[element.rotation]},${isEan ? 'E30' : '2'},${narrow},${wide},${barHeight},${element.showText ? 'B' : 'N'},"${escapeEpl(element.content)}"`
}

function lineLine(element: LineElement, layout: LabelLayout): string {
  const width = Math.max(1, mmToDots(element.widthMm, layout.dpi))
  const height = Math.max(1, mmToDots(element.heightMm, layout.dpi))
  return `${element.invert ? 'LE' : 'LO'}${anchor(element, layout, 'top-left')},${width},${height}`
}

function boxLines(element: BoxElement, layout: LabelLayout): string[] {
  const x = mmToDots(element.x, layout.dpi)
  const y = mmToDots(element.y, layout.dpi)
  const width = mmToDots(element.widthMm, layout.dpi)
  const height = mmToDots(element.heightMm, layout.dpi)
  const thickness = Math.max(1, mmToDots(element.thicknessMm, layout.dpi))
  if (!element.invert) {
    return [`X${x},${y},${thickness},${x + width},${y + height}`]
  }
  const side = Math.max(0, height - 2 * thickness)
  return [
    `LE${x},${y},${width},${thickness}`,
    `LE${x},${y + height - thickness},${width},${thickness}`,
    ...(side > 0 ? [`LE${x},${y + thickness},${thickness},${side}`, `LE${x + width - thickness},${y + thickness},${thickness},${side}`] : [])
  ]
}

function eplLines(element: LabelElement, layout: LabelLayout): string[] {
  switch (element.type) {
    case 'text':
      return [textLine(element, layout)]
    case 'barcode':
      return [barcodeLine(element, layout)]
    case 'line':
      return [lineLine(element, layout)]
    case 'box':
      return boxLines(element, layout)
    case 'raw':
      return element.language === 'epl' ? [element.content] : []
  }
}

export function eplBody(layout: LabelLayout): string[] {
  return emissionOrder(layout.elements).flatMap((element) => eplLines(element, layout))
}
