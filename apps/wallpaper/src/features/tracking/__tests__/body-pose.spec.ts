import {expect, test} from 'vitest'
import {createBodyPose} from '../body-pose'

const shoulders = (angle = 0) => {
  const radians = (angle * Math.PI) / 180
  const landmarks = Array.from({length: 33}, () => ({visibility: 1, x: 0.5, y: 0.5, z: 0}))
  const world = landmarks.map((point) => ({...point}))
  world[11] = {visibility: 1, x: 0.2 * Math.cos(radians), y: -0.4, z: 0.2 * Math.sin(radians)}
  world[12] = {visibility: 1, x: -world[11]!.x, y: -0.4, z: -world[11]!.z}
  return {landmarks, world}
}

test('should track shoulder yaw in the same mirrored direction as head rotation', () => {
  for (const angle of [-30, -15, 0, 15, 30, 60]) {
    const {landmarks, world} = shoulders(angle)
    expect(createBodyPose({landmarks, world})?.x).toBeCloseTo(Math.max(-1, Math.min(1, angle / 30)))
  }
})

test('should ignore camera translation, shoulder width and sideways lean when reading yaw', () => {
  const {landmarks, world} = shoulders(15)
  const translated = world.map((point) => ({
    ...point,
    x: point.x * 2 + 1,
    y: point.y + 2,
    z: point.z * 2 + 3,
  }))
  translated[11]!.y += 0.2
  expect(createBodyPose({landmarks, world: translated})).toEqual({x: expect.closeTo(0.5), y: 0})
})

test('should neutralize missing, occluded, clipped or invalid shoulders instead of inventing rotation', () => {
  expect(createBodyPose({landmarks: [], world: []})).toBeNull()
  for (const patch of [{visibility: 0.2}, {x: -0.1}, {y: 1.1}, {visibility: NaN}]) {
    const {landmarks, world} = shoulders()
    Object.assign(landmarks[11]!, patch)
    expect(createBodyPose({landmarks, world})).toBeNull()
  }
  const {landmarks, world} = shoulders()
  world[11]!.z = NaN
  expect(createBodyPose({landmarks, world})).toBeNull()
  world[11] = {...world[12]!}
  expect(createBodyPose({landmarks, world})).toBeNull()
})
