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

it('should reveal UI when a blocking dialog opens after auto-hide already hid chrome', () => {
  const {result} = renderHook(useUiAutoHide, {wrapper: PreferenceProvider})
  result.onEnabledChange(true)

  vi.advanceTimersByTime(30_000)
  expect(result.hidden()).toBe(true)

  const dialog = document.createElement('div')
  dialog.setAttribute('role', 'dialog')
  vi.spyOn(dialog, 'getClientRects').mockReturnValue({length: 1} as DOMRectList)
  document.body.append(dialog)

  expect(result.hidden()).toBe(false)
})
