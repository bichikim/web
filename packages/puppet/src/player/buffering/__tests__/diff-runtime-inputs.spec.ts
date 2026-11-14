import {expect, test} from 'vitest'
import {captureRuntimeInputs} from '../capture-runtime-inputs'
import {diffRuntimeInputs} from '../diff-runtime-inputs'
import {createState} from './fixtures/runtime-state'
test('should track look target and speed without retaining old integrated positions or time', () => {
  const before = captureRuntimeInputs(createState())
  const after = {
    ...before,
    look: {...before.look, lookTarget: {x: 0.5, y: 0.2}},
    playback: {...before.playback, speed: 2},
  }
  expect(diffRuntimeInputs({after, before})).toEqual({
    look: {lookTarget: {x: 0.5, y: 0.2}},
    playback: {speed: 2},
  })
})
test('should carry explicit zero-time seeks and cleared controls', () => {
  const before = captureRuntimeInputs(createState())
  expect(diffRuntimeInputs({after: before, before, playback: 'replace'})).toEqual({
    playback: before.playback,
  })
  const withLip = {...before, lipSyncLevel: 0.5}
  expect(diffRuntimeInputs({after: before, before: withLip})).toEqual({lipSyncLevel: undefined})
})

test('should change an independent motion weight without copying its old simulation time', () => {
  const additional = [
    {
      blend: 'replace' as const,
      completion: undefined,
      elapsed: 0.1,
      id: 1,
      loop: true,
      motionId: 'walk',
      priority: 1,
      speed: 1,
      status: 'playing' as const,
      stopping: undefined,
      time: 0.1,
      weight: 1,
    },
  ]
  const before = {...captureRuntimeInputs(createState()), additional}
  const after = {...before, additional: [{...additional[0]!, weight: 0.5}]}
  expect(diffRuntimeInputs({after, before})).toEqual({additional: {1: {weight: 0.5}}})
})
