import {formatLocalDate} from 'src/utils/format-local-date'
import {PInput} from 'src/components/PInput'
import {cx} from 'class-variance-authority'
import {type Accessor, Show} from 'solid-js'
import * as m from '@paraglide/message'
import type {CalendarEvent} from '../features/calendar'
import type {MemoryMemo} from '../features/memory-assist'
import {useCalendarAlarmController} from '../features/calendar-alarm'
import {PButton} from './PButton'
const systemNow = () => new Date()
const INPUT_CLASSES = cx(
  'box-border min-h-control-md min-w-0 w-full rounded-panel-inner border border-solid border-border',
  'bg-content-surface px-4 text-base text-foreground outline-none',
  'focus-visible:border-highlight focus-visible:shadow-focus',
)

interface CalendarAlarmControlProps {
  readonly now?: Accessor<Date>
  readonly defaultAlarmDate?: Date
  readonly event: CalendarEvent
  readonly memos: Accessor<ReadonlyArray<MemoryMemo>>
}

export const CalendarAlarmControl = (props: CalendarAlarmControlProps) => {
  const clock = () => (props.now ?? systemNow)()
  const alarm = useCalendarAlarmController(
    () => props.event,
    () => props.memos(),
    () => props.defaultAlarmDate,
    clock,
  )

  return (
    <>
      <button
        aria-controls={alarm.popoverId}
        aria-haspopup="dialog"
        aria-label={
          alarm.active()
            ? m.calendar_alarm_edit({title: props.event.title})
            : m.calendar_alarm_add({title: props.event.title})
        }
        class={cx(
          'inline-flex min-h-control-sm items-center gap-1.5 rounded-panel-inner border px-2.5',
          'text-modal-detail font-750 outline-none focus-visible:shadow-focus',
          '[anchor-name:var(--pomo-calendar-alarm-anchor)]',
          alarm.active()
            ? 'border-highlight bg-primary-soft text-foreground'
            : 'border-border bg-transparent text-muted-foreground hover:bg-surface-interactive',
        )}
        onClick={(event) => {
          event.preventDefault()
          alarm.toggle()
        }}
        popovertarget={alarm.popoverId}
        style={{'--pomo-calendar-alarm-anchor': alarm.popoverAnchor}}
        type="button"
      >
        <span aria-hidden="true" class="i-tabler-bell size-4" />
        <span>{alarm.active() ? m.calendar_alarm_button_active() : m.calendar_alarm_button()}</span>
      </button>

      <section
        aria-labelledby={alarm.titleId}
        class={cx(
          'fixed inset-auto m-0 mt-2 box-border w-[min(calc(100vw-2rem),20rem)]',
          'rounded-panel border border-border bg-modal-surface p-4 text-foreground shadow-panel',
          'backdrop-blur-surface [position-area:bottom_span-left]',
          '[position-anchor:var(--pomo-calendar-alarm-anchor)]',
        )}
        id={alarm.popoverId}
        popover="auto"
        ref={alarm.setPopoverElement}
        role="dialog"
        style={{'--pomo-calendar-alarm-anchor': alarm.popoverAnchor}}
      >
        <h2 class="m-0 text-base font-750" id={alarm.titleId}>
          {m.calendar_alarm_title()}
        </h2>
        <p class="mb-1 mt-2 truncate text-sm font-700">{props.event.title}</p>
        <p class="mb-4 mt-0 text-modal-detail leading-5 text-muted-foreground">
          {m.calendar_alarm_description()}
        </p>

        <div class="grid grid-cols-1 gap-3">
          <label class="grid gap-1.5 text-sm font-650">
            <span>{m.calendar_alarm_date()}</span>
            <PInput
              unstyled
              class={INPUT_CLASSES}
              min={formatLocalDate(clock())}
              onInput={(event) => alarm.setDate(event.currentTarget.value)}
              type="date"
              value={alarm.date()}
            />
          </label>
          <label class="grid gap-1.5 text-sm font-650">
            <span>{m.calendar_alarm_time()}</span>
            <PInput
              unstyled
              class={INPUT_CLASSES}
              onInput={(event) => alarm.setTime(event.currentTarget.value)}
              type="time"
              value={alarm.time()}
            />
          </label>
        </div>

        <div class="mt-4 grid gap-2">
          <PButton raised class="w-full" disabled={alarm.pending()} onPress={alarm.save}>
            {m.calendar_alarm_save()}
          </PButton>
          <Show when={alarm.storedMemo() !== undefined}>
            <PButton
              bordered
              transparent
              class="w-full"
              disabled={alarm.pending()}
              onPress={alarm.remove}
              tone="danger"
            >
              {m.calendar_alarm_remove()}
            </PButton>
          </Show>
        </div>
        <Show when={alarm.message()}>
          {(currentMessage) => (
            <p aria-live="polite" class="mb-0 mt-3 text-sm text-danger" role="status">
              {currentMessage()}
            </p>
          )}
        </Show>
      </section>
    </>
  )
}
