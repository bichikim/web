import {expect, test} from 'vitest'
import {createCameraTarget} from '../camera-target'

test('should turn opposite ways from opposite character positions toward the same user', () => {
  const left = createCameraTarget({anchor: {x: 0.1, y: 0.5}, aspect: 16 / 9, point: {x: 0, y: 0}})
  const right = createCameraTarget({anchor: {x: 0.9, y: 0.5}, aspect: 16 / 9, point: {x: 0, y: 0}})
  expect(left.x).toBeGreaterThan(0)
  expect(right.x).toBeLessThan(0)
  expect(left.x).toBeCloseTo(-right.x)
})

test('should account for camera placement distance and calibrated face center', () => {
  const base = {anchor: {x: 0.5, y: 0.5}, aspect: 16 / 9, point: {x: 0.3, y: -0.2}}
  const calibrated = createCameraTarget({
    ...base,
    options: {cameraY: 0.5, centerX: 0.3, centerY: -0.2},
  })
  expect(calibrated).toEqual({x: 0, y: 0})
  const near = createCameraTarget({
    ...base,
    options: {cameraX: 0.8, distance: 30},
    point: {x: 0, y: 0},
  })
  const far = createCameraTarget({
    ...base,
    options: {cameraX: 0.8, distance: 150},
    point: {x: 0, y: 0},
  })
  expect(near.x).toBeGreaterThan(far.x)
  const shifted = createCameraTarget({...base, options: {cameraX: -0.5}})
  expect(shifted.x).toBeLessThan(0)
})

test('should return neutral when no face is detected and bound extreme directions', () => {
  expect(
    createCameraTarget({
      anchor: {x: 0, y: 0},
      aspect: 16 / 9,
      point: {detected: false, x: 1, y: 1},
    }),
  ).toEqual({x: 0, y: 0})
  const point = createCameraTarget({
    anchor: {x: -2, y: 3},
    aspect: 16 / 9,
    options: {distance: 20},
    point: {x: 1, y: 1},
  })
  expect(point.x).toBeLessThanOrEqual(1)
  expect(point.y).toBeLessThanOrEqual(1)
  expect(point.y).toBeGreaterThanOrEqual(-1)
})
