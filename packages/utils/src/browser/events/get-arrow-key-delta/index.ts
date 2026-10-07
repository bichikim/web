import type {Point} from 'src/core/types/shared'

/** Maps arrow keys to screen-coordinate deltas; returns null for other keys. */
export const getArrowKeyDelta = (key: string, step = 1): Point | null => {
  switch (key) {
    case 'ArrowDown':
      return {x: 0, y: step}
    case 'ArrowLeft':
      return {x: -step, y: 0}
    case 'ArrowRight':
      return {x: step, y: 0}
    case 'ArrowUp':
      return {x: 0, y: -step}
    default:
      return null
  }
}
