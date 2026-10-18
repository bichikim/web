import {describe, expect, test, vi} from 'vitest'
import {createMotionPlaybacks} from '../create-motion-playbacks'

const motions = [{duration: 2, id: 'idle', tracks: []}]
const setup = () => createMotionPlaybacks({motions, onChange: vi.fn()})

describe('createMotionPlaybacks', () => {
  test('should deliver completion after final-frame weight and speed adjustments', () => {
    const playbacks = setup()
    const onComplete = vi.fn()
    const handle = playbacks.start('idle', {loop: false, onComplete})!
    const callbacks = playbacks.advance(2)
    handle.setWeight(0.5)
    handle.setSpeed(2)
    playbacks.update([...motions])
    callbacks.forEach((callback) => callback())
    expect(onComplete).toHaveBeenCalledOnce()
    expect(handle.getState()).toMatchObject({speed: 2, status: 'finished', weight: 0.5})
  })
  test('should cancel queued completion when seeking back to replay', () => {
    const playbacks = setup()
    const onComplete = vi.fn()
    const handle = playbacks.start('idle', {loop: false, onComplete})!
    const callbacks = playbacks.advance(2)
    handle.seek(1)
    callbacks.forEach((callback) => callback())
    expect(onComplete).not.toHaveBeenCalled()
    handle.resume()
    playbacks.advance(1).forEach((callback) => callback())
    expect(onComplete).toHaveBeenCalledOnce()
  })
  test('should control two instances of the same motion independently', () => {
    const playbacks = setup()
    const first = playbacks.start('idle')!
    const second = playbacks.start('idle', {speed: 2})!
    playbacks.advance(0.5).forEach((complete) => complete())
    first.pause()
    playbacks.advance(0.25)
    expect(first.getState()).toMatchObject({status: 'paused', time: 0.5})
    expect(second.getState()).toMatchObject({status: 'playing', time: 1.5})
    first.seek(1)
    first.resume()
    first.setSpeed(0.5)
    first.setWeight(0.25)
    playbacks.advance(0.5)
    expect(first.getState()).toMatchObject({time: 1.25, weight: 0.25})
    first.stop()
    expect(first.getState().status).toBe('stopped')
    expect(playbacks.frames()).toHaveLength(1)
  })
  test('should complete once after holding the last frame and replay after seeking', () => {
    const onComplete = vi.fn()
    const playbacks = setup()
    const handle = playbacks.start('idle', {loop: false, onComplete})!
    playbacks.advance(3).forEach((complete) => complete())
    playbacks.advance(3).forEach((complete) => complete())
    expect(onComplete).toHaveBeenCalledOnce()
    expect(handle.getState()).toMatchObject({status: 'finished', time: 2})
    expect(playbacks.frames()).toHaveLength(1)
    handle.seek(1)
    handle.resume()
    playbacks.advance(1).forEach((complete) => complete())
    expect(onComplete).toHaveBeenCalledTimes(2)
  })
  test('should wrap loops, clamp seeks and freeze a zero playback speed', () => {
    const playbacks = setup()
    const handle = playbacks.start('idle')!
    playbacks.advance(5)
    expect(handle.getState().time).toBe(1)
    handle.seek(-1)
    expect(handle.getState().time).toBe(0)
    handle.seek(9)
    expect(handle.getState().time).toBe(2)
    handle.setSpeed(0)
    playbacks.advance(1)
    expect(handle.getState().time).toBe(2)
  })
  test('should stop removed motions and reconcile duration edits without reviving old handles', () => {
    const playbacks = setup()
    const handle = playbacks.start('idle')!
    handle.seek(1.5)
    playbacks.update([{...motions[0]!, duration: 1}])
    expect(handle.getState()).toMatchObject({duration: 1, time: 1})
    playbacks.update([])
    handle.resume()
    expect(handle.getState().status).toBe('stopped')
    expect(playbacks.start('missing')).toBeUndefined()
  })
  test('should reject invalid numeric options before changing playback state', () => {
    const playbacks = setup()
    expect(() => playbacks.start('idle', {speed: -1})).toThrow(RangeError)
    expect(() => playbacks.start('idle', {weight: Infinity})).toThrow(RangeError)
    expect(() => playbacks.start('idle', {priority: NaN})).toThrow(RangeError)
    const handle = playbacks.start('idle')!
    expect(() => handle.seek(NaN)).toThrow(RangeError)
    expect(() => handle.setWeight(-1)).toThrow(RangeError)
    expect(handle.getState()).toMatchObject({time: 0, weight: 1})
    playbacks.stop()
    expect(playbacks.frames()).toEqual([])
  })
  test('should complete zero-duration one shots once and suspend all playbacks', () => {
    const playbacks = createMotionPlaybacks({
      motions: [{duration: 0, id: 'zero', tracks: []}],
      onChange: vi.fn(),
    })
    const handle = playbacks.start('zero', {loop: false})!
    expect(playbacks.advance(1)).toHaveLength(0)
    expect(handle.getState().status).toBe('finished')
    const looping = playbacks.start('zero')!
    playbacks.pause()
    expect(looping.getState().status).toBe('paused')
    playbacks.resume()
    expect(looping.getState().status).toBe('playing')
  })
  test('should retain the last time when stopped globally and cancel queued completions', () => {
    const playbacks = setup()
    const onComplete = vi.fn()
    const handle = playbacks.start('idle', {loop: false, onComplete})!
    const callbacks = playbacks.advance(2)
    playbacks.stop()
    callbacks.forEach((callback) => callback())
    expect(handle.getState()).toMatchObject({status: 'stopped', time: 2})
    expect(onComplete).not.toHaveBeenCalled()
  })
})
