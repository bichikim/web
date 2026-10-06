import {getArrowKeyDelta} from '@winter-love/utils/browser/events/get-arrow-key-delta'
import type {Point} from '@winter-love/utils/core/types/shared'
import type {SquareCropResizeHandle} from './types'

/** Maps arrow keys to movement, constraining resize handles to their axes. */
export const getSquareCropKeyboardDelta = (
  key: string,
  step: number,
  handle: SquareCropResizeHandle,
): Point | null => {
  const delta = getArrowKeyDelta(key, step)

  if (delta === null) {
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
