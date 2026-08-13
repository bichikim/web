/** @vitest-environment jsdom */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {ParallaxController} from '../parallax-controller'

class MotionPreference extends EventTarget {
  matches = false
  readonly media = '(prefers-reduced-motion: reduce)'

  setMatches(matches: boolean) {
    this.matches = matches
    this.dispatchEvent(new Event('change'))
  }
}

describe('ParallaxController', () => {
  const motionPreference = new MotionPreference()

  beforeEach(() => {
    motionPreference.matches = false
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => motionPreference),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('should propagate runtime reduced-motion preference changes', () => {
    const renderOffset = vi.fn()
    const onMotionPreferenceChange = vi.fn()
    const controller = new ParallaxController(
      document.createElement('div'),
      renderOffset,
      onMotionPreferenceChange,
    )

    controller.start()
    motionPreference.setMatches(true)
    motionPreference.setMatches(false)

    expect(renderOffset).toHaveBeenNthCalledWith(1, 0, 0)
    expect(renderOffset).toHaveBeenNthCalledWith(2, 0, 0)
    expect(onMotionPreferenceChange).toHaveBeenNthCalledWith(1, true)
    expect(onMotionPreferenceChange).toHaveBeenNthCalledWith(2, false)

    controller.destroy()
    motionPreference.setMatches(true)

    expect(onMotionPreferenceChange).toHaveBeenCalledTimes(2)
  })
})
