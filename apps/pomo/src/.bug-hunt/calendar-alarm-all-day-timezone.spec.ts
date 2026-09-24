/** @vitest-environment node */
import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import {expect, it, vi} from 'vitest'

dayjs.extend(utc)
dayjs.extend(timezone)

/** Mirrors all-day branch of `getEventAlarmAt` in `use-calendar-alarm-controller.ts`. */
const getDefaultAllDayAlarmAt = (eventStart: string): Date => {
  const [year, month, day] = eventStart.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day, 9)
}

it('should default all-day alarms to 09:00 in the calendar time zone, not the system zone', () => {
  vi.stubEnv('TZ', 'UTC')
  const calendarTimeZone = 'Asia/Seoul'
  const eventStart = '2026-09-05'

  const actual = getDefaultAllDayAlarmAt(eventStart)
  const expected = dayjs.tz('2026-09-05 09:00', calendarTimeZone).toDate()

  expect(actual.toISOString()).toBe(expected.toISOString())
})
