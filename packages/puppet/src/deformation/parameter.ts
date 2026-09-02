import Delaunator from 'delaunator'

import type {
  PuppetParameterBinding,
  PuppetParameterBinding2D,
  PuppetParameterKeyform,
} from '../player/document'

export type PuppetParameterValues = readonly [number] | readonly [number, number]

export interface SampleParameterVerticesOptions {
  readonly binding?: PuppetParameterBinding
  readonly partId: string
  readonly restVertices: ReadonlyArray<number>
  readonly values: PuppetParameterValues
}

const getPartVertices = (
  keyform: PuppetParameterKeyform,
  partId: string,
  restVertices: ReadonlyArray<number>,
) => keyform.parts.find((part) => part.partId === partId)?.vertices ?? restVertices

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

const sampleOneDimensionalVertices = (options: SampleParameterVerticesOptions) => {
  const {binding} = options
  const [value] = options.values
  const keyforms = binding?.parameterIds.length === 1 ? binding.keyforms : []

  if (keyforms.length === 0 || value === undefined) {
    return options.restVertices
  }

  const nextIndex = keyforms.findIndex((keyform) => keyform.values[0] >= value)

  if (nextIndex === -1) {
    return getPartVertices(keyforms.at(-1)!, options.partId, options.restVertices)
  }

  const nextKeyform = keyforms[nextIndex]
  if (nextIndex === 0 || nextKeyform === undefined) {
    return getPartVertices(keyforms[0]!, options.partId, options.restVertices)
  }

  const previousKeyform = keyforms[nextIndex - 1]
  if (previousKeyform === undefined) {
    return options.restVertices
  }

  return interpolateVertices(
    getPartVertices(previousKeyform, options.partId, options.restVertices),
    getPartVertices(nextKeyform, options.partId, options.restVertices),
    getProgress(previousKeyform.values[0], nextKeyform.values[0], value),
  )
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

  return binding !== undefined && isTwoDimensionalParameterBinding(binding)
    ? sampleTwoDimensionalVertices(options, binding)
    : sampleOneDimensionalVertices(options)
}

export const parameterValuesEqual = (first: ReadonlyArray<number>, second: ReadonlyArray<number>) =>
  first.length === second.length && first.every((value, index) => value === second[index])

export interface SampleParameterCoordinatesOptions {
  readonly binding: PuppetParameterBinding
  readonly keyformCoordinates: ReadonlyArray<ReadonlyArray<number> | undefined>
  readonly restCoordinates: ReadonlyArray<number>
  readonly values: PuppetParameterValues
}

const getKeyformCoordinates = (options: SampleParameterCoordinatesOptions, index: number) =>
  options.keyformCoordinates[index] ?? options.restCoordinates

const sampleOneDimensionalCoordinates = (options: SampleParameterCoordinatesOptions) => {
  const [value] = options.values
  const {keyforms} = options.binding
  if (value === undefined || keyforms.length === 0) {
    return options.restCoordinates
  }

  const nextIndex = keyforms.findIndex((keyform) => keyform.values[0] >= value)
  if (nextIndex === -1) {
    return getKeyformCoordinates(options, keyforms.length - 1)
  }

  const nextKeyform = keyforms[nextIndex]
  if (nextIndex === 0 || nextKeyform === undefined) {
    return getKeyformCoordinates(options, 0)
  }

  const previousKeyform = keyforms[nextIndex - 1]
  return previousKeyform === undefined
    ? options.restCoordinates
    : interpolateVertices(
        getKeyformCoordinates(options, nextIndex - 1),
        getKeyformCoordinates(options, nextIndex),
        getProgress(previousKeyform.values[0], nextKeyform.values[0], value),
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

export const sampleParameterCoordinates = (options: SampleParameterCoordinatesOptions) =>
  isTwoDimensionalParameterBinding(options.binding)
    ? sampleTwoDimensionalCoordinates(options, options.binding)
    : sampleOneDimensionalCoordinates(options)
