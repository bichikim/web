import {AssetContainer} from '@babylonjs/core/assetContainer'
import {NullEngine} from '@babylonjs/core/Engines/nullEngine'
import {Quaternion} from '@babylonjs/core/Maths/math.vector'
import {TransformNode} from '@babylonjs/core/Meshes/transformNode'
import {Scene} from '@babylonjs/core/scene'
import {expect, it, vi} from 'vitest'
import {mountGarmentPhysics} from '../garment-physics'

it('should simulate a garment joint and restore its authored pose on cleanup', () => {
  const engine = new NullEngine()
  vi.spyOn(engine, 'getDeltaTime').mockReturnValue(1000 / 60)
  const scene = new Scene(engine)
  const container = new AssetContainer(scene)
  const joint = new TransformNode('J_Sec_L_HoodString2_01', scene)
  joint.position.y = 2
  joint.rotationQuaternion = Quaternion.Identity()
  const tail = new TransformNode('J_Sec_L_HoodString2_end_01', scene)
  tail.parent = joint
  tail.position.x = 0.1
  container.transformNodes.push(joint, tail)
  const dispose = mountGarmentPhysics(container, '/haru.vrm')
  for (let frame = 0; frame < 60; frame += 1) {
    scene.onBeforeRenderObservable.notifyObservers(scene)
  }
  tail.computeWorldMatrix(true)
  expect(tail.getAbsolutePosition().y).toBeLessThan(2)
  expect(tail.position.length()).toBeCloseTo(0.1)
  dispose()
  expect(joint.rotationQuaternion).toEqual(Quaternion.Identity())
  scene.dispose()
  engine.dispose()
})
