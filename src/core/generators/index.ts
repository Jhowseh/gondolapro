import { isForeignRaw } from '../layout'
import { QUANTITY_TAG, substituteSamples } from '../syspdvFields'
import { renderTemplate, templateFor } from '../templates'
import type { LabelLayout, Language } from '../types'
import { eplBody } from './epl'
import { pplaBody, pplaHeader } from './ppla'
import { zplBody } from './zpl'

const BODY_GENERATORS: Record<Language, (layout: LabelLayout, headerLines: string[]) => string[]> = {
  ppla: pplaBody,
  epl: eplBody,
  zpl: zplBody
}

const HEADER_NORMALIZERS: Record<Language, (lines: string[]) => string[]> = {
  ppla: pplaHeader,
  epl: (lines) => lines,
  zpl: (lines) => lines
}

const SAMPLE_QUANTITY: Record<Language, string> = {
  ppla: '0001',
  epl: '1',
  zpl: '1'
}

interface GenerateOptions {
  withSamples?: boolean
}

export function generateScript(layout: LabelLayout, options: GenerateOptions = {}): string {
  const template = templateFor(layout)
  const header = HEADER_NORMALIZERS[layout.language](renderTemplate(template.header, layout))
  const ownLayout = { ...layout, elements: layout.elements.filter((element) => !isForeignRaw(element, layout.language)) }
  const script = [...header, ...BODY_GENERATORS[layout.language](ownLayout, header), ...renderTemplate(template.footer, layout)].join('\n')

  return options.withSamples ? substituteSamples(script, { ...layout.samples, [QUANTITY_TAG]: SAMPLE_QUANTITY[layout.language] }) : script
}
