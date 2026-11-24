import { cleanSamples, tag, type SampleValues } from './syspdvFields'
import type { BarcodeElement, BoxElement, DrawableElement, DrawableType, LabelElement, LabelLayout, Language, LineElement, RawElement, Template, TextElement } from './types'

type Overrides<T> = Partial<Omit<T, 'id' | 'type'>>

const DUPLICATE_OFFSET_MM = 2

function createId(): string {
  return crypto.randomUUID()
}

export function createText(overrides: Overrides<TextElement> = {}): TextElement {
  return { id: createId(), type: 'text', x: 2, y: 2, rotation: 0, content: 'TEXTO', heightMm: 3, ...overrides }
}

export function createBarcode(overrides: Overrides<BarcodeElement> = {}): BarcodeElement {
  return {
    id: createId(),
    type: 'barcode',
    x: 2,
    y: 2,
    rotation: 0,
    content: tag(1),
    symbology: 'ean13',
    heightMm: 10,
    moduleDots: 2,
    showText: true,
    ...overrides
  }
}

export function createLine(overrides: Overrides<LineElement> = {}): LineElement {
  return { id: createId(), type: 'line', x: 2, y: 2, widthMm: 40, heightMm: 0.3, invert: true, ...overrides }
}

export function createBox(overrides: Overrides<BoxElement> = {}): BoxElement {
  return { id: createId(), type: 'box', x: 2, y: 2, widthMm: 30, heightMm: 15, thicknessMm: 0.3, invert: true, ...overrides }
}

export function isInverted(element: LabelElement): element is LineElement | BoxElement {
  return (element.type === 'line' || element.type === 'box') && element.invert === true
}

export function partitionByInversion(elements: LabelElement[]): { normal: LabelElement[]; inverted: LabelElement[] } {
  return { normal: elements.filter((element) => !isInverted(element)), inverted: elements.filter(isInverted) }
}

export function emissionOrder(elements: LabelElement[]): LabelElement[] {
  const { normal, inverted } = partitionByInversion(elements)
  return [...normal, ...inverted]
}

export function isForeignRaw(element: LabelElement, language: Language): boolean {
  return element.type === 'raw' && element.language !== language
}

export function contentOf(element: LabelElement): string | null {
  return element.type === 'text' || element.type === 'barcode' ? element.content : null
}

export function createRaw(language: Language, content: string): RawElement {
  return { id: createId(), type: 'raw', x: 0, y: 0, language, content }
}

export function createElement(type: DrawableType): LabelElement {
  switch (type) {
    case 'text':
      return createText()
    case 'barcode':
      return createBarcode()
    case 'line':
      return createLine()
    case 'box':
      return createBox()
  }
}

export function duplicateElement(element: LabelElement): LabelElement {
  if (element.type === 'raw') {
    return { ...element, id: createId() }
  }
  return { ...element, id: createId(), x: element.x + DUPLICATE_OFFSET_MM, y: element.y + DUPLICATE_OFFSET_MM }
}

export function withSamples(layout: LabelLayout, samples: SampleValues): LabelLayout {
  const cleaned = cleanSamples(samples)
  const next: LabelLayout = { ...layout }
  delete next.samples
  return Object.keys(cleaned).length > 0 ? { ...next, samples: cleaned } : next
}

export function withTemplate(layout: LabelLayout, template: Template | null): LabelLayout {
  const templates = { ...layout.templates }
  if (template) {
    templates[layout.language] = template
  } else {
    delete templates[layout.language]
  }
  return { ...layout, templates }
}

export function createDefaultLayout(): LabelLayout {
  return {
    name: 'Gôndola 100x30',
    widthMm: 100,
    heightMm: 30,
    gapMm: 3,
    dpi: 203,
    language: 'ppla',
    templates: {},
    elements: [
      createText({ x: 2, y: 2, content: tag(3), heightMm: 3.5 }),
      createBarcode({ x: 2, y: 9 }),
      createText({ x: 48, y: 15.5, content: 'R$', heightMm: 4 }),
      createText({ x: 45, y: 11, content: tag(6), heightMm: 8 })
    ]
  }
}

export function describeElement(element: LabelElement): string {
  switch (element.type) {
    case 'text':
      return `Texto "${element.content}"`
    case 'barcode':
      return 'Código de barras'
    case 'line':
      return 'Linha'
    case 'box':
      return 'Caixa'
    case 'raw':
      return `Comando "${element.content}"`
  }
}

export function isDrawable(element: LabelElement): element is DrawableElement {
  return element.type !== 'raw'
}
