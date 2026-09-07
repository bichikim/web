import {getDeformerWeights} from '../../deformation/weights'
import {
  getDocumentScene,
  type PuppetDocument,
  type PuppetPoint,
  type PuppetVertexReference,
} from '../../player'
import {
  type DeformerWeightChange,
  getDeformerInputVertices,
  setDeformerVertexWeights,
} from './deformer-weights'
import {findNode, findNodeLock} from './scene-tree'

export type WeightPaintMode = 'add' | 'subtract' | 'smooth'
export interface WeightPaintVertex extends PuppetVertexReference, PuppetPoint {}
export interface CreateWeightPaintStrokeOptions {
  readonly document: PuppetDocument
  readonly nodeId: string
  readonly boneIndex: number
  readonly vertices: readonly WeightPaintVertex[]
  readonly radius: number
  readonly strength: number
  readonly mode: WeightPaintMode
}
export interface WeightPaintStroke {
  readonly paint: (point: PuppetPoint) => PuppetDocument | undefined
}

const vertexKey = (vertex: PuppetVertexReference) =>
  JSON.stringify([vertex.partId, vertex.vertexIndex])
const distanceToSegment = (point: PuppetPoint, start: PuppetPoint, end: PuppetPoint): number => {
  const horizontal = end.x - start.x
  const vertical = end.y - start.y
  const length = horizontal * horizontal + vertical * vertical
  const progress =
    length === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((point.x - start.x) * horizontal + (point.y - start.y) * vertical) / length),
        )
  return Math.hypot(
    point.x - start.x - horizontal * progress,
    point.y - start.y - vertical * progress,
  )
}
const getNeighbors = (document: PuppetDocument): Map<string, Set<string>> => {
  const neighbors = new Map<string, Set<string>>()
  const TRIANGLE_SIZE = 3
  for (const part of document.parts) {
    for (let index = 0; index < part.mesh.indices.length; index += TRIANGLE_SIZE) {
      const triangle = part.mesh.indices.slice(index, index + TRIANGLE_SIZE)
      for (const vertexIndex of triangle) {
        const key = vertexKey({partId: part.id, vertexIndex})
        const adjacent = neighbors.get(key) ?? new Set<string>()
        for (const neighbor of triangle.filter((candidate) => candidate !== vertexIndex)) {
          adjacent.add(vertexKey({partId: part.id, vertexIndex: neighbor}))
        }
        neighbors.set(key, adjacent)
      }
    }
  }
  return neighbors
}

/** Paints a stroke against its initial mesh and weights, with at most one strength application per vertex. */
export const createWeightPaintStroke = (
  options: CreateWeightPaintStrokeOptions,
): WeightPaintStroke | undefined => {
  const {roots} = getDocumentScene(options.document)
  const node = findNode(roots, options.nodeId)
  if (
    node?.kind !== 'deformer' ||
    findNodeLock(roots, node.id) ||
    !Number.isFinite(options.radius) ||
    options.radius <= 0 ||
    !Number.isFinite(options.strength) ||
    options.strength <= 0 ||
    options.strength > 1 ||
    !Number.isInteger(options.boneIndex) ||
    options.boneIndex < 0 ||
    options.boneIndex >=
      (node.boneRestPoints === undefined ? 1 : node.boneRestPoints.length / 2 - 1)
  ) {
    return undefined
  }
  const inputs = getDeformerInputVertices(options.document, node)
  const vertices = options.vertices.filter((vertex) => {
    const input = inputs.get(vertex.partId)
    return (
      input !== undefined &&
      Number.isInteger(vertex.vertexIndex) &&
      vertex.vertexIndex >= 0 &&
      vertex.vertexIndex < input.length / 2 &&
      Number.isFinite(vertex.x) &&
      Number.isFinite(vertex.y) &&
      !findNodeLock(roots, vertex.partId)
    )
  })
  if (vertices.length === 0) {
    return undefined
  }
  const weights = new Map(
    vertices.map((vertex) => {
      const input = inputs.get(vertex.partId)!
      return [
        vertexKey(vertex),
        getDeformerWeights(
          node,
          {x: input[vertex.vertexIndex * 2]!, y: input[vertex.vertexIndex * 2 + 1]!},
          vertex,
        )[options.boneIndex]!,
      ]
    }),
  )
  const neighbors = getNeighbors(options.document)
  const targets = new Map(
    vertices.map((vertex) => {
      const key = vertexKey(vertex)
      switch (options.mode) {
        case 'add':
          return [key, 1] as const
        case 'subtract':
          return [key, 0] as const
        case 'smooth': {
          const values = [...(neighbors.get(key) ?? [])].flatMap((neighbor) =>
            weights.has(neighbor) ? [weights.get(neighbor)!] : [],
          )
          return [
            key,
            values.length === 0
              ? weights.get(key)!
              : values.reduce((sum, value) => sum + value, 0) / values.length,
          ] as const
        }
        default: {
          const exhaustive: never = options.mode
          return exhaustive
        }
      }
    }),
  )
  const coverage = new Map<string, number>()
  let previous: PuppetPoint | null = null
  let {document} = options
  return {
    paint(point) {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        return undefined
      }
      const changes: DeformerWeightChange[] = []
      for (const vertex of vertices) {
        const distance = distanceToSegment(vertex, previous ?? point, point)
        const falloff = Math.max(0, 1 - distance / options.radius)
        const amount = falloff * options.strength
        const key = vertexKey(vertex)
        if (amount > (coverage.get(key) ?? 0)) {
          coverage.set(key, amount)
          const initial = weights.get(key)!
          const weight = initial + (targets.get(key)! - initial) * amount
          if (weight !== initial) {
            changes.push({...vertex, boneIndex: options.boneIndex, weight})
          }
        }
      }
      previous = point
      const next = setDeformerVertexWeights({changes, document, nodeId: options.nodeId})
      if (next !== undefined) {
        document = next
      }
      return next
    },
  }
}
