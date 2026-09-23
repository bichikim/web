/** @vitest-environment node */
import {AssetContainer} from '@babylonjs/core/assetContainer'
import {Bone} from '@babylonjs/core/Bones/bone'
import {Skeleton} from '@babylonjs/core/Bones/skeleton'
import {VertexBuffer} from '@babylonjs/core/Buffers/buffer'
import {NullEngine} from '@babylonjs/core/Engines/nullEngine'
import {Mesh} from '@babylonjs/core/Meshes/mesh'
import {TransformNode} from '@babylonjs/core/Meshes/transformNode'
import {Scene} from '@babylonjs/core/scene'
import {expect, it, vi} from 'vitest'
import {mountClothContact} from '../cloth-contact'

it.each([0, 0.4])('should cover the thigh through the knee at %s and restore on cleanup', (x) => {
  const engine = new NullEngine()
  const scene = new Scene(engine)
  const container = new AssetContainer(scene)
  const thigh = new TransformNode('J_Bip_L_UpperLeg', scene)
  const knee = new TransformNode('J_Bip_L_LowerLeg', scene)
  knee.position.x = 0.4
  container.transformNodes.push(thigh, knee)
  const skeleton = new Skeleton('skirt', 'skirt', scene)
  const ancestor = new Bone('root', skeleton, null, undefined, undefined, undefined, -1)
  const skirt = new Bone(
    'J_Sec_L_SkirtFront1_01',
    skeleton,
    ancestor,
    undefined,
    undefined,
    undefined,
    0,
  )
  expect(skirt.getIndex()).toBe(0)
  const mesh = new Mesh('dress', scene)
  mesh.skeleton = skeleton
  mesh.setVerticesData(VertexBuffer.PositionKind, [x, -0.01, 0])
  mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, [0, 0, 0, 0])
  mesh.setVerticesData(VertexBuffer.MatricesWeightsKind, [1, 0, 0, 0])
  container.meshes.push(mesh)
  const dispose = mountClothContact(container, '/vroid.glb')
  scene.onBeforeRenderObservable.notifyObservers(scene)
  const position = scene.getMeshByName('dress-cloth')!.getVerticesData(VertexBuffer.PositionKind)!
  expect(position[1]).toBeGreaterThan(0)
  expect(Math.hypot(position[0] - x, position[1], position[2])).toBeGreaterThanOrEqual(0.0745)
  dispose()
  expect(mesh.getVerticesData(VertexBuffer.PositionKind)![1]).toBeCloseTo(-0.01)
  scene.dispose()
  engine.dispose()
})

it.each(['fabric', 'Body_primitive2'])(
  'should keep the animated waist seam attached for %s',
  (name) => {
    const engine = new NullEngine()
    vi.spyOn(engine, 'getDeltaTime').mockReturnValue(1000 / 60)
    const scene = new Scene(engine)
    const container = new AssetContainer(scene)
    const skeleton = new Skeleton('skirt', 'skirt', scene)
    const skirt = new Bone(
      'J_Sec_L_SkirtBack1_01',
      skeleton,
      null,
      undefined,
      undefined,
      undefined,
      0,
    )
    const waist = new Bone('waist', skeleton, null, undefined, undefined, undefined, 1)
    expect(skirt.getIndex()).toBe(0)
    expect(waist.getIndex()).toBe(1)
    const mesh = new Mesh(name, scene)
    mesh.skeleton = skeleton
    const original = [0, 0.4, 0, 0.1, 0.5, 0, 0, 0.2, 0.1]
    mesh.setVerticesData(VertexBuffer.PositionKind, original)
    mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    mesh.setVerticesData(VertexBuffer.MatricesWeightsKind, [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0])
    mesh.setIndices([0, 1, 2])
    container.meshes.push(mesh)
    const dispose = mountClothContact(container, '/vroid.glb')
    for (let frame = 0; frame < 120; frame += 1) {
      scene.onBeforeRenderObservable.notifyObservers(scene)
    }
    const positions = scene
      .getMeshByName(`${name}-cloth`)!
      .getVerticesData(VertexBuffer.PositionKind)!
    expect(positions[7]).toBeCloseTo(0.4)
    if (name === 'fabric') {
      expect(positions[1]).toBeLessThan(0.5)
    }
    expect(positions[4]).toBeLessThan(0.38)
    dispose()
    expect(mesh.getVerticesData(VertexBuffer.PositionKind)![4]).toBeCloseTo(original[4])
    scene.dispose()
    engine.dispose()
  },
)
