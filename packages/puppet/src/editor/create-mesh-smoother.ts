import {clamp} from 'es-toolkit/math'
import {getBoundaryEdges, getMeshEdgeRecords} from '../mesh'
import type {PuppetMesh} from '../player'
import type {VertexPoint} from './edit-document'

interface SmoothVerticesOptions {
  readonly center: VertexPoint
  readonly radius: number
  readonly strength: number
  readonly vertices: readonly number[]
}

export interface MeshSmoother {
  readonly apply: (options: SmoothVerticesOptions) => number[]
  readonly available: boolean
}

const getInteriorNeighbors = (mesh: Pick<PuppetMesh, 'indices' | 'boundaryLoops'>) => {
  const boundary = new Set([
    ...getBoundaryEdges(mesh).flatMap((edge) => [edge.firstIndex, edge.secondIndex]),
    ...(mesh.boundaryLoops?.flat() ?? []),
  ])
  const neighbors = new Map<number, Set<number>>()
  for (const {edge} of getMeshEdgeRecords(mesh)) {
    for (const [vertex, neighbor] of [
      [edge.firstIndex, edge.secondIndex],
      [edge.secondIndex, edge.firstIndex],
    ] as const) {
      if (!boundary.has(vertex)) {
        const adjacent = neighbors.get(vertex) ?? new Set<number>()
        adjacent.add(neighbor)
        neighbors.set(vertex, adjacent)
      }
    }
  }
  return neighbors
}

/** Builds a reusable smoother that blends connected interior vertices while preserving mesh outlines. */
export const createMeshSmoother = (
  mesh: Pick<PuppetMesh, 'indices' | 'boundaryLoops'>,
): MeshSmoother => {
  const neighbors = getInteriorNeighbors(mesh)
  const apply = (options: SmoothVerticesOptions) =>
    options.vertices.map((coordinate, index) => {
      const vertex = Math.floor(index / 2)
      const adjacent = neighbors.get(vertex)
      if (adjacent === undefined || adjacent.size === 0) {
        return coordinate
      }
      const distance = Math.hypot(
        options.vertices[vertex * 2]! - options.center.x,
        options.vertices[vertex * 2 + 1]! - options.center.y,
      )
      const weight =
        clamp(1 - distance / Math.max(1, options.radius), 0, 1) * clamp(options.strength, 0, 1)
      const axis = index % 2
      const average =
        [...adjacent].reduce((sum, neighbor) => sum + options.vertices[neighbor * 2 + axis]!, 0) /
        adjacent.size
      return coordinate + (average - coordinate) * weight
    })
  return {apply, available: neighbors.size > 0}
}
