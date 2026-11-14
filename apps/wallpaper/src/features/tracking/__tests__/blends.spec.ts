import {expect, test} from 'vitest'
import {createTrackingBlends} from '../blends'

const parameters = [
  {defaultValue: 0, id: 'face-x', maximum: 30, minimum: -30},
  {defaultValue: 0.2, id: 'gaze-x', maximum: 1, minimum: -1},
]

test('should default to overwrite and add only the input displacement from the model default', () => {
  const blend = createTrackingBlends(parameters, {eyeX: {blend: 'add'}})
  const input = {'face-x': 10, 'gaze-x': 0.5}
  expect(blend(input)).toEqual({
    'face-x': {mode: 'overwrite', value: 10},
    'gaze-x': {mode: 'add', value: 0.3},
  })
  expect(input).toEqual({'face-x': 10, 'gaze-x': 0.5})
  expect(blend({'gaze-x': 0.2})).toEqual({'gaze-x': {mode: 'add', value: 0}})
})

test('should skip disabled connections and use the last axis when a parameter is connected twice', () => {
  const blend = createTrackingBlends(parameters, {
    eyeX: {blend: 'add', parameterId: null},
    headX: {blend: 'add'},
    headY: {blend: 'overwrite', parameterId: 'face-x'},
  })
  expect(blend({'face-x': 2, 'gaze-x': 0.3})).toEqual({'face-x': {mode: 'overwrite', value: 2}})
  expect(blend({})).toEqual({})
})
