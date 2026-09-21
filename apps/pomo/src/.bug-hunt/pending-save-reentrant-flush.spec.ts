import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {createPendingSave} from '../features/pending-save'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

it('should save a value scheduled while flush is still running the save callback', () => {
  const saved: number[] = []
  let releaseFirstSave: () => void = () => undefined
  const pending = createPendingSave<number>({
    delayMilliseconds: 100,
    save(value) {
      saved.push(value)
      if (value === 1) {
        pending.schedule(2)
        releaseFirstSave()
      }
    },
  })

  pending.schedule(1)
  vi.advanceTimersByTime(100)

  expect(saved).toEqual([1])
  expect(pending.hasPending()).toBe(true)

  vi.advanceTimersByTime(100)

  expect(saved).toEqual([1, 2])
})
