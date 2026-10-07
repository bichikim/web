import {PInput} from 'src/components/p-input/PInput'
import {cx} from 'class-variance-authority'
import {type Accessor, createSignal, Show} from 'solid-js'
import * as m from '@paraglide/message'
import type {CalendarEvent} from '../../features/calendar'
import type {MemoryMemo} from '../../features/memory-assist'
import {useCalendarAlarmController} from '../../features/calendar-alarm'
import {localDateRuntime, type LocalDateRuntime, useLocalDate} from '../../features/civil-date'
import {PButton} from '../p-button/PButton'
const systemNow = () => new Date()
const INPUT_CLASSES = cx(
  'box-border min-h-control-md min-w-0 w-full rounded-panel-inner border border-solid border-border',
  'bg-content-surface px-4 text-base text-foreground outline-none',
  'focus-visible:border-highlight focus-visible:shadow-focus',
)

interface CalendarAlarmDateInputProps {
  readonly clock: Accessor<Date>
  readonly onInput: (value: string) => void
  readonly timeZone: Accessor<string>
  readonly value: Accessor<string>
}

const CalendarAlarmDateInput = (props: CalendarAlarmDateInputProps) => {
  const clock = () => props.clock()
  const timeZone = () => props.timeZone()
  const runtime: LocalDateRuntime = {
    now: clock,
    schedule: localDateRuntime.schedule,
    subscribe: localDateRuntime.subscribe,
  }
  const minimumDate = useLocalDate({runtime, timeZone})

  return (
    <label class="grid gap-1.5 text-sm font-650">
      <span>{m.calendar_alarm_date()}</span>
      <PInput
        unstyled
        class={INPUT_CLASSES}
        min={minimumDate()}
        onInput={(event) => props.onInput(event.currentTarget.value)}
        type="date"
        value={props.value()}
      />
    </label>
  )
}

interface CalendarAlarmControlProps {
  readonly now?: Accessor<Date>
  readonly defaultAlarmDate?: Date
  readonly event: CalendarEvent
  readonly memos: Accessor<ReadonlyArray<MemoryMemo>>
  readonly timeZone?: string
}

export const CalendarAlarmControl = (props: CalendarAlarmControlProps) => {
  const clock = () => (props.now ?? systemNow)()
  const timeZone = () => props.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const [popoverOpen, setPopoverOpen] = createSignal(false)
  const alarm = useCalendarAlarmController({
    clock,
    defaultAlarmDate: () => props.defaultAlarmDate,
    event: () => props.event,
    memos: () => props.memos(),
    timeZone,
  })
  const toggleAlarm = (event: MouseEvent) => {
    event.preventDefault()
    const popover =
      event.currentTarget instanceof HTMLElement
        ? event.currentTarget.ownerDocument.getElementById(alarm.popoverId)
        : null
    const willOpen = popover !== null && !popover.matches(':popover-open')
    alarm.toggle()
    setPopoverOpen(willOpen)
  }

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
          'text-sm leading-5 font-750 outline-none focus-visible:shadow-focus',
          '[anchor-name:var(--pomo-calendar-alarm-anchor)]',
          alarm.active()
            ? 'border-highlight bg-primary-soft text-foreground'
            : 'border-border bg-transparent text-muted-foreground hover:bg-surface-interactive',
        )}
        onClick={toggleAlarm}
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
        onToggle={(event) => setPopoverOpen(event.newState === 'open')}
        popover="auto"
        ref={alarm.setPopoverElement}
        role="dialog"
        style={{'--pomo-calendar-alarm-anchor': alarm.popoverAnchor}}
      >
        <h2 class="m-0 text-base font-750" id={alarm.titleId}>
          {m.calendar_alarm_title()}
        </h2>
        <p class="mb-1 mt-2 truncate text-sm font-700">{props.event.title}</p>
        <p class="mb-4 mt-0 text-sm leading-5 text-muted-foreground">
          {m.calendar_alarm_description()}
        </p>

        <Show when={alarm.legacyAlarm()}>
          <p class="mb-4 mt-0 text-sm text-danger" role="status">
            {m.calendar_alarm_legacy_notice()}
          </p>
        </Show>

        <div class="grid grid-cols-1 gap-3">
          <Show when={popoverOpen()}>
            <CalendarAlarmDateInput
              clock={clock}
              onInput={alarm.setDate}
              timeZone={timeZone}
              value={alarm.date}
            />
          </Show>
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
