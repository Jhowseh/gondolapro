import type { Corner } from '../generators/anchor'
import type { LabelLayout, Language, Rotation } from '../types'

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

export interface ScriptSections {
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

export function topLeftFromCorner(point: { x: number; y: number }, corner: Corner, width: number, height: number): { x: number; y: number } {
  switch (corner) {
    case 'top-left':
      return { x: point.x, y: point.y }
    case 'top-right':
      return { x: point.x - width, y: point.y }
    case 'bottom-left':
      return { x: point.x, y: point.y - height }
    case 'bottom-right':
      return { x: point.x - width, y: point.y - height }
  }
}

export function invertRotationCodes(codes: Record<Rotation, string>): Record<string, Rotation> {
  const inverted: Record<string, Rotation> = {}
  for (const rotation of [0, 90, 180, 270] as Rotation[]) {
    inverted[codes[rotation]] = rotation
  }
  return inverted
}
