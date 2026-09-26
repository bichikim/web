import type {VertexPoint} from './edit-document'

export interface DeformBrushVerticesOptions {
  readonly center: VertexPoint
  readonly delta: VertexPoint
  readonly hardness: number
  readonly radius: number
  readonly strength: number
  readonly vertices: readonly number[]
}

/** Moves vertices within the brush radius, with a full-strength core and a linear outer falloff. */
export const deformBrushVertices = (options: DeformBrushVerticesOptions): number[] => {
  const core = Math.min(1, Math.max(0, options.hardness))
  const strength = Math.min(1, Math.max(0, options.strength))
  const radius = Math.max(0, options.radius)

  return options.vertices.map((coordinate, index) => {
    const offset = index % 2
    const vertex = Math.floor(index / 2) * 2
    const distance = Math.hypot(
      options.vertices[vertex]! - options.center.x,
      options.vertices[vertex + 1]! - options.center.y,
    )
    const progress = radius === 0 ? 1 : distance / radius
    const falloff = progress >= 1 ? 0 : progress <= core ? 1 : (1 - progress) / (1 - core)
    return coordinate + (offset === 0 ? options.delta.x : options.delta.y) * falloff * strength
  })
}
