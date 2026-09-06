import {For, Show} from 'solid-js'
import * as m from '@paraglide/message'
import {getLocale} from '@paraglide/runtime'
import {type CalendarEvent, type CalendarEvents} from '../../features/calendar'
import {useMemoryMemos} from '../../features/memory-assist'
import {CalendarAlarmControl} from '../CalendarAlarmControl'
import {formatDate} from './dates'

const formatEventTime = (event: CalendarEvent, timeZone: string) =>
  event.allDay
    ? m.calendar_event_all_day()
    : new Intl.DateTimeFormat(getLocale(), {
        hour: 'numeric',
        minute: '2-digit',
        timeZone,
      }).format(new Date(event.start))

interface CalendarAgendaProps {
  readonly calendar: CalendarEvents | null
  readonly failed: boolean
  readonly loginRequired: boolean
  readonly loading: boolean
  readonly memos: ReturnType<typeof useMemoryMemos>
  readonly refreshFailed: boolean
  readonly selectedDate: Date
  readonly selectedEvents: ReadonlyArray<CalendarEvent>
}

export const CalendarAgenda = (props: CalendarAgendaProps) => (
  <section class="grid gap-3 border-t border-border pt-4" aria-labelledby="calendar-day-title">
    <h3 class="m-0 text-sm font-750" id="calendar-day-title">
      {formatDate(props.selectedDate)}
    </h3>
    <Show
      when={!props.loginRequired}
      fallback={<p class="m-0 text-sm">{m.calendar_events_login_required()}</p>}
    >
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
    </Show>
  </section>
)
