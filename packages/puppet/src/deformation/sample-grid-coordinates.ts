import type {PuppetParameterBindingBase} from '../player/document'
import type {SampleParameterCoordinatesOptions} from './parameter'

interface GridBinding extends Pick<PuppetParameterBindingBase, 'sampling'> {
  readonly parameterIds: ReadonlyArray<string>
  readonly keyforms: ReadonlyArray<{readonly values: ReadonlyArray<number>}>
}

export interface SampleGridCoordinatesOptions extends Omit<
  SampleParameterCoordinatesOptions,
  'binding' | 'values'
> {
  /** 축 개수 제한 없이 표본화하는 격자와 샘플링 정책. */
  readonly binding: GridBinding
  /** 각 격자 축의 입력값. */
  readonly values: ReadonlyArray<number>
}
import {locateOneDimensionalKeyform} from './locate-keyform-segment'

const KEY_PROGRESS_EPSILON = 0.0001

const getCoordinates = (options: SampleGridCoordinatesOptions, index: number) =>
  options.keyformCoordinates[index] ?? options.restCoordinates

const grids = new WeakMap<
  SampleGridCoordinatesOptions['binding'],
  {
    readonly axes: ReadonlyArray<{readonly keys: number[]; readonly rounded: number[]}>
    readonly corners: ReadonlyMap<string, number>
  }
>()

const getGrid = (binding: SampleGridCoordinatesOptions['binding']) => {
  let grid = grids.get(binding)
  if (grid === undefined) {
    const axes = binding.parameterIds.map((_, axis) => {
      const keys = [...new Set(binding.keyforms.map((form) => form.values[axis]!))].sort(
        (first, second) => first - second,
      )
      return {keys, rounded: keys.map(Math.fround)}
    })
    const corners = new Map<string, number>()
    binding.keyforms.forEach((form, index) => {
      const key = JSON.stringify(form.values)
      if (!corners.has(key)) {
        corners.set(key, index)
      }
    })
    grid = {axes, corners}
    grids.set(binding, grid)
  }
  return grid
}

interface GridCorner {
  readonly index: number
  readonly weight: number
}

const computeGridCorners = (options: SampleGridCoordinatesOptions): ReadonlyArray<GridCorner> => {
  const policy = options.binding.sampling
  const precision =
    options.sampling === 'step'
      ? (policy?.discretePrecision ?? 'float32')
      : (policy?.continuousPrecision ?? 'float64')
  const tolerance = policy?.keyTolerance ?? KEY_PROGRESS_EPSILON
  const grid = getGrid(options.binding)
  const axes = grid.axes.map(({keys, rounded}, axis) => {
    const roundedKeys = precision === 'float32' ? rounded : keys
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
  return corners.map((corner) => ({
    index: grid.corners.get(JSON.stringify(corner.values)) ?? -1,
    weight: corner.weight,
  }))
}

interface GridPoint {
  readonly values: ReadonlyArray<number>
  readonly repeatRanges: SampleGridCoordinatesOptions['repeatRanges']
  readonly corners: ReadonlyArray<GridCorner>
}

// Channels share one interpolation point. Retain only the latest continuous/discrete point
// per immutable binding; channel coordinates and rest values are always read from the caller.
const gridPoints = new WeakMap<GridBinding, Map<boolean, GridPoint>>()

const getGridCorners = (options: SampleGridCoordinatesOptions) => {
  let points = gridPoints.get(options.binding)
  if (points === undefined) {
    points = new Map()
    gridPoints.set(options.binding, points)
  }
  const discrete = options.sampling === 'step'
  const previous = points.get(discrete)
  if (
    previous !== undefined &&
    previous.values.length === options.values.length &&
    previous.values.every((value, index) => Object.is(value, options.values[index])) &&
    (previous.repeatRanges?.length ?? 0) === (options.repeatRanges?.length ?? 0) &&
    (previous.repeatRanges ?? []).every(
      (range, index) =>
        range?.[0] === options.repeatRanges?.[index]?.[0] &&
        range?.[1] === options.repeatRanges?.[index]?.[1],
    )
  ) {
    return previous.corners
  }
  const corners = computeGridCorners(options)
  points.set(discrete, {
    corners,
    repeatRanges: options.repeatRanges?.map((range) =>
      range === undefined ? undefined : ([range[0], range[1]] as const),
    ),
    values: [...options.values],
  })
  return corners
}

/** Snapshots the interpolation point; each indexed read samples the supplied coordinate channels. */
export const createGridCoordinateSampler = (
  options: SampleGridCoordinatesOptions,
): ((index: number) => number) => {
  const samples = getGridCorners(options)
  if (samples.length === 0) {
    return (index) => options.restCoordinates[index]!
  }
  const coordinates = samples.map((sample) => getCoordinates(options, sample.index))
  // The common one-axis grid keeps its original accumulation order, including the origin term.
  if (samples.length === 2) {
    const first = coordinates[0]!
    const second = coordinates[1]!
    const firstWeight = samples[0]!.weight
    const secondWeight = samples[1]!.weight
    const rest = options.restCoordinates
    return (index) => {
      const origin = first[index] ?? rest[index]!
      const initial = origin + ((first[index] ?? rest[index]!) - origin) * firstWeight
      return initial + ((second[index] ?? rest[index]!) - origin) * secondWeight
    }
  }
  return (index) => {
    const rest = options.restCoordinates[index]!
    const origin = coordinates[0]![index] ?? rest
    let result = origin
    for (let corner = 0; corner < samples.length; corner += 1) {
      result += ((coordinates[corner]![index] ?? rest) - origin) * samples[corner]!.weight
    }
    return result
  }
}

/** 직교 키폼 격자를 보간하며, 이산 채널은 각 축의 낮은 키를 유지한다. */
export const sampleGridCoordinates = (
  options: SampleGridCoordinatesOptions,
): ReadonlyArray<number> => {
  if (getGridCorners(options).length === 0) {
    return options.restCoordinates
  }
  const sample = createGridCoordinateSampler(options)
  return options.restCoordinates.map((_, index) => sample(index))
}
