const AXES = 3
const INFLUENCES = 4
const EPSILON = 0.000001
const POSITION_PRECISION = 100000
import type {AssetContainer} from '@babylonjs/core/assetContainer'
import {VertexBuffer} from '@babylonjs/core/Buffers/buffer'
import {Mesh} from '@babylonjs/core/Meshes/mesh'
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData'
import {z} from 'zod'
import {createCloth, parseCloth} from './cloth'

const metadataSchema = z.object({gltf: z.object({extras: z.object({pomoCloth: z.string()})})})

export const attachCloth = (container: AssetContainer) => {
  const garments = [...container.transformNodes, ...container.meshes].flatMap((node) => {
    const metadata = metadataSchema.safeParse(node.metadata)
    const data = parseCloth(metadata.success ? metadata.data.gltf.extras.pomoCloth : null)
    if (data === null) {
      return []
    }
    const solver = createCloth(data)
    const meshes = [...(node instanceof Mesh ? [node] : []), ...node.getChildMeshes()].flatMap(
      (mesh) => {
        if (!(mesh instanceof Mesh) || mesh.skeleton !== null) {
          return []
        }
        const source = mesh.getVerticesData(VertexBuffer.PositionKind)
        const indices = mesh.getIndices()
        if (source === null || indices === null || source.length === 0) {
          return []
        }
        mesh.makeGeometryUnique()
        const rest = Float32Array.from(source)
        const positions = rest.slice()
        const normals = Float32Array.from(mesh.getVerticesData(VertexBuffer.NormalKind) ?? [])
        const originalNormals = normals.slice()
        const geometricNormals = normals.slice()
        VertexData.ComputeNormals(rest, indices, geometricNormals)
        const mapping = new Int32Array((rest.length / AXES) * INFLUENCES)
        const weights = new Float32Array(mapping.length)
        const limits = new Float32Array(rest.length / AXES)
        for (let vertex = 0; vertex < rest.length / AXES; vertex += 1) {
          const key = Array.from(rest.slice(vertex * AXES, vertex * AXES + AXES), (value) =>
            Math.round(value * POSITION_PRECISION),
          ).join(',')
          limits[vertex] = data.limits === undefined ? Infinity : (data.limits[key] ?? 0)
          const nearest = [Infinity, Infinity, Infinity, Infinity]
          for (let particle = 0; particle < data.mobility.length; particle += 1) {
            let distance = 0
            for (let axis = 0; axis < AXES; axis += 1) {
              distance += (rest[vertex * AXES + axis] - data.positions[particle * AXES + axis]) ** 2
            }
            const slot = nearest.findIndex((value) => distance < value)
            if (slot >= 0) {
              for (let shift = AXES; shift > slot; shift -= 1) {
                nearest[shift] = nearest[shift - 1]
                mapping[vertex * INFLUENCES + shift] = mapping[vertex * INFLUENCES + shift - 1]
              }
              nearest[slot] = distance
              mapping[vertex * INFLUENCES + slot] = particle
            }
          }
          const total = nearest.reduce((sum, distance) => sum + 1 / Math.max(distance, EPSILON), 0)
          for (let slot = 0; slot < INFLUENCES; slot += 1) {
            weights[vertex * INFLUENCES + slot] = 1 / Math.max(nearest[slot], EPSILON) / total
          }
        }
        mesh.setVerticesData(VertexBuffer.PositionKind, positions, true)
        mesh.setVerticesData(VertexBuffer.NormalKind, normals, true)
        return [
          {
            geometricNormals,
            indices,
            limits,
            mapping,
            mesh,
            normals,
            originalNormals,
            positions,
            rest,
            weights,
          },
        ]
      },
    )
    return [{data, meshes, solver}]
  })
  let wasEnabled = true
  return {
    available: garments.length > 0,
    update: (elapsed: number, enabled: boolean, wind: number) => {
      if (!enabled && !wasEnabled) {
        return
      }
      for (const garment of garments) {
        if (enabled) {
          garment.solver.advance(elapsed, wind)
        } else {
          garment.solver.reset()
        }
        for (const surface of garment.meshes) {
          for (let index = 0; index < surface.positions.length; index += 1) {
            const vertex = Math.floor(index / AXES)
            const axis = index % AXES
            let offset = 0
            for (let slot = 0; slot < INFLUENCES; slot += 1) {
              const particle = surface.mapping[vertex * INFLUENCES + slot] * AXES + axis
              offset +=
                (garment.solver.positions[particle] - garment.data.positions[particle]) *
                surface.weights[vertex * INFLUENCES + slot]
            }
            surface.positions[index] = surface.rest[index] + offset
          }
          for (let vertex = 0; vertex < surface.limits.length; vertex += 1) {
            const offset = vertex * AXES
            let length = 0
            for (let axis = 0; axis < AXES; axis += 1) {
              length += (surface.positions[offset + axis] - surface.rest[offset + axis]) ** 2
            }
            const scale = Math.min(1, surface.limits[vertex] / Math.max(Math.sqrt(length), EPSILON))
            for (let axis = 0; axis < AXES; axis += 1) {
              surface.positions[offset + axis] =
                surface.rest[offset + axis] +
                (surface.positions[offset + axis] - surface.rest[offset + axis]) * scale
            }
          }
          VertexData.ComputeNormals(surface.positions, surface.indices, surface.normals)
          for (let offset = 0; offset < surface.normals.length; offset += AXES) {
            let length = 0
            for (let axis = 0; axis < AXES; axis += 1) {
              const index = offset + axis
              surface.normals[index] +=
                surface.originalNormals[index] - surface.geometricNormals[index]
              length += surface.normals[index] ** 2
            }
            const divisor = Math.max(Math.sqrt(length), EPSILON)
            for (let axis = 0; axis < AXES; axis += 1) {
              surface.normals[offset + axis] /= divisor
            }
          }
          if (!enabled) {
            surface.normals.set(surface.originalNormals)
          }
          surface.mesh.updateVerticesData(VertexBuffer.PositionKind, surface.positions, true)
          surface.mesh.updateVerticesData(VertexBuffer.NormalKind, surface.normals)
        }
      }
      wasEnabled = enabled
    },
  }
}
