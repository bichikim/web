import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createPendingSave} from '..'
import {createRoot, onCleanup} from 'solid-js'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

it('should save only the latest value after the full quiet interval', () => {
  const save = vi.fn()
  const pending = createPendingSave({delayMilliseconds: 500, save})
  pending.schedule(1)
  vi.advanceTimersByTime(400)
  pending.schedule(2)
  vi.advanceTimersByTime(499)
  expect(save).not.toHaveBeenCalled()
  expect(pending.hasPending()).toBe(true)
  vi.advanceTimersByTime(1)
  expect(save).toHaveBeenCalledExactlyOnceWith(2)
  expect(pending.hasPending()).toBe(false)
})

it('should flush once and cancel obsolete values without a later save', () => {
  const save = vi.fn(() => 'ignored save result')
  const pending = createPendingSave({delayMilliseconds: 500, save})
  expect(pending.schedule(null)).toBeUndefined()
  expect(pending.flush()).toBeUndefined()
  expect(pending.flush()).toBeUndefined()
  expect(save).toHaveBeenCalledExactlyOnceWith(null)
  pending.schedule(2)
  pending.cancel()
  vi.runAllTimers()
  expect(save).toHaveBeenCalledOnce()
  expect(pending.hasPending()).toBe(false)
})

it('should clear pending state before saving and retain a newly scheduled value', () => {
  const saved: number[] = []
  const pending = createPendingSave<number>({
    delayMilliseconds: 500,
    save(value) {
      expect(pending.hasPending()).toBe(false)
      saved.push(value)
      if (value === 1) {
        pending.schedule(2)
      }
    },
  })
  pending.schedule(1)
  pending.flush()
  vi.advanceTimersByTime(500)
  expect(saved).toEqual([1, 2])
})

it('should flush immediately before effects initialize and during owner cleanup', () => {
  const save = vi.fn()
  createRoot((dispose) => {
    const pending = createPendingSave({delayMilliseconds: 500, save})
    pending.schedule('before effects')
    pending.flush()
    expect(save).toHaveBeenCalledExactlyOnceWith('before effects')
    onCleanup(pending.flush)
    pending.schedule('cleanup')
    dispose()
  })
  vi.runAllTimers()
  expect(save.mock.calls).toEqual([['before effects'], ['cleanup']])
})

it('should propagate save failures without retrying the consumed value', () => {
  const failure = new Error('save failed')
  const save = vi.fn(() => {
    throw failure
  })
  const pending = createPendingSave({delayMilliseconds: 500, save})
  pending.schedule(undefined)
  expect(() => pending.flush()).toThrow(failure)
  expect(pending.hasPending()).toBe(false)
  pending.flush()
  vi.runAllTimers()
  expect(save).toHaveBeenCalledExactlyOnceWith(undefined)
})

it('should retain a reentrant save even when the first save throws', () => {
  const saved: number[] = []
  const pending = createPendingSave<number>({
    delayMilliseconds: 500,
    save(value) {
      saved.push(value)
      if (value === 1) {
        pending.schedule(2)
        throw new Error('first save failed')
      }
    },
  })
  pending.schedule(1)
  expect(() => vi.advanceTimersByTime(500)).toThrow('first save failed')
  expect(pending.hasPending()).toBe(true)
  vi.advanceTimersByTime(500)
  expect(saved).toEqual([1, 2])
})

it.each([-200, 200])('should preserve the quiet interval after a clock shift of %s', (shift) => {
  vi.setSystemTime(1000)
  const save = vi.fn()
  const pending = createPendingSave({delayMilliseconds: 500, save})
  pending.schedule('first')
  vi.advanceTimersByTime(400)
  pending.schedule('latest')
  vi.setSystemTime(1400 + shift)
  vi.advanceTimersByTime(499)
  expect(save).not.toHaveBeenCalled()
  vi.advanceTimersByTime(1)
  expect(save).toHaveBeenCalledExactlyOnceWith('latest')
  expect(pending.hasPending()).toBe(false)
})
