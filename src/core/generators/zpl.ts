import { fontOverrideFor } from '../fonts'
import { emissionOrder } from '../layout'
import { measureBarcode, measureText, sanitizeContent, wideBarDots } from '../measure'
import type { BarcodeElement, BoxElement, LabelElement, LabelLayout, LineElement, Rotation, TextElement } from '../types'
import { mmToDots, mmToVisibleDots } from '../units'

export const ZPL_ORIENTATION: Record<Rotation, string> = { 0: 'N', 90: 'R', 180: 'I', 270: 'B' }

function escapeZpl(content: string): string {
  return sanitizeContent(content).replace(/[\^~]/g, '')
}

function origin(element: LabelElement, layout: LabelLayout): string {
  return `^FO${mmToDots(element.x, layout.dpi)},${mmToDots(element.y, layout.dpi)}`
}

function textLine(element: TextElement, layout: LabelLayout): string {
  const override = fontOverrideFor(element, 'zpl')
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

function graphicBox(element: LineElement | BoxElement, layout: LabelLayout): string {
  const width = mmToVisibleDots(element.widthMm, layout.dpi)
  const height = mmToVisibleDots(element.heightMm, layout.dpi)
  const thickness = element.type === 'box' ? mmToVisibleDots(element.thicknessMm, layout.dpi) : Math.min(width, height)
  return `${origin(element, layout)}${element.invert ? '^FR' : ''}^GB${width},${height},${thickness}^FS`
}

export function zplBody(layout: LabelLayout): string[] {
  return emissionOrder(layout.elements).flatMap((element) => {
    switch (element.type) {
      case 'text':
        return [textLine(element, layout)]
      case 'barcode':
        return [barcodeLine(element, layout)]
      case 'line':
      case 'box':
        return [graphicBox(element, layout)]
      case 'raw':
        return [element.content]
    }
  })
}
