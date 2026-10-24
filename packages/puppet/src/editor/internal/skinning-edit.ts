import type {PuppetPoint, PuppetSkinBinding} from '../../player'
import {distanceToSegment, type WeightPaintMode} from './weight-paint'

export interface SkinTriangle {
  readonly indices: readonly number[]
  readonly flipped: boolean
  readonly stretched: boolean
}
const TRIANGLE_SIZE = 3
const STRETCH_LIMIT = 2
const area = (vertices: readonly number[], indices: readonly number[]) => {
  const [first, second, third] = indices.map((index) => index * 2)
  return (
    (vertices[second!]! - vertices[first!]!) * (vertices[third! + 1]! - vertices[first! + 1]!) -
    (vertices[third!]! - vertices[first!]!) * (vertices[second! + 1]! - vertices[first! + 1]!)
  )
}

/** Reports winding changes, collapse and edges stretched beyond twice their rest length. */
export const inspectSkinTriangles = (
  rest: readonly number[],
  posed: readonly number[],
  indices: readonly number[],
): readonly SkinTriangle[] => {
  const triangles: SkinTriangle[] = []
  for (let offset = 0; offset < indices.length; offset += TRIANGLE_SIZE) {
    const triangle = indices.slice(offset, offset + TRIANGLE_SIZE)
    const reference = area(rest, triangle)
    triangles.push({
      flipped: reference !== 0 && reference * area(posed, triangle) <= 0,
      indices: triangle,
      stretched: triangle.some((vertex, index) => {
        const neighbor = triangle[(index + 1) % TRIANGLE_SIZE]!
        const length = (points: readonly number[]) =>
          Math.hypot(
            points[vertex * 2]! - points[neighbor * 2]!,
            points[vertex * 2 + 1]! - points[neighbor * 2 + 1]!,
          )
        const original = length(rest)
        return original > 0 && length(posed) > original * STRETCH_LIMIT
      }),
    })
  }
  return triangles
}

/** Replaces selected vertex weights and redistributes the remaining weight proportionally. */
export const replaceSkinWeights = (
  binding: PuppetSkinBinding,
  target: number,
  changes: ReadonlyMap<number, number>,
): PuppetSkinBinding => ({
  ...binding,
  influences: binding.influences.map((influence, index) => ({
    ...influence,
    weights: influence.weights.map((current, vertex) => {
      const input = changes.get(vertex)
      if (input === undefined || !Number.isFinite(input)) {
        return current
      }
      const value = Math.max(0, Math.min(1, input))
      if (index === target) {
        return value
      }
      const remainder = binding.influences.reduce(
        (sum, other, otherIndex) =>
          sum + (otherIndex === target ? 0 : (other.weights[vertex] ?? 0)),
        0,
      )
      return remainder > 0
        ? (current / remainder) * (1 - value)
        : (1 - value) / (binding.influences.length - 1)
    }),
  })),
})

export interface SkinStrokeOptions {
  readonly binding: PuppetSkinBinding
  readonly target: number
  readonly vertices: readonly number[]
  readonly indices: readonly number[]
  readonly radius: number
  readonly strength: number
  readonly mode: WeightPaintMode
  readonly protect: boolean
  readonly selected?: readonly number[]
}

/** Paints on the initial posed geometry with a single maximum coverage per vertex per stroke. */
export const createSkinStroke = (options: SkinStrokeOptions) => {
  const initial = options.binding.influences[options.target]?.weights ?? []
  const neighbors = initial.map(() => new Set<number>())
  for (let offset = 0; offset < options.indices.length; offset += TRIANGLE_SIZE) {
    const triangle = options.indices.slice(offset, offset + TRIANGLE_SIZE)
    for (const vertex of triangle) {
      for (const neighbor of triangle) {
        if (neighbor !== vertex) {
          neighbors[vertex]?.add(neighbor)
        }
      }
    }
  }
  const targets = initial.map((weight, index) => {
    switch (options.mode) {
      case 'add':
        return 1
      case 'subtract':
        return 0
      case 'smooth': {
        const values = [...neighbors[index]!].map((vertex) => initial[vertex]!)
        return values.length === 0
          ? weight
          : values.reduce((sum, value) => sum + value, 0) / values.length
      }
      default: {
        const exhaustive: never = options.mode
        return exhaustive
      }
    }
  })
  const coverage = new Map<number, number>()
  const changes = new Map<number, number>()
  let previous: PuppetPoint | undefined
  return {
    paint(point: PuppetPoint): PuppetSkinBinding {
      initial.forEach((weight, index) => {
        if (
          (options.protect && (weight === 0 || weight === 1)) ||
          (options.selected !== undefined &&
            options.selected.length > 0 &&
            !options.selected.includes(index))
        ) {
          return
        }
        const distance = distanceToSegment(
          {x: options.vertices[index * 2]!, y: options.vertices[index * 2 + 1]!},
          previous ?? point,
          point,
        )
        const amount = Math.max(0, 1 - distance / options.radius) * options.strength
        if (amount > (coverage.get(index) ?? 0)) {
          coverage.set(index, amount)
          changes.set(index, weight + (targets[index]! - weight) * amount)
        }
      })
      previous = point
      return replaceSkinWeights(options.binding, options.target, changes)
    },
  }
}
