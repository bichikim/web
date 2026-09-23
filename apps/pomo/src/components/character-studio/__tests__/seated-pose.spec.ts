/** @vitest-environment node */
import {AssetContainer} from '@babylonjs/core/assetContainer'
import {Bone} from '@babylonjs/core/Bones/bone'
import {Skeleton} from '@babylonjs/core/Bones/skeleton'
import {VertexBuffer} from '@babylonjs/core/Buffers/buffer'
import {Vector3} from '@babylonjs/core/Maths/math.vector'
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial'
import {CreateBox} from '@babylonjs/core/Meshes/Builders/boxBuilder'
import {NullEngine} from '@babylonjs/core/Engines/nullEngine'
import {TransformNode} from '@babylonjs/core/Meshes/transformNode'
import {Scene} from '@babylonjs/core/scene'
import {Mesh} from '@babylonjs/core/Meshes/mesh'
import {MorphTarget} from '@babylonjs/core/Morph/morphTarget'
import {MorphTargetManager} from '@babylonjs/core/Morph/morphTargetManager'
import {expect, it, vi} from 'vitest'
import {seatCharacter} from '../seated-pose'

it.each([
  [0, 0.475],
  [1, 0.5],
])('should fit seat %i to its calibrated cushion height', (index, height) => {
  const engine = new NullEngine()
  const scene = new Scene(engine)
  const container = new AssetContainer(scene)
  const model = new TransformNode('model', scene)
  const hips = new TransformNode('J_Bip_C_Hips', scene)
  hips.position.y = 0.8
  hips.parent = model
  const skeleton = new Skeleton('body', 'body', scene)
  const bone = new Bone('J_Bip_C_Hips', skeleton, null, undefined, undefined, undefined, 0)
  expect(bone.getIndex()).toBe(0)
  const mesh = new Mesh('body', scene)
  mesh.parent = model
  mesh.skeleton = skeleton
  mesh.setVerticesData(VertexBuffer.PositionKind, [0, 0.7, 0])
  mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, [0, 0, 0, 0])
  mesh.setVerticesData(VertexBuffer.MatricesWeightsKind, [1, 0, 0, 0])
  container.rootNodes.push(model)
  container.transformNodes.push(model, hips)
  container.meshes.push(mesh)
  const dispose = seatCharacter(container, index)
  const surface = Vector3.TransformCoordinates(
    new Vector3(0, 0.7, 0),
    mesh.computeWorldMatrix(true),
  )
  expect(surface.y).toBeCloseTo(0.602)
  const cushion = CreateBox('cushion', {depth: 2, height: 0.1, width: 1}, scene)
  cushion.position.set(-0.9, 0.45, 0)
  cushion.material = new StandardMaterial('seatCushion', scene)
  cushion.computeWorldMatrix(true)
  scene.onBeforeRenderObservable.notifyObservers(scene)
  const settled = Vector3.TransformCoordinates(
    new Vector3(0, 0.7, 0),
    mesh.computeWorldMatrix(true),
  )
  expect(settled.y).toBeCloseTo(height)
  dispose()
  scene.dispose()
  engine.dispose()
})

it('should bend the knees, separate seats and remove the animation on cleanup', () => {
  const engine = new NullEngine()
  const scene = new Scene(engine)
  const container = new AssetContainer(scene)
  const knee = new TransformNode('J_Bip_L_LowerLeg', scene)
  container.transformNodes.push(knee)
  const dispose = seatCharacter(container, 0)
  expect(knee.rotationQuaternion?.toEulerAngles().x).toBeCloseTo(Math.PI / 2)
  expect(scene.getTransformNodeByName('seated-character-0')?.position.z).toBeLessThan(0)
  dispose()
  expect(knee.rotationQuaternion).toBeNull()
  expect(scene.getTransformNodeByName('seated-character-0')).toBeNull()
  scene.dispose()
  engine.dispose()
})

it('should animate breathing and close then reopen the eyes', () => {
  const engine = new NullEngine()
  vi.spyOn(engine, 'getDeltaTime').mockReturnValue(95)
  const scene = new Scene(engine)
  const container = new AssetContainer(scene)
  const spine = new TransformNode('J_Bip_C_Spine', scene)
  container.transformNodes.push(spine)
  const face = new Mesh('face', scene)
  const manager = new MorphTargetManager(scene)
  const blink = new MorphTarget('Fcl_EYE_Close', 0, scene)
  manager.addTarget(blink)
  face.morphTargetManager = manager
  container.meshes.push(face)
  const dispose = seatCharacter(container, 0)
  scene.onBeforeRenderObservable.notifyObservers(scene)
  expect(blink.influence).toBeCloseTo(1)
  expect(spine.rotationQuaternion?.x).not.toBe(0)
  scene.onBeforeRenderObservable.notifyObservers(scene)
  expect(blink.influence).toBeCloseTo(0)
  dispose()
  scene.dispose()
  engine.dispose()
})
