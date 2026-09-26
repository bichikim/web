/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {usePicker} from '../use-picker'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})
it('should open an empty picker on the UTC date across a host-local date boundary', () => {
  vi.stubEnv('TZ', 'America/Los_Angeles')
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T05:00:00.000Z'))
  const picker = renderHook(() => usePicker({}))
  picker.result.toggle()
  expect(picker.result.view()).toEqual({day: 1, month: 1, year: 2026})
  picker.cleanup()
})
