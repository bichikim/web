/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {usePicker} from '../components/date-picker/use-picker'
import {calculateService} from '../features/tools/calculate-service'
import {formatDate} from '../features/civil-date'
import {formatLocalDate} from '../utils/format-local-date'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

it('should keep enlistment day aligned with the local today label used by Service', () => {
  vi.stubEnv('TZ', 'America/Los_Angeles')
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-06-15T06:00:00.000Z'))

  const now = new Date()
  const localToday = formatLocalDate(now)
  const pickerDefaultDay = formatDate({
    day: now.getUTCDate(),
    month: now.getUTCMonth() + 1,
    year: now.getUTCFullYear(),
  })

  expect(localToday).toBe('2026-06-14')
  expect(pickerDefaultDay).toBe('2026-06-15')

  const picker = renderHook(() => usePicker({}))
  picker.result.toggle()
  expect(formatDate(picker.result.view())).toBe(pickerDefaultDay)

  const aligned = calculateService({branch: 'army', start: localToday, today: localToday})
  const mismatched = calculateService({branch: 'army', start: pickerDefaultDay, today: localToday})

  expect(mismatched?.remaining).toBe(aligned?.remaining)
  picker.cleanup()
})
