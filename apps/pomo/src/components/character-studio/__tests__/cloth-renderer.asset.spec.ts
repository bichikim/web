/** @vitest-environment node */
import {readFileSync, writeFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {NullEngine} from '@babylonjs/core/Engines/nullEngine'
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader'
import {Mesh} from '@babylonjs/core/Meshes/mesh'
import {Scene} from '@babylonjs/core/scene'
import '@babylonjs/loaders/glTF'
import {attachCloth} from '../cloth-renderer'

describe('attachCloth with the fitted sweater', () => {
  it('should load elastic contacts, preserve fixed regions and restore the accepted shape', async () => {
    const engine = new NullEngine()
    const scene = new Scene(engine)
    const bytes = readFileSync('apps/pomo/public/character-studio/pomo.glb')
    const container = await LoadAssetContainerAsync(bytes, scene, {
      pluginExtension: '.glb',
      pluginOptions: {gltf: {skipMaterials: true}},
    })
    const sweater = container.meshes.find((mesh) => mesh.name === 'Settled knit sweater')
    const body = container.meshes.find(
      (mesh) =>
        mesh.name.startsWith('Pomo connected body physics copy') && mesh.getTotalVertices() > 0,
    )
    expect(sweater).toBeInstanceOf(Mesh)
    expect(body).toBeInstanceOf(Mesh)
    if (!(sweater instanceof Mesh) || !(body instanceof Mesh)) {
      throw new Error('Fitted meshes are missing')
    }
    const original = Array.from(sweater.getVerticesData('position') ?? [])
    const bodyOriginal = Array.from(body.getVerticesData('position') ?? [])
    const cloth = attachCloth(container)
    expect(cloth.available).toBe(true)
    const frames: number[][] = []
    for (let frame = 0; frame < 600; frame += 1) {
      cloth.update(1 / 60, true, 1)
      if (frame % 30 === 0) {
        frames.push(Array.from(sweater.getVerticesData('position') ?? []))
      }
    }
    expect(frames[0]).not.toEqual(frames[10])
    let moving = 0
    for (let vertex = 0; vertex < original.length / 3; vertex += 1) {
      const offset = vertex * 3
      const distance = Math.hypot(
        ...[0, 1, 2].map((axis) => frames[10][offset + axis] - original[offset + axis]),
      )
      expect(distance).toBeLessThanOrEqual(0.00511)
      if (original[offset + 1] > 1.17) {
        expect(frames[10].slice(offset, offset + 3)).toEqual(original.slice(offset, offset + 3))
      }
      if (distance > 0.00001) {
        moving += 1
      }
    }
    expect(moving).toBeGreaterThan(500)
    expect(Array.from(body.getVerticesData('position') ?? [])).toEqual(bodyOriginal)
    const snapshotPath = process.env.POMO_CLOTH_SNAPSHOTS
    if (snapshotPath !== undefined) {
      writeFileSync(
        snapshotPath,
        JSON.stringify({faces: Array.from(sweater.getIndices() ?? []), frames, original}),
      )
    }
    cloth.update(1 / 60, false, 0)
    expect(Array.from(sweater.getVerticesData('position') ?? [])).toEqual(original)
    container.dispose()
    scene.dispose()
    engine.dispose()
  }, 30000)
})
