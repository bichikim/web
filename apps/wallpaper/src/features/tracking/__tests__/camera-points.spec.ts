import {expect, test} from 'vitest'
import {cameraTrackingPoints} from '../camera-points'

const surface = {aspect: 2, height: 0.5, left: 0.1, top: 0.4, width: 0.4}
const options = {cameraX: 0.5, cameraY: 0, centerX: 0.2, centerY: -0.1}

test('should separate the fixed camera viewing direction from calibrated face movement', () => {
  const resting = cameraTrackingPoints({options, point: {x: 0.2, y: -0.1}, surface})
  expect(resting.target).toEqual(resting.origin)
  const moved = cameraTrackingPoints({options, point: {x: 0.2, y: 0}, surface})
  expect(moved.origin).toEqual(resting.origin)
  expect(moved.target.y).toBeGreaterThan(resting.target.y)
})

test('should neutralize both camera points when the face is lost', () => {
  expect(cameraTrackingPoints({options, point: {detected: false, x: 1, y: 1}, surface})).toEqual({
    origin: {x: 0, y: 0},
    target: {x: 0, y: 0},
  })
})
