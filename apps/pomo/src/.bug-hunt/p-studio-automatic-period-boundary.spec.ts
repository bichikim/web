/** @vitest-environment node */
import {afterEach, describe, expect, it, vi} from 'vitest'

import {getAutomaticScenePeriod, resolveScenePeriod} from '../features/focus-room-time'

/** Mirrors `AUTOMATIC_PERIOD_REFRESH` in `src/components/p-studio/PStudio.tsx`. */
const AUTOMATIC_PERIOD_REFRESH_MS = 60_000

describe('P Studio automatic scene period refresh policy', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('should flip auto scene period at 07:00 local time, not up to 59 minutes later', () => {
    vi.useFakeTimers()

    let automaticPeriod = getAutomaticScenePeriod(new Date())
    const refreshAutomaticPeriod = () => {
      automaticPeriod = getAutomaticScenePeriod(new Date())
    }

    vi.setSystemTime(new Date(2026, 0, 1, 6, 1, 0))
    refreshAutomaticPeriod()
    expect(automaticPeriod).toBe('night')

    const stopRefresh = globalThis.setInterval(refreshAutomaticPeriod, AUTOMATIC_PERIOD_REFRESH_MS)

    vi.setSystemTime(new Date(2026, 0, 1, 7, 0, 0))
    vi.advanceTimersByTime(30_000)

    expect(getAutomaticScenePeriod(new Date())).toBe('day')
    expect(automaticPeriod).toBe('night')
    expect(resolveScenePeriod('auto', automaticPeriod)).toBe('day')

    globalThis.clearInterval(stopRefresh)
  })
})
