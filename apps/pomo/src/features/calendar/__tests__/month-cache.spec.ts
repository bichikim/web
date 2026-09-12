/** @vitest-environment jsdom */

import {beforeEach, expect, it} from 'vitest'

import type {CalendarEvents} from '../client'
import {readCalendarMonthCache, writeCalendarMonthCache} from '../month-cache'

const range = {
  accountKey: 'email:a@example.com',
  end: '2026-09-30T15:00:00.000Z',
  start: '2026-08-31T15:00:00.000Z',
  timeZone: 'Asia/Seoul',
}
const calendar: CalendarEvents = {
  connectedConnections: 1,
  events: [],
  timeZone: 'Asia/Seoul',
  truncated: false,
  unavailableConnections: 0,
}

beforeEach(() => {
  sessionStorage.clear()
})

it('should restore a calendar month only for the same range and time zone', () => {
  expect(writeCalendarMonthCache(range, calendar)).toBeNull()

  expect(readCalendarMonthCache(range)).toEqual(calendar)
  expect(readCalendarMonthCache({...range, timeZone: 'UTC'})).toBeNull()
})

it('should ignore a malformed calendar cache', () => {
  sessionStorage.setItem('pomo:calendar-month-cache:v1', '{bad')

  expect(readCalendarMonthCache(range)).toBeNull()
})

it('should preserve truncation when restoring cached events', () => {
  writeCalendarMonthCache(range, {...calendar, truncated: true})
  expect(readCalendarMonthCache(range)?.truncated).toBe(true)
})

it('should isolate the same month between accounts', () => {
  writeCalendarMonthCache(range, calendar)
  const otherRange = {...range, accountKey: 'email:b@example.com'}
  expect(readCalendarMonthCache(otherRange)).toBeNull()
  const otherCalendar = {...calendar, connectedConnections: 2}
  writeCalendarMonthCache(otherRange, otherCalendar)
  expect(readCalendarMonthCache(range)).toEqual(calendar)
  expect(readCalendarMonthCache(otherRange)).toEqual(otherCalendar)
})

it('should ignore legacy entries without an account', () => {
  sessionStorage.setItem(
    'pomo:calendar-month-cache:v1',
    JSON.stringify({
      entries: [{key: JSON.stringify([range.start, range.end, range.timeZone]), value: calendar}],
      version: 1,
    }),
  )
  expect(readCalendarMonthCache(range)).toBeNull()
})

it('should ignore account-scoped version 2 entries with unscoped Google event IDs', () => {
  sessionStorage.setItem(
    'pomo:calendar-month-cache:v1',
    JSON.stringify({
      entries: [
        {
          key: JSON.stringify([range.accountKey, range.start, range.end, range.timeZone]),
          value: calendar,
        },
      ],
      version: 2,
    }),
  )
  expect(readCalendarMonthCache(range)).toBeNull()
})
