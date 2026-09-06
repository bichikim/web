import {createEffect, createMemo, createResource, createSignal, type JSX} from 'solid-js'
import {
  type CalendarEvent,
  type CalendarEvents,
  type CalendarMonthRange,
  groupCalendarEvents,
  listCalendarEvents,
  readCalendarMonthCache,
  writeCalendarMonthCache,
} from '../features/calendar'
import {useAuth} from '../features/auth/AuthProvider'
import {useMemoryMemos} from '../features/memory-assist'
import {type CalendarDay, WEEK_LENGTH} from './calendar-month/dates'
import {CalendarHeader} from './calendar-month/Header'
import {CalendarGrid} from './calendar-month/Grid'
import {CalendarAgenda} from './calendar-month/Agenda'

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

const padNumber = (value: number) => String(value).padStart(2, '0')

const createLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`

const createMonthDays = (month: Date): ReadonlyArray<ReadonlyArray<CalendarDay | null>> => {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const leadingDays = new Date(year, monthIndex, 1).getDay()
  const occupiedDays = leadingDays + daysInMonth
  const trailingDays = (WEEK_LENGTH - (occupiedDays % WEEK_LENGTH)) % WEEK_LENGTH
  const cells: ReadonlyArray<CalendarDay | null> = [
    ...Array.from({length: leadingDays}, () => null),
    ...Array.from({length: daysInMonth}, (_, index) => {
      const number = index + 1
      const date = new Date(year, monthIndex, number)
      return {date, key: createLocalDateKey(date), number}
    }),
    ...Array.from({length: trailingDays}, () => null),
  ]
  return Array.from({length: cells.length / WEEK_LENGTH}, (_, index) =>
    cells.slice(index * WEEK_LENGTH, (index + 1) * WEEK_LENGTH),
  )
}

const loadCalendarMonth = async (request: CalendarMonthRequest): Promise<CalendarMonthResult> => {
  try {
    const value = await listCalendarEvents(request.range)
    return {kind: 'loaded', requestKey: request.requestKey, value}
  } catch (error: unknown) {
    console.error('Failed to load calendar month', error)
    return {kind: 'failed', requestKey: request.requestKey}
  }
}

interface CalendarMonthProps {
  readonly revision?: number
  readonly settings?: JSX.Element
}

export const CalendarMonth = (props: CalendarMonthProps) => {
  const authentication = useAuth()
  const accountKey = createMemo(() => {
    const session = authentication.session()
    return session?.provider === 'email' ? session.email : (session?.provider ?? null)
  })
  const sessionRevision = createMemo((revision: number) => {
    accountKey()
    return revision + 1
  }, 0)
  const today = new Date()
  const memos = useMemoryMemos()
  const [month, setMonth] = createSignal(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = createSignal(new Date(today))
  const monthRange = createMemo(() => {
    const currentMonth = month()
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    const range = {
      end: end.toISOString(),
      start: start.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
  const [calendarResult] = createResource(
    () => (authentication.session() === null ? false : monthRange()),
    loadCalendarMonth,
  )
  const cachedCalendar = createMemo(() =>
    accountKey() === null ? null : readCalendarMonthCache(monthRange().range),
  )
  let lastCachedResult: LoadedCalendarMonth | null = null
  createEffect(() => {
    const request = monthRange()
    const result = calendarResult()
    if (
      authentication.session() === null ||
      result?.kind !== 'loaded' ||
      result.requestKey !== request.requestKey ||
      result === lastCachedResult
    ) {
      return
    }

    lastCachedResult = result
    const cacheError = writeCalendarMonthCache(request.range, result.value)
    if (cacheError !== null) {
      console.error('Failed to cache calendar month', cacheError)
    }
  })
  const calendar = createMemo(() => {
    if (authentication.session() === null) {
      return null
    }
    const request = monthRange()
    const result = calendarResult()
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
    const result = calendarResult()
    return (
      result?.kind === 'failed' &&
      result.requestKey === monthRange().requestKey &&
      cachedCalendar() !== null
    )
  })

  const changeMonth = (offset: number) => {
    const currentMonth = month()
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1)
    setMonth(nextMonth)
    setSelectedDate(nextMonth)
  }

  return (
    <section aria-labelledby="calendar-month-title" class="grid gap-4">
      <CalendarHeader month={month()} onChange={changeMonth} settings={props.settings} />

      <CalendarGrid
        days={days()}
        eventsByDay={eventsByDay()}
        onSelect={setSelectedDate}
        selectedKey={selectedKey()}
        todayKey={todayKey}
      />
      <CalendarAgenda
        calendar={calendar()}
        failed={
          authentication.state().kind === 'unavailable' ||
          (calendarResult()?.kind === 'failed' && calendar() === null)
        }
        loginRequired={authentication.state().kind === 'anonymous'}
        loading={
          authentication.state().kind === 'checking' ||
          (calendarResult.loading && calendar() === null)
        }
        memos={memos}
        refreshFailed={refreshFailed()}
        selectedDate={selectedDate()}
        selectedEvents={selectedEvents()}
      />
    </section>
  )
}
