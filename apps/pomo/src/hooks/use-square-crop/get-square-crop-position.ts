import {clamp} from 'es-toolkit/math'
import type {Point} from '@winter-love/utils/core/types/shared'
import type {SquareCropFrame, SquareCropSelection} from './types'

const clampPosition = (value: number): number => clamp(value, -1, 1)

/** Converts viewport selection coordinates to a position within the image's movable range. */
export const getSquareCropPosition = (
  frame: SquareCropFrame,
  selection: SquareCropSelection,
): Point => {
  const maxX = Math.max(0, (frame.imageWidth - selection.size) / 2)
  const maxY = Math.max(0, (frame.imageHeight - selection.size) / 2)

  return {
    x: maxX === 0 ? 0 : clampPosition((selection.x - (frame.imageX + maxX)) / maxX),
    y: maxY === 0 ? 0 : clampPosition((selection.y - (frame.imageY + maxY)) / maxY),
  }
}
