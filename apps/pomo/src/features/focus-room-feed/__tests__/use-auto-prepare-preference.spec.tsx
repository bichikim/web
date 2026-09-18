import {PreferenceProvider} from 'src/hooks/use-preference'
import {createRenderEffect} from 'solid-js'
/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {
  readFeedAutoPreparePreference,
  useAutoPreparePreference,
} from '../use-auto-prepare-preference'
beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
it('should preserve automatic preparation by default and persist opting out', () => {
  const first = renderHook(useAutoPreparePreference, {wrapper: PreferenceProvider})
  expect(first.result.enabled()).toBe(true)
  first.result.onEnabledChange(false)
  expect(readFeedAutoPreparePreference()).toBe(false)
  first.cleanup()
  expect(renderHook(useAutoPreparePreference, {wrapper: PreferenceProvider}).result.enabled()).toBe(
    false,
  )
})

it('should expose the stored state on the first ready render after every mount', () => {
  localStorage.setItem('pomo:feed-auto-prepare:v1', 'false')
  const values: Array<boolean> = []
  const mount = () =>
    renderHook(
      () => {
        const preference = useAutoPreparePreference()
        createRenderEffect(() => {
          const value = preference.enabled()
          if (value !== null) {
            values.push(value)
          }
        })
        return preference
      },
      {wrapper: PreferenceProvider},
    )
  const first = mount()
  first.cleanup()
  mount()
  expect(values).toEqual([false, false])
})

it('should retain a session opt-out and notify mounted consumers when storage rejects writes', () => {
  const {
    result: [first, second],
  } = renderHook(() => [useAutoPreparePreference(), useAutoPreparePreference()] as const, {
    wrapper: PreferenceProvider,
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota')
  })
  vi.stubGlobal('reportError', vi.fn())
  first.onEnabledChange(false)
  expect(first.enabled()).toBe(false)
  expect(second.enabled()).toBe(false)
})
