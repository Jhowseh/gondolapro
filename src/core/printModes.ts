import { stripStx } from './controlCodes'
import { isInverted } from './layout'
import { renderTemplate, templateFor } from './templates'
import type { LabelLayout } from './types'

export const PPLA_XOR_COMMAND = 'A1'

export const PPLA_TRANSPARENT_COMMAND = 'A2'

const PPLA_MODE_PATTERN = /^A([1-5])$/

const PPLA_XOR_MODE = '1'

const PPLA_DEFAULT_MODE = '2'

function modeOf(line: string): string | null {
  return PPLA_MODE_PATTERN.exec(stripStx(line).trim())?.[1] ?? null
}

export function invertedElementIds(layout: LabelLayout): Set<string> {
  const inverted = new Set(layout.elements.filter(isInverted).map((element) => element.id))
  if (layout.language !== 'ppla') {
    return inverted
  }

  let mode = PPLA_DEFAULT_MODE
  for (const line of renderTemplate(templateFor(layout).header, layout)) {
    mode = modeOf(line) ?? mode
  }

  for (const element of layout.elements) {
    if (element.type === 'raw') {
      if (element.language === 'ppla') mode = modeOf(element.content) ?? mode
    } else if (mode === PPLA_XOR_MODE) {
      inverted.add(element.id)
    }
  }

  return inverted
}
