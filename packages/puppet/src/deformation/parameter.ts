import {sampleGridCoordinates} from './sample-grid-coordinates'
import {locateOneDimensionalKeyform} from './locate-keyform-segment'
export {locateOneDimensionalKeyform, type KeyformSegment} from './locate-keyform-segment'
import Delaunator from 'delaunator'

import {
  MAX_PARAMETER_DIMENSIONS,
  type PuppetParameterBinding,
  type PuppetParameterBinding2D,
  type PuppetParameterBinding3D,
  type PuppetParameterKeyform,
} from '../player/document'

export {MAX_PARAMETER_DIMENSIONS}

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

interface SampleTriangulatedCoordinatesOptions {
  /** 삼각 분할에 사용할 2차원 키폼. 분할 캐시는 키폼 배열의 참조를 기준으로 재사용한다. */
  readonly binding: PuppetParameterBinding2D
  /**
   * 보간에 필요한 키폼 인덱스로 호출한다. 좌표 누락 시 대체 정책은 콜백이 담당한다.
   * 정확히 일치하는 키는 반환 배열의 참조를 그대로 사용한다.
   */
  readonly coordinates: (index: number) => ReadonlyArray<number>
  /** 입력 값·키폼이 없거나 보간 경계를 찾지 못했을 때 수정 없이 반환하는 기본 좌표. */
  readonly restCoordinates: ReadonlyArray<number>
  /** 표본 파라미터 값. 앞의 두 값을 X/Y로 사용하며 둘 중 하나라도 없으면 기본 좌표를 반환한다. */
  readonly values: PuppetParameterValues
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

const sampleTriangulatedCoordinates = (options: SampleTriangulatedCoordinatesOptions) => {
  const {binding} = options
  const [x, y] = options.values
  if (x === undefined || y === undefined || binding.keyforms.length === 0) {
    return options.restCoordinates
  }

  const exactIndex = binding.keyforms.findIndex(
    (keyform) => keyform.values[0] === x && keyform.values[1] === y,
  )
  if (exactIndex >= 0 || binding.keyforms.length === 1) {
    return options.coordinates(Math.max(0, exactIndex))
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
          options.coordinates(firstIndex!),
          options.coordinates(secondIndex!),
          options.coordinates(thirdIndex!),
          weights,
        )
      }
    }
  }

  const closest = getClosestSegment(point, points, triangulation.hull)
  return closest === undefined
    ? options.restCoordinates
    : interpolateVertices(
        options.coordinates(closest.firstIndex),
        options.coordinates(closest.secondIndex),
        closest.progress,
      )
}

const sampleTwoDimensionalVertices = (
  options: SampleParameterVerticesOptions,
  binding: PuppetParameterBinding2D,
) =>
  sampleTriangulatedCoordinates({
    binding,
    coordinates: (index) =>
      getPartVertices(binding.keyforms[index]!, options.partId, options.restVertices),
    restCoordinates: options.restVertices,
    values: options.values,
  })

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
  // 식은 같지만 차원별로 좁혀야 키폼 배열이 바인딩과 같은 차원으로 유지된다. 합집합 그대로 매핑하면
  // 차원이 섞인 키폼 배열이 되어 타입 검사를 통과하지 못한다.
  if (isThreeDimensionalParameterBinding(binding)) {
    return {...binding, keyforms: binding.keyforms.map(update)}
  }
  if (isTwoDimensionalParameterBinding(binding)) {
    return {...binding, keyforms: binding.keyforms.map(update)}
  }
  return {...binding, keyforms: binding.keyforms.map(update)}
}

const keyformValue = (keyform: {readonly values: ReadonlyArray<number>}, index: number) =>
  keyform.values[index] ?? 0

/** `keyform` keyed at `values`. */
export const withKeyformValues = (
  keyform: Omit<PuppetParameterKeyform, 'values'>,
  values: PuppetParameterValues,
): PuppetParameterKeyform => {
  // 값 튜플의 길이로 좁혀야 결과가 같은 차원의 키폼 타입 하나에 맞는다.
  if (values.length === MAX_PARAMETER_DIMENSIONS) {
    return {...keyform, values}
  }
  if (values.length === 2) {
    return {...keyform, values}
  }
  return {...keyform, values}
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
        values: [
          keyformValue(keyform, 0),
          keyformValue(keyform, 1),
          keyformValue(keyform, 2),
        ] as const,
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
  // 평면마다 전체 키폼을 다시 거르지 않도록 세 번째 값별 인덱스를 한 번에 묶는다.
  const indicesByValue = binding.keyforms.reduce((planeIndices, keyform, index) => {
    const indices = planeIndices.get(keyform.values[2])
    if (indices === undefined) {
      planeIndices.set(keyform.values[2], [index])
    } else {
      indices.push(index)
    }
    return planeIndices
  }, new Map<number, number[]>())
  const planes = [...indicesByValue]
    .toSorted(([first], [second]) => first - second)
    .map(
      ([value, indices]): KeyformPlane => ({
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
      }),
    )
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
  if (binding?.interpolation === 'grid') {
    return sampleParameterCoordinates({
      binding,
      keyformCoordinates: binding.keyforms.map((keyform) =>
        getPartVertices(keyform, options.partId, options.restVertices),
      ),
      repeatRanges: options.repeatRanges,
      restCoordinates: options.restVertices,
      values: options.values,
    })
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
  /** 낮은 키폼을 유지하고 다음 키에서 전환한다. 생략하면 바인딩의 보간을 쓰며, 축 정밀도는 binding.sampling을 따른다. */
  readonly sampling?: 'step'
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
) =>
  sampleTriangulatedCoordinates({
    binding,
    coordinates: (index) => getKeyformCoordinates(options, index),
    restCoordinates: options.restCoordinates,
    values: options.values,
  })

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
  if (options.binding.interpolation === 'grid' || options.sampling === 'step') {
    return sampleGridCoordinates(options)
  }
  if (isThreeDimensionalParameterBinding(options.binding)) {
    return sampleThreeDimensionalCoordinates(options, options.binding)
  }
  return isTwoDimensionalParameterBinding(options.binding)
    ? sampleTwoDimensionalCoordinates(options, options.binding)
    : sampleOneDimensionalCoordinates(options)
}
