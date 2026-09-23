import {VertexBuffer} from '@babylonjs/core/Buffers/buffer'
import {Vector3} from '@babylonjs/core/Maths/math.vector'
import {Mesh} from '@babylonjs/core/Meshes/mesh'
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData'
import type {IndicesArray} from '@babylonjs/core/types'

export interface ClothRenderer {
  update(points: readonly Vector3[], particles: readonly number[]): void
  dispose(): void
}

/** Renders simulated fabric in world space, retaining the source material and UV seams. */
export const createClothRenderer = (
  source: Mesh,
  mapping: ReadonlyMap<number, number>,
  originalIndices: IndicesArray,
): ClothRenderer => {
  const components = 3
  const vertices = [...mapping.entries()]
  const renderIndices = new Map(vertices.map(([vertex], index) => [vertex, index]))
  const triangles: number[] = []
  const remaining: number[] = []
  for (let index = 0; index < originalIndices.length; index += components) {
    const face = [originalIndices[index], originalIndices[index + 1], originalIndices[index + 2]]
    if (face.every((vertex) => mapping.has(vertex))) {
      triangles.push(...face.map((vertex) => renderIndices.get(vertex)!))
    } else {
      remaining.push(...face)
    }
  }
  const mesh = new Mesh(`${source.name}-cloth`, source.getScene())
  mesh.material = source.material
  mesh.receiveShadows = source.receiveShadows
  const positions = new Float32Array(vertices.length * components)
  const normals = new Float32Array(positions.length)
  mesh.setVerticesData(VertexBuffer.PositionKind, positions, true)
  mesh.setVerticesData(VertexBuffer.NormalKind, normals, true)
  for (const kind of [VertexBuffer.UVKind, VertexBuffer.UV2Kind, VertexBuffer.ColorKind]) {
    const data = source.getVerticesData(kind)
    const stride = source.getVertexBuffer(kind)?.getSize()
    if (data !== null && stride !== undefined) {
      const selected = vertices.flatMap(([vertex]) =>
        Array.from(data.slice(vertex * stride, (vertex + 1) * stride)),
      )
      mesh.setVerticesData(kind, selected)
    }
  }
  mesh.setIndices(triangles)
  source.setIndices(remaining)
  return {
    dispose() {
      source.setIndices(originalIndices)
      mesh.dispose()
    },
    update(points, particles) {
      vertices.forEach(([, particle], index) =>
        points[particles[particle]].toArray(positions, index * components),
      )
      VertexData.ComputeNormals(positions, triangles, normals)
      mesh.updateVerticesData(VertexBuffer.PositionKind, positions, true)
      mesh.updateVerticesData(VertexBuffer.NormalKind, normals)
    },
  }
}
