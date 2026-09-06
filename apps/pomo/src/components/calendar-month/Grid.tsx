import {cx} from 'class-variance-authority'
import {For, Show} from 'solid-js'
import * as m from '@paraglide/message'
import {getLocale} from '@paraglide/runtime'
import {type CalendarEvent} from '../../features/calendar'
import {type CalendarDay, formatDate, WEEK_LENGTH} from './dates'

type EventsByDay = ReadonlyMap<string, ReadonlyArray<CalendarEvent>>

const WEEKDAY_REFERENCE_YEAR = 2024

const FIRST_SUNDAY_DATE = 7

const getWeekdayLabels = () =>
  Array.from({length: WEEK_LENGTH}, (_, index) =>
    new Intl.DateTimeFormat(getLocale(), {weekday: 'short'}).format(
      new Date(WEEKDAY_REFERENCE_YEAR, 0, FIRST_SUNDAY_DATE + index),
    ),
  )

interface CalendarGridProps {
  readonly days: ReadonlyArray<ReadonlyArray<CalendarDay | null>>
  readonly eventsByDay: EventsByDay
  readonly onSelect: (date: Date) => void
  readonly selectedKey: string
  readonly todayKey: string
}

export const CalendarGrid = (props: CalendarGridProps) => (
  <div aria-labelledby="calendar-month-title" class="grid grid-cols-7 gap-1" role="grid">
    <div class="contents" role="row">
      <For each={getWeekdayLabels()}>
        {(label) => (
          <span
            class="py-1 text-center text-modal-detail font-700 text-muted-foreground"
            role="columnheader"
          >
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
                              class="flex w-full min-w-0 items-center justify-center gap-0.5 text-modal-detail"
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
