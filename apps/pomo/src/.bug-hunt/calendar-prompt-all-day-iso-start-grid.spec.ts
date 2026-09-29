/** @vitest-environment node */
import {expect, it} from 'vitest'

import {groupCalendarEvents} from '../features/calendar/group-events'

const event = {
  accountLabel: 'work@example.com',
  allDay: true,
  calendarLabel: '업무',
  end: '2026-10-01',
  id: 'all-day-iso-start',
  provider: 'google' as const,
  start: '2026-09-30T00:00:00Z',
  title: 'ISO 시작 종일 일정',
}

it('groups the same all-day ISO-start event on its civil start date', () => {
  expect(
    groupCalendarEvents([event], ['2026-09-30'], 'America/Los_Angeles').get('2026-09-30'),
  ).toEqual([event])
})
