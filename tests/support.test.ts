import { describe, expect, it } from 'vitest'
import { generateScript } from '../src/core/generators'
import { createBarcode, createDefaultLayout, createLine, createText } from '../src/core/layout'
import { barcodeData, elementBox, measureText, textInkBox } from '../src/core/measure'
import { toPrinterPayload } from '../src/core/printerPayload'
import { parseLayout, serializeLayout } from '../src/core/serialization'
import { cleanSamples, findTags, substituteSamples } from '../src/core/syspdvFields'
import { validateLayout } from '../src/core/validation'
import { layoutWith } from './fixtures'

describe('SysPDV tags', () => {
  it('finds numbered and named tags in content', () => {
    expect(findTags('R$ </6> / </5> </precoReferencial>')).toEqual(['6', '5', 'precoreferencial'])
  })

  it('substitutes samples and keeps unknown tags visible', () => {
    expect(substituteSamples('</5> </31>')).toBe('UN [31]')
    expect(substituteSamples('Q</17>', { 17: '0003' })).toBe('Q0003')
  })

  it('keeps digits written right after a regular tag', () => {
    expect(substituteSamples('</5>12')).toBe('UN12')
  })

  it('cuts the description for </18>XXYY', () => {
    expect(substituteSamples('</18>0105')).toBe('ARROZ')
    expect(substituteSamples('</18>0711')).toBe('TIPO ')
  })

  it('writes the character of </99>XXX', () => {
    expect(substituteSamples('</99>065</99>066')).toBe('AB')
  })

  it('uses the first column of </32>VVVXXXX', () => {
    expect(substituteSamples('1D420200012</32>1200005</1>')).toBe('1D4202000120005' + '7891234567895')
  })

  it('pads prices with the two leading spaces SysPDV prints', () => {
    expect(substituteSamples('</6>')).toBe('  1.249,90')
    expect(substituteSamples('</28>')).toBe('  1.199,90')
  })

  it('counts the price padding in the printed width', () => {
    const layout = layoutWith([])
    const plain = elementBox(createText({ content: 'R$', heightMm: 4.5 }), layout).width
    const price = elementBox(createText({ content: '</6>', heightMm: 4.5 }), layout).width
    expect(price).toBeCloseTo((plain / 2) * 10)
  })
})

describe('barcode data', () => {
  it('falls back to a valid EAN-13 when the sample does not fit', () => {
    expect(barcodeData(createBarcode({ content: 'ABC' }))).toBe('7891234567895')
  })

  it('pads interleaved 2 of 5 data to an even length', () => {
    expect(barcodeData(createBarcode({ content: '123', symbology: 'i2of5' }))).toBe('0123')
  })
})

describe('element box', () => {
  it('swaps width and height for vertical elements', () => {
    const layout = layoutWith([])
    const horizontal = elementBox(createText({ content: 'ABC' }), layout)
    const vertical = elementBox(createText({ content: 'ABC', rotation: 270 }), layout)
    expect(vertical.width).toBeCloseTo(horizontal.height)
    expect(vertical.height).toBeCloseTo(horizontal.width)
  })
})

describe('printer payload', () => {
  it('adds STX to PPLA system commands and splits the L line', () => {
    const payload = toPrinterPayload('O0220\nLC0000\nH14\nE', 'ppla')
    expect(payload).toBe('\x02O0220\r\n\x02L\r\nC0000\r\nH14\r\nE\r\n')
  })

  it('does not add STX again when the script already has it', () => {
    expect(toPrinterPayload('\x02L\nH14\nE', 'ppla')).toBe('\x02L\r\nH14\r\nE\r\n')
  })

  it('keeps ZPL untouched apart from line breaks', () => {
    expect(toPrinterPayload('^XA\n^XZ', 'zpl')).toBe('^XA\r\n^XZ\r\n')
  })
})

describe('validation', () => {
  it('accepts the default layout', () => {
    expect(validateLayout(createDefaultLayout())).toEqual([])
  })

  it('reports elements outside the label', () => {
    const issues = validateLayout(layoutWith([createText({ x: 95, content: 'TEXTO LONGO' })]))
    expect(issues.map((issue) => issue.message)).toContain('Texto "TEXTO LONGO" passa da borda da etiqueta.')
  })

  it('reports unknown tags and invalid fixed EAN codes', () => {
    const issues = validateLayout(layoutWith([createText({ content: '</31>' }), createBarcode({ content: '123' })]))
    expect(issues).toHaveLength(2)
  })

  it('reports tags that are missing their parameter digits', () => {
    const issues = validateLayout(layoutWith([createText({ content: '</18>01' })]))
    expect(issues.map((issue) => issue.message)).toEqual([expect.stringContaining('A tag </18> precisa de 4 dígitos')])
  })

  it('accepts every tag of the real SysPDV layout', () => {
    const contents = ['</18>0135', '</23>:', 'R$</24>', '</6>', '</1>']
    expect(validateLayout(layoutWith(contents.map((content, index) => createText({ y: index * 5, content }))))).toEqual([])
  })
})

