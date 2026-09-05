import {expect, it} from 'vitest'

import {type CalendarEvent, groupCalendarEvents} from '../index'

const event: CalendarEvent = {
  accountLabel: 'test@example.com',
  allDay: false,
  calendarLabel: 'test',
  end: '2026-09-04T02:00:00Z',
  id: 'spanning',
  provider: 'google',
  start: '2026-09-03T14:00:00Z',
  title: 'Spanning event',
}

it.each([
  {
    allDay: true,
    days: ['2026-09-01', '2026-09-02', '2026-09-03'],
    end: '2026-09-03',
    expected: ['2026-09-01', '2026-09-02'],
    start: '2026-08-31',
    timeZone: 'America/Los_Angeles',
  },
  {
    allDay: true,
    days: ['2026-09-29', '2026-09-30'],
    end: '2026-10-03',
    expected: ['2026-09-30'],
    start: '2026-09-30',
    timeZone: 'Asia/Seoul',
  },
  {
    allDay: false,
    days: ['2026-09-03', '2026-09-04', '2026-09-05'],
    end: '2026-09-04T02:00:00Z',
    expected: ['2026-09-03', '2026-09-04'],
    start: '2026-09-03T14:00:00Z',
    timeZone: 'Asia/Seoul',
  },
  {
    allDay: false,
    days: ['2026-09-03', '2026-09-04'],
    end: '2026-09-03T15:00:00Z',
    expected: ['2026-09-03'],
    start: '2026-09-03T14:00:00Z',
    timeZone: 'Asia/Seoul',
  },
  {
    allDay: false,
    days: ['2026-09-03', '2026-09-04'],
    end: '2026-09-03T15:00:00.001Z',
    expected: ['2026-09-03', '2026-09-04'],
    start: '2026-09-03T14:00:00Z',
    timeZone: 'Asia/Seoul',
  },
  {
    allDay: false,
    days: ['2026-03-07', '2026-03-08', '2026-03-09'],
    end: '2026-03-09T00:00:00-04:00',
    expected: ['2026-03-07', '2026-03-08'],
    start: '2026-03-07T23:00:00-05:00',
    timeZone: 'America/New_York',
  },
  {
    allDay: false,
    days: ['2026-11-01', '2026-11-02'],
    end: '2026-11-02T00:00:00-05:00',
    expected: ['2026-11-01'],
    start: '2026-10-31T23:00:00-04:00',
    timeZone: 'America/New_York',
  },
  {
    allDay: false,
    days: ['2026-09-03', '2026-09-04'],
    end: '2026-09-04T02:00:00Z',
    expected: ['2026-09-03'],
    start: '2026-09-04T01:00:00Z',
    timeZone: 'America/Los_Angeles',
  },
  {
    allDay: true,
    days: ['2024-02-28', '2024-02-29', '2024-03-01'],
    end: '2024-03-01',
    expected: ['2024-02-28', '2024-02-29'],
    start: '2024-02-28',
    timeZone: 'UTC',
  },
])('should group $start through $end in $timeZone within visible days', (range) => {
  const source = {...event, allDay: range.allDay, end: range.end, start: range.start}
  const grouped = groupCalendarEvents([source], range.days, range.timeZone)
  expect([...grouped.keys()]).toEqual(range.expected)
  for (const events of grouped.values()) {
    expect(events).toEqual([source])
    expect(events[0]).toBe(source)
  }
})

it('should preserve input order and event identity for overlapping events', () => {
  const second = {...event, id: 'second'}
  expect(
    groupCalendarEvents([event, second], ['2026-09-04'], 'Asia/Seoul').get('2026-09-04'),
  ).toEqual([event, second])
})

it('should leave days empty without events or overlap', () => {
  expect(groupCalendarEvents([], ['2026-09-04'], 'UTC').size).toBe(0)
  expect(groupCalendarEvents([event], ['2026-10-01'], 'UTC').size).toBe(0)
  expect(groupCalendarEvents([event], [], 'UTC').size).toBe(0)
})
