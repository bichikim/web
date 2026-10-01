/** @vitest-environment node */
import {expect, it} from 'vitest'

import {dayjs} from 'src/utils/zoned-dayjs'

/** Mirrors `saveAlarm` timestamp construction in use-calendar-alarm-controller. */
const buildAlarmAt = (date: string, time: string, timeZone: string) =>
  dayjs.tz(`${date}T${time}:00`, timeZone).toDate()

it('should preserve the entered local time for alarms in a DST gap', () => {
  const date = '2026-03-08'
  const time = '02:30'
  const timeZone = 'America/New_York'
  const alarmAt = buildAlarmAt(date, time, timeZone)

  expect(dayjs(alarmAt).tz(timeZone).format('HH:mm')).toBe(time)
})
