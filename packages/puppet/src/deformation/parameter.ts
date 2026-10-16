import Delaunator from 'delaunator'

import type {
  PuppetParameterBinding,
  PuppetParameterBinding2D,
  PuppetParameterBinding3D,
  PuppetParameterKeyform,
} from '../player/document'

/** Parameters a binding can key, Cubism's limit. */
export const MAX_PARAMETER_DIMENSIONS = 3

/** How many parameters a binding keys. */
export type ParameterDimensions = 1 | 2 | typeof MAX_PARAMETER_DIMENSIONS

export type PuppetParameterValues =
  | readonly [number]
  | readonly [number, number]
  | readonly [number, number, number]

/** Per bound parameter, the `[minimum, maximum]` of a repeating one (see `getRepeatRanges`). */
export type PuppetRepeatRanges = ReadonlyArray<readonly [number, number] | undefined>

export interface SampleParameterVerticesOptions {
  readonly binding?: PuppetParameterBinding
  readonly partId: string
  readonly repeatRanges?: PuppetRepeatRanges
  readonly restVertices: ReadonlyArray<number>
  readonly values: PuppetParameterValues
}

/** Two keyform indices of a 1D binding and the progress from the first to the second. */
export interface KeyformSegment {
  readonly from: number
  readonly progress: number
  readonly to: number
}

const getPartVertices = (
  keyform: PuppetParameterKeyform,
  partId: string,
  restVertices: ReadonlyArray<number>,
) => {
  const vertices = keyform.parts.find((part) => part.partId === partId)?.vertices
  return vertices === undefined || vertices.length === 0 ? restVertices : vertices
}

const interpolateVertices = (
  first: ReadonlyArray<number>,
  second: ReadonlyArray<number>,
  progress: number,
) =>
  first.map(
    (coordinate, index) => coordinate + ((second[index] ?? coordinate) - coordinate) * progress,
  )

const getProgress = (minimum: number, maximum: number, value: number) =>
  maximum === minimum ? 0 : (value - minimum) / (maximum - minimum)

/**
 * Where `value` falls among a 1D binding's increasing keyform values. With a repeat range, the
 * keyform at the maximum is ignored and values past the last keyform, or before the first,
 * blend from the last keyform into the first one placed one range later.
 */
export const locateOneDimensionalKeyform = (
  keys: ReadonlyArray<number>,
  value: number,
  repeatRange?: readonly [number, number],
): KeyformSegment | undefined => {
  const indices = keys.flatMap((key, index) =>
    repeatRange === undefined || key < repeatRange[1] ? [index] : [],
  )
  const [first] = indices
  const last = indices.at(-1)
  if (first === undefined || last === undefined) {
    return undefined
  }
  if (repeatRange !== undefined && (value >= keys[last]! || value < keys[first]!)) {
    const span = repeatRange[1] - repeatRange[0]
    const unwrapped = value < keys[first]! ? value + span : value
    return {
      from: last,
      progress: getProgress(keys[last]!, keys[first]! + span, unwrapped),
      to: first,
    }
  }
  const next = indices.find((index) => keys[index]! >= value)
  if (next === undefined) {
    return {from: last, progress: 0, to: last}
  }
  const previous = indices[indices.indexOf(next) - 1]
  return previous === undefined
    ? {from: next, progress: 0, to: next}
    : {from: previous, progress: getProgress(keys[previous]!, keys[next]!, value), to: next}
}

const sampleOneDimensionalVertices = (options: SampleParameterVerticesOptions) => {
  const {binding} = options
  const [value] = options.values
  const keyforms = binding?.parameterIds.length === 1 ? binding.keyforms : []

  const segment =
    value === undefined
      ? undefined
      : locateOneDimensionalKeyform(
          keyforms.map((keyform) => keyform.values[0]),
          value,
          options.repeatRanges?.[0],
        )
  if (segment === undefined) {
    return options.restVertices
  }
  const vertices = (index: number) =>
    getPartVertices(keyforms[index]!, options.partId, options.restVertices)
  return segment.from === segment.to
    ? vertices(segment.from)
    : interpolateVertices(vertices(segment.from), vertices(segment.to), segment.progress)
}

