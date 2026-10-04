/** @vitest-environment node */
import {expect, it} from 'vitest'

import {dayjs} from 'src/utils/zoned-dayjs'

/** Mirrors `saveAlarm` validation in `use-calendar-alarm-controller`. */
const buildAlarmAt = (date: string, time: string, timeZone: string) =>
  dayjs.tz(`${date}T${time}:00`, timeZone).toDate()

const isSaveRejected = (alarmAt: Date, now: Date) =>
  Number.isNaN(alarmAt.getTime()) || alarmAt.getTime() <= now.getTime()

it('should allow saving an alarm for the current clock minute', () => {
  const timeZone = 'Asia/Seoul'
  const now = dayjs.tz('2026-10-05T14:30:45', timeZone).toDate()
  const alarmAt = buildAlarmAt('2026-10-05', '14:30', timeZone)

  expect(isSaveRejected(alarmAt, now)).toBe(false)
})
