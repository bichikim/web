/** @vitest-environment jsdom */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {visibilityInterval} from '../utils/visibility-interval/visibility-interval'

const INTERVAL = 1000

describe('visibilityInterval runOverdueOnVisible with wall-clock adjustment', () => {
  let documentHidden = false
  let wallClock = 1_000_000

  beforeEach(() => {
    documentHidden = false
    wallClock = 1_000_000
    vi.useFakeTimers()
    vi.spyOn(Date, 'now').mockImplementation(() => wallClock)
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => documentHidden)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const changeVisibility = (hidden: boolean) => {
    documentHidden = hidden
    document.dispatchEvent(new Event('visibilitychange'))
  }

  it('should run overdue work when returning visible after a backward clock adjustment', () => {
    const callback = vi.fn()
    const stop = visibilityInterval({callback, interval: INTERVAL, runOverdueOnVisible: true})

    vi.advanceTimersByTime(INTERVAL)
    expect(callback).toHaveBeenCalledTimes(1)

    changeVisibility(true)
    wallClock += INTERVAL * 5
    wallClock -= INTERVAL * 10
    changeVisibility(false)

    expect(callback).toHaveBeenCalledTimes(2)
    stop()
  })
})
