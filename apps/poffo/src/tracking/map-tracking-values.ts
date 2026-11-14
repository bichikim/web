import type {PuppetParameterValueMap} from '@winter-love/puppet/player'
import type {MappingValues, ParameterMapping} from './types'

interface MapTrackingValuesOptions {
  readonly mappings: ReadonlyArray<ParameterMapping>
  readonly values: MappingValues
  readonly previous?: PuppetParameterValueMap
  readonly elapsed: number
}
/** Converts calibrated inputs to clamped model values with time-based smoothing. */
export const mapTrackingValues = (options: MapTrackingValuesOptions): PuppetParameterValueMap =>
  Object.fromEntries(
    options.mappings.flatMap((mapping) => {
      const value = options.values[mapping.input]
      if (
        !mapping.enabled ||
        mapping.inputConnected === false ||
        (mapping.outputConnected === false && !mapping.parameterId.startsWith('draft:')) ||
        value === undefined ||
        !Number.isFinite(value) ||
        mapping.inputMaximum === mapping.inputMinimum
      ) {
        return []
      }
      if (mapping.direct) {
        return [
          [
            mapping.parameterId,
            Math.max(
              Math.min(mapping.outputMinimum, mapping.outputMaximum),
              Math.min(Math.max(mapping.outputMinimum, mapping.outputMaximum), value),
            ),
          ],
        ]
      }
      const minimum = Math.min(mapping.inputMinimum, mapping.inputMaximum)
      const maximum = Math.max(mapping.inputMinimum, mapping.inputMaximum)
      const origin = Math.min(maximum, Math.max(minimum, 0))
      const amplified = origin + (value - (mapping.baseline ?? origin)) * (mapping.multiplier ?? 1)
      const amount = Math.min(
        1,
        Math.max(
          0,
          (amplified - mapping.inputMinimum) / (mapping.inputMaximum - mapping.inputMinimum),
        ),
      )
      const target =
        mapping.outputMinimum + amount * (mapping.outputMaximum - mapping.outputMinimum)
      const previous = options.previous?.[mapping.parameterId]
      const blend =
        mapping.smoothing <= 0 ? 1 : 1 - Math.exp(-Math.max(0, options.elapsed) / mapping.smoothing)
      return [
        [
          mapping.parameterId,
          previous === undefined ? target : previous + (target - previous) * blend,
        ],
      ]
    }),
  )
