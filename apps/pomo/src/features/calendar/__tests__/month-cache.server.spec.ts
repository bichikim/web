import {afterEach, expect, it} from 'vitest'

import {
  clearCalendarMonthCache,
  readCalendarMonthCache,
  writeCalendarMonthCache,
} from '../month-cache'

const range = {
  end: '2026-09-30T15:00:00.000Z',
  start: '2026-08-31T15:00:00.000Z',
  timeZone: 'Asia/Seoul',
}
const calendar = {
  connectedConnections: 1,
  events: [],
  timeZone: 'Asia/Seoul',
  unavailableConnections: 0,
}

const originalSessionStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')

afterEach(() => {
  if (originalSessionStorage === undefined) {
    Reflect.deleteProperty(globalThis, 'sessionStorage')
    return
  }

  Object.defineProperty(globalThis, 'sessionStorage', originalSessionStorage)
})

it('should treat the browser cache as unavailable during server rendering', () => {
  Reflect.deleteProperty(globalThis, 'sessionStorage')

  expect(readCalendarMonthCache(range)).toBeNull()
  expect(writeCalendarMonthCache(range, calendar)).toBeNull()
  expect(clearCalendarMonthCache()).toBeNull()
})
