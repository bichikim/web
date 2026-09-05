import {cx} from 'class-variance-authority'
import {type Accessor, createMemo, createSignal, createUniqueId, type Setter, Show} from 'solid-js'

import * as m from '@paraglide/message'

import type {CalendarEvent} from '../features/calendar'
import {usePEvents} from '../features/focus-room-dialogue'
import {createMemoryMemo, type MemoryMemo, updateMemoryMemos} from '../features/memory-assist'
import {PButton} from './PButton'

const CALENDAR_ALARM_ID_PREFIX = 'calendar-alarm:'
const ALL_DAY_ALARM_HOUR = 9
const DATE_KEY_LENGTH = 10

const INPUT_CLASSES = cx(
  'box-border min-h-control-md min-w-0 w-full rounded-panel-inner border border-solid border-border',
  'bg-content-surface px-4 text-base text-foreground outline-none',
  'focus-visible:border-highlight focus-visible:shadow-focus',
)

const padNumber = (value: number) => String(value).padStart(2, '0')
const getDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`
const getTimeInputValue = (date: Date) =>
  `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`
const getMemoId = (eventId: string) => `${CALENDAR_ALARM_ID_PREFIX}${eventId}`
const getEventAlarmAt = (event: CalendarEvent) => {
  if (event.allDay) {
    const [year, month, day] = event.start.slice(0, DATE_KEY_LENGTH).split('-').map(Number)
    return new Date(year, month - 1, day, ALL_DAY_ALARM_HOUR)
  }

  return new Date(event.start)
}

interface CalendarAlarmControlProps {
  readonly event: CalendarEvent
  readonly memos: Accessor<ReadonlyArray<MemoryMemo>>
}

interface CalendarAlarmController {
  readonly active: Accessor<boolean>
  readonly date: Accessor<string>
  readonly message: Accessor<string | null>
  readonly pending: Accessor<boolean>
  readonly popoverAnchor: string
  readonly popoverId: string
  readonly remove: () => Promise<void>
  readonly save: () => Promise<void>
  readonly setDate: Setter<string>
  readonly setPopoverElement: Setter<HTMLElement | undefined>
  readonly setTime: Setter<string>
  readonly storedMemo: Accessor<MemoryMemo | undefined>
  readonly time: Accessor<string>
  readonly titleId: string
  readonly toggle: () => void
}

const useCalendarAlarmController = (
  event: Accessor<CalendarEvent>,
  memos: Accessor<ReadonlyArray<MemoryMemo>>,
): CalendarAlarmController => {
  const alarmId = () => getMemoId(event().id)
  const events = usePEvents()
  const popoverId = createUniqueId()
  const titleId = createUniqueId()
  const popoverAnchor = `--pomo-calendar-alarm-${popoverId}`
  const [popoverElement, setPopoverElement] = createSignal<HTMLElement>()
  const [date, setDate] = createSignal('')
  const [time, setTime] = createSignal('')
  const [message, setMessage] = createSignal<string | null>(null)
  const [pending, setPending] = createSignal(false)
  const storedMemo = createMemo(() => memos().find((memo) => memo.id === alarmId()))
  const activeAlarm = createMemo(() => {
    const exactReminderAt = storedMemo()?.exactReminderAt
    return exactReminderAt !== null && exactReminderAt !== undefined
  })

  const resetFields = () => {
    const storedAlarmAt = storedMemo()?.exactReminderAt
    const alarmAt =
      storedAlarmAt === null || storedAlarmAt === undefined
        ? getEventAlarmAt(event())
        : new Date(storedAlarmAt)
    setDate(getDateInputValue(alarmAt))
    setTime(getTimeInputValue(alarmAt))
    setMessage(null)
  }

  const togglePopover = () => {
    const popover = popoverElement()
    if (popover === undefined) {
      return
    }

    if (popover.matches(':popover-open')) {
      popover.hidePopover()
      return
    }

    resetFields()
    popover.showPopover()
  }

  const saveAlarm = async () => {
    const alarmAt = new Date(`${date()}T${time()}:00`)
    if (Number.isNaN(alarmAt.getTime()) || alarmAt.getTime() <= Date.now()) {
      setMessage(m.calendar_alarm_invalid_time())
      return
    }

    setPending(true)
    setMessage(null)
    try {
      const currentMemo = storedMemo()
      const text = m.calendar_alarm_dialogue({title: event().title})
      if (
        currentMemo?.dialogueId !== null &&
        currentMemo?.dialogueId !== undefined &&
        currentMemo.text !== text
      ) {
        await events.deleteDialogue(currentMemo.dialogueId)
      }

      const now = new Date()
      const currentAlarmId = alarmId()
      await updateMemoryMemos((currentMemos) => {
        const existingMemo = currentMemos.find((memo) => memo.id === currentAlarmId)
        const alarm: MemoryMemo =
          existingMemo === undefined
            ? createMemoryMemo({
                exactReminderAt: alarmAt.toISOString(),
                id: currentAlarmId,
                now,
                random: Math.random,
                recallMode: 'none',
                text,
              })
            : {
                ...existingMemo,
                dialogueId: existingMemo.text === text ? existingMemo.dialogueId : null,
                exactReminderAt: alarmAt.toISOString(),
                nextRecallAt: null,
                recallMode: 'none',
                text,
                updatedAt: now.toISOString(),
              }
        return [alarm, ...currentMemos.filter((memo) => memo.id !== currentAlarmId)]
      })
      popoverElement()?.hidePopover()
    } catch (error: unknown) {
      console.error('Failed to save a calendar alarm.', error)
      setMessage(m.calendar_alarm_save_failed())
    } finally {
      setPending(false)
    }
  }

  const removeAlarm = async () => {
    const currentMemo = storedMemo()
    if (currentMemo === undefined) {
      return
    }

    setPending(true)
    setMessage(null)
    try {
      if (currentMemo.dialogueId !== null) {
        await events.deleteDialogue(currentMemo.dialogueId)
      }
      const currentAlarmId = alarmId()
      await updateMemoryMemos((currentMemos) =>
        currentMemos.filter((memo) => memo.id !== currentAlarmId),
      )
      popoverElement()?.hidePopover()
    } catch (error: unknown) {
      console.error('Failed to remove a calendar alarm.', error)
      setMessage(m.calendar_alarm_remove_failed())
    } finally {
      setPending(false)
    }
  }

  return {
    active: activeAlarm,
    date,
    message,
    pending,
    popoverAnchor,
    popoverId,
    remove: removeAlarm,
    save: saveAlarm,
    setDate,
    setPopoverElement,
    setTime,
    storedMemo,
    time,
    titleId,
    toggle: togglePopover,
  }
}

export const CalendarAlarmControl = (props: CalendarAlarmControlProps) => {
  const alarm = useCalendarAlarmController(
    () => props.event,
    () => props.memos(),
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
          'text-xs font-750 outline-none focus-visible:shadow-focus',
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
        <p class="mb-4 mt-0 text-xs leading-5 text-muted-foreground">
          {m.calendar_alarm_description()}
        </p>

        <div class="grid grid-cols-1 gap-3">
          <label class="grid gap-1.5 text-sm font-650">
            <span>{m.calendar_alarm_date()}</span>
            <input
              class={INPUT_CLASSES}
              min={getDateInputValue(new Date())}
              onInput={(event) => alarm.setDate(event.currentTarget.value)}
              type="date"
              value={alarm.date()}
            />
          </label>
          <label class="grid gap-1.5 text-sm font-650">
            <span>{m.calendar_alarm_time()}</span>
            <input
              class={INPUT_CLASSES}
              onInput={(event) => alarm.setTime(event.currentTarget.value)}
              type="time"
              value={alarm.time()}
            />
          </label>
        </div>

        <div class="mt-4 grid gap-2">
          <PButton class="w-full" disabled={alarm.pending()} onPress={alarm.save}>
            {m.calendar_alarm_save()}
          </PButton>
          <Show when={alarm.storedMemo() !== undefined}>
            <PButton class="w-full" disabled={alarm.pending()} onPress={alarm.remove} tone="danger">
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
