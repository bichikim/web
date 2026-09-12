/** @vitest-environment node */
import {setTimeout} from 'node:timers/promises'
import {afterEach, expect, it, vi} from 'vitest'
import {getMonotonicTime} from '../index'

afterEach(() => vi.restoreAllMocks())

it.each([-60_000, 60_000])(
  'should advance independently of a %i ms wall-clock change',
  async (adjustment) => {
    const startedAt = getMonotonicTime()
    const wallTime = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(wallTime + adjustment)
    await setTimeout(10)
    const elapsed = getMonotonicTime() - startedAt
    expect(elapsed).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(10_000)
  },
)
