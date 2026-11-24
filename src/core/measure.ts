import { resolveFont, type ResolvedFont } from './fonts'
import { substituteSamples, type SampleValues } from './syspdvFields'
import type { BarcodeElement, Box, LabelElement, LabelLayout, Size, TextElement } from './types'
import { dotsToMm, mmToDots, mmToVisibleDots } from './units'

const I2OF5_WIDE_RATIO = 2

const BARCODE_TEXT_HEIGHT_MM = 2.5

const PPLA_DESCENT_RATIO = 0.25

const DESCENDER_PATTERN = /[,;gjpqy]/

const EAN13_MODULES = 95

const EAN13_FALLBACK = '7891234567895'

interface TextMetrics {
  font: ResolvedFont
  text: string
  width: number
  height: number
  descent: number
}

interface BarcodeMetrics {
  data: string
  width: number
  height: number
  barHeight: number
  textHeight: number
}

export function sanitizeContent(content: string): string {
  return content.replace(/[\r\n]+/g, ' ')
}

export function measureText(element: TextElement, layout: LabelLayout): TextMetrics {
  const font = resolveFont(layout.language, mmToDots(element.heightMm, layout.dpi), element.font)
  const text = substituteSamples(sanitizeContent(element.content), layout.samples)
  return {
    font,
    text,
    width: Math.max(1, text.length) * font.advanceDots,
    height: font.heightDots,
    descent: layout.language === 'ppla' && DESCENDER_PATTERN.test(text) ? Math.round(font.heightDots * PPLA_DESCENT_RATIO) : 0
  }
}

export function barcodeData(element: BarcodeElement, samples?: SampleValues): string {
  const digits = substituteSamples(element.content, samples).replace(/\D/g, '')
  if (element.symbology === 'ean13') {
    return digits.length === 12 || digits.length === 13 ? digits : EAN13_FALLBACK
  }
  if (!digits) {
    return `0${EAN13_FALLBACK}`
  }
  return digits.length % 2 === 0 ? digits : `0${digits}`
}

export function wideBarDots(element: BarcodeElement): number {
  return element.wideDots ?? element.moduleDots * I2OF5_WIDE_RATIO
}

function barcodeWidthDots(element: BarcodeElement, data: string): number {
  if (element.symbology === 'ean13') {
    return EAN13_MODULES * element.moduleDots
  }
  const narrow = element.moduleDots
  const wide = wideBarDots(element)
  return 4 * narrow + data.length * (3 * narrow + 2 * wide) + wide + 2 * narrow
}

export function measureBarcode(element: BarcodeElement, layout: LabelLayout): BarcodeMetrics {
  const data = barcodeData(element, layout.samples)
  const barHeight = mmToVisibleDots(element.heightMm, layout.dpi)
  const textHeight = element.showText ? mmToDots(BARCODE_TEXT_HEIGHT_MM, layout.dpi) : 0
  return {
    data,
    width: barcodeWidthDots(element, data),
    height: barHeight + textHeight,
    barHeight,
    textHeight
  }
}

export function contentSizeMm(element: LabelElement, layout: LabelLayout): Size {
  switch (element.type) {
    case 'text': {
      const metrics = measureText(element, layout)
      return { width: dotsToMm(metrics.width, layout.dpi), height: dotsToMm(metrics.height, layout.dpi) }
    }
    case 'barcode': {
      const metrics = measureBarcode(element, layout)
      return { width: dotsToMm(metrics.width, layout.dpi), height: dotsToMm(metrics.height, layout.dpi) }
    }
    case 'line':
    case 'box':
      return { width: element.widthMm, height: element.heightMm }
    case 'raw':
      return { width: 0, height: 0 }
  }
}

export function elementBox(element: LabelElement, layout: LabelLayout): Box {
  const size = contentSizeMm(element, layout)
  const rotated = (element.type === 'text' || element.type === 'barcode') && (element.rotation === 90 || element.rotation === 270)
  return {
    x: element.x,
    y: element.y,
    width: rotated ? size.height : size.width,
    height: rotated ? size.width : size.height
  }
}

export function textInkBox(element: TextElement, layout: LabelLayout): Box | null {
  const metrics = measureText(element, layout)
  const visible = metrics.text.trim()
  if (!visible) {
    return null
  }
  const box = elementBox(element, layout)
  if (element.rotation !== 0) {
    return box
  }
  const leading = metrics.text.length - metrics.text.trimStart().length
  const advance = dotsToMm(metrics.font.advanceDots, layout.dpi)
  return {
    x: box.x + leading * advance,
    y: box.y,
    width: visible.length * advance,
    height: box.height + dotsToMm(metrics.descent, layout.dpi)
  }
}
