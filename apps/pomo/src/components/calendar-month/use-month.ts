import dayjs from 'dayjs'
import {type Accessor, createEffect, createMemo, createResource, createSignal} from 'solid-js'
import {
  type CalendarEvent,
  type CalendarEvents,
  type CalendarMonthCacheRange,
  type CalendarMonthRange,
  groupCalendarEvents,
} from 'src/features/calendar'
import type {AuthController} from 'src/features/auth/controller'
import {type CalendarDay, WEEK_LENGTH} from './dates'

export interface MonthEnvironment {
  readonly load: (range: CalendarMonthRange) => Promise<CalendarEvents>
  readonly now: () => Date
  readonly readCache: (range: CalendarMonthCacheRange) => CalendarEvents | null
  readonly reportError: (message: string, error: unknown) => void
  readonly timeZone: () => string
  readonly writeCache: (range: CalendarMonthCacheRange, value: CalendarEvents) => unknown | null
}

export interface UseMonthProps {
  readonly authentication: AuthController
  readonly environment: MonthEnvironment
  readonly revision?: number
}

export interface MonthController {
  readonly calendar: Accessor<CalendarEvents | null>
  readonly changeMonth: (offset: number) => void
  readonly days: Accessor<ReadonlyArray<ReadonlyArray<CalendarDay | null>>>
  readonly eventsByDay: Accessor<ReadonlyMap<string, ReadonlyArray<CalendarEvent>>>
  readonly failed: Accessor<boolean>
  readonly loading: Accessor<boolean>
  readonly loginRequired: Accessor<boolean>
  readonly month: Accessor<Date>
  readonly refreshFailed: Accessor<boolean>
  readonly selectedDate: Accessor<Date>
  readonly selectedEvents: Accessor<ReadonlyArray<CalendarEvent>>
  readonly selectedKey: Accessor<string>
  readonly selectDate: (date: Date) => void
  readonly todayKey: string
}

interface LoadedCalendarMonth {
  readonly kind: 'loaded'
  readonly requestKey: string
  readonly value: CalendarEvents
}

interface FailedCalendarMonth {
  readonly kind: 'failed'
  readonly requestKey: string
}

type CalendarMonthResult = FailedCalendarMonth | LoadedCalendarMonth

interface CalendarMonthRequest {
  readonly range: CalendarMonthRange
  readonly requestKey: string
  readonly revision: number
}

const createLocalDateKey = (date: Date) => dayjs(date).format('YYYY-MM-DD')

const createMonthDays = (month: Date): ReadonlyArray<ReadonlyArray<CalendarDay | null>> => {
  const start = dayjs(month).startOf('month')
  const daysInMonth = start.daysInMonth()
  const leadingDays = start.day()
  const occupiedDays = leadingDays + daysInMonth
  const trailingDays = (WEEK_LENGTH - (occupiedDays % WEEK_LENGTH)) % WEEK_LENGTH
  const cells: ReadonlyArray<CalendarDay | null> = [
    ...Array.from({length: leadingDays}, () => null),
    ...Array.from({length: daysInMonth}, (_, index) => {
      const number = index + 1
      const date = start.date(number).toDate()
      return {date, key: createLocalDateKey(date), number}
    }),
    ...Array.from({length: trailingDays}, () => null),
  ]
  return Array.from({length: cells.length / WEEK_LENGTH}, (_, index) =>
    cells.slice(index * WEEK_LENGTH, (index + 1) * WEEK_LENGTH),
  )
}

const loadCalendarMonth = async (
  request: CalendarMonthRequest,
  environment: MonthEnvironment,
): Promise<CalendarMonthResult> => {
  try {
    const value = await environment.load(request.range)
    return {kind: 'loaded', requestKey: request.requestKey, value}
  } catch (error: unknown) {
    environment.reportError('Failed to load calendar month', error)
    return {kind: 'failed', requestKey: request.requestKey}
  }
}

