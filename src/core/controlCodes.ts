export const STX = '\x02'

export const STX_LABEL = '<STX>'

export function showControlCodes(text: string): string {
  return text.split(STX).join(STX_LABEL)
}

export function restoreControlCodes(text: string): string {
  return text.split(STX_LABEL).join(STX)
}

export function stripStx(line: string): string {
  return line.startsWith(STX) ? line.slice(1) : line
}
