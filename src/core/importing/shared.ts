import { cornerOf, type Corner } from '../generators/anchor'
import { createText } from '../layout'
import { elementBox, measureText } from '../measure'
import { ROTATIONS, type FontOverride, type LabelElement, type LabelLayout, type Language, type Rotation, type TextElement } from '../types'
import { dotsToMm } from '../units'

export interface ImportFrame {
  name: string
  widthMm: number
  heightMm: number
  gapMm: number
  dpi: number
  syspdvCode?: string
}

export interface ImportResult {
  layout: LabelLayout
  warnings: string[]
}

interface ScriptSections {
  header: string[]
  body: string[]
  footer: string[]
}

export function splitScriptLines(script: string): string[] {
  return script
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[\r\n]+$/, ''))
    .filter((line) => line.trim().length > 0)
}

export function splitSections(lines: string[], isBodyLine: (line: string) => boolean): ScriptSections {
  const first = lines.findIndex(isBodyLine)
  if (first === -1) {
    return { header: lines, body: [], footer: [] }
  }
  const last = lines.length - 1 - [...lines].reverse().findIndex(isBodyLine)
  return {
    header: lines.slice(0, first),
    body: lines.slice(first, last + 1),
    footer: lines.slice(last + 1)
  }
}

export function baseLayout(frame: ImportFrame, language: Language, header: string[], footer: string[]): LabelLayout {
  return {
    name: frame.name,
    widthMm: frame.widthMm,
    heightMm: frame.heightMm,
    gapMm: frame.gapMm,
    dpi: frame.dpi,
    language,
    templates: { [language]: { header: header.join('\n'), footer: footer.join('\n') } },
    elements: [],
    ...(frame.syspdvCode ? { syspdvCode: frame.syspdvCode } : {})
  }
}

export function placeAtCorner<T extends LabelElement>(element: T, layout: LabelLayout, pointMm: { x: number; y: number }, corner: Corner): T {
  const { width, height } = elementBox(element, layout)
  const offset = cornerOf({ x: 0, y: 0, width, height }, corner)
  return { ...element, x: pointMm.x - offset.x, y: pointMm.y - offset.y }
}

export function importedText(rotation: Rotation, content: string, font: FontOverride, layout: LabelLayout): TextElement {
  const draft = createText({ rotation, content, heightMm: 1, font })
  return { ...draft, heightMm: dotsToMm(measureText(draft, layout).height, layout.dpi) }
}

export function invertRotationCodes(codes: Record<Rotation, string>): Record<string, Rotation> {
  const inverted: Record<string, Rotation> = {}
  for (const rotation of ROTATIONS) {
    inverted[codes[rotation]] = rotation
  }
  return inverted
}
