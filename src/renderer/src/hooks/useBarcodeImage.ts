import JsBarcode from 'jsbarcode'
import { useMemo } from 'react'
import type { Symbology } from '../../../core/types'

const FORMAT: Record<Symbology, string> = {
  ean13: 'EAN13',
  i2of5: 'ITF'
}

export function useBarcodeImage(symbology: Symbology, data: string, showText: boolean): HTMLCanvasElement | null {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    try {
      JsBarcode(canvas, data, {
        format: FORMAT[symbology],
        width: 2,
        height: 120,
        margin: 0,
        flat: true,
        displayValue: showText,
        fontSize: 26,
        textMargin: 2,
        background: '#ffffff',
        lineColor: '#111111'
      })
      return canvas
    } catch {
      return null
    }
  }, [symbology, data, showText])
}
