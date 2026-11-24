import { describe, expect, it } from 'vitest'
import { STX } from '../src/core/controlCodes'
import { generateScript } from '../src/core/generators'
import { detectLanguage, extractCandidates, importScript, inferFrame, summarizeImport, type ImportFrame } from '../src/core/importing'
import { rtfToText } from '../src/core/importing/rtf'
import { createBarcode, createBox, createLine, createText } from '../src/core/layout'
import { invertedElementIds } from '../src/core/printModes'
import type { LabelLayout, Language } from '../src/core/types'
import { SYSPDV_LAYOUT_BASE64, SYSPDV_SCRIPT } from './fixtures'

function syspdvExport(description: string): Uint8Array {
  const xml = `<?xml version="1.0" standalone="yes"?>  <DATAPACKET Version="2.0"><METADATA><FIELDS><FIELD attrname="ETQCOD" fieldtype="string" required="true" SUBTYPE="FixedChar" WIDTH="2"/><FIELD attrname="ETQDES" fieldtype="string" WIDTH="40"/><FIELD attrname="ETQLAY" fieldtype="bin.hex" SUBTYPE="Binary"/></FIELDS><PARAMS/></METADATA><ROWDATA><ROW ETQCOD="04" ETQDES="${description}" ETQLAY="${SYSPDV_LAYOUT_BASE64}"/></ROWDATA></DATAPACKET>`
  return Uint8Array.from(xml, (char) => char.charCodeAt(0))
}

function frame(overrides: Partial<ImportFrame> = {}): ImportFrame {
  return { name: 'Importado', widthMm: 100, heightMm: 30, gapMm: 3, dpi: 203, ...overrides }
}

function roundTrip(layout: LabelLayout): string {
  const imported = importScript(generateScript(layout), layout.language, frame()).layout
  return generateScript(imported)
}

describe('SysPDV export', () => {
  it('reads the layout stored as RTF inside the XML', () => {
    const [candidate] = extractCandidates(syspdvExport('ETIQUETA RABBIT GONDOLA'), 'LAYOUT_ETIQUETA.XML')
    expect(candidate.label).toBe('04 - ETIQUETA RABBIT GONDOLA')
    expect(candidate.syspdvCode).toBe('04')
    expect(candidate.script.trim()).toBe(SYSPDV_SCRIPT)
  })

  it('decodes Windows-1252 descriptions', () => {
    const bytes = syspdvExport('PREÇO REF')
    const [candidate] = extractCandidates(bytes, 'layout.xml')
    expect(candidate.name).toBe('PREÇO REF')
  })

  it('rejects an XML without layouts', () => {
    const empty = Uint8Array.from('<DATAPACKET><ROWDATA></ROWDATA></DATAPACKET>', (char) => char.charCodeAt(0))
    expect(() => extractCandidates(empty, 'vazio.xml')).toThrow('O arquivo XML não tem nenhum layout de etiqueta do SysPDV.')
  })

  it('imports the real layout and regenerates the same script', () => {
    const [candidate] = extractCandidates(syspdvExport('RABBIT'), 'layout.xml')
    expect(detectLanguage(candidate.script)).toBe('ppla')
    const result = importScript(candidate.script, 'ppla', frame({ syspdvCode: candidate.syspdvCode }))
    expect(summarizeImport(result)).toEqual({ drawable: 8, raw: 2 })
    expect(result.layout.syspdvCode).toBe('04')
    expect(generateScript(result.layout)).toBe(SYSPDV_SCRIPT)
  })

  it('understands each kind of PPLA element', () => {
    const [candidate] = extractCandidates(syspdvExport('RABBIT'), 'layout.xml')
    const types = importScript(candidate.script, 'ppla', frame()).layout.elements.map((element) => element.type)
    expect(types).toEqual(['text', 'line', 'text', 'text', 'text', 'raw', 'text', 'raw', 'barcode', 'text'])
  })
})

