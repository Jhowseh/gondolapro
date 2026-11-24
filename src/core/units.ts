export const MM_PER_INCH = 25.4

export function dotsPerMm(dpi: number): number {
  return dpi / MM_PER_INCH
}

export function mmToDots(mm: number, dpi: number): number {
  return Math.round(mm * dotsPerMm(dpi))
}

export function dotsToMm(dots: number, dpi: number): number {
  return dots / dotsPerMm(dpi)
}

export function mmToVisibleDots(mm: number, dpi: number): number {
  return Math.max(1, mmToDots(mm, dpi))
}

export function pad(value: number, length: number): string {
  return String(Math.max(0, Math.round(value))).padStart(length, '0')
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function snap(value: number, step: number): number {
  return Math.round(value / step) * step
}
