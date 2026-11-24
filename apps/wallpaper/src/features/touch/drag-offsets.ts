import type {PoffoTouch} from '@winter-love/wallpaper/settings/touch'
import type {TouchParameter, TouchPoint} from './types'

interface DragOffsetsOptions {
  readonly parameters: readonly TouchParameter[]
  readonly settings: PoffoTouch
  readonly offsets: Readonly<Record<string, number>>
  readonly previous: TouchPoint
  readonly point: TouchPoint
  readonly shift: boolean
}

/** Applies axis routing to incremental pointer movement; Shift isolates the third axis. */
export const dragOffsets = (options: DragOffsetsOptions): Readonly<Record<string, number>> =>
  Object.fromEntries(
    options.parameters.map((parameter) => {
      const binding = options.settings.parameters?.[parameter.id]
      const axis =
        binding?.axis === undefined || binding.axis === 'auto' ? parameter.axis : binding.axis
      const delta =
        axis === 'x' ? options.point.x - options.previous.x : options.point.y - options.previous.y
      const activated = options.shift ? axis === 'z' : axis !== 'z'
      const direction = binding?.invert ? -1 : 1
      const range = parameter.maximum - parameter.minimum
      const value =
        (options.offsets[parameter.id] ?? 0) +
        (activated
          ? (delta / options.settings.distance) * range * (binding?.gain ?? 1) * direction
          : 0)
      return [parameter.id, Math.max(-range, Math.min(range, value))]
    }),
  )
