import { QUANTITY_TAG, substituteSamples } from '../syspdvFields'
import { renderTemplate, templateFor } from '../templates'
import type { LabelLayout, Language } from '../types'
import { eplBody } from './epl'
import { pplaBody } from './ppla'
import { zplBody } from './zpl'

const BODY_GENERATORS: Record<Language, (layout: LabelLayout) => string[]> = {
  ppla: pplaBody,
  epl: eplBody,
  zpl: zplBody
}

const SAMPLE_QUANTITY: Record<Language, string> = {
  ppla: '0001',
  epl: '1',
  zpl: '1'
}

export interface GenerateOptions {
  withSamples?: boolean
}

export function generateScript(layout: LabelLayout, options: GenerateOptions = {}): string {
  const template = templateFor(layout)
  const script = [
    ...renderTemplate(template.header, layout),
    ...BODY_GENERATORS[layout.language](layout),
    ...renderTemplate(template.footer, layout)
  ].join('\n')

  return options.withSamples ? substituteSamples(script, { ...layout.samples, [QUANTITY_TAG]: SAMPLE_QUANTITY[layout.language] }) : script
}
