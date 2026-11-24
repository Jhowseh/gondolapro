const LINE_BREAK = '\r\n'

function scriptLines(script: string): string[] {
  return script.split(/\r?\n/)
}

export function toClipboardText(script: string): string {
  return scriptLines(script).join(LINE_BREAK)
}

export function toPrinterPayload(script: string): string {
  return scriptLines(script)
    .filter((line) => line.length > 0)
    .map((line) => line + LINE_BREAK)
    .join('')
}
