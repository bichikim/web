import type {PuppetMesh} from '../player/document'
import {getEdgeKey, getMeshEdgeRecords, type MeshEdge} from './geometry'

export interface BoundaryEdge extends MeshEdge {
  readonly oppositeIndex: number
}

export const getBoundaryEdges = (
  mesh: Pick<PuppetMesh, 'indices'>,
): ReadonlyArray<BoundaryEdge> => {
  const edges = new Map<string, ReadonlyArray<BoundaryEdge>>()

  for (const record of getMeshEdgeRecords(mesh)) {
    const oppositeIndex = record.triangle.find(
      (index) => index !== record.edge.firstIndex && index !== record.edge.secondIndex,
    )
    const key = getEdgeKey(record.edge.firstIndex, record.edge.secondIndex)

    if (oppositeIndex !== undefined) {
      const edge = {...record.edge, oppositeIndex}
      edges.set(key, [...(edges.get(key) ?? []), edge])
    }
  }

  return [...edges.values()].filter((matches) => matches.length === 1).flat()
}

const findNextIndex = (
  neighbors: ReadonlyMap<number, ReadonlyArray<number>>,
  unvisitedEdges: ReadonlySet<string>,
  currentIndex: number,
  previousIndex: number,
) =>
  (neighbors.get(currentIndex) ?? []).find(
    (candidate) =>
      candidate !== previousIndex && unvisitedEdges.has(getEdgeKey(currentIndex, candidate)),
  )

export const deriveBoundaryLoops = (
  mesh: Pick<PuppetMesh, 'indices'>,
): ReadonlyArray<ReadonlyArray<number>> => {
  const edges = getBoundaryEdges(mesh)
  const neighbors = new Map<number, number[]>()
  const unvisitedEdges = new Set(edges.map((edge) => getEdgeKey(edge.firstIndex, edge.secondIndex)))
  const loops: number[][] = []

  for (const edge of edges) {
    neighbors.set(edge.firstIndex, [...(neighbors.get(edge.firstIndex) ?? []), edge.secondIndex])
    neighbors.set(edge.secondIndex, [...(neighbors.get(edge.secondIndex) ?? []), edge.firstIndex])
  }

  for (const edge of edges) {
    const startingKey = getEdgeKey(edge.firstIndex, edge.secondIndex)

    if (unvisitedEdges.has(startingKey)) {
      const loop = [edge.firstIndex]
      const startIndex = edge.firstIndex
      let previousIndex = edge.firstIndex
      let currentIndex = edge.secondIndex
      unvisitedEdges.delete(startingKey)

      while (currentIndex !== startIndex) {
        loop.push(currentIndex)
        const nextIndex = findNextIndex(neighbors, unvisitedEdges, currentIndex, previousIndex)

        if (nextIndex === undefined) {
          return []
        }

        unvisitedEdges.delete(getEdgeKey(currentIndex, nextIndex))
        previousIndex = currentIndex
        currentIndex = nextIndex
      }

      loops.push(loop)
    }
  }

  return loops
}

export const withBoundaryLoops = (mesh: PuppetMesh): PuppetMesh => ({
  ...mesh,
  boundaryLoops: deriveBoundaryLoops(mesh),
})
