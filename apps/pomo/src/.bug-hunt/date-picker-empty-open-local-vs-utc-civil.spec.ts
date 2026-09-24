/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {usePicker} from '../components/date-picker/use-picker'

afterEach(() => {
  vi.useRealTimers()
})

/**
 * PDatePicker formats month/weekday labels with timeZone: 'UTC' and cells use UTC civil addDays/dateEpoch.
 * Empty open should seed view with UTC civil today, not host-local calendar day.
 */
it('should open empty picker on UTC civil today when local calendar day differs', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T05:00:00.000Z'))

  const previousTz = process.env.TZ
  process.env.TZ = 'America/Los_Angeles'

  const view = renderHook(() => usePicker({}))
  view.result.toggle()

  expect(view.result.view()).toEqual({day: 1, month: 1, year: 2026})

  view.cleanup()
  process.env.TZ = previousTz
})
