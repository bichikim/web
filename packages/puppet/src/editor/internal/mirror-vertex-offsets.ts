import {getDistanceSquared, getMeshTriangles, getSignedArea} from '../../mesh'
import type {PuppetPoint} from '../../player'

interface MirrorVertexOffsetsOptions {
  readonly axis: 'x' | 'y'
  readonly center: number
  readonly reference: readonly number[]
  readonly vertices: readonly number[]
  readonly indices: readonly number[]
}

const BARYCENTRIC_EPSILON = -1e-8

const pointAt = (coordinates: readonly number[], index: number): PuppetPoint => ({
  x: coordinates[index * 2]!,
  y: coordinates[index * 2 + 1]!,
})
const sampleOffset = (options: MirrorVertexOffsetsOptions, point: PuppetPoint): PuppetPoint => {
  for (const triangle of getMeshTriangles({indices: options.indices})) {
    const [first, second, third] = triangle.map((index) => pointAt(options.reference, index))
    const area = getSignedArea(first!, second!, third!)
    const weights = [
      getSignedArea(point, second!, third!) / area,
      getSignedArea(first!, point, third!) / area,
      getSignedArea(first!, second!, point) / area,
    ]
    if (weights.every((value) => Number.isFinite(value) && value >= BARYCENTRIC_EPSILON)) {
      return triangle.reduce(
        (sum, index, offset) => ({
          x:
            sum.x +
            (options.vertices[index * 2]! - options.reference[index * 2]!) * weights[offset]!,
          y:
            sum.y +
            (options.vertices[index * 2 + 1]! - options.reference[index * 2 + 1]!) *
              weights[offset]!,
        }),
        {x: 0, y: 0},
      )
    }
  }
  const nearest = Array.from({length: options.reference.length / 2}, (_, index) => index).reduce(
    (current, index) =>
      getDistanceSquared(point, pointAt(options.reference, index)) <
      getDistanceSquared(point, pointAt(options.reference, current))
        ? index
        : current,
    0,
  )
  return {
    x: options.vertices[nearest * 2]! - options.reference[nearest * 2]!,
    y: options.vertices[nearest * 2 + 1]! - options.reference[nearest * 2 + 1]!,
  }
}

/** Reflects the sampled deformation field onto the reference geometry, preserving vertex order and UVs. */
export const mirrorVertexOffsets = (options: MirrorVertexOffsetsOptions): number[] =>
  Array.from({length: options.reference.length / 2}, (_, index) => {
    const point = pointAt(options.reference, index)
    const reflected = {...point, [options.axis]: 2 * options.center - point[options.axis]}
    const offset = sampleOffset(options, reflected)
    return [
      point.x + offset.x * (options.axis === 'x' ? -1 : 1),
      point.y + offset.y * (options.axis === 'y' ? -1 : 1),
    ]
  }).flat()
