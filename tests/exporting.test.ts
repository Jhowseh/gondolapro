import { describe, expect, it } from 'vitest'
import { buildSyspdvExport, encodeWindows1252, normalizeSyspdvCode, syspdvExportProblem, textToRtf } from '../src/core/exporting'
import { generateScript } from '../src/core/generators'
import { extractCandidates, importScript } from '../src/core/importing'
import { rtfToText } from '../src/core/importing/rtf'
import { SYSPDV_LAYOUT_BASE64, SYSPDV_SCRIPT } from './fixtures'

function base64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

describe('SysPDV XML export', () => {
  it('writes the layout as the same RTF the SysPDV stores', () => {
    expect(base64(encodeWindows1252(textToRtf(SYSPDV_SCRIPT)))).toBe(SYSPDV_LAYOUT_BASE64)
  })

  it('reproduces the original XML row of an imported layout', () => {
    const bytes = buildSyspdvExport({ code: '04', description: 'ETIQUETA GONDOLA', script: SYSPDV_SCRIPT })
    const xml = new TextDecoder('windows-1252').decode(bytes)
    expect(xml).toContain(`<ROW ETQCOD="04" ETQDES="ETIQUETA GONDOLA" ETQLAY="${SYSPDV_LAYOUT_BASE64}"/>`)
  })

  it('can be imported back into the same script', () => {
    const bytes = buildSyspdvExport({ code: 'A1', description: 'PREÇO & PROMOÇÃO "10%"', script: SYSPDV_SCRIPT })
    const [candidate] = extractCandidates(bytes, 'layout.xml')
    expect(candidate.syspdvCode).toBe('A1')
    expect(candidate.name).toBe('PREÇO & PROMOÇÃO "10%"')
    expect(candidate.script.trim()).toBe(SYSPDV_SCRIPT)
    const imported = importScript(candidate.script, 'ppla', { name: candidate.name, widthMm: 100, heightMm: 30, gapMm: 3, dpi: 203 })
    expect(generateScript(imported.layout)).toBe(SYSPDV_SCRIPT)
  })

  it('escapes RTF special characters and accents', () => {
    const rtf = textToRtf('A\\{B}\nPreço')
    expect(rtf).toContain("A\\\\\\{B\\}\\par\r\nPre\\'e7o\\par\r\n")
    expect(rtfToText(rtf).replace(/\0/g, '')).toBe('A\\{B}\nPreço\n\n')
  })

  it('checks code and description', () => {
    expect(normalizeSyspdvCode(' 4 ')).toBe('04')
    expect(normalizeSyspdvCode('a1')).toBe('A1')
    expect(syspdvExportProblem({ code: '', description: 'X' })).toBe('Informe o código do layout no SysPDV.')
    expect(syspdvExportProblem({ code: '123', description: 'X' })).toBe('O código tem no máximo 2 caracteres.')
    expect(syspdvExportProblem({ code: '0-', description: 'X' })).toBe('Use só letras e números no código.')
    expect(syspdvExportProblem({ code: '04', description: ' ' })).toBe('Informe a descrição do layout.')
    expect(syspdvExportProblem({ code: '04', description: 'X'.repeat(41) })).toBe('A descrição tem no máximo 40 caracteres.')
    expect(syspdvExportProblem({ code: '04', description: 'ETIQUETA' })).toBeNull()
    expect(() => buildSyspdvExport({ code: '', description: 'X', script: 'E' })).toThrow('Informe o código do layout no SysPDV.')
  })
})
