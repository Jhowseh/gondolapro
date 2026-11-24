import { createBarcode, createBox, createLine, createText } from '../src/core/layout'
import { STX } from '../src/core/controlCodes'
import type { LabelElement, LabelLayout, Language } from '../src/core/types'

export function layoutWith(elements: LabelElement[], language: Language = 'ppla'): LabelLayout {
  return {
    name: 'Teste',
    widthMm: 100,
    heightMm: 30,
    gapMm: 3,
    dpi: 203,
    language,
    templates: {},
    elements
  }
}

export const description = createText({ x: 2, y: 2, content: '</3>', heightMm: 3.5 })

export const barcode = createBarcode({ x: 2, y: 9 })

export const divider = createLine({ x: 0, y: 15, widthMm: 100, heightMm: 0.3, invert: false })

export const frame = createBox({ x: 1, y: 1, widthMm: 50, heightMm: 20, thicknessMm: 0.5, invert: false })

export const band = createLine({ x: 0, y: 0, widthMm: 40, heightMm: 10 })

export const invertedFrame = createBox({ x: 1, y: 1, widthMm: 50, heightMm: 20, thicknessMm: 0.5 })

export const SYSPDV_LAYOUT_BASE64 =
  'e1xydGYxXGFuc2lcYW5zaWNwZzEyNTJcZGVmZjBcZGVmbGFuZzEwNDZ7XGZvbnR0Ymx7XGYwXGZuaWxcZmNoYXJzZXQwIFRhaG9tYTt9fQ0Ke1xjb2xvcnRibCA7XHJlZDBcZ3JlZW4wXGJsdWUwO30NClx2aWV3a2luZDRcdWMxXHBhcmRcY2YxXGYwXGZzMjBcJzAyTzAyMjBccGFyDQpcJzAyZVxwYXINClwnMDJMXHBhcg0KSDE0XHBhcg0KRDIyXHBhcg0KU0NccGFyDQpSMDAwMFxwYXINCkQxMVxwYXINCkExXHBhcg0KMTQxMDAwMDAwNzkwMDU1PC8xOD4wMTM1XHBhcg0KMVgxMTAwMDAwMDUwMjMwTDE1MDAyMFxwYXINCjEzMTAwMDAwMDA4MDI1MDwvMjM+OlxwYXINCjEzMTAwMDAwMDA4MDMwMFIkPC8yND5ccGFyDQoxNDExMDAwMDA0NTAyNDBSJFxwYXINCkEyXHBhcg0KMTYxMDAwMDAwMzYwMjUwPC82PlxwYXINCkEyXHBhcg0KMWQ0MjAxNDAwMjMwMDYwPC8xPlxwYXINCjEzMTEwMDAwMDA3MDA2MDwvMT5ccGFyDQpRPC8xNz5ccGFyDQpFXHBhcg0KXHBhcg0KfQ0KAA=='

export const SYSPDV_SCRIPT = [
  `${STX}O0220`,
  `${STX}e`,
  `${STX}L`,
  'H14',
  'D22',
  'SC',
  'R0000',
  'D11',
  'A1',
  '141000000790055</18>0135',
  '1X1100000050230L150020',
  '131000000080250</23>:',
  '131000000080300R$</24>',
  '141100000450240R$',
  'A2',
  '161000000360250</6>',
  'A2',
  '1d4201400230060</1>',
  '131100000070060</1>',
  'Q</17>',
  'E'
].join('\n')
