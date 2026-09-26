/** @vitest-environment jsdom */
import {renderHook, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'
import type {
  CalendarEvents,
  CalendarMonthCacheRange,
  CalendarMonthRange,
} from 'src/features/calendar'
import type {AuthenticatedSession} from 'src/features/auth/machine'
import type {AuthController} from 'src/features/auth/controller'
import {type MonthEnvironment, useMonth} from '../use-month'

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
const createEnvironment = () =>
  ({
    load: vi
      .fn<(range: CalendarMonthRange) => Promise<CalendarEvents>>()
      .mockResolvedValue(emptyCalendar),
    now: () => new Date('2024-02-29T03:00:00.000Z'),
    readCache: vi
      .fn<(range: CalendarMonthCacheRange) => CalendarEvents | null>()
      .mockReturnValue(null),
    reportError: vi.fn<(message: string, error: unknown) => void>(),
    timeZone: () => 'Asia/Seoul',
    writeCache: vi
      .fn<(range: CalendarMonthCacheRange, value: CalendarEvents) => unknown | null>()
      .mockReturnValue(null),
  }) satisfies MonthEnvironment

it('should use explicit time and storage boundaries for leap months and navigation', async () => {
  const environment = createEnvironment()
  const {result} = renderHook(() => useMonth({authentication, environment}))
  expect(result.todayKey()).toBe('2024-02-29')
  expect(result.selectedKey()).toBe('2024-02-29')
  expect(
    result
      .days()
      .flat()
      .filter((day) => day !== null),
  ).toHaveLength(29)
  await waitFor(() => expect(result.loading()).toBe(false))
  expect(environment.load).toHaveBeenCalledWith({
    end: '2024-02-29T15:00:00.000Z',
    start: '2024-01-31T15:00:00.000Z',
    timeZone: 'Asia/Seoul',
  })
  expect(environment.writeCache).toHaveBeenCalledOnce()
  result.changeMonth(1)
  expect(result.selectedKey()).toBe('2024-03-01')
  await waitFor(() => expect(environment.writeCache).toHaveBeenCalledTimes(2))
  result.selectDate(new Date(2024, 2, 12))
  expect(result.selectedKey()).toBe('2024-03-12')
})

it('should use the calendar time zone for today, grid, and month boundaries', async () => {
  vi.stubEnv('TZ', 'UTC')
  try {
    const environment = {
      ...createEnvironment(),
      now: () => new Date('2026-08-31T16:00:00.000Z'),
    }
    const event = {
      accountLabel: 'person@example.com',
      allDay: false,
      calendarLabel: '업무',
      end: '2026-08-31T17:00:00.000Z',
      id: 'midnight-boundary',
      provider: 'google' as const,
      start: '2026-08-31T16:00:00.000Z',
      title: '자정 직후 일정',
    }
    environment.load.mockResolvedValue({...emptyCalendar, events: [event]})
    const {result} = renderHook(() => useMonth({authentication, environment}))

    expect(result.todayKey()).toBe('2026-09-01')
    expect(result.selectedKey()).toBe('2026-09-01')
    expect(
      result
        .days()
        .flat()
        .find((day) => day?.number === 1)?.key,
    ).toBe('2026-09-01')
    await waitFor(() =>
      expect(environment.load).toHaveBeenCalledWith({
        end: '2026-09-30T15:00:00.000Z',
        start: '2026-08-31T15:00:00.000Z',
        timeZone: 'Asia/Seoul',
      }),
    )
    await waitFor(() => expect(result.eventsByDay().get('2026-09-01')).toEqual([event]))
  } finally {
    vi.unstubAllEnvs()
  }
})

it('should update today when the calendar time zone changes', () => {
  vi.stubEnv('TZ', 'UTC')
  try {
    const [timeZone, setTimeZone] = createSignal('Asia/Seoul')
    const environment = {
      ...createEnvironment(),
      now: () => new Date('2026-09-01T20:00:00.000Z'),
      timeZone,
    }
    const view = renderHook(() => useMonth({authentication, environment}))

    expect(view.result.todayKey()).toBe('2026-09-02')
    setTimeZone('America/New_York')
    expect(view.result.todayKey()).toBe('2026-09-01')
    view.cleanup()
  } finally {
    vi.unstubAllEnvs()
  }
})

it('should preserve cached data and report refresh failure through the supplied boundary', async () => {
  const environment = createEnvironment()
  const failure = new Error('offline')
  environment.readCache.mockReturnValue(emptyCalendar)
  environment.load.mockRejectedValue(failure)
  const {result} = renderHook(() => useMonth({authentication, environment}))
  expect(result.calendar()).toBe(emptyCalendar)
  await waitFor(() => expect(result.refreshFailed()).toBe(true))
  expect(result.failed()).toBe(false)
  expect(environment.reportError).toHaveBeenCalledWith('Failed to load calendar month', failure)
  expect(environment.writeCache).not.toHaveBeenCalled()
})

it('should prevent an obsolete request from replacing the refreshed cache', async () => {
  const environment = createEnvironment()
  const pending = Promise.withResolvers<CalendarEvents>()
  environment.load.mockReturnValueOnce(pending.promise)
  const [revision, setRevision] = createSignal(0)
  const {result} = renderHook(() =>
    useMonth({
      authentication,
      environment,
      get revision() {
        return revision()
      },
    }),
  )
  setRevision(1)
  await waitFor(() => expect(environment.writeCache).toHaveBeenCalledOnce())
  pending.resolve({...emptyCalendar, connectedConnections: 2})
  await pending.promise
  expect(result.calendar()).toBe(emptyCalendar)
  expect(environment.writeCache).toHaveBeenCalledOnce()
})

it('should skip storage and network access for an anonymous session', () => {
  const environment = createEnvironment()
  const {result} = renderHook(() =>
    useMonth({
      authentication: {session: () => null, state: () => ({kind: 'anonymous'})},
      environment,
    }),
  )
  expect(result.loginRequired()).toBe(true)
  expect(result.calendar()).toBeNull()
  expect(environment.load).not.toHaveBeenCalled()
  expect(environment.readCache).not.toHaveBeenCalled()
})

it('should fetch without caching when the session has no account identifier', async () => {
  const environment = createEnvironment()
  const {result} = renderHook(() =>
    useMonth({
      authentication: {
        session: () => ({kind: 'authenticated', provider: 'toss'}),
        state: () => ({kind: 'authenticated', provider: 'toss'}),
      },
      environment,
    }),
  )
  await waitFor(() => expect(result.calendar()).toEqual(emptyCalendar))
  expect(environment.readCache).not.toHaveBeenCalled()
  expect(environment.writeCache).not.toHaveBeenCalled()
})

it('should not write an account A response into account B cache after switching accounts', async () => {
  const environment = createEnvironment()
  const pending = Promise.withResolvers<CalendarEvents>()
  environment.load.mockReturnValueOnce(pending.promise)
  const [session, setSession] = createSignal<AuthenticatedSession>({
    email: 'a@example.com',
    kind: 'authenticated',
    provider: 'email',
  })
  const {result} = renderHook(() =>
    useMonth({
      authentication: {session, state: session},
      environment,
    }),
  )
  setSession({email: 'b@example.com', kind: 'authenticated', provider: 'email'})
  await waitFor(() => expect(environment.writeCache).toHaveBeenCalledOnce())
  expect(environment.writeCache).toHaveBeenCalledWith(
    expect.objectContaining({accountKey: 'email:b@example.com'}),
    emptyCalendar,
  )
  pending.resolve({...emptyCalendar, connectedConnections: 2})
  await pending.promise
  expect(result.calendar()).toEqual(emptyCalendar)
  expect(environment.writeCache).toHaveBeenCalledOnce()
})

it('should discard loaded events when an unidentified session is replaced', async () => {
  const environment = createEnvironment()
  const [session, setSession] = createSignal<AuthenticatedSession>({
    kind: 'authenticated',
    provider: 'toss',
  })
  const {result} = renderHook(() =>
    useMonth({
      authentication: {session, state: session},
      environment,
    }),
  )
  await waitFor(() => expect(result.calendar()).toEqual(emptyCalendar))
  const pending = Promise.withResolvers<CalendarEvents>()
  environment.load.mockReturnValueOnce(pending.promise)
  setSession({kind: 'authenticated', provider: 'toss'})
  expect(result.calendar()).toBeNull()
  pending.reject(new Error('offline'))
  await waitFor(() => expect(result.failed()).toBe(true))
  expect(result.calendar()).toBeNull()
})