const BARYCENTRIC_EPSILON = 1e-9
const TRIANGLE_VERTEX_COUNT = 3

type Point = readonly [number, number]
type Weights = readonly [number, number, number]
type Triangulation = ReturnType<typeof Delaunator.from>

interface TriangulationData {
  readonly points: ReadonlyArray<Point>
  readonly triangulation: Triangulation
}

const triangulationByKeyforms = new WeakMap<object, TriangulationData>()

const getTriangulation = (binding: PuppetParameterBinding2D) => {
  const cached = triangulationByKeyforms.get(binding.keyforms)
  if (cached !== undefined) {
    return cached
  }

  const points = binding.keyforms.map((keyform) => keyform.values)
  const data = {points, triangulation: Delaunator.from(points)}
  triangulationByKeyforms.set(binding.keyforms, data)
  return data
}

const getBarycentricWeights = (point: Point, first: Point, second: Point, third: Point) => {
  const denominator =
    (second[1] - third[1]) * (first[0] - third[0]) + (third[0] - second[0]) * (first[1] - third[1])
  if (Math.abs(denominator) <= BARYCENTRIC_EPSILON) {
    return undefined
  }

  const firstWeight =
    ((second[1] - third[1]) * (point[0] - third[0]) +
      (third[0] - second[0]) * (point[1] - third[1])) /
    denominator
  const secondWeight =
    ((third[1] - first[1]) * (point[0] - third[0]) +
      (first[0] - third[0]) * (point[1] - third[1])) /
    denominator
  const thirdWeight = 1 - firstWeight - secondWeight

  return [firstWeight, secondWeight, thirdWeight] as const
}

const containsPoint = (weights: Weights) =>
  weights.every((weight) => weight >= -BARYCENTRIC_EPSILON)

const interpolateThreeVertices = (
  first: ReadonlyArray<number>,
  second: ReadonlyArray<number>,
  third: ReadonlyArray<number>,
  weights: Weights,
) =>
  first.map(
    (coordinate, index) =>
      coordinate * weights[0] +
      (second[index] ?? coordinate) * weights[1] +
      (third[index] ?? coordinate) * weights[2],
  )

const getClosestSegment = (point: Point, points: ReadonlyArray<Point>, hull: Uint32Array) => {
  let closest:
    | {readonly firstIndex: number; readonly progress: number; readonly secondIndex: number}
    | undefined
  let closestDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index < hull.length; index += 1) {
    const firstIndex = hull[index]
    const secondIndex = hull[(index + 1) % hull.length]
    const first = firstIndex === undefined ? undefined : points[firstIndex]
    const second = secondIndex === undefined ? undefined : points[secondIndex]
    if (first !== undefined && second !== undefined) {
      const differenceX = second[0] - first[0]
      const differenceY = second[1] - first[1]
      const lengthSquared = differenceX * differenceX + differenceY * differenceY
      const progress =
        lengthSquared === 0
          ? 0
          : Math.min(
              1,
              Math.max(
                0,
                ((point[0] - first[0]) * differenceX + (point[1] - first[1]) * differenceY) /
                  lengthSquared,
              ),
            )
      const closestX = first[0] + differenceX * progress
      const closestY = first[1] + differenceY * progress
      const distance = (point[0] - closestX) ** 2 + (point[1] - closestY) ** 2

      if (distance < closestDistance) {
        closestDistance = distance
        closest = {firstIndex, progress, secondIndex}
      }
    }
  }

  return closest
}