export const useMonth = (props: UseMonthProps): MonthController => {
  const accountKey = createMemo(() => {
    const session = props.authentication.session()
    return session?.provider === 'email' ? `email:${session.email}` : null
  })
  const sessionRevision = createMemo((revision: number) => {
    props.authentication.session()
    return revision + 1
  }, 0)
  const today = props.environment.now()
  const [month, setMonth] = createSignal(dayjs(today).startOf('month').toDate())
  const [selectedDate, setSelectedDate] = createSignal(new Date(today))
  const monthRange = createMemo(() => {
    const currentMonth = month()
    const start = dayjs(currentMonth).startOf('month').toDate()
    const end = dayjs(start).add(1, 'month').toDate()
    const range = {
      end: end.toISOString(),
      start: start.toISOString(),
      timeZone: props.environment.timeZone(),
    }
    const revision = props.revision ?? 0
    return {
      range,
      requestKey: JSON.stringify([
        range.start,
        range.end,
        range.timeZone,
        revision,
        sessionRevision(),
      ]),
      revision,
    }
  })
  const [calendarResult] = createResource<CalendarMonthResult | null, CalendarMonthRequest>(
    () => (props.authentication.session() === null ? false : monthRange()),
    (request) => loadCalendarMonth(request, props.environment),
    {initialValue: null},
  )
  const cacheRange = createMemo(() => {
    const key = accountKey()
    return key === null ? null : {...monthRange().range, accountKey: key}
  })
  const cachedCalendar = createMemo(() => {
    const range = cacheRange()
    return range === null ? null : props.environment.readCache(range)
  })
  let lastCachedResult: LoadedCalendarMonth | null = null
  createEffect(() => {
    const request = monthRange()
    const range = cacheRange()
    const result = calendarResult.latest
    if (
      range === null ||
      props.authentication.session() === null ||
      result?.kind !== 'loaded' ||
      result.requestKey !== request.requestKey ||
      result === lastCachedResult
    ) {
      return
    }

    lastCachedResult = result
    const cacheError = props.environment.writeCache(range, result.value)
    if (cacheError !== null) {
      props.environment.reportError('Failed to cache calendar month', cacheError)
    }
  })
  const calendar = createMemo(() => {
    if (props.authentication.session() === null) {
      return null
    }
    const request = monthRange()
    const result = calendarResult.latest
    return result?.kind === 'loaded' && result.requestKey === request.requestKey
      ? result.value
      : cachedCalendar()
  })
  const days = createMemo(() => createMonthDays(month()))
  const eventsByDay = createMemo(() => {
    const result = calendar()
    const grouped = new Map<string, ReadonlyArray<CalendarEvent>>()
    if (result === null) {
      return grouped
    }

    const visibleDates = days().flatMap((week) =>
      week.flatMap((day) => (day === null ? [] : [day.key])),
    )
    return groupCalendarEvents(result.events, visibleDates, result.timeZone)
  })
  const selectedKey = createMemo(() => createLocalDateKey(selectedDate()))
  const selectedEvents = createMemo(() => eventsByDay().get(selectedKey()) ?? [])
  const todayKey = createLocalDateKey(today)
  const refreshFailed = createMemo(() => {
    const result = calendarResult.latest
    return (
      result?.kind === 'failed' &&
      result.requestKey === monthRange().requestKey &&
      cachedCalendar() !== null
    )
  })

  const changeMonth = (offset: number) => {
    const currentMonth = month()
    const nextMonth = dayjs(currentMonth).startOf('month').add(offset, 'month').toDate()
    setMonth(nextMonth)
    setSelectedDate(nextMonth)
  }

  return {
    calendar,
    changeMonth,
    days,
    eventsByDay,
    failed: () =>
      props.authentication.state().kind === 'unavailable' ||
      (calendarResult.latest?.kind === 'failed' && calendar() === null),
    loading: () =>
      props.authentication.state().kind === 'checking' ||
      (calendarResult.loading && calendar() === null),
    loginRequired: () => props.authentication.state().kind === 'anonymous',
    month,
    refreshFailed,
    selectDate: setSelectedDate,
    selectedDate,
    selectedEvents,
    selectedKey,
    todayKey,
  }
}