describe('PPLA print modes', () => {
  it('marks elements drawn in XOR mode (A1) until A2 appears', () => {
    const [candidate] = extractCandidates(syspdvExport('RABBIT'), 'layout.xml')
    const { layout } = importScript(candidate.script, 'ppla', frame())
    const inverted = invertedElementIds(layout)
    const flags = layout.elements.filter((element) => element.type !== 'raw').map((element) => inverted.has(element.id))
    expect(flags).toEqual([true, true, true, true, true, false, false, false])
  })

  it('inverts a line added after A2, as in the imported layout', () => {
    const [candidate] = extractCandidates(syspdvExport('RABBIT'), 'layout.xml')
    const { layout } = importScript(candidate.script, 'ppla', frame())
    const added = createLine({ x: 17.5, y: 5, widthMm: 40, heightMm: 10 })
    const edited = { ...layout, elements: [...layout.elements, added] }
    expect(invertedElementIds(edited).has(added.id)).toBe(true)
    expect(generateScript(edited).split('\n').slice(-5)).toEqual(['A1', '1X1100000590069L157039', 'A2', 'Q</17>', 'E'])
  })

  it('reads XOR lines from EPL and ZPL', () => {
    const epl = importScript('N\nA16,16,0,4,1,1,N,"X"\nLE0,0,320,80\nP1', 'epl', frame()).layout
    const zpl = importScript('^XA^FO16,16^A0N,28,28^FDX^FS^FO0,0^FR^GB320,80,80^FS^XZ', 'zpl', frame()).layout
    expect(epl.elements[1]).toMatchObject({ type: 'line', invert: true })
    expect(zpl.elements[1]).toMatchObject({ type: 'line', invert: true })
  })
})

describe('RTF', () => {
  it('drops formatting and keeps paragraphs and escaped bytes', () => {
    expect(rtfToText("{\\rtf1{\\fonttbl{\\f0 Tahoma;}}\\pard\\'02L\\par A\\{B\\}\\par}")).toBe(`${STX}L\nA{B}\n`)
  })
})

describe('language detection', () => {
  it('detects ZPL, EPL and PPLA', () => {
    expect(detectLanguage('^XA\n^FO10,10^A0N,20,20^FDX^FS\n^XZ')).toBe('zpl')
    expect(detectLanguage('N\nq799\nA16,16,0,4,1,1,N,"</3>"\nP1')).toBe('epl')
    expect(detectLanguage('L\n131100000970008</3>\nE')).toBe('ppla')
  })

  it('reads the label size from EPL and ZPL', () => {
    expect(inferFrame('N\nq799\nQ240,24\nP1', 'epl', 203)).toMatchObject({ widthMm: expect.closeTo(100, 1), heightMm: expect.closeTo(30, 1), gapMm: expect.closeTo(3, 1) })
    expect(inferFrame('^XA^PW799^LL240^XZ', 'zpl', 203)).toMatchObject({ widthMm: expect.closeTo(100, 1), heightMm: expect.closeTo(30, 1) })
  })
})

describe('round trip', () => {
  const elements = () => [
    createText({ x: 2, y: 2, content: '</3>', heightMm: 3.5 }),
    createText({ x: 70, y: 4, content: 'VERTICAL', heightMm: 3, rotation: 90 }),
    createBarcode({ x: 2, y: 9 }),
    createBarcode({ x: 40, y: 18, symbology: 'i2of5', showText: false, heightMm: 6 }),
    createLine({ x: 0, y: 15, widthMm: 100, heightMm: 0.3 }),
    createBox({ x: 1, y: 1, widthMm: 50, heightMm: 20, thicknessMm: 0.5 })
  ]

  for (const language of ['ppla', 'epl', 'zpl'] as Language[]) {
    it(`keeps a generated ${language.toUpperCase()} script unchanged`, () => {
      const layout: LabelLayout = { ...frame(), language, templates: {}, elements: elements() }
      expect(roundTrip(layout)).toBe(generateScript(layout))
    })
  }

  it('keeps unknown commands in place as raw elements', () => {
    const script = '^XA\n^FO10,10^A0N,20,20^FDA^FS\n^FO20,20^FB200,2^FDB^FS\n^XZ'
    const { layout } = importScript(script, 'zpl', frame())
    expect(layout.elements.map((element) => element.type)).toEqual(['text', 'raw'])
    expect(generateScript(layout)).toBe('^XA\n^FO10,10^A0N,20,20^FDA^FS\n^FO20,20^FB200,2^FDB^FS\n^XZ')
  })

  it('converts ^FT fields and warns about it', () => {
    const result = importScript('^XA^FT10,40^A0N,30,30^FDX^FS^XZ', 'zpl', frame())
    expect(generateScript(result.layout)).toContain('^FO10,10^A0N,30,30^FDX^FS')
    expect(result.warnings).toHaveLength(1)
  })
})
