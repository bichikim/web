import {expect, test, vi} from 'vitest'
import {createMotionPlaybacks} from '../create-motion-playbacks'

const motions = [{duration: 2, id: 'walk', tracks: []}]
test('should restore multiple motion instances while retaining existing handle identities', () => {
  const source = createMotionPlaybacks({motions, onChange: vi.fn()})
  const first = source.start('walk')!
  const second = source.start('walk', {speed: 2})!
  source.advance(0.25)
  const state = structuredClone(source.capture())
  source.advance(0.25)
  source.restore(state)
  expect(first.getState().time).toBe(0.25)
  expect(second.getState().time).toBe(0.5)
  const receiver = createMotionPlaybacks({motions: structuredClone(motions), onChange: vi.fn()})
  receiver.restore(state)
  receiver.advance(0.25)
  source.advance(0.25)
  expect(receiver.capture()).toEqual(source.capture())
  expect(first.id).not.toBe(second.id)
})
test('should carry completion tokens across the Worker checkpoint without callbacks', () => {
  const onCompletion = vi.fn()
  const source = createMotionPlaybacks({motions, onChange: vi.fn()})
  source.start('walk', {completion: 7, loop: false})
  const receiver = createMotionPlaybacks({motions, onChange: vi.fn(), onCompletion})
  receiver.restore(structuredClone(source.capture()))
  receiver.advance(2).forEach((run) => run())
  expect(onCompletion).toHaveBeenCalledExactlyOnceWith(7)
})

test('should retain a handle when a displayed checkpoint temporarily precedes its start', () => {
  const source = createMotionPlaybacks({motions, onChange: vi.fn()})
  const beforeStart = source.capture()
  const handle = source.start('walk')!
  const desired = source.capture()
  source.restore(beforeStart)
  source.restore(desired)
  source.advance(0.25)
  expect(handle.getState()).toMatchObject({status: 'playing', time: 0.25})
  handle.pause()
  expect(handle.getState().status).toBe('paused')
  handle.seek(0.5)
  expect(source.capture()[0]).toMatchObject({status: 'paused', time: 0.5})
  expect(handle.getState().time).toBe(0.5)
  handle.stop()
  expect(handle.getState()).toMatchObject({status: 'stopped', time: 0.5})
  expect(source.capture()).toEqual([])
})
