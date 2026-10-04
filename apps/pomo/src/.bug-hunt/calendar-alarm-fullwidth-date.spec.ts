/** @vitest-environment node */
import {expect, it} from 'vitest'

import {dayjs} from '../utils/zoned-dayjs'

it('should parse calendar alarm date-time when the date uses fullwidth digits', () => {
  const alarmAt = dayjs.tz('２０２６-１０-０４T09:05:00', 'Asia/Seoul').toDate()

  expect(Number.isNaN(alarmAt.getTime())).toBe(false)
  expect(alarmAt.toISOString()).toBe('2026-10-04T00:05:00.000Z')
})
