import {clampUnit} from 'src/utils/clamp-unit'
import {type Accessor, createMemo} from 'solid-js'

import type {VirtualLightPosition} from 'src/features/relax-glass-renderer'
const MAX_HORIZONTAL_OFFSET = 0.08
const MAX_VERTICAL_OFFSET = 0.06

interface TiltOffset {
  readonly x: number
  readonly y: number
}

/** Adds device tilt or drag motion to a manually selected light position. */
export const useDaylightTilt = (
  basePosition: Accessor<VirtualLightPosition>,
  motionOffset: Accessor<TiltOffset>,
) => {
  const position = createMemo(() => {
    const base = basePosition()
    const movement = motionOffset()
    return {
      ...base,
      x: clampUnit(base.x + movement.x * MAX_HORIZONTAL_OFFSET),
      y: clampUnit(base.y + movement.y * MAX_VERTICAL_OFFSET),
    }
  })

  return {position}
}
