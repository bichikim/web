/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {useUiAutoHide} from 'src/features/ui-auto-hide'

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'visible',
  })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('should keep the UI hidden when the document becomes hidden after inactivity hide', () => {
  const {result} = renderHook(useUiAutoHide, {wrapper: PreferenceProvider})
  result.onEnabledChange(true)
  vi.advanceTimersByTime(30_000)
  expect(result.hidden()).toBe(true)

  Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'hidden'})
  document.dispatchEvent(new Event('visibilitychange'))

  expect(result.hidden()).toBe(true)
})
