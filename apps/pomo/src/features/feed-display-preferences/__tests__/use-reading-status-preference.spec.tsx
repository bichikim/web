import {createRenderEffect} from 'solid-js'
/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it} from 'vitest'
import {useReadingStatusPreference} from '../use-reading-status-preference'

beforeEach(() => localStorage.clear())
afterEach(cleanup)
it('should show progress by default and share changes with mounted consumers', () => {
  const first = renderHook(useReadingStatusPreference)
  const second = renderHook(useReadingStatusPreference)
  expect(first.result.visible()).toBe(true)
  first.result.onVisibleChange(false)
  expect(first.result.visible()).toBe(false)
  expect(second.result.visible()).toBe(false)
  second.result.onVisibleChange(true)
  expect(first.result.visible()).toBe(true)
})
it('should restore the saved preference after remounting', () => {
  const first = renderHook(useReadingStatusPreference)
  first.result.onVisibleChange(false)
  first.cleanup()
  expect(renderHook(useReadingStatusPreference).result.visible()).toBe(false)
})

it('should expose the stored state on the first ready render after every mount', () => {
  localStorage.setItem('pomo:feed-reading-status-visible:v1', 'false')
  const values: Array<boolean> = []
  const mount = () =>
    renderHook(() => {
      const preference = useReadingStatusPreference()
      createRenderEffect(() => {
        if (preference.isReady()) {
          values.push(preference.visible())
        }
      })
      return preference
    })
  const first = mount()
  first.cleanup()
  mount()
  expect(values).toEqual([false, false])
})
