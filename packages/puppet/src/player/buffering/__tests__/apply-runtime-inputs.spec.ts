import {expect, test} from 'vitest'
import {applyRuntimeInputs} from '../apply-runtime-inputs'
import {createState} from './fixtures/runtime-state'
test('should combine pending controls with the newest Worker simulation checkpoint', () => {
  const state = createState()
  const next = applyRuntimeInputs(state, {
    look: {lookTarget: {x: 0.5, y: 0}},
    parameterValues: {custom: 0.4},
    playback: {speed: 2},
  })
  expect(next.parameterValues).toEqual({custom: 0.4})
  expect(next.look.lookPoint).toBe(state.look.lookPoint)
  expect(next.playback.time).toBe(state.playback.time)
  expect(next.physicsState).toBe(state.physicsState)
  expect(next.chainState).toBe(state.chainState)
  expect(next.frameValues).toBe(state.frameValues)
})

test('should merge independent motion controls into the latest timeline and remove stopped instances', () => {
  const entry = {
    blend: 'replace' as const,
    completion: undefined,
    elapsed: 0.8,
    id: 1,
    loop: true,
    motionId: 'walk',
    priority: 1,
    speed: 1,
    status: 'playing' as const,
    stopping: undefined,
    time: 0.8,
    weight: 1,
  }
  const state = {...createState(), additional: [entry]}
  const changed = applyRuntimeInputs(state, {additional: {1: {weight: 0.5}}})
  expect(changed.additional[0]).toEqual({...entry, weight: 0.5})
  expect(applyRuntimeInputs(changed, {additional: {1: null}}).additional).toEqual([])
})

test('should ignore a late handle edit after its playback has faded out in the Worker', () => {
  const state = createState()
  const result = applyRuntimeInputs(state, {additional: {1: {speed: 2, weight: 0.5}}})
  expect(result.additional).toEqual([])
  expect(result.physicsState).toBe(state.physicsState)
})
