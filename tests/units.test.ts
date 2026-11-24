import { describe, expect, it } from 'vitest'
import { resolveFont } from '../src/core/fonts'
import { mmToDots, mmToHundredthsInch, pad } from '../src/core/units'

describe('units', () => {
  it('converts millimetres to printer dots at 203 dpi', () => {
    expect(mmToDots(100, 203)).toBe(799)
    expect(mmToDots(30, 203)).toBe(240)
    expect(mmToDots(3, 203)).toBe(24)
  })

  it('converts millimetres to PPLA hundredths of an inch', () => {
    expect(mmToHundredthsInch(25.4)).toBe(100)
    expect(mmToHundredthsInch(10)).toBe(39)
  })

  it('pads numbers with zeros', () => {
    expect(pad(97, 4)).toBe('0097')
    expect(pad(-3, 3)).toBe('000')
  })
})

describe('resolveFont', () => {
  it('prefers a native PPLA font over a large multiplier', () => {
    expect(resolveFont('ppla', 28)).toMatchObject({ fontId: '3', hMult: 1, vMult: 1, heightDots: 27 })
  })

  it('uses multipliers for large PPLA text', () => {
    expect(resolveFont('ppla', 64)).toMatchObject({ fontId: '4', vMult: 2, heightDots: 72 })
  })

  it('picks the closest EPL font', () => {
    expect(resolveFont('epl', 28)).toMatchObject({ fontId: '4', hMult: 1, vMult: 1, heightDots: 24 })
  })

  it('caps the EPL horizontal multiplier at 6', () => {
    expect(resolveFont('epl', 48 * 9).hMult).toBeLessThanOrEqual(6)
  })

  it('keeps ZPL text scalable', () => {
    expect(resolveFont('zpl', 28)).toMatchObject({ fontId: '0', heightDots: 28 })
    expect(resolveFont('zpl', 4).heightDots).toBe(10)
  })
})
