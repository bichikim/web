import {afterEach, describe, expect, it, vi} from 'vitest'
import {observeMediaQuery, observeReducedMotionPreference} from '..'

afterEach(() => vi.unstubAllGlobals())

describe('observeMediaQuery', () => {
  it('should notify current matches and dispose the change subscription', () => {
    const media = Object.assign(new EventTarget(), {matches: true}) as MediaQueryList
    const onChange = vi.fn()
    const matchMedia = vi.fn(() => media)
    const unsubscribe = observeMediaQuery('(prefers-reduced-motion: reduce)', onChange, {
      matchMedia,
    })
    expect(matchMedia).toHaveBeenCalledExactlyOnceWith('(prefers-reduced-motion: reduce)')
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true)
    Object.assign(media, {matches: false})
    media.dispatchEvent(new Event('change'))
    expect(onChange).toHaveBeenLastCalledWith(false)
    unsubscribe?.()
    media.dispatchEvent(new Event('change'))
    expect(onChange).toHaveBeenCalledTimes(2)
  })
  it('should observe changes without an initial notification when requested', () => {
    const media = Object.assign(new EventTarget(), {matches: true}) as MediaQueryList
    const onChange = vi.fn()
    const unsubscribe = observeMediaQuery('query', onChange, {
      matchMedia: () => media,
      notifyInitial: false,
    })
    expect(onChange).not.toHaveBeenCalled()
    Object.assign(media, {matches: false})
    media.dispatchEvent(new Event('change'))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(false)
    unsubscribe?.()
  })
  it('should return null without notifying when matchMedia is unavailable', () => {
    const onChange = vi.fn()
    vi.stubGlobal('matchMedia', undefined)
    expect(observeMediaQuery('query', onChange)).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('observeReducedMotionPreference', () => {
  it.each([true, false])(
    'should observe the reduced-motion query from an initial value of %s',
    (initial) => {
      const media = Object.assign(new EventTarget(), {matches: initial}) as MediaQueryList
      const matchMedia = vi.fn(() => media)
      vi.stubGlobal('matchMedia', matchMedia)
      const onChange = vi.fn()

      const unsubscribe = observeReducedMotionPreference(onChange)

      expect(matchMedia).toHaveBeenCalledExactlyOnceWith('(prefers-reduced-motion: reduce)')
      expect(onChange).toHaveBeenCalledExactlyOnceWith(initial)
      const change = Object.assign(new Event('change'), {matches: !initial})
      media.dispatchEvent(change)
      expect(onChange.mock.calls).toEqual([[initial], [!initial]])

      unsubscribe?.()
      media.dispatchEvent(change)
      expect(onChange).toHaveBeenCalledTimes(2)
    },
  )

  it('should preserve injected matchMedia and suppress only the initial notification', () => {
    const media = Object.assign(new EventTarget(), {matches: false}) as MediaQueryList
    const matchMedia = vi.fn(() => media)
    vi.stubGlobal('matchMedia', undefined)
    const onChange = vi.fn()

    const unsubscribe = observeReducedMotionPreference(onChange, {matchMedia, notifyInitial: false})

    expect(matchMedia).toHaveBeenCalledExactlyOnceWith('(prefers-reduced-motion: reduce)')
    expect(onChange).not.toHaveBeenCalled()
    Object.assign(media, {matches: true})
    media.dispatchEvent(new Event('change'))
    expect(onChange).toHaveBeenCalledExactlyOnceWith(true)

    unsubscribe?.()
    media.dispatchEvent(new Event('change'))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('should return null without notifying when reduced-motion observation is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined)
    const onChange = vi.fn()

    expect(observeReducedMotionPreference(onChange)).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })
})
