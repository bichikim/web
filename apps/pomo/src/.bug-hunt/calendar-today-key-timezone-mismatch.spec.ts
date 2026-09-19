/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {
  CalendarEvents,
  CalendarMonthCacheRange,
  CalendarMonthRange,
} from 'src/features/calendar'
import type {AuthController} from 'src/features/auth/controller'
import {type MonthEnvironment, useMonth} from '../components/calendar-month/use-month'

const authentication: AuthController = {
  session: () => ({email: 'person@example.com', kind: 'authenticated', provider: 'email'}),
  state: () => ({email: 'person@example.com', kind: 'authenticated', provider: 'email'}),
}

const emptyCalendar: CalendarEvents = {
  connectedConnections: 1,
  events: [],
  timeZone: 'Asia/Seoul',
  truncated: false,
  unavailableConnections: 0,
}

const createEnvironment = (now: Date): MonthEnvironment =>
  ({
    load: vi
      .fn<(range: CalendarMonthRange) => Promise<CalendarEvents>>()
      .mockResolvedValue(emptyCalendar),
    now: () => now,
    readCache: vi
      .fn<(range: CalendarMonthCacheRange) => CalendarEvents | null>()
      .mockReturnValue(null),
    reportError: vi.fn<(message: string, error: unknown) => void>(),
    timeZone: () => 'Asia/Seoul',
    writeCache: vi
      .fn<(range: CalendarMonthCacheRange, value: CalendarEvents) => unknown | null>()
      .mockReturnValue(null),
  }) satisfies MonthEnvironment

/**
 * useMonth groups events in Asia/Seoul but todayKey/month grid use browser-local civil dates.
 *
 * @see apps/pomo/src/components/calendar-month/use-month.ts L108-118
 * @see apps/pomo/src/utils/format-local-date/index.ts L3-4
 */
describe('bug-hunt: calendar todayKey timezone mismatch', () => {
  const previousTimeZone = process.env.TZ

  beforeEach(() => {
    process.env.TZ = 'UTC'
  })

  afterEach(() => {
    process.env.TZ = previousTimeZone
  })

  it('should use Asia/Seoul civil date for todayKey when environment timeZone is Asia/Seoul', () => {
    const seoulMidnightInstant = new Date('2026-08-31T16:00:00.000Z')
    const environment = createEnvironment(seoulMidnightInstant)
    const {result} = renderHook(() => useMonth({authentication, environment}))

    expect(result.todayKey()).toBe('2026-09-01')
    expect(result.selectedKey()).toBe('2026-09-01')
    expect(result.month().getUTCMonth()).toBe(8)
  })
})
