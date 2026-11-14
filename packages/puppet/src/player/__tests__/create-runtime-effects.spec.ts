import {expect, test, vi} from 'vitest'
import {createRuntimeEffects} from '../create-runtime-effects'
test('should deliver each presented callback once and cancel callbacks explicitly removed by controls', () => {
  const onEvent = vi.fn()
  const complete = vi.fn()
  const cancelled = vi.fn()
  const effects = createRuntimeEffects({onEvent})
  const first = effects.register(complete)!
  const second = effects.register(cancelled)!
  effects.cancel(second)
  const state = {
    pending: [
      {completion: first, kind: 'completion' as const, sequence: 1},
      {event: {motionId: 'walk', time: 0.2, value: 'step'}, kind: 'event' as const, sequence: 2},
      {completion: second, kind: 'completion' as const, sequence: 3},
    ],
    sequence: 3,
  }
  effects.dispatch(state)
  effects.dispatch(state)
  expect(complete).toHaveBeenCalledOnce()
  expect(cancelled).not.toHaveBeenCalled()
  expect(onEvent).toHaveBeenCalledExactlyOnceWith({motionId: 'walk', time: 0.2, value: 'step'})
  expect(effects.acknowledged()).toBe(3)
})
test('should stop a notification batch when its callback replaces the current lifetime', () => {
  const onEvent = vi.fn()
  const effects = createRuntimeEffects({onEvent})
  const token = effects.register(() => effects.clear())!
  effects.dispatch({
    pending: [
      {completion: token, kind: 'completion', sequence: 1},
      {event: {motionId: 'walk', time: 0.2, value: 'step'}, kind: 'event', sequence: 2},
    ],
    sequence: 2,
  })
  expect(onEvent).not.toHaveBeenCalled()
})

test('should retain an independent motion completion callback for explicit replay until cancelled', () => {
  const effects = createRuntimeEffects()
  const callback = vi.fn()
  const token = effects.register(callback, {repeat: true})!
  effects.dispatch({pending: [{completion: token, kind: 'completion', sequence: 1}], sequence: 1})
  effects.dispatch({pending: [{completion: token, kind: 'completion', sequence: 2}], sequence: 2})
  expect(callback).toHaveBeenCalledTimes(2)
  effects.cancel(token)
  effects.dispatch({pending: [{completion: token, kind: 'completion', sequence: 3}], sequence: 3})
  expect(callback).toHaveBeenCalledTimes(2)
})
