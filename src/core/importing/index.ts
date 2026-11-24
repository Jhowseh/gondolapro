import { stripStx } from '../controlCodes'
import type { Language } from '../types'
import { inferEplFrame, isEplElementLine, parseEpl } from './epl'
import { isPplaElementLine, parsePpla } from './ppla'
import { splitScriptLines, type ImportFrame, type ImportResult } from './shared'
import { inferZplFrame, parseZpl } from './zpl'

export type { ImportCandidate } from './sources'
export { extractCandidates, normalizeScript } from './sources'
export type { ImportFrame, ImportResult } from './shared'

interface ImportSummary {
  drawable: number
  raw: number
}

export function detectLanguage(script: string): Language {
  if (/\^XA/i.test(script)) {
    return 'zpl'
  }
  const lines = splitScriptLines(script).map((line) => stripStx(line).trim())
  const ppla = lines.filter(isPplaElementLine).length
  const epl = lines.filter(isEplElementLine).length
  return epl > ppla ? 'epl' : 'ppla'
}

export function inferFrame(script: string, language: Language, dpi: number): Partial<Pick<ImportFrame, 'widthMm' | 'heightMm' | 'gapMm'>> {
  switch (language) {
    case 'epl':
      return inferEplFrame(script, dpi)
    case 'zpl':
      return inferZplFrame(script, dpi)
    case 'ppla':
      return {}
  }
}

export function importScript(script: string, language: Language, frame: ImportFrame): ImportResult {
  switch (language) {
    case 'ppla':
      return parsePpla(script, frame)
    case 'epl':
      return parseEpl(script, frame)
    case 'zpl':
      return parseZpl(script, frame)
  }
}

export function summarizeImport(result: ImportResult): ImportSummary {
  const raw = result.layout.elements.filter((element) => element.type === 'raw').length
  return { drawable: result.layout.elements.length - raw, raw }
}
