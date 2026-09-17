/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {usePicker} from '../use-picker'

afterEach(() => vi.useRealTimers())
it('should open an empty picker on the device date at the year boundary', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 11, 31, 23, 30))
  const view = renderHook(() => usePicker({}))
  view.result.toggle()
  expect(view.result.view()).toEqual({day: 31, month: 12, year: 2026})
  view.cleanup()
})
