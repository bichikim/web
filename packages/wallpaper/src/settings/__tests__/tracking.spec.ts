import {expect, it} from 'vitest'
import {poffoBindingsSchema, poffoTrackingOptionsSchema, poffoTrackingSchema} from '../tracking'

it('should retain body rotation and speed settings while leaving omitted defaults unset', () => {
  const options = {
    bodyFollowSpeed: 2.5,
    bodyScale: 0.6,
    eyeCursorReach: 0.7,
    eyeFollowSpeed: 2,
    headFollowSpeed: 0.5,
    headMaximumX: 20,
  }
  expect(poffoTrackingOptionsSchema.parse(options)).toEqual(options)
  expect(poffoTrackingOptionsSchema.parse({})).toEqual({})
})
it.each([
  {bodyScale: -0.1},
  {bodyScale: 1.1},
  {bodyFollowSpeed: 0},
  {bodyFollowSpeed: 5.1},
  {headFollowSpeed: 0},
  {headFollowSpeed: 5.1},
  {eyeFollowSpeed: 0},
  {eyeFollowSpeed: 5.1},
  {eyeCursorReach: 0},
  {eyeCursorReach: 3.1},
])('should reject body tracking outside its adjustable range: %j', (options) => {
  expect(poffoTrackingOptionsSchema.safeParse(options).success).toBe(false)
})

it('should persist pose input, tilt calibration and an explicit tilt parameter connection', () => {
  expect(poffoTrackingSchema.parse('camera-pose')).toBe('camera-pose')
  const options = {headCenterZ: -2, headLimitZ: 15, headResponseZ: 0.5}
  expect(poffoTrackingOptionsSchema.parse(options)).toEqual(options)
  const bindings = {headZ: {inverted: true, parameterId: 'CustomTilt'}}
  expect(poffoBindingsSchema.parse(bindings)).toEqual(bindings)
  expect(poffoTrackingOptionsSchema.safeParse({headLimitZ: -1}).success).toBe(false)
})