describe('serialization', () => {
  it('round-trips a layout', () => {
    const layout = createDefaultLayout()
    expect(parseLayout(serializeLayout(layout))).toEqual(layout)
  })

  it('rejects files that are not layouts', () => {
    expect(() => parseLayout('{"kind":"other"}')).toThrow('O arquivo não é um layout válido do GôndolaPro.')
    expect(() => parseLayout('not json')).toThrow()
  })
})

describe('editable samples', () => {
  it('uses the values typed for the layout and keeps the price padding', () => {
    const samples = { '3': 'CABO DE FREIO', '6': '165,00' }
    expect(substituteSamples('</3> R$</6>', samples)).toBe('CABO DE FREIO R$  165,00')
  })

  it('cuts the description fields from the typed description', () => {
    const samples = { '2': 'ARANHA TRAVA CUBO TRASEIRA BICICLETA ARO 29 REFORCADA' }
    expect(substituteSamples('</15>|</16>|</18>0106', samples)).toBe('ARANHA TRAVA CUBO TRASEIR|A BICICLETA ARO 29 R|ARANHA')
  })

  it('limits a typed value to the size SysPDV sends', () => {
    expect(substituteSamples('</5>', { '5': 'UNIDADE' })).toBe('UNI')
  })

  it('drops values equal to the default, derived fields and unknown tags', () => {
    expect(cleanSamples({ '6': '1.249,90', '15': 'X', '99': 'A', zz: '1', '3': 'MANGUEIRA' })).toEqual({ '3': 'MANGUEIRA' })
  })

  it('measures the barcode and the test print with the typed code', () => {
    const layout = { ...layoutWith([createBarcode({ content: '</1>' })]), samples: { '1': '7891000315507' } }
    expect(barcodeData(createBarcode({ content: '</1>' }), layout.samples)).toBe('7891000315507')
    expect(generateScript(layout, { withSamples: true })).toContain('7891000315507')
  })

  it('saves and opens the typed values with the layout', () => {
    const layout = { ...createDefaultLayout(), samples: { '6': '165,00' } }
    expect(parseLayout(serializeLayout(layout)).samples).toEqual({ '6': '165,00' })
    expect(parseLayout(serializeLayout(createDefaultLayout())).samples).toBeUndefined()
  })

  it('still opens layouts saved under the old app name', () => {
    const legacy = serializeLayout(createDefaultLayout()).replace('"gondolapro-layout"', '"etiqstudio-layout"')
    expect(parseLayout(legacy).name).toBe(createDefaultLayout().name)
  })
})

describe('printed ink', () => {
  it('skips the price padding and adds the comma descent in PPLA', () => {
    const layout = layoutWith([])
    const price = createText({ x: 10, y: 5, content: '</6>', heightMm: 4.5 })
    const metrics = measureText(price, layout)
    const box = elementBox(price, layout)
    const ink = textInkBox(price, layout)!
    expect(metrics.descent).toBe(9)
    expect(ink.x).toBeCloseTo(box.x + (box.width / 10) * 2)
    expect(ink.width).toBeCloseTo((box.width / 10) * 8)
    expect(ink.height).toBeGreaterThan(box.height)
  })

  it('has no descent when nothing hangs below the line', () => {
    expect(measureText(createText({ content: 'R$ 10' }), layoutWith([])).descent).toBe(0)
    expect(measureText(createText({ content: '1,00' }), layoutWith([], 'zpl')).descent).toBe(0)
  })

  it('warns when the price leaves its black band', () => {
    const price = createText({ x: 42, y: 10, content: '</6>', heightMm: 9 })
    const band = createLine({ x: 50, y: 9, widthMm: 40, heightMm: 13 })
    const messages = validateLayout(layoutWith([price, band])).map((issue) => issue.message)
    expect(messages).toContain('Texto "</6>" não cabe inteiro na faixa em que está: uma parte sai para fora dela.')
    const roomy = { ...band, widthMm: 46 }
    expect(validateLayout(layoutWith([price, roomy]))).toEqual([])
  })
})
