import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createPendingSave} from '..'

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
  const save = vi.fn()
  const pending = createPendingSave({delayMilliseconds: 500, save})
  pending.schedule(null)
  pending.flush()
  pending.flush()
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
