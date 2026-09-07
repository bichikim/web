import {type JSX, Show} from 'solid-js'
import * as m from '@paraglide/message'
import {getLocale} from '@paraglide/runtime'

const formatMonth = (month: Date) =>
  new Intl.DateTimeFormat(getLocale(), {month: 'long', year: 'numeric'}).format(month)

interface CalendarHeaderProps {
  readonly month: Date
  readonly onChange: (offset: number) => void
  readonly settings?: JSX.Element
}

export const CalendarHeader = (props: CalendarHeaderProps) => (
  <header class="flex items-center justify-between gap-3">
    <h2 class="m-0 text-lg font-800" id="calendar-month-title">
      {formatMonth(props.month)}
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
          onClick={() => props.onChange(-1)}
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
          onClick={() => props.onChange(1)}
          type="button"
        >
          <span aria-hidden="true" class="i-tabler-chevron-right size-5" />
        </button>
      </nav>
      <Show when={props.settings}>{(settings) => settings()}</Show>
    </div>
  </header>
)
