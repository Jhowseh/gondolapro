import { STX } from './controlCodes'
import type { LabelLayout, Language, Template } from './types'
import { mmToDots } from './units'

export const DEFAULT_TEMPLATES: Record<Language, Template> = {
  ppla: {
    header: [`${STX}O0220`, `${STX}e`, `${STX}L`, 'H14', 'SC', 'R0000', 'D11'].join('\n'),
    footer: ['Q</17>', 'E'].join('\n')
  },
  epl: {
    header: ['N', 'q{widthDots}', 'Q{heightDots},{gapDots}', 'S3', 'D9', 'ZT'].join('\n'),
    footer: 'P</17>'
  },
  zpl: {
    header: ['^XA', '^PW{widthDots}', '^LL{heightDots}', '^LH0,0'].join('\n'),
    footer: ['^PQ</17>,0,1,Y', '^XZ'].join('\n')
  }
}

export const TEMPLATE_VARIABLES = ['widthDots', 'heightDots', 'gapDots'] as const

export function templateFor(layout: LabelLayout): Template {
  return layout.templates[layout.language] ?? DEFAULT_TEMPLATES[layout.language]
}

export function templateVariables(layout: LabelLayout): Record<string, number> {
  return {
    widthDots: mmToDots(layout.widthMm, layout.dpi),
    heightDots: mmToDots(layout.heightMm, layout.dpi),
    gapDots: mmToDots(layout.gapMm, layout.dpi)
  }
}

export function renderTemplate(text: string, layout: LabelLayout): string[] {
  const variables = templateVariables(layout)
  return text
    .replace(/\{(\w+)\}/g, (match, name: string) => (name in variables ? String(variables[name]) : match))
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
}
