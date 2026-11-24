import { describe, expect, it } from 'vitest'
import { generateScript } from '../src/core/generators'
import { pplaBody, multiplierCode } from '../src/core/generators/ppla'
import { eplBody } from '../src/core/generators/epl'
import { zplBody } from '../src/core/generators/zpl'
import { createBarcode, createText } from '../src/core/layout'
import { band, barcode, description, divider, frame, invertedFrame, layoutWith } from './fixtures'

describe('inverted lines and boxes', () => {
  it('creates new lines and boxes in inverted mode', () => {
    expect(band.invert).toBe(true)
    expect(invertedFrame.invert).toBe(true)
  })

  it('moves inverted PPLA elements to the end in XOR mode, whatever the order', () => {
    const body = pplaBody(layoutWith([band, description]))
    expect(body).toEqual(['131100000970008</3>', 'A1', '1X1100000790000L157039', 'A2'])
  })

  it('uses LE for inverted EPL lines and draws inverted boxes with four LE lines', () => {
    expect(eplBody(layoutWith([band, description], 'epl'))).toEqual(['A16,16,0,4,1,1,N,"</3>"', 'LE0,0,320,80'])
    expect(eplBody(layoutWith([invertedFrame], 'epl'))).toEqual(['LE8,8,400,4', 'LE8,164,400,4', 'LE8,12,4,152', 'LE404,12,4,152'])
  })

  it('uses ^FR for inverted ZPL graphics', () => {
    expect(zplBody(layoutWith([band, description], 'zpl'))).toEqual(['^FO16,16^A0N,28,28^FD</3>^FS', '^FO0,0^FR^GB320,80,80^FS'])
  })
})

describe('PPLA', () => {
  it('writes text with the bottom-left anchor', () => {
    expect(pplaBody(layoutWith([description]))).toEqual(['131100000970008</3>'])
  })

  it('writes an EAN-13 barcode', () => {
    expect(pplaBody(layoutWith([barcode]))).toEqual(['1F6203900330008</1>'])
  })

  it('uses lowercase barcode letters to hide the digits', () => {
    const [line] = pplaBody(layoutWith([createBarcode({ x: 2, y: 9, symbology: 'i2of5', showText: false })]))
    expect(line.slice(0, 4)).toBe('1d42')
  })

  it('writes lines and boxes', () => {
    expect(pplaBody(layoutWith([divider, frame]))).toEqual(['1X1100000580000L394001', '1X1100000350004B197079002002'])
  })

  it('rotates text to the vertical orientation', () => {
    const vertical = createText({ x: 10, y: 5, content: 'ABC', heightMm: 3.5, rotation: 90 })
    expect(pplaBody(layoutWith([vertical]))).toEqual(['431100000980039ABC'])
  })

  it('encodes multipliers above 9 as letters', () => {
    expect(multiplierCode(9)).toBe('9')
    expect(multiplierCode(10)).toBe('A')
    expect(multiplierCode(24)).toBe('O')
  })

  it('wraps the body with the default header and footer', () => {
    const script = generateScript(layoutWith([description]))
    expect(script.split('\n')).toEqual(['\x02O0220', '\x02e', '\x02L', 'H14', 'SC', 'R0000', 'D11', '131100000970008</3>', 'Q</17>', 'E'])
  })

  it('replaces tags with sample values for test prints', () => {
    const script = generateScript(layoutWith([description]), { withSamples: true })
    expect(script).toContain('131100000970008ARROZ T1 PREMIUM 5KG')
    expect(script).toContain('Q0001')
  })
})

describe('EPL', () => {
  it('writes text, barcode, line and box', () => {
    expect(eplBody(layoutWith([description, barcode, divider, frame], 'epl'))).toEqual([
      'A16,16,0,4,1,1,N,"</3>"',
      'B16,72,0,E30,2,2,80,B,"</1>"',
      'LO0,120,799,2',
      'X8,8,4,408,168'
    ])
  })

  it('escapes quotes inside text', () => {
    const [line] = eplBody(layoutWith([createText({ content: 'POL "A"' })], 'epl'))
    expect(line.endsWith('"POL \\"A\\""')).toBe(true)
  })

  it('renders the template with label dimensions', () => {
    const script = generateScript(layoutWith([], 'epl'))
    expect(script.split('\n')).toEqual(['N', 'q799', 'Q240,24', 'S3', 'D9', 'ZT', 'P</17>'])
  })
})

describe('ZPL', () => {
  it('writes text, barcode, line and box', () => {
    expect(zplBody(layoutWith([description, barcode, divider, frame], 'zpl'))).toEqual([
      '^FO16,16^A0N,28,28^FD</3>^FS',
      '^FO16,72^BY2,2.0,80^BEN,80,Y,N^FD</1>^FS',
      '^FO0,120^GB799,2,2^FS',
      '^FO8,8^GB400,160,4^FS'
    ])
  })

  it('uses the interleaved 2 of 5 command', () => {
    const [line] = zplBody(layoutWith([createBarcode({ symbology: 'i2of5', showText: false })], 'zpl'))
    expect(line).toContain('^B2N,80,N,N,N')
  })

  it('closes the label with the quantity tag', () => {
    const script = generateScript(layoutWith([], 'zpl'))
    expect(script.split('\n')).toEqual(['^XA', '^PW799', '^LL240', '^LH0,0', '^PQ</17>,0,1,Y', '^XZ'])
  })

  it('uses custom templates when present', () => {
    const layout = { ...layoutWith([], 'zpl'), templates: { zpl: { header: '^XA', footer: '^XZ' } } }
    expect(generateScript(layout)).toBe('^XA\n^XZ')
  })
})
