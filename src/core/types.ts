export type Language = 'ppla' | 'epl' | 'zpl'

export type Rotation = 0 | 90 | 180 | 270

export const ROTATIONS: Rotation[] = [0, 90, 180, 270]

export type Symbology = 'ean13' | 'i2of5'

export interface FontOverride {
  language: Language
  id: string
  width: string
  height: string
  extra?: string
}

export interface TextElement {
  id: string
  type: 'text'
  x: number
  y: number
  rotation: Rotation
  content: string
  heightMm: number
  font?: FontOverride
}

export interface BarcodeElement {
  id: string
  type: 'barcode'
  x: number
  y: number
  rotation: Rotation
  content: string
  symbology: Symbology
  heightMm: number
  moduleDots: number
  wideDots?: number
  showText: boolean
}

export interface LineElement {
  id: string
  type: 'line'
  x: number
  y: number
  widthMm: number
  heightMm: number
  invert?: boolean
}

export interface BoxElement {
  id: string
  type: 'box'
  x: number
  y: number
  widthMm: number
  heightMm: number
  thicknessMm: number
  invert?: boolean
}

export interface RawElement {
  id: string
  type: 'raw'
  x: number
  y: number
  language: Language
  content: string
}

export type LabelElement = TextElement | BarcodeElement | LineElement | BoxElement | RawElement

type ElementType = LabelElement['type']

export type DrawableType = Exclude<ElementType, 'raw'>

export type DrawableElement = Exclude<LabelElement, RawElement>

export interface Template {
  header: string
  footer: string
}

export interface LabelLayout {
  name: string
  widthMm: number
  heightMm: number
  gapMm: number
  dpi: number
  language: Language
  templates: Partial<Record<Language, Template>>
  elements: LabelElement[]
  syspdvCode?: string
  samples?: Record<string, string>
}

export interface Size {
  width: number
  height: number
}

export interface Box {
  x: number
  y: number
  width: number
  height: number
}
