import dayjs from 'dayjs'
import {formatLocalDate} from 'src/utils/format-local-date'
import {type Accessor, createMemo, createSignal, createUniqueId, type Setter} from 'solid-js'
import * as m from '@paraglide/message'
import {type CalendarEvent, getLegacyEventId} from '../calendar'
import {usePEvents} from '../focus-room-dialogue'
import {type MemoryMemo, memoryMemoDeletion, updateMemoryMemos} from '../memory-assist'
import {createCalendarAlarmSaver} from './create-calendar-alarm-saver'
const CALENDAR_ALARM_ID_PREFIX = 'calendar-alarm:'
const ALL_DAY_ALARM_HOUR = 9
const DATE_KEY_LENGTH = 10
const getTimeInputValue = (date: Date) => dayjs(date).format('HH:mm')
const getMemoId = (eventId: string) => `${CALENDAR_ALARM_ID_PREFIX}${eventId}`
const getEventAlarmAt = (event: CalendarEvent, defaultAlarmDate?: Date) => {
  if (event.allDay) {
    if (defaultAlarmDate !== undefined) {
      return new Date(
        defaultAlarmDate.getFullYear(),
        defaultAlarmDate.getMonth(),
        defaultAlarmDate.getDate(),
        ALL_DAY_ALARM_HOUR,
      )
    }
    const [year, month, day] = event.start.slice(0, DATE_KEY_LENGTH).split('-').map(Number)
    return new Date(year, month - 1, day, ALL_DAY_ALARM_HOUR)
  }

  return new Date(event.start)
}

interface CalendarAlarmController {
  readonly active: Accessor<boolean>
  readonly legacyAlarm: Accessor<boolean>
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

export const useCalendarAlarmController = (
  event: Accessor<CalendarEvent>,
  memos: Accessor<ReadonlyArray<MemoryMemo>>,
  defaultAlarmDate: Accessor<Date | undefined>,
  clock: Accessor<Date>,
): CalendarAlarmController => {
  const alarmId = () => getMemoId(event().id)
  const events = usePEvents()
  const saveToStorage = createCalendarAlarmSaver({
    cleanup: (memoId) =>
      memoryMemoDeletion.cleanup({deleteDialogue: events.deleteDialogue, memoId}),
    reportError: (error) =>
      console.error('Calendar alarm saved; retired dialogue cleanup will retry.', error),
    updateMemos: updateMemoryMemos,
  })
  const popoverId = createUniqueId()
  const titleId = createUniqueId()
  const popoverAnchor = `--pomo-calendar-alarm-${popoverId}`
  const [popoverElement, setPopoverElement] = createSignal<HTMLElement>()
  const [date, setDate] = createSignal('')
  const [time, setTime] = createSignal('')
  const [message, setMessage] = createSignal<string | null>(null)
  const [pending, setPending] = createSignal(false)
  const storedMemo = createMemo(() => memos().find((memo) => memo.id === alarmId()))
  const legacyAlarm = createMemo(() => {
    const legacyId = getLegacyEventId(event())
    return (
      legacyId !== null &&
      memos().some(
        (memo) =>
          memo.id === getMemoId(legacyId) &&
          memo.nextExactReminderAt !== null &&
          memo.deletionPending !== true,
      )
    )
  })
  const activeAlarm = createMemo(() => {
    const exactReminderAt = storedMemo()?.exactReminderAt
    return exactReminderAt !== null && exactReminderAt !== undefined
  })

  const resetFields = () => {
    const storedAlarmAt = storedMemo()?.exactReminderAt
    const alarmAt =
      storedAlarmAt === null || storedAlarmAt === undefined
        ? getEventAlarmAt(event(), defaultAlarmDate())
        : new Date(storedAlarmAt)
    setDate(formatLocalDate(alarmAt))
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
    if (Number.isNaN(alarmAt.getTime()) || alarmAt.getTime() <= clock().getTime()) {
      setMessage(m.calendar_alarm_invalid_time())
      return
    }

    setPending(true)
    setMessage(null)
    try {
      await saveToStorage({
        alarmAt,
        memoId: alarmId(),
        now: clock(),
        random: Math.random,
        text: m.calendar_alarm_dialogue({title: event().title}),
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
    if (currentMemo === undefined || pending()) {
      return
    }

    setPending(true)
    setMessage(null)
    try {
      await memoryMemoDeletion.delete({
        deleteDialogue: events.deleteDialogue,
        memoId: currentMemo.id,
      })
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
    legacyAlarm,
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
