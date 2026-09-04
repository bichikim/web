/** @vitest-environment jsdom */

import {beforeEach, expect, it} from 'vitest'

import type {CalendarEvents} from '../client'
import {readCalendarMonthCache, writeCalendarMonthCache} from '../month-cache'

const range = {
  end: '2026-09-30T15:00:00.000Z',
  start: '2026-08-31T15:00:00.000Z',
  timeZone: 'Asia/Seoul',
}
const calendar: CalendarEvents = {
  connectedConnections: 1,
  events: [],
  timeZone: 'Asia/Seoul',
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