const sampleTwoDimensionalVertices = (
  options: SampleParameterVerticesOptions,
  binding: PuppetParameterBinding2D,
) => {
  const [x, y] = options.values
  if (x === undefined || y === undefined || binding.keyforms.length === 0) {
    return options.restVertices
  }

  const exactKeyform = binding.keyforms.find(
    (keyform) => keyform.values[0] === x && keyform.values[1] === y,
  )
  if (exactKeyform !== undefined) {
    return getPartVertices(exactKeyform, options.partId, options.restVertices)
  }

  if (binding.keyforms.length === 1) {
    return getPartVertices(binding.keyforms[0]!, options.partId, options.restVertices)
  }

  const point = [x, y] as const
  const {points, triangulation} = getTriangulation(binding)

  for (let index = 0; index < triangulation.triangles.length; index += TRIANGLE_VERTEX_COUNT) {
    const firstIndex = triangulation.triangles[index]
    const secondIndex = triangulation.triangles[index + 1]
    const thirdIndex = triangulation.triangles[index + 2]
    const firstPoint = firstIndex === undefined ? undefined : points[firstIndex]
    const secondPoint = secondIndex === undefined ? undefined : points[secondIndex]
    const thirdPoint = thirdIndex === undefined ? undefined : points[thirdIndex]
    if (firstPoint !== undefined && secondPoint !== undefined && thirdPoint !== undefined) {
      const weights = getBarycentricWeights(point, firstPoint, secondPoint, thirdPoint)
      if (weights !== undefined && containsPoint(weights)) {
        return interpolateThreeVertices(
          getPartVertices(binding.keyforms[firstIndex]!, options.partId, options.restVertices),
          getPartVertices(binding.keyforms[secondIndex]!, options.partId, options.restVertices),
          getPartVertices(binding.keyforms[thirdIndex]!, options.partId, options.restVertices),
          weights,
        )
      }
    }
  }

  const closest = getClosestSegment(point, points, triangulation.hull)
  if (closest === undefined) {
    return options.restVertices
  }

  return interpolateVertices(
    getPartVertices(binding.keyforms[closest.firstIndex]!, options.partId, options.restVertices),
    getPartVertices(binding.keyforms[closest.secondIndex]!, options.partId, options.restVertices),
    closest.progress,
  )
}

export const isTwoDimensionalParameterBinding = (
  binding: PuppetParameterBinding,
): binding is PuppetParameterBinding2D => binding.parameterIds.length === 2

export const isThreeDimensionalParameterBinding = (
  binding: PuppetParameterBinding,
): binding is PuppetParameterBinding3D => binding.parameterIds.length === MAX_PARAMETER_DIMENSIONS

/** `binding` with every keyform passed through `update`, which keeps the keyform's values. */
export const mapBindingKeyforms = (
  binding: PuppetParameterBinding,
  update: <Keyform extends PuppetParameterKeyform>(keyform: Keyform) => Keyform,
): PuppetParameterBinding => {
  if (isThreeDimensionalParameterBinding(binding)) {
    return {...binding, keyforms: binding.keyforms.map(update)}
  }
  return isTwoDimensionalParameterBinding(binding)
    ? {...binding, keyforms: binding.keyforms.map(update)}
    : {...binding, keyforms: binding.keyforms.map(update)}
}

const keyformValue = (keyform: {readonly values: ReadonlyArray<number>}, index: number) =>
  keyform.values[index] ?? 0

/** `keyform` keyed at `values`. */
export const withKeyformValues = (
  keyform: Omit<PuppetParameterKeyform, 'values'>,
  values: PuppetParameterValues,
): PuppetParameterKeyform => {
  if (values.length === MAX_PARAMETER_DIMENSIONS) {
    return {...keyform, values}
  }
  return values.length === 2 ? {...keyform, values} : {...keyform, values}
}

/** `binding` with `keyforms`, each value tuple cut to the binding's parameter count. */
export const withBindingKeyforms = (
  binding: PuppetParameterBinding,
  keyforms: ReadonlyArray<
    Omit<PuppetParameterKeyform, 'values'> & {readonly values: ReadonlyArray<number>}
  >,
): PuppetParameterBinding => {
  if (isThreeDimensionalParameterBinding(binding)) {
    return {
      ...binding,
      keyforms: keyforms.map((keyform) => ({
        ...keyform,
        values: [keyform.values[0], keyformValue(keyform, 1), keyformValue(keyform, 2)] as const,
      })),
    }
  }
  return isTwoDimensionalParameterBinding(binding)
    ? {
        ...binding,
        keyforms: keyforms.map((keyform) => ({
          ...keyform,
          values: [keyformValue(keyform, 0), keyformValue(keyform, 1)] as const,
        })),
      }
    : {
        ...binding,
        keyforms: keyforms.map((keyform) => ({
          ...keyform,
          values: [keyformValue(keyform, 0)] as const,
        })),
      }
}

