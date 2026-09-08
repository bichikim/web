import {readFile} from 'node:fs/promises'
import {NullEngine} from '@babylonjs/core/Engines/nullEngine'
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader'
import {VertexBuffer} from '@babylonjs/core/Buffers/buffer'
import {Scene} from '@babylonjs/core/scene'
import '@babylonjs/loaders/glTF'
import {expect, it, vi} from 'vitest'
import {mountClothContact} from '../cloth-contact'
import {seatCharacter} from '../seated-pose'

it('should keep the real Luna garment finite throughout seated gestures', async () => {
  const engine = new NullEngine()
  vi.spyOn(engine, 'getDeltaTime').mockReturnValue(1000 / 60)
  const scene = new Scene(engine)
  const bytes = await readFile('apps/pomo/public/assets/character-studio/vroid.glb')
  const container = await LoadAssetContainerAsync(bytes, scene, {
    pluginExtension: '.glb',
    pluginOptions: {gltf: {skipMaterials: true}},
  })
  container.addAllToScene()
  const unseat = seatCharacter(container, 1)
  const dispose = mountClothContact(container, '/vroid.glb')
  const durations: number[] = []
  for (let frame = 0; frame < 2880; frame += 1) {
    const start = performance.now()
    scene.onBeforeRenderObservable.notifyObservers(scene)
    durations.push(performance.now() - start)
  }
  const clothMeshes = scene.meshes.filter((mesh) => mesh.name.endsWith('-cloth'))
  expect(clothMeshes.length).toBeGreaterThan(0)
  const positions = clothMeshes.flatMap((mesh) =>
    Array.from(mesh.getVerticesData(VertexBuffer.PositionKind) ?? []),
  )
  expect(positions.length).toBeGreaterThan(1000)
  expect(positions.every(Number.isFinite)).toBe(true)
  expect(positions.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0)).toBeLessThan(
    5,
  )
  durations.sort((left, right) => left - right)
  console.info('Luna physics milliseconds', {
    max: durations[2879],
    median: durations[1440],
    p95: durations[2736],
  })
  dispose()
  unseat()
  container.dispose()
  scene.dispose()
  engine.dispose()
}, 180000)
