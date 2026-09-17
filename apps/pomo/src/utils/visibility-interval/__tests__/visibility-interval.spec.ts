/** @vitest-environment jsdom */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {visibilityInterval} from '../visibility-interval'

const INTERVAL = 1000

describe('visibilityInterval', () => {
  let documentHidden = false

  beforeEach(() => {
    documentHidden = false
    vi.useFakeTimers()
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

  it('should call the callback on each interval while the document is visible', () => {
    const callback = vi.fn()
    const stop = visibilityInterval(callback, INTERVAL)

    expect(callback).not.toHaveBeenCalled()
    vi.advanceTimersByTime(INTERVAL - 1)
    expect(callback).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(callback).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(INTERVAL)
    expect(callback).toHaveBeenCalledTimes(2)
    stop()
  })

  it('should not start the interval when the document is already hidden', () => {
    documentHidden = true
    const callback = vi.fn()
    const stop = visibilityInterval({callback, interval: INTERVAL})

    vi.advanceTimersByTime(INTERVAL)
    expect(callback).not.toHaveBeenCalled()
    stop()
  })

  it('should stop calling the callback while the document is hidden', () => {
    const callback = vi.fn()
    const stop = visibilityInterval({callback, interval: INTERVAL})

    vi.advanceTimersByTime(INTERVAL)
    expect(callback).toHaveBeenCalledTimes(1)

    changeVisibility(true)
    vi.advanceTimersByTime(INTERVAL)
    expect(callback).toHaveBeenCalledTimes(1)
    stop()
  })

  it('should resume a single interval when the document becomes visible', () => {
    const callback = vi.fn()
    const stop = visibilityInterval({callback, interval: INTERVAL})

    changeVisibility(true)
    vi.advanceTimersByTime(INTERVAL)
    expect(callback).not.toHaveBeenCalled()

    changeVisibility(false)
    vi.advanceTimersByTime(INTERVAL)
    expect(callback).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(INTERVAL)
    expect(callback).toHaveBeenCalledTimes(2)
    stop()
  })

  it('should not start an additional interval when visibility reports visible again', () => {
    const callback = vi.fn()
    const stop = visibilityInterval({callback, interval: INTERVAL})

    changeVisibility(false)
    vi.advanceTimersByTime(INTERVAL)
    expect(callback).toHaveBeenCalledTimes(1)
    stop()
  })

  it('should run the callback when returning before the interval deadline', () => {
    const callback = vi.fn()
    const stop = visibilityInterval({callback, interval: INTERVAL, runOnVisible: true})

    changeVisibility(true)
    vi.advanceTimersByTime(INTERVAL - 1)
    changeVisibility(false)
    expect(callback).toHaveBeenCalledOnce()

    changeVisibility(false)
    expect(callback).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(INTERVAL)
    expect(callback).toHaveBeenCalledTimes(2)
    stop()
  })

  it('should stop calling the callback after cleanup', () => {
    const callback = vi.fn()
    const stop = visibilityInterval({callback, interval: INTERVAL})

    stop()
    vi.advanceTimersByTime(INTERVAL)
    expect(callback).not.toHaveBeenCalled()
  })

  it('should ignore visibility changes after cleanup', () => {
    const callback = vi.fn()
    const stop = visibilityInterval({callback, interval: INTERVAL})

    stop()
    changeVisibility(true)
    changeVisibility(false)
    vi.advanceTimersByTime(INTERVAL)
    expect(callback).not.toHaveBeenCalled()
  })
  it('should run once on overdue return and restart the interval from visibility', () => {
    const callback = vi.fn()
    const stop = visibilityInterval({callback, interval: INTERVAL, runOverdueOnVisible: true})
    vi.advanceTimersByTime(INTERVAL)
    changeVisibility(true)
    vi.advanceTimersByTime(INTERVAL * 3)
    expect(callback).toHaveBeenCalledTimes(1)
    changeVisibility(false)
    expect(callback).toHaveBeenCalledTimes(2)
    changeVisibility(false)
    expect(callback).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(INTERVAL)
    expect(callback).toHaveBeenCalledTimes(3)
    stop()
  })

  it('should wait a full interval after returning before the deadline', () => {
    const callback = vi.fn()
    const stop = visibilityInterval({callback, interval: INTERVAL, runOverdueOnVisible: true})
    changeVisibility(true)
    vi.advanceTimersByTime(INTERVAL - 1)
    changeVisibility(false)
    expect(callback).not.toHaveBeenCalled()
    vi.advanceTimersByTime(INTERVAL - 1)
    expect(callback).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(callback).toHaveBeenCalledTimes(1)
    stop()
  })

  it('should run at the deadline when initially hidden and stop after cleanup', () => {
    documentHidden = true
    const callback = vi.fn()
    const stop = visibilityInterval({callback, interval: INTERVAL, runOverdueOnVisible: true})
    vi.advanceTimersByTime(INTERVAL)
    changeVisibility(false)
    expect(callback).toHaveBeenCalledTimes(1)
    stop()
    changeVisibility(true)
    vi.advanceTimersByTime(INTERVAL)
    changeVisibility(false)
    expect(callback).toHaveBeenCalledTimes(1)
  })
})
