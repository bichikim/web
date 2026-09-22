/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {useUiAutoHide} from '../features/ui-auto-hide/use-ui-auto-hide'

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('should restore visibility when an existing element becomes a visible dialog', async () => {
  const shell = document.createElement('div')
  document.body.append(shell)

  const {result} = renderHook(useUiAutoHide, {wrapper: PreferenceProvider})
  result.onEnabledChange(true)
  vi.advanceTimersByTime(30_000)
  expect(result.hidden()).toBe(true)

  vi.spyOn(shell, 'getClientRects').mockReturnValue({length: 1} as DOMRectList)
  shell.setAttribute('role', 'dialog')

  try {
    await Promise.resolve()
    expect(result.hidden()).toBe(false)
  } finally {
    shell.remove()
  }
})
