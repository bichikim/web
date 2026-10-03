import type {SquareCropPoint, SquareCropResizeHandle} from './types'

const getArrowDelta = (key: string, step: number): SquareCropPoint | null => {
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

/** Maps arrow keys to movement, constraining resize handles to their axes. */
export const getSquareCropKeyboardDelta = (
  key: string,
  step: number,
  handle?: SquareCropResizeHandle,
): SquareCropPoint | null => {
  const delta = getArrowDelta(key, step)

  if (delta === null || handle === undefined) {
    return delta
  }

  const horizontal = handle.includes('west') ? -1 : handle.includes('east') ? 1 : 0
  const vertical = handle.includes('north') ? -1 : handle.includes('south') ? 1 : 0

  if (horizontal === 0 || vertical === 0) {
    return {x: horizontal === 0 ? 0 : delta.x, y: vertical === 0 ? 0 : delta.y}
  }

  const isExpanding = delta.x * horizontal + delta.y * vertical > 0
  const sizeDelta = isExpanding ? step : -step

  return {x: horizontal * sizeDelta, y: vertical * sizeDelta}
}
