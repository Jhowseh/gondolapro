export const SYSPDV_CODE_LENGTH = 2

export const SYSPDV_DESCRIPTION_LENGTH = 40

interface SyspdvExport {
  code: string
  description: string
  script: string
}

const RTF_HEADER =
  '{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1046{\\fonttbl{\\f0\\fnil\\fcharset0 Tahoma;}}\r\n{\\colortbl ;\\red0\\green0\\blue0;}\r\n\\viewkind4\\uc1\\pard\\cf1\\f0\\fs20'

const RTF_FOOTER = '\\par\r\n}\r\n\0'

const XML_HEADER =
  '<?xml version="1.0" standalone="yes"?>  <DATAPACKET Version="2.0"><METADATA><FIELDS><FIELD attrname="ETQCOD" fieldtype="string" required="true" SUBTYPE="FixedChar" WIDTH="2"/><FIELD attrname="ETQDES" fieldtype="string" WIDTH="40"/><FIELD attrname="ETQLAY" fieldtype="bin.hex" SUBTYPE="Binary"/></FIELDS><PARAMS/></METADATA><ROWDATA>'

const XML_FOOTER = '</ROWDATA></DATAPACKET>'

const XML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }

const UNKNOWN_BYTE = 0x3f

const WINDOWS_1252 = buildWindows1252Table()

function buildWindows1252Table(): Map<string, number> {
  const decoder = new TextDecoder('windows-1252')
  const table = new Map<string, number>()
  for (let byte = 0; byte < 256; byte++) {
    table.set(decoder.decode(Uint8Array.of(byte)), byte)
  }
  return table
}

export function encodeWindows1252(text: string): Uint8Array {
  return Uint8Array.from(Array.from(text), (char) => WINDOWS_1252.get(char) ?? UNKNOWN_BYTE)
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function escapeRtfChar(char: string): string {
  if (char === '\\' || char === '{' || char === '}') {
    return `\\${char}`
  }
  const byte = WINDOWS_1252.get(char)
  if (byte === undefined) {
    const code = char.codePointAt(0) ?? UNKNOWN_BYTE
    return code > 0xffff ? '?' : `\\u${code > 0x7fff ? code - 65536 : code}?`
  }
  if (byte < 0x20 || byte >= 0x80) {
    return `\\'${byte.toString(16).padStart(2, '0')}`
  }
  return char
}

export function textToRtf(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n')
  const body = lines.map((line) => `${Array.from(line, escapeRtfChar).join('')}\\par\r\n`).join('')
  return `${RTF_HEADER}${body}${RTF_FOOTER}`
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => XML_ESCAPES[char])
}

export function normalizeSyspdvCode(code: string): string {
  const trimmed = code.trim().toUpperCase()
  return /^\d$/.test(trimmed) ? `0${trimmed}` : trimmed
}

export function syspdvExportProblem(data: Pick<SyspdvExport, 'code' | 'description'>): string | null {
  const code = normalizeSyspdvCode(data.code)
  if (code.length === 0) return 'Informe o código do layout no SysPDV.'
  if (code.length > SYSPDV_CODE_LENGTH) return `O código tem no máximo ${SYSPDV_CODE_LENGTH} caracteres.`
  if (!/^[0-9A-Z]+$/.test(code)) return 'Use só letras e números no código.'
  if (data.description.trim().length === 0) return 'Informe a descrição do layout.'
  if (data.description.trim().length > SYSPDV_DESCRIPTION_LENGTH) return `A descrição tem no máximo ${SYSPDV_DESCRIPTION_LENGTH} caracteres.`
  return null
}

export function buildSyspdvExport(data: SyspdvExport): Uint8Array {
  const problem = syspdvExportProblem(data)
  if (problem) {
    throw new Error(problem)
  }
  const layout = bytesToBase64(encodeWindows1252(textToRtf(data.script)))
  const row = `<ROW ETQCOD="${escapeXml(normalizeSyspdvCode(data.code))}" ETQDES="${escapeXml(data.description.trim())}" ETQLAY="${layout}"/>`
  return encodeWindows1252(`${XML_HEADER}${row}${XML_FOOTER}`)
}
