/** @vitest-environment node */
import {expect, it} from 'vitest'

import {formatCalendarDate} from '../format-calendar-date'

const createFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  })

it.each([
  {
    date: '2026-09-04T15:00:00.000Z',
    expected: '2026-09-05',
    timeZone: 'Asia/Seoul',
  },
  {
    date: '2026-03-08T04:00:00.000Z',
    expected: '2026-03-07',
    timeZone: 'America/New_York',
  },
  {
    date: '2026-03-08T05:00:00.000Z',
    expected: '2026-03-08',
    timeZone: 'America/New_York',
  },
  {
    date: '2026-03-08T06:59:59.000Z',
    expected: '2026-03-08',
    timeZone: 'America/New_York',
  },
  {
    date: '2026-03-08T07:00:00.000Z',
    expected: '2026-03-08',
    timeZone: 'America/New_York',
  },
  {
    date: '2026-11-01T05:59:59.000Z',
    expected: '2026-11-01',
    timeZone: 'America/New_York',
  },
  {
    date: '2026-11-01T06:00:00.000Z',
    expected: '2026-11-01',
    timeZone: 'America/New_York',
  },
])('should format $date as $expected in $timeZone', ({date, expected, timeZone}) => {
  expect(formatCalendarDate({date: new Date(date), formatter: createFormatter(timeZone)})).toBe(
    expected,
  )
})
