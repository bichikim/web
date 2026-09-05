import {cx} from 'class-variance-authority'
import {createEffect, createMemo, createResource, createSignal, For, type JSX, Show} from 'solid-js'

import * as m from '@paraglide/message'
import {getLocale} from '@paraglide/runtime'

import {
  type CalendarEvent,
  type CalendarEvents,
  type CalendarMonthRange,
  listCalendarEvents,
  readCalendarMonthCache,
  writeCalendarMonthCache,
} from '../features/calendar'
import {useMemoryMemos} from '../features/memory-assist'
import {CalendarAlarmControl} from './CalendarAlarmControl'

interface CalendarDay {
  readonly date: Date
  readonly key: string
  readonly number: number
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
type EventsByDay = ReadonlyMap<string, ReadonlyArray<CalendarEvent>>

interface CalendarMonthRequest {
  readonly range: CalendarMonthRange
  readonly requestKey: string
  readonly revision: number
}

const WEEK_LENGTH = 7
const DATE_KEY_LENGTH = 10
const WEEKDAY_REFERENCE_YEAR = 2024
const FIRST_SUNDAY_DATE = 7

const padNumber = (value: number) => String(value).padStart(2, '0')
const createLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`

const readDatePart = (parts: ReadonlyArray<Intl.DateTimeFormatPart>, type: string) =>
  parts.find((part) => part.type === type)?.value ?? ''

const createZonedDateKey = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: '2-digit',
    timeZone,
    year: 'numeric',
  }).formatToParts(date)
  return `${readDatePart(parts, 'year')}-${readDatePart(parts, 'month')}-${readDatePart(parts, 'day')}`
}

const createEventDateKey = (event: CalendarEvent, timeZone: string) =>
  event.allDay
    ? event.start.slice(0, DATE_KEY_LENGTH)
    : createZonedDateKey(new Date(event.start), timeZone)

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

const formatMonth = (month: Date) =>
  new Intl.DateTimeFormat(getLocale(), {month: 'long', year: 'numeric'}).format(month)
const formatDate = (date: Date) =>
  new Intl.DateTimeFormat(getLocale(), {day: 'numeric', month: 'long', year: 'numeric'}).format(
    date,
  )
const formatEventTime = (event: CalendarEvent, timeZone: string) =>
  event.allDay
    ? m.calendar_event_all_day()
    : new Intl.DateTimeFormat(getLocale(), {
        hour: 'numeric',
        minute: '2-digit',
        timeZone,
      }).format(new Date(event.start))

const getWeekdayLabels = () =>
  Array.from({length: WEEK_LENGTH}, (_, index) =>
    new Intl.DateTimeFormat(getLocale(), {weekday: 'short'}).format(
      new Date(WEEKDAY_REFERENCE_YEAR, 0, FIRST_SUNDAY_DATE + index),
    ),
  )

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

interface CalendarGridProps {
  readonly days: ReadonlyArray<ReadonlyArray<CalendarDay | null>>
  readonly eventsByDay: EventsByDay
  readonly onSelect: (date: Date) => void
  readonly selectedKey: string
  readonly todayKey: string
}

const CalendarGrid = (props: CalendarGridProps) => (
  <div aria-labelledby="calendar-month-title" class="grid grid-cols-7 gap-1" role="grid">
    <div class="contents" role="row">
      <For each={getWeekdayLabels()}>
        {(label) => (
          <span class="py-1 text-center text-xs font-700 text-muted-foreground" role="columnheader">
            {label}
          </span>
        )}
      </For>
    </div>
    <For each={props.days}>
      {(week) => (
        <div class="contents" role="row">
          <For each={week}>
            {(day) => (
              <div class="min-w-0" role="gridcell">
                <Show when={day}>
                  {(visibleDay) => {
                    const dayEvents = () => props.eventsByDay.get(visibleDay().key) ?? []
                    const firstEvent = () => dayEvents()[0]
                    const isSelected = () => visibleDay().key === props.selectedKey
                    return (
                      <button
                        aria-current={visibleDay().key === props.todayKey ? 'date' : undefined}
                        aria-label={m.calendar_day_label({
                          count: dayEvents().length,
                          date: formatDate(visibleDay().date),
                        })}
                        aria-pressed={isSelected()}
                        class={cx(
                          'grid min-h-16 w-full grid-rows-[auto_1fr] place-items-center gap-1',
                          'rounded-panel-inner border p-1',
                          'text-sm font-700 outline-none focus-visible:shadow-focus',
                          isSelected()
                            ? 'border-highlight bg-primary-soft text-foreground'
                            : 'border-transparent text-foreground hover:bg-content-surface',
                        )}
                        onClick={() => props.onSelect(visibleDay().date)}
                        type="button"
                      >
                        <span>{visibleDay().number}</span>
                        <Show when={firstEvent()}>
                          {(event) => (
                            <span
                              aria-hidden="true"
                              class="flex w-full min-w-0 items-center justify-center gap-0.5 text-[0.625rem] leading-4"
                            >
                              <span class="truncate font-650 text-muted-foreground">
                                {event().title}
                              </span>
                              <Show when={dayEvents().length > 1}>
                                <span class="flex-none text-highlight">
                                  +{dayEvents().length - 1}
                                </span>
                              </Show>
                            </span>
                          )}
                        </Show>
                      </button>
                    )
                  }}
                </Show>
              </div>
            )}
          </For>
        </div>
      )}
    </For>
  </div>
)

interface CalendarAgendaProps {
  readonly calendar: CalendarEvents | null
  readonly failed: boolean
  readonly loading: boolean
  readonly memos: ReturnType<typeof useMemoryMemos>
  readonly refreshFailed: boolean
  readonly selectedDate: Date
  readonly selectedEvents: ReadonlyArray<CalendarEvent>
}

const CalendarAgenda = (props: CalendarAgendaProps) => (
  <section class="grid gap-3 border-t border-border pt-4" aria-labelledby="calendar-day-title">
    <h3 class="m-0 text-sm font-750" id="calendar-day-title">
      {formatDate(props.selectedDate)}
    </h3>
    <Show when={!props.loading} fallback={<p class="m-0 text-sm">{m.calendar_loading()}</p>}>
      <Show when={!props.failed} fallback={<p role="alert">{m.calendar_events_failed()}</p>}>
        <Show
          when={(props.calendar?.connectedConnections ?? 0) > 0}
          fallback={<p class="m-0 text-sm">{m.calendar_events_connect_required()}</p>}
        >
          <Show
            when={props.selectedEvents.length > 0}
            fallback={<p class="m-0 text-sm text-muted-foreground">{m.calendar_day_empty()}</p>}
          >
            <ul
              aria-labelledby="calendar-day-title"
              class={
                'm-0 grid max-h-[min(18rem,35dvh)] list-none gap-2 overflow-y-auto ' +
                'overscroll-contain p-0 pr-1 outline-none [scrollbar-gutter:stable] ' +
                'focus-visible:shadow-focus'
              }
              tabIndex={0}
            >
              <For each={props.selectedEvents}>
                {(event) => (
                  <li
                    class={
                      'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 ' +
                      'rounded-panel-inner bg-content-surface px-3 py-2.5'
                    }
                  >
                    <span class="text-xs font-750 text-highlight">
                      {formatEventTime(event, props.calendar?.timeZone ?? 'UTC')}
                    </span>
                    <div class="min-w-0">
                      <p class="m-0 truncate text-sm font-750">{event.title}</p>
                      <p class="mb-0 mt-1 truncate text-xs text-muted-foreground">
                        {event.calendarLabel} · {event.accountLabel}
                      </p>
                    </div>
                    <CalendarAlarmControl event={event} memos={props.memos} />
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </Show>
      </Show>
    </Show>
    <Show when={props.calendar?.truncated}>
      <p class="m-0 text-xs leading-5 text-muted-foreground" role="status">
        {m.calendar_events_truncated()}
      </p>
    </Show>
    <Show when={(props.calendar?.unavailableConnections ?? 0) > 0}>
      <p class="m-0 text-xs leading-5 text-muted-foreground" role="status">
        {m.calendar_events_partial()}
      </p>
    </Show>
    <Show when={props.refreshFailed}>
      <p class="m-0 text-xs leading-5 text-muted-foreground" role="status">
        {m.calendar_refresh_failed()}
      </p>
    </Show>
  </section>
)

export const CalendarMonth = (props: CalendarMonthProps) => {
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
      requestKey: JSON.stringify([range.start, range.end, range.timeZone, revision]),
      revision,
    }
  })
  const [calendarResult] = createResource(monthRange, loadCalendarMonth)
  const cachedCalendar = createMemo(() => readCalendarMonthCache(monthRange().range))
  let lastCachedResult: LoadedCalendarMonth | null = null
  createEffect(() => {
    const request = monthRange()
    const result = calendarResult()
    if (
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

    for (const event of result.events) {
      const key = createEventDateKey(event, result.timeZone)
      grouped.set(key, [...(grouped.get(key) ?? []), event])
    }
    return grouped
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
      <header class="flex items-center justify-between gap-3">
        <h2 class="m-0 text-lg font-800" id="calendar-month-title">
          {formatMonth(month())}
        </h2>
        <div class="flex items-center gap-2">
          <nav aria-label={m.calendar_month_navigation()} class="flex gap-2">
            <button
              aria-label={m.calendar_month_previous()}
              class={
                'grid size-9 place-items-center rounded-control border border-border ' +
                'bg-content-surface text-foreground outline-none hover:border-border-hover ' +
                'hover:bg-surface-interactive focus-visible:shadow-focus'
              }
              onClick={() => changeMonth(-1)}
              type="button"
            >
              <span aria-hidden="true" class="i-tabler-chevron-left size-5" />
            </button>
            <button
              aria-label={m.calendar_month_next()}
              class={
                'grid size-9 place-items-center rounded-control border border-border ' +
                'bg-content-surface text-foreground outline-none hover:border-border-hover ' +
                'hover:bg-surface-interactive focus-visible:shadow-focus'
              }
              onClick={() => changeMonth(1)}
              type="button"
            >
              <span aria-hidden="true" class="i-tabler-chevron-right size-5" />
            </button>
          </nav>
          <Show when={props.settings}>{(settings) => settings()}</Show>
        </div>
      </header>

      <CalendarGrid
        days={days()}
        eventsByDay={eventsByDay()}
        onSelect={setSelectedDate}
        selectedKey={selectedKey()}
        todayKey={todayKey}
      />
      <CalendarAgenda
        calendar={calendar()}
        failed={calendarResult()?.kind === 'failed' && calendar() === null}
        loading={calendarResult.loading && calendar() === null}
        memos={memos}
        refreshFailed={refreshFailed()}
        selectedDate={selectedDate()}
        selectedEvents={selectedEvents()}
      />
    </section>
  )
}
