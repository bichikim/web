import {PreferenceProvider} from 'src/hooks/use-preference'
import {createRenderEffect} from 'solid-js'
/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it} from 'vitest'
import {useReadingStatusPreference} from '../use-reading-status-preference'

beforeEach(() => localStorage.clear())
afterEach(cleanup)
it('should show progress by default and share changes with mounted consumers', () => {
  const {
    result: [first, second],
  } = renderHook(() => [useReadingStatusPreference(), useReadingStatusPreference()] as const, {
    wrapper: PreferenceProvider,
  })
  expect(first.visible()).toBe(true)
  first.onVisibleChange(false)
  expect(first.visible()).toBe(false)
  expect(second.visible()).toBe(false)
  second.onVisibleChange(true)
  expect(first.visible()).toBe(true)
})
it('should restore the saved preference after remounting', () => {
  const first = renderHook(useReadingStatusPreference, {wrapper: PreferenceProvider})
  first.result.onVisibleChange(false)
  first.cleanup()
  expect(
    renderHook(useReadingStatusPreference, {wrapper: PreferenceProvider}).result.visible(),
  ).toBe(false)
})

it('should expose the stored state on the first ready render after every mount', () => {
  localStorage.setItem('pomo:feed-reading-status-visible:v1', 'false')
  const values: Array<boolean> = []
  const mount = () =>
    renderHook(
      () => {
        const preference = useReadingStatusPreference()
        createRenderEffect(() => {
          const value = preference.visible()
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
