import { isLanguage } from './languages'
import { withSamples } from './layout'
import type { LabelLayout } from './types'

export const LAYOUT_FILE_EXTENSION = 'etq'

const FILE_KIND = 'gondolapro-layout'

const ACCEPTED_FILE_KINDS = new Set([FILE_KIND, 'etiqstudio-layout'])

const FILE_VERSION = 1

const ELEMENT_TYPES = new Set(['text', 'barcode', 'line', 'box', 'raw'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function stringEntries(record: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(Object.entries(record).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
}

function invalid(): Error {
  return new Error('O arquivo não é um layout válido do GôndolaPro.')
}

export function serializeLayout(layout: LabelLayout): string {
  return JSON.stringify({ kind: FILE_KIND, version: FILE_VERSION, layout }, null, 2)
}

export function parseLayout(text: string): LabelLayout {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw invalid()
  }

  if (!isRecord(data) || !ACCEPTED_FILE_KINDS.has(String(data.kind)) || !isRecord(data.layout)) {
    throw invalid()
  }

  if (typeof data.version !== 'number' || data.version > FILE_VERSION) {
    throw new Error('Este layout foi salvo por uma versão mais nova do GôndolaPro.')
  }

  const layout = data.layout
  const elementsAreValid =
    Array.isArray(layout.elements) &&
    layout.elements.every((element) => isRecord(element) && typeof element.id === 'string' && ELEMENT_TYPES.has(String(element.type)))

  if (
    typeof layout.name !== 'string' ||
    !isPositiveNumber(layout.widthMm) ||
    !isPositiveNumber(layout.heightMm) ||
    !isPositiveNumber(layout.dpi) ||
    typeof layout.gapMm !== 'number' ||
    !isLanguage(layout.language) ||
    !elementsAreValid
  ) {
    throw invalid()
  }

  const parsed: LabelLayout = {
    ...(layout as unknown as LabelLayout),
    templates: isRecord(layout.templates) ? (layout.templates as LabelLayout['templates']) : {}
  }
  return withSamples(parsed, isRecord(layout.samples) ? stringEntries(layout.samples) : {})
}
