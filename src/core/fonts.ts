import type { FontOverride, Language, TextElement } from './types'

interface BitmapFont {
  id: string
  heightDots: number
  advanceDots: number
  automatic: boolean
}

export interface ResolvedFont {
  fontId: string
  hMult: number
  vMult: number
  heightDots: number
  advanceDots: number
}

export const MONO_ADVANCE_RATIO = 0.55

const ZPL_ADVANCE_RATIO = 0.6

const ZPL_MIN_HEIGHT = 10

const MULTIPLIER_PENALTY = 3

type BitmapLanguage = Exclude<Language, 'zpl'>

const BITMAP_FONTS: Record<BitmapLanguage, BitmapFont[]> = {
  ppla: [
    { id: '0', heightDots: 7, advanceDots: 6, automatic: true },
    { id: '1', heightDots: 13, advanceDots: 9, automatic: true },
    { id: '2', heightDots: 18, advanceDots: 12, automatic: true },
    { id: '3', heightDots: 27, advanceDots: 16, automatic: true },
    { id: '4', heightDots: 36, advanceDots: 20, automatic: true },
    { id: '5', heightDots: 52, advanceDots: 20, automatic: false },
    { id: '6', heightDots: 64, advanceDots: 34, automatic: false },
    { id: '7', heightDots: 28, advanceDots: 17, automatic: false },
    { id: '8', heightDots: 28, advanceDots: 17, automatic: false }
  ],
  epl: [
    { id: '1', heightDots: 12, advanceDots: 10, automatic: true },
    { id: '2', heightDots: 16, advanceDots: 12, automatic: true },
    { id: '3', heightDots: 20, advanceDots: 14, automatic: true },
    { id: '4', heightDots: 24, advanceDots: 16, automatic: true },
    { id: '5', heightDots: 48, advanceDots: 34, automatic: true }
  ]
}

const MULTIPLIER_LIMITS: Record<BitmapLanguage, { horizontal: number; vertical: number }> = {
  ppla: { horizontal: 9, vertical: 9 },
  epl: { horizontal: 6, vertical: 9 }
}

function bitmapFont(language: BitmapLanguage, id: string): BitmapFont | undefined {
  return BITMAP_FONTS[language].find((font) => font.id === id)
}

export function parseMultiplierCode(code: string): number {
  if (/^[1-9]$/.test(code)) {
    return Number(code)
  }
  if (/^[A-Oa-o]$/.test(code)) {
    return code.toUpperCase().charCodeAt(0) - 55
  }
  return 1
}

function resolveOverride(override: FontOverride): ResolvedFont {
  if (override.language === 'zpl') {
    const heightDots = Math.max(1, Number(override.height) || ZPL_MIN_HEIGHT)
    const widthDots = Math.max(1, Number(override.width) || heightDots)
    return { fontId: override.id, hMult: 1, vMult: 1, heightDots, advanceDots: widthDots * ZPL_ADVANCE_RATIO }
  }
  const font = bitmapFont(override.language, override.id) ?? BITMAP_FONTS[override.language][2]
  const hMult = parseMultiplierCode(override.width)
  const vMult = parseMultiplierCode(override.height)
  return {
    fontId: override.id,
    hMult,
    vMult,
    heightDots: font.heightDots * vMult,
    advanceDots: font.advanceDots * hMult
  }
}

export function fontOverrideFor(element: TextElement, language: Language): FontOverride | undefined {
  return element.font?.language === language ? element.font : undefined
}

export function resolveFont(language: Language, targetHeightDots: number, override?: FontOverride): ResolvedFont {
  if (override?.language === language) {
    return resolveOverride(override)
  }

  if (language === 'zpl') {
    const heightDots = Math.max(ZPL_MIN_HEIGHT, Math.round(targetHeightDots))
    return { fontId: '0', hMult: 1, vMult: 1, heightDots, advanceDots: heightDots * ZPL_ADVANCE_RATIO }
  }

  const limits = MULTIPLIER_LIMITS[language]
  let best: { font: BitmapFont; vMult: number; score: number } | null = null

  for (const font of BITMAP_FONTS[language].filter((item) => item.automatic)) {
    for (let vMult = 1; vMult <= limits.vertical; vMult++) {
      const score = Math.abs(font.heightDots * vMult - targetHeightDots) + (vMult - 1) * MULTIPLIER_PENALTY
      if (!best || score < best.score) {
        best = { font, vMult, score }
      }
    }
  }

  const { font, vMult } = best!
  const hMult = Math.min(vMult, limits.horizontal)
  return {
    fontId: font.id,
    hMult,
    vMult,
    heightDots: font.heightDots * vMult,
    advanceDots: font.advanceDots * hMult
  }
}
