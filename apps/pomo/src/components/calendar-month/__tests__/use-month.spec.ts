/** @vitest-environment jsdom */
import {renderHook, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'
import type {CalendarEvents, CalendarMonthRange} from 'src/features/calendar'
import type {AuthController} from 'src/features/auth/controller'
import {type MonthEnvironment, useMonth} from '../use-month'

const authentication: AuthController = {
  session: () => ({kind: 'authenticated', provider: 'toss'}),
  state: () => ({kind: 'authenticated', provider: 'toss'}),
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
    now: () => new Date(2024, 1, 29, 12),
    readCache: vi.fn<(range: CalendarMonthRange) => CalendarEvents | null>().mockReturnValue(null),
    reportError: vi.fn<(message: string, error: unknown) => void>(),
    timeZone: () => 'Asia/Seoul',
    writeCache: vi
      .fn<(range: CalendarMonthRange, value: CalendarEvents) => unknown | null>()
      .mockReturnValue(null),
  }) satisfies MonthEnvironment

it('should use explicit time and storage boundaries for leap months and navigation', async () => {
  const environment = createEnvironment()
  const {result} = renderHook(() => useMonth({authentication, environment}))
  expect(result.todayKey).toBe('2024-02-29')
  expect(result.selectedKey()).toBe('2024-02-29')
  expect(
    result
      .days()
      .flat()
      .filter((day) => day !== null),
  ).toHaveLength(29)
  await waitFor(() => expect(result.loading()).toBe(false))
  expect(environment.load).toHaveBeenCalledWith({
    end: new Date(2024, 2, 1).toISOString(),
    start: new Date(2024, 1, 1).toISOString(),
    timeZone: 'Asia/Seoul',
  })
  expect(environment.writeCache).toHaveBeenCalledOnce()
  result.changeMonth(1)
  expect(result.selectedKey()).toBe('2024-03-01')
  await waitFor(() => expect(environment.writeCache).toHaveBeenCalledTimes(2))
  result.selectDate(new Date(2024, 2, 12))
  expect(result.selectedKey()).toBe('2024-03-12')
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
