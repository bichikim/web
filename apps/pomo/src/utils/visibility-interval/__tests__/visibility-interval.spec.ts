/** @vitest-environment jsdom */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {visibilityInterval} from '..'

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
    document.dispatchEvent(new Event('visibilitychange', {bubbles: true}))
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
    const stop = visibilityInterval(callback, INTERVAL)

    vi.advanceTimersByTime(INTERVAL)
    expect(callback).not.toHaveBeenCalled()
    stop()
  })

  it('should stop calling the callback while the document is hidden', () => {
    const callback = vi.fn()
    const stop = visibilityInterval(callback, INTERVAL)

    vi.advanceTimersByTime(INTERVAL)
    expect(callback).toHaveBeenCalledTimes(1)

    changeVisibility(true)
    vi.advanceTimersByTime(INTERVAL)
    expect(callback).toHaveBeenCalledTimes(1)
    stop()
  })

  it('should resume a single interval when the document becomes visible', () => {
    const callback = vi.fn()
    const stop = visibilityInterval(callback, INTERVAL)

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
    const stop = visibilityInterval(callback, INTERVAL)

    changeVisibility(false)
    vi.advanceTimersByTime(INTERVAL)
    expect(callback).toHaveBeenCalledTimes(1)
    stop()
  })

  it('should stop calling the callback after cleanup', () => {
    const callback = vi.fn()
    const stop = visibilityInterval(callback, INTERVAL)

    stop()
    vi.advanceTimersByTime(INTERVAL)
    expect(callback).not.toHaveBeenCalled()
  })

  it('should ignore visibility changes after cleanup', () => {
    const callback = vi.fn()
    const stop = visibilityInterval(callback, INTERVAL)

    stop()
    changeVisibility(true)
    changeVisibility(false)
    vi.advanceTimersByTime(INTERVAL)
    expect(callback).not.toHaveBeenCalled()
  })
})