/** One plane of a 3D binding: its third value, a 2D view of it and its keyform indices. */
export interface KeyformPlane {
  readonly binding: PuppetParameterBinding2D
  readonly indices: ReadonlyArray<number>
  readonly value: number
}

const planesByKeyforms = new WeakMap<object, ReadonlyArray<KeyformPlane>>()

/** A 3D binding's planes by increasing third value, keyforms in document order. */
export const getKeyformPlanes = (binding: PuppetParameterBinding3D) => {
  const cached = planesByKeyforms.get(binding.keyforms)
  if (cached !== undefined) {
    return cached
  }
  const values = [...new Set(binding.keyforms.map((keyform) => keyform.values[2]))].toSorted(
    (first, second) => first - second,
  )
  const planes = values.map((value): KeyformPlane => {
    const indices = binding.keyforms.flatMap((keyform, index) =>
      keyform.values[2] === value ? [index] : [],
    )
    return {
      binding: {
        id: binding.id,
        keyforms: indices.map((index) => {
          const keyform = binding.keyforms[index]!
          return {...keyform, values: [keyform.values[0], keyform.values[1]] as const}
        }),
        parameterIds: [binding.parameterIds[0], binding.parameterIds[1]],
      },
      indices,
      value,
    }
  })
  planesByKeyforms.set(binding.keyforms, planes)
  return planes
}

/** Samples the two planes around the third value and blends them. */
const samplePlanes = (
  binding: PuppetParameterBinding3D,
  options: {
    readonly fallback: ReadonlyArray<number>
    readonly repeatRange: readonly [number, number] | undefined
    readonly value: number | undefined
  },
  sample: (plane: KeyformPlane) => ReadonlyArray<number>,
) => {
  const planes = getKeyformPlanes(binding)
  const segment =
    options.value === undefined
      ? undefined
      : locateOneDimensionalKeyform(
          planes.map((plane) => plane.value),
          options.value,
          options.repeatRange,
        )
  if (segment === undefined) {
    return options.fallback
  }
  const from = sample(planes[segment.from]!)
  return segment.from === segment.to
    ? from
    : interpolateVertices(from, sample(planes[segment.to]!), segment.progress)
}

const sampleThreeDimensionalVertices = (
  options: SampleParameterVerticesOptions,
  binding: PuppetParameterBinding3D,
) => {
  const [x, y, z] = options.values
  return x === undefined || y === undefined
    ? options.restVertices
    : samplePlanes(
        binding,
        {fallback: options.restVertices, repeatRange: options.repeatRanges?.[2], value: z},
        (plane) => sampleTwoDimensionalVertices({...options, values: [x, y]}, plane.binding),
      )
}

export const sampleParameterVertices = (options: SampleParameterVerticesOptions) => {
  const {binding} = options
  const targetPartIds = binding?.targetPartIds
  const targetsPart =
    binding === undefined ||
    (targetPartIds === undefined
      ? binding.keyforms.some((keyform) =>
          keyform.parts.some((part) => part.partId === options.partId),
        )
      : targetPartIds.includes(options.partId))

  if (!targetsPart) {
    return options.restVertices
  }

  if (binding !== undefined && isThreeDimensionalParameterBinding(binding)) {
    return sampleThreeDimensionalVertices(options, binding)
  }
  return binding !== undefined && isTwoDimensionalParameterBinding(binding)
    ? sampleTwoDimensionalVertices(options, binding)
    : sampleOneDimensionalVertices(options)
}

export const parameterValuesEqual = (first: ReadonlyArray<number>, second: ReadonlyArray<number>) =>
  first.length === second.length && first.every((value, index) => value === second[index])

export interface SampleParameterCoordinatesOptions {
  readonly binding: PuppetParameterBinding
  readonly keyformCoordinates: ReadonlyArray<ReadonlyArray<number> | undefined>
  readonly repeatRanges?: PuppetRepeatRanges
  readonly restCoordinates: ReadonlyArray<number>
  readonly values: PuppetParameterValues
}

