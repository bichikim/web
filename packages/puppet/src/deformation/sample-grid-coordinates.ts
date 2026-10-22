import type {SampleParameterCoordinatesOptions} from './parameter'
import {locateOneDimensionalKeyform} from './locate-keyform-segment'

const KEY_PROGRESS_EPSILON = 0.0001

const getCoordinates = (options: SampleParameterCoordinatesOptions, index: number) =>
  options.keyformCoordinates[index] ?? options.restCoordinates

/** 직교 키폼 격자를 보간하며, 이산 채널은 각 축의 낮은 키를 유지한다. */
export const sampleGridCoordinates = (options: SampleParameterCoordinatesOptions) => {
  const policy = options.binding.sampling
  const precision =
    options.sampling === 'step'
      ? (policy?.discretePrecision ?? 'float32')
      : (policy?.continuousPrecision ?? 'float64')
  const tolerance = policy?.keyTolerance ?? KEY_PROGRESS_EPSILON
  const axes = options.binding.parameterIds.map((_, axis) => {
    const keys = [
      ...new Set(options.binding.keyforms.map((keyform) => keyform.values[axis]!)),
    ].sort((first, second) => first - second)
    const roundedKeys = precision === 'float32' ? keys.map(Math.fround) : keys
    const input =
      precision === 'float32' ? Math.fround(options.values[axis]!) : options.values[axis]!
    const value =
      policy?.keyToleranceUnit === 'parameter'
        ? (roundedKeys.find((key) => Math.abs(key - input) < tolerance) ?? input)
        : input
    const segment = locateOneDimensionalKeyform(roundedKeys, value, options.repeatRanges?.[axis])
    const progress =
      segment === undefined
        ? 0
        : policy?.keyToleranceUnit === 'parameter'
          ? segment.progress
          : segment.progress <= tolerance
            ? 0
            : segment.progress >= 1 - tolerance
              ? 1
              : segment.progress
    return segment === undefined
      ? []
      : segment.from === segment.to || options.sampling === 'step'
        ? [{value: keys[progress === 1 ? segment.to : segment.from]!, weight: 1}]
        : [
            {value: keys[segment.from]!, weight: 1 - progress},
            {value: keys[segment.to]!, weight: progress},
          ]
  })
  const corners = axes.reduce<Array<{values: number[]; weight: number}>>(
    (previous, axis) =>
      previous.flatMap((corner) =>
        axis.map((key) => ({
          values: [...corner.values, key.value],
          weight: corner.weight * key.weight,
        })),
      ),
    [{values: [], weight: 1}],
  )
  if (corners.length === 0) {
    return options.restCoordinates
  }
  const samples = corners.map((corner) => ({
    coordinates: getCoordinates(
      options,
      options.binding.keyforms.findIndex((form) =>
        form.values.every((value, axis) => value === corner.values[axis]),
      ),
    ),
    weight: corner.weight,
  }))
  return options.restCoordinates.map((rest, index) => {
    const origin = samples[0]?.coordinates[index] ?? rest
    return samples.reduce(
      (sum, sample) => sum + ((sample.coordinates[index] ?? rest) - origin) * sample.weight,
      origin,
    )
  })
}
