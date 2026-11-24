import { STX } from './controlCodes'
import type { Language } from './types'

const LINE_BREAK = '\r\n'

function withPplaControlCodes(lines: string[]): string[] {
  if (lines.some((line) => line.startsWith(STX))) {
    return lines
  }
  const labelStart = lines.findIndex((line) => line.startsWith('L'))
  return lines.flatMap((line, index) => {
    if (labelStart === -1 || index < labelStart) {
      return [`${STX}${line}`]
    }
    if (index === labelStart) {
      const rest = line.slice(1)
      return rest ? [`${STX}L`, rest] : [`${STX}L`]
    }
    return [line]
  })
}

export function toPrinterPayload(script: string, language: Language): string {
  const lines = script.split(/\r?\n/).filter((line) => line.length > 0)
  const output = language === 'ppla' ? withPplaControlCodes(lines) : lines
  return output.join(LINE_BREAK) + LINE_BREAK
}
