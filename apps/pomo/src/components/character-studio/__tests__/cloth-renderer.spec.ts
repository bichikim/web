/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import {AssetContainer} from '@babylonjs/core/assetContainer'
import {NullEngine} from '@babylonjs/core/Engines/nullEngine'
import {Scene} from '@babylonjs/core/scene'
import {Mesh} from '@babylonjs/core/Meshes/mesh'
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData'
import {attachCloth} from '../cloth-renderer'

describe('attachCloth', () => {
  it.each([1, 2, 4, 6])(
    'should retain vertex buffers while updating cloth with %i particles',
    (count) => {
      const engine = new NullEngine()
      const scene = new Scene(engine)
      const container = new AssetContainer(scene)
      const mesh = new Mesh('cloth', scene)
      try {
        const vertices = new VertexData()
        vertices.positions = [0, 1, 0, -0.1, 0, 0, 0.1, 0, 0]
        vertices.indices = [0, 1, 2]
        vertices.normals = [0, 0, 1, 0, 0, 1, 0, 0, 1]
        vertices.applyToMesh(mesh)
        mesh.metadata = {
          gltf: {
            extras: {
              pomoCloth: JSON.stringify({
                contacts: Array.from({length: count}, () => [0, 0, 1, 0]).flat(),
                edges: [],
                mobility: Array.from({length: count}, () => 1),
                positions: Array.from({length: count}, (_, index) => [
                  index / 16,
                  1 - index / 32,
                  0,
                ]).flat(),
              }),
            },
          },
        }
        container.meshes.push(mesh)
        const cloth = attachCloth(container)
        const positionBuffer = mesh.getVertexBuffer('position')!
        const normalBuffer = mesh.getVertexBuffer('normal')!
        const positions = positionBuffer.getData()!
        const normals = normalBuffer.getData()!
        const original = Array.from(mesh.getVerticesData('position')!)
        expect(cloth.available).toBe(true)

        cloth.update(1 / 60, true, 1)
        expect(Array.from(mesh.getVerticesData('position')!)).not.toEqual(original)
        expect(Array.from(mesh.getVerticesData('position')!).every(Number.isFinite)).toBe(true)
        expect(Array.from(mesh.getVerticesData('normal')!).every(Number.isFinite)).toBe(true)
        expect(mesh.getVertexBuffer('position')).toBe(positionBuffer)
        expect(mesh.getVertexBuffer('normal')).toBe(normalBuffer)
        expect(positionBuffer.getData()).toBe(positions)
        expect(normalBuffer.getData()).toBe(normals)

        cloth.update(1 / 60, false, 0)
        expect(Array.from(mesh.getVerticesData('position')!)).toEqual(original)
      } finally {
        container.dispose()
        scene.dispose()
        engine.dispose()
      }
    },
  )

  it('should update actual Babylon buffers and restore the original mesh when disabled', () => {
    const engine = new NullEngine()
    const scene = new Scene(engine)
    const container = new AssetContainer(scene)
    const mesh = new Mesh('cloth', scene)
    const positions = [0, 1, 0, -0.1, 0, 0, 0.1, 0, 0]
    const vertices = new VertexData()
    vertices.positions = positions
    vertices.indices = [0, 1, 2]
    vertices.normals = [0, 0, 1, 0, 0, 1, 0, 0, 1]
    vertices.applyToMesh(mesh)
    mesh.metadata = {
      gltf: {
        extras: {
          pomoCloth: JSON.stringify({
            contacts: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
            edges: [0, 1, 1, 2, 0, 2],
            limits: {'-10000,0,0': 0.012, '0,100000,0': 0, '10000,0,0': 0.012},
            mobility: [0, 1, 1],
            positions,
          }),
        },
      },
    }
    container.meshes.push(mesh)
    const cloth = attachCloth(container)
    expect(cloth.available).toBe(true)
    const original = Array.from(mesh.getVerticesData('position') ?? [])
    const originalNormals = Array.from(mesh.getVerticesData('normal') ?? [])
    for (let index = 0; index < 120; index += 1) {
      cloth.update(1 / 60, true, 1)
    }
    expect(Array.from(mesh.getVerticesData('position') ?? [])).not.toEqual(original)
    expect(Array.from(mesh.getVerticesData('position') ?? []).slice(0, 3)).toEqual(
      original.slice(0, 3),
    )
    expect(Array.from(mesh.getVerticesData('normal') ?? []).every(Number.isFinite)).toBe(true)
    cloth.update(1 / 60, false, 0)
    expect(Array.from(mesh.getVerticesData('normal') ?? [])).toEqual(originalNormals)
    expect(Array.from(mesh.getVerticesData('position') ?? [])).toEqual(original)
    cloth.update(10, false, 0)
    expect(Array.from(mesh.getVerticesData('position') ?? [])).toEqual(original)
    container.dispose()
    scene.dispose()
    engine.dispose()
  })
})
