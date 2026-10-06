import {afterEach, expect, it, vi} from 'vitest'
import {observeMediaQuery} from '..'

afterEach(() => vi.unstubAllGlobals())

it('should notify current matches and dispose the change subscription', () => {
  const media = Object.assign(new EventTarget(), {matches: true}) as MediaQueryList
  const onChange = vi.fn()
  const matchMedia = vi.fn(() => media)
  const unsubscribe = observeMediaQuery('(prefers-reduced-motion: reduce)', onChange, {matchMedia})
  expect(matchMedia).toHaveBeenCalledExactlyOnceWith('(prefers-reduced-motion: reduce)')
  expect(onChange).toHaveBeenCalledExactlyOnceWith(true)
  Object.assign(media, {matches: false})
  media.dispatchEvent(new Event('change'))
  expect(onChange).toHaveBeenLastCalledWith(false)
  unsubscribe?.()
  media.dispatchEvent(new Event('change'))
  expect(onChange).toHaveBeenCalledTimes(2)
})
it('should support silent initial observation and unavailable capability', () => {
  const media = Object.assign(new EventTarget(), {matches: true}) as MediaQueryList
  const onChange = vi.fn()
  const unsubscribe = observeMediaQuery('query', onChange, {
    matchMedia: () => media,
    notifyInitial: false,
  })
  expect(onChange).not.toHaveBeenCalled()
  unsubscribe?.()
  vi.stubGlobal('matchMedia', undefined)
  expect(observeMediaQuery('query', onChange)).toBeNull()
})
