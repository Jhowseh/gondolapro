import type { Box } from '../types'

export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export function cornerOf(box: Box, corner: Corner): { x: number; y: number } {
  const right = box.x + box.width
  const bottom = box.y + box.height
  switch (corner) {
    case 'top-left':
      return { x: box.x, y: box.y }
    case 'top-right':
      return { x: right, y: box.y }
    case 'bottom-left':
      return { x: box.x, y: bottom }
    case 'bottom-right':
      return { x: right, y: bottom }
  }
}
