import type {PoffoTouch} from '@winter-love/wallpaper/settings/touch'
import type {TouchParameter} from './types'

interface TapOffsetsOptions {
  readonly parameters: readonly TouchParameter[]
  readonly settings: PoffoTouch
  readonly values: Readonly<Record<string, number>>
}
const RANDOM_MIDPOINT = 0.5

/** Gives each affected parameter a small random displacement within its range. */
export const tapOffsets = (options: TapOffsetsOptions): Readonly<Record<string, number>> =>
  Object.fromEntries(
    options.parameters.map((parameter) => {
      const value = options.values[parameter.id] ?? parameter.defaultValue
      const positive = Math.max(0, parameter.maximum - value)
      const negative = Math.max(0, value - parameter.minimum)
      const random = Math.random() < RANDOM_MIDPOINT ? -1 : 1
      const direction = positive === 0 ? -1 : negative === 0 ? 1 : random
      const amount =
        (parameter.maximum - parameter.minimum) *
        options.settings.amount *
        (options.settings.parameters?.[parameter.id]?.gain ?? 1)
      return [parameter.id, Math.min(amount, direction > 0 ? positive : negative) * direction]
    }),
  )
