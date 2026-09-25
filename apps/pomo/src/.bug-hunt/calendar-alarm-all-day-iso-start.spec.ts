/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {dayjs} from 'src/utils/zoned-dayjs'

const DATE_KEY_LENGTH = 10
const ALL_DAY_ALARM_TIME = '09:00:00'

/** Mirrors `getEventAlarmAt` all-day branch in `use-calendar-alarm-controller.ts`. */
const getAllDayAlarmDateInput = (eventStart: string) => eventStart.slice(0, DATE_KEY_LENGTH)

const getLocalCalendarDate = (isoStart: string, timeZone: string) =>
  dayjs(isoStart).tz(timeZone).format('YYYY-MM-DD')

describe('calendar alarm all-day default date', () => {
  it('should use the event local calendar day instead of the UTC date prefix', () => {
    const eventStart = '2026-09-06T00:00:00.000Z'
    const timeZone = 'America/Los_Angeles'
    const expectedLocalDate = getLocalCalendarDate(eventStart, timeZone)
    const alarmDateFromController = getAllDayAlarmDateInput(eventStart)

    expect(expectedLocalDate).toBe('2026-09-05')
    expect(alarmDateFromController).toBe('2026-09-06')
    expect(alarmDateFromController).toBe(expectedLocalDate)
  })
})
