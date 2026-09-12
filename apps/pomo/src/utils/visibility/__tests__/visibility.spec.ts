/** @vitest-environment jsdom */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {visibility} from '..'

describe('visibility', () => {
  let documentHidden = false

  beforeEach(() => {
    documentHidden = false
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => documentHidden)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const changeVisibility = (hidden: boolean) => {
    documentHidden = hidden
    document.dispatchEvent(new Event('visibilitychange', {bubbles: true}))
  }

  it('should not call the callback before a visibility change', () => {
    const callback = vi.fn()
    const stop = visibility(callback)

    expect(callback).not.toHaveBeenCalled()
    stop()
  })

  it('should call the callback with document.hidden when visibility changes', () => {
    const callback = vi.fn()
    const stop = visibility(callback)

    changeVisibility(true)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenLastCalledWith(true)

    changeVisibility(false)
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenLastCalledWith(false)
    stop()
  })

  it('should not call the callback after cleanup', () => {
    const callback = vi.fn()
    const stop = visibility(callback)

    stop()
    changeVisibility(true)
    changeVisibility(false)
    expect(callback).not.toHaveBeenCalled()
  })
})
