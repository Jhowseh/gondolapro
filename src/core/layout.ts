import { tag } from './syspdvFields'
import type { BarcodeElement, BoxElement, DrawableType, LabelElement, LabelLayout, Language, LineElement, RawElement, TextElement } from './types'

type Overrides<T> = Partial<Omit<T, 'id' | 'type'>>

export function createId(): string {
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

export function emissionOrder(elements: LabelElement[]): LabelElement[] {
  return [...elements.filter((element) => !isInverted(element)), ...elements.filter(isInverted)]
}

export function createRaw(language: Language, content: string): RawElement {
  return { id: createId(), type: 'raw', x: 0, y: 0, language, content }
}

export function createElement(type: DrawableType, position: { x: number; y: number }): LabelElement {
  switch (type) {
    case 'text':
      return createText(position)
    case 'barcode':
      return createBarcode(position)
    case 'line':
      return createLine(position)
    case 'box':
      return createBox(position)
  }
}

export function duplicateElement(element: LabelElement, offsetMm = 2): LabelElement {
  if (element.type === 'raw') {
    return { ...element, id: createId() }
  }
  return { ...element, id: createId(), x: element.x + offsetMm, y: element.y + offsetMm }
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

export function isDrawable(element: LabelElement): element is Exclude<LabelElement, RawElement> {
  return element.type !== 'raw'
}
