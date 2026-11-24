import { emissionOrder } from '../layout'
import { measureBarcode, measureText, sanitizeContent, wideBarDots } from '../measure'
import type { BarcodeElement, BoxElement, LabelElement, LabelLayout, LineElement, Rotation, TextElement } from '../types'
import { mmToDots } from '../units'

export const ZPL_ORIENTATION: Record<Rotation, string> = { 0: 'N', 90: 'R', 180: 'I', 270: 'B' }

export function escapeZpl(content: string): string {
  return sanitizeContent(content).replace(/[\^~]/g, '')
}

function origin(element: LabelElement, layout: LabelLayout): string {
  return `^FO${mmToDots(element.x, layout.dpi)},${mmToDots(element.y, layout.dpi)}`
}

function textLine(element: TextElement, layout: LabelLayout): string {
  const override = element.font?.language === 'zpl' ? element.font : undefined
  const { font } = measureText(element, layout)
  const size = override ? `${override.height},${override.width}` : `${font.heightDots},${font.heightDots}`
  return `${origin(element, layout)}^A${font.fontId}${ZPL_ORIENTATION[element.rotation]},${size}^FD${escapeZpl(element.content)}^FS`
}

function barcodeLine(element: BarcodeElement, layout: LabelLayout): string {
  const { barHeight } = measureBarcode(element, layout)
  const orientation = ZPL_ORIENTATION[element.rotation]
  const interpretation = element.showText ? 'Y' : 'N'
  const ratio = (wideBarDots(element) / element.moduleDots).toFixed(1)
  const command =
    element.symbology === 'ean13'
      ? `^BE${orientation},${barHeight},${interpretation},N`
      : `^B2${orientation},${barHeight},${interpretation},N,N`
  return `${origin(element, layout)}^BY${element.moduleDots},${ratio},${barHeight}${command}^FD${escapeZpl(element.content)}^FS`
}

function lineLine(element: LineElement, layout: LabelLayout): string {
  const width = Math.max(1, mmToDots(element.widthMm, layout.dpi))
  const height = Math.max(1, mmToDots(element.heightMm, layout.dpi))
  return `${origin(element, layout)}${reverse(element)}^GB${width},${height},${Math.min(width, height)}^FS`
}

function boxLine(element: BoxElement, layout: LabelLayout): string {
  const width = Math.max(1, mmToDots(element.widthMm, layout.dpi))
  const height = Math.max(1, mmToDots(element.heightMm, layout.dpi))
  const thickness = Math.max(1, mmToDots(element.thicknessMm, layout.dpi))
  return `${origin(element, layout)}${reverse(element)}^GB${width},${height},${thickness}^FS`
}

function reverse(element: LineElement | BoxElement): string {
  return element.invert ? '^FR' : ''
}

export function zplBody(layout: LabelLayout): string[] {
  return emissionOrder(layout.elements).flatMap((element) => {
    switch (element.type) {
      case 'text':
        return [textLine(element, layout)]
      case 'barcode':
        return [barcodeLine(element, layout)]
      case 'line':
        return [lineLine(element, layout)]
      case 'box':
        return [boxLine(element, layout)]
      case 'raw':
        return element.language === 'zpl' ? [element.content] : []
    }
  })
}
