/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {dayjs} from 'src/utils/zoned-dayjs'

/** Mirrors `saveAlarm` in `use-calendar-alarm-controller`. */
const parseCalendarAlarmAt = (date: string, time: string, timeZone: string) =>
  dayjs.tz(`${date}T${time}:00`, timeZone).toDate()

describe('calendar alarm datetime paste', () => {
  const timeZone = 'Asia/Seoul'
  const futureDate = '2026-12-20'

  it.each([
    {label: 'fullwidth digits', time: '０９:０５'},
    {label: 'fullwidth colon', time: '09：05'},
  ])('should accept $label in the alarm time field', ({time}) => {
    const alarmAt = parseCalendarAlarmAt(futureDate, time, timeZone)

    expect(Number.isNaN(alarmAt.getTime())).toBe(false)
    expect(alarmAt.getTime()).toBeGreaterThan(Date.now())
  })
})
