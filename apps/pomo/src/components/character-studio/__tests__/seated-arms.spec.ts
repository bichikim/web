/** @vitest-environment node */
import {AssetContainer} from '@babylonjs/core/assetContainer'
import {NullEngine} from '@babylonjs/core/Engines/nullEngine'
import {TransformNode} from '@babylonjs/core/Meshes/transformNode'
import {Scene} from '@babylonjs/core/scene'
import {expect, it} from 'vitest'
import {createSeatedArms} from '../seated-arms'

it('should move resting fingers independently and continuously without accumulating rotations', () => {
  const engine = new NullEngine()
  const scene = new Scene(engine)
  const container = new AssetContainer(scene)
  const fingers = ['L_Index1', 'L_Index2', 'L_Little1', 'R_Index1', 'L_Thumb1'].map(
    (name) => new TransformNode(`J_Bip_${name}`, scene),
  )
  container.transformNodes.push(...fingers)
  const arms = createSeatedArms(container)
  const action = {gesture: 0, glance: 0, hands: 0, shift: 0}
  arms.update(action, 2)
  const first = fingers.map((finger) => finger.rotationQuaternion!.clone())
  const curls: number[] = []
  for (let frame = 0; frame < 600; frame += 1) {
    arms.update(action, frame / 60)
    curls.push(fingers[1].rotationQuaternion!.toEulerAngles().z)
  }
  expect(Math.max(...curls) - Math.min(...curls)).toBeGreaterThan(0.25)
  arms.update(action, 2)
  arms.update(action, 2 + 1 / 60)
  fingers.forEach((finger, index) => {
    expect(finger.rotationQuaternion).not.toEqual(first[index])
    expect(Math.abs(finger.rotationQuaternion!.z - first[index].z)).toBeLessThan(0.01)
  })
  arms.update(action, 7)
  expect(fingers[0].rotationQuaternion).not.toEqual(first[0])
  expect(fingers[0].rotationQuaternion).not.toEqual(fingers[2].rotationQuaternion)
  arms.update(action, 2)
  fingers.forEach((finger, index) => expect(finger.rotationQuaternion).toEqual(first[index]))
  arms.dispose()
  fingers.forEach((finger) => expect(finger.rotationQuaternion).toBeNull())
  scene.dispose()
  engine.dispose()
})

it('should place a hand within reach and raise it for a gesture without stretching bones', () => {
  const engine = new NullEngine()
  const scene = new Scene(engine)
  const container = new AssetContainer(scene)
  const hips = new TransformNode('J_Bip_C_Hips', scene)
  const upper = new TransformNode('J_Bip_R_UpperArm', scene)
  upper.parent = hips
  upper.position.set(-0.15, 0.4, 0)
  const lower = new TransformNode('J_Bip_R_LowerArm', scene)
  lower.parent = upper
  lower.position.x = -0.25
  const hand = new TransformNode('J_Bip_R_Hand', scene)
  hand.parent = lower
  hand.position.x = -0.2
  container.transformNodes.push(hips, upper, lower, hand)
  const finger = new TransformNode('J_Bip_R_Index1', scene)
  finger.parent = hand
  container.transformNodes.push(finger)
  const arms = createSeatedArms(container)
  arms.update({gesture: 0, glance: 0, hands: 0, shift: 0})
  hand.computeWorldMatrix(true)
  const resting = hand.getAbsolutePosition().clone()
  const restingFinger = finger.rotationQuaternion!.clone()
  arms.update({gesture: 1, glance: 0, hands: 0, shift: 0})
  hand.computeWorldMatrix(true)
  expect(hand.getAbsolutePosition().y).toBeGreaterThan(resting.y)
  expect(finger.rotationQuaternion).not.toEqual(restingFinger)
  arms.update({gesture: 0, glance: 0, hands: 0, shift: 0})
  expect(finger.rotationQuaternion).toEqual(restingFinger)
  expect(lower.position.length()).toBeCloseTo(0.25)
  expect(hand.position.length()).toBeCloseTo(0.2)
  arms.dispose()
  expect(upper.rotationQuaternion).toBeNull()
  expect(finger.rotationQuaternion).toBeNull()
  scene.dispose()
  engine.dispose()
})
