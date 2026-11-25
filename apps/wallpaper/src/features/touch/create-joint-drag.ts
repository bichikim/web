import type {ParameterDrag} from '@winter-love/puppet/player'
import type {TouchPoint} from './types'

interface CreateJointDragOptions {
  readonly drag: ParameterDrag
  readonly parameterIds: readonly string[]
  readonly response: readonly number[]
  readonly values: () => Readonly<Record<string, number>>
  readonly offsets: () => Readonly<Record<string, number>>
  readonly write: (offsets: Readonly<Record<string, number>>) => void
}
export interface JointDrag {
  move(point: TouchPoint): void
  cancel(): void
}
const MILLISECONDS_PER_SECOND = 1000
const INITIAL_FRAME_RATE = 60
const FRAME_DURATION = MILLISECONDS_PER_SECOND / INITIAL_FRAME_RATE
const MAXIMUM_LAG = 280
const SETTLE_TOLERANCE = 0.001

/** Exponential following is frame-rate independent; only unsettled joints request another frame. */
export const createJointDrag = (options: CreateJointDragOptions): JointDrag => {
  let target: Readonly<Record<string, number>> = {}
  let frame: number | undefined
  let previous: number | undefined
  let cancelled = false
  const advance = (elapsed: number) => {
    const values = options.values()
    const offsets = options.offsets()
    let pending = false
    const next = Object.fromEntries(
      options.parameterIds.map((id, index) => {
        const current = values[id] ?? 0
        const response = options.response[index]!
        const desired = response === 0 ? current : (target[id] ?? current)
        const factor = response >= 1 ? 1 : 1 - Math.exp(-elapsed / ((1 - response) * MAXIMUM_LAG))
        const interpolated = current + (desired - current) * factor
        const settled = Math.abs(desired - interpolated) < SETTLE_TOLERANCE
        const value = settled ? desired : interpolated
        pending ||= !settled
        return [id, value - current + (offsets[id] ?? 0)]
      }),
    )
    options.write(next)
    return pending
  }
  const tick = (time: number) => {
    frame = undefined
    if (cancelled) {
      return
    }
    const elapsed = previous === undefined ? FRAME_DURATION : Math.max(0, time - previous)
    previous = time
    if (advance(elapsed)) {
      frame = requestAnimationFrame(tick)
    }
  }
  return {
    cancel() {
      cancelled = true
      if (frame !== undefined) {
        cancelAnimationFrame(frame)
        frame = undefined
      }
    },
    move(point) {
      if (cancelled) {
        return
      }
      target = options.drag.solve(point)
      if (frame === undefined) {
        previous = undefined
        if (advance(FRAME_DURATION)) {
          frame = requestAnimationFrame(tick)
        }
      }
    },
  }
}