const getKeyformCoordinates = (options: SampleParameterCoordinatesOptions, index: number) =>
  options.keyformCoordinates[index] ?? options.restCoordinates

const sampleOneDimensionalCoordinates = (options: SampleParameterCoordinatesOptions) => {
  const [value] = options.values
  const segment =
    value === undefined
      ? undefined
      : locateOneDimensionalKeyform(
          options.binding.keyforms.map((keyform) => keyform.values[0]),
          value,
          options.repeatRanges?.[0],
        )
  if (segment === undefined) {
    return options.restCoordinates
  }
  return segment.from === segment.to
    ? getKeyformCoordinates(options, segment.from)
    : interpolateVertices(
        getKeyformCoordinates(options, segment.from),
        getKeyformCoordinates(options, segment.to),
        segment.progress,
      )
}

const sampleTwoDimensionalCoordinates = (
  options: SampleParameterCoordinatesOptions,
  binding: PuppetParameterBinding2D,
) => {
  const [x, y] = options.values
  if (x === undefined || y === undefined || binding.keyforms.length === 0) {
    return options.restCoordinates
  }

  const exactIndex = binding.keyforms.findIndex(
    (keyform) => keyform.values[0] === x && keyform.values[1] === y,
  )
  if (exactIndex >= 0 || binding.keyforms.length === 1) {
    return getKeyformCoordinates(options, Math.max(0, exactIndex))
  }

  const point = [x, y] as const
  const {points, triangulation} = getTriangulation(binding)
  for (let index = 0; index < triangulation.triangles.length; index += TRIANGLE_VERTEX_COUNT) {
    const firstIndex = triangulation.triangles[index]
    const secondIndex = triangulation.triangles[index + 1]
    const thirdIndex = triangulation.triangles[index + 2]
    const firstPoint = firstIndex === undefined ? undefined : points[firstIndex]
    const secondPoint = secondIndex === undefined ? undefined : points[secondIndex]
    const thirdPoint = thirdIndex === undefined ? undefined : points[thirdIndex]
    if (firstPoint !== undefined && secondPoint !== undefined && thirdPoint !== undefined) {
      const weights = getBarycentricWeights(point, firstPoint, secondPoint, thirdPoint)
      if (weights !== undefined && containsPoint(weights)) {
        return interpolateThreeVertices(
          getKeyformCoordinates(options, firstIndex!),
          getKeyformCoordinates(options, secondIndex!),
          getKeyformCoordinates(options, thirdIndex!),
          weights,
        )
      }
    }
  }

  const closest = getClosestSegment(point, points, triangulation.hull)
  return closest === undefined
    ? options.restCoordinates
    : interpolateVertices(
        getKeyformCoordinates(options, closest.firstIndex),
        getKeyformCoordinates(options, closest.secondIndex),
        closest.progress,
      )
}

const sampleThreeDimensionalCoordinates = (
  options: SampleParameterCoordinatesOptions,
  binding: PuppetParameterBinding3D,
) => {
  const [x, y, z] = options.values
  return x === undefined || y === undefined
    ? options.restCoordinates
    : samplePlanes(
        binding,
        {fallback: options.restCoordinates, repeatRange: options.repeatRanges?.[2], value: z},
        (plane) =>
          sampleTwoDimensionalCoordinates(
            {
              ...options,
              binding: plane.binding,
              keyformCoordinates: plane.indices.map((index) => options.keyformCoordinates[index]),
              values: [x, y],
            },
            plane.binding,
          ),
      )
}

export const sampleParameterCoordinates = (options: SampleParameterCoordinatesOptions) => {
  if (isThreeDimensionalParameterBinding(options.binding)) {
    return sampleThreeDimensionalCoordinates(options, options.binding)
  }
  return isTwoDimensionalParameterBinding(options.binding)
    ? sampleTwoDimensionalCoordinates(options, options.binding)
    : sampleOneDimensionalCoordinates(options)
}
