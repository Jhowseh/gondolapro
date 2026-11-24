import { isRtf, rtfToText } from './rtf'

export interface ImportCandidate {
  label: string
  name: string
  syspdvCode?: string
  script: string
}

const ROW_PATTERN = /<ROW\b([^>]*?)\/?>/gi

const ATTRIBUTE_PATTERN = /([\w:-]+)\s*=\s*"([^"]*)"/g

const XML_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

export function decodeBytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '')
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64.replace(/\s+/g, ''))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function decodeXmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) return String.fromCodePoint(parseInt(entity.slice(2), 16))
    if (entity.startsWith('#')) return String.fromCodePoint(Number(entity.slice(1)))
    return XML_ENTITIES[entity.toLowerCase()] ?? match
  })
}

function attributesOf(source: string): Record<string, string> {
  const attributes: Record<string, string> = {}
  for (const match of source.matchAll(ATTRIBUTE_PATTERN)) {
    attributes[match[1].toUpperCase()] = decodeXmlEntities(match[2])
  }
  return attributes
}

export function normalizeScript(text: string): string {
  const plain = isRtf(text) ? rtfToText(text) : text
  return plain.replace(/\0/g, '').replace(/\r\n?/g, '\n')
}

function baseName(fileName: string): string {
  const name = fileName.split(/[\\/]/).pop() ?? fileName
  return name.replace(/\.[^.]+$/, '')
}

export function isSyspdvExport(text: string): boolean {
  return /<DATAPACKET\b/i.test(text)
}

export function parseSyspdvExport(xml: string): ImportCandidate[] {
  const candidates: ImportCandidate[] = []
  for (const row of xml.matchAll(ROW_PATTERN)) {
    const attributes = attributesOf(row[1])
    if (!attributes.ETQLAY) continue
    const code = attributes.ETQCOD?.trim() ?? ''
    const description = attributes.ETQDES?.trim() ?? ''
    candidates.push({
      label: [code, description].filter(Boolean).join(' - ') || 'Layout sem nome',
      name: description || `Etiqueta ${code}`,
      syspdvCode: code || undefined,
      script: normalizeScript(decodeBytes(base64ToBytes(attributes.ETQLAY)))
    })
  }
  if (candidates.length === 0) {
    throw new Error('O arquivo XML não tem nenhum layout de etiqueta do SysPDV.')
  }
  return candidates
}

export function extractCandidates(bytes: Uint8Array, fileName: string): ImportCandidate[] {
  const text = decodeBytes(bytes)
  if (isSyspdvExport(text)) {
    return parseSyspdvExport(text)
  }
  return [{ label: fileName, name: baseName(fileName), script: normalizeScript(text) }]
}
