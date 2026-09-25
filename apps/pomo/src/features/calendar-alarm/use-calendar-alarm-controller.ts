import {dayjs} from 'src/utils/zoned-dayjs'
import {formatLocalDate} from 'src/utils/format-local-date'
import {type Accessor, createMemo, createSignal, createUniqueId, type Setter} from 'solid-js'
import * as m from '@paraglide/message'
import {type CalendarEvent, getLegacyEventId} from '../calendar'
import {usePEvents} from '../focus-room-dialogue'
import {
  isMemoryMemoDeletionPending,
  type MemoryMemo,
  memoryMemoDeletion,
  updateMemoryMemos,
} from '../memory-assist'
import {createCalendarAlarmSaver} from './create-calendar-alarm-saver'
const CALENDAR_ALARM_ID_PREFIX = 'calendar-alarm:'
const ALL_DAY_ALARM_TIME = '09:00:00'
const DATE_KEY_LENGTH = 10
const getDateInputValue = (date: Date, timeZone: string) =>
  dayjs(date).tz(timeZone).format('YYYY-MM-DD')
const getTimeInputValue = (date: Date, timeZone: string) => dayjs(date).tz(timeZone).format('HH:mm')
const getMemoId = (eventId: string) => `${CALENDAR_ALARM_ID_PREFIX}${eventId}`
const getLegacyMemoId = (event: CalendarEvent) => {
  const legacyEventId = getLegacyEventId(event)
  return legacyEventId === null ? undefined : getMemoId(legacyEventId)
}
const getEventAlarmAt = (
  event: CalendarEvent,
  defaultAlarmDate: Date | undefined,
  timeZone: string,
) => {
  if (event.allDay) {
    const alarmDate =
      defaultAlarmDate === undefined
        ? event.start.slice(0, DATE_KEY_LENGTH)
        : formatLocalDate(defaultAlarmDate)
    return dayjs.tz(`${alarmDate}T${ALL_DAY_ALARM_TIME}`, timeZone).toDate()
  }

  return new Date(event.start)
}

interface UseCalendarAlarmControllerProps {
  readonly clock: Accessor<Date>
  readonly defaultAlarmDate: Accessor<Date | undefined>
  readonly event: Accessor<CalendarEvent>
  readonly memos: Accessor<ReadonlyArray<MemoryMemo>>
  readonly timeZone: Accessor<string>
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
  props: UseCalendarAlarmControllerProps,
): CalendarAlarmController => {
  const alarmId = () => getMemoId(props.event().id)
  const events = usePEvents()
  const saveToStorage = createCalendarAlarmSaver({
    cleanup: (memoId) =>
      memoryMemoDeletion.cleanup({deleteDialogue: events.deleteDialogue, memoId}),
    deleteMemo: async (memoId) => {
      await memoryMemoDeletion.delete({deleteDialogue: events.deleteDialogue, memoId})
    },
    reportError: (error) => console.error('Calendar alarm saved; cleanup will retry.', error),
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
  const usableMemos = () => props.memos().filter((memo) => !isMemoryMemoDeletionPending(memo))
  const storedMemo = createMemo(() => usableMemos().find((memo) => memo.id === alarmId()))
  const legacyAlarm = createMemo(() => {
    const legacyMemoId = getLegacyMemoId(props.event())
    return (
      legacyMemoId !== undefined &&
      usableMemos().some((memo) => memo.id === legacyMemoId && memo.nextExactReminderAt !== null)
    )
  })
  const activeAlarm = createMemo(() => {
    const nextExactReminderAt = storedMemo()?.nextExactReminderAt
    return nextExactReminderAt !== null && nextExactReminderAt !== undefined
  })

  const resetFields = () => {
    const currentEvent = props.event()
    const currentTimeZone = props.timeZone()
    const storedAlarmAt = storedMemo()?.exactReminderAt
    const alarmAt =
      storedAlarmAt === null || storedAlarmAt === undefined
        ? getEventAlarmAt(currentEvent, props.defaultAlarmDate(), currentTimeZone)
        : new Date(storedAlarmAt)
    setDate(getDateInputValue(alarmAt, currentTimeZone))
    setTime(getTimeInputValue(alarmAt, currentTimeZone))
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
    const currentDate = date()
    const currentTime = time()
    const currentTimeZone = props.timeZone()
    const alarmAt = dayjs.tz(`${currentDate}T${currentTime}:00`, currentTimeZone).toDate()
    const now = props.clock()
    if (Number.isNaN(alarmAt.getTime()) || alarmAt.getTime() <= now.getTime()) {
      setMessage(m.calendar_alarm_invalid_time())
      return
    }

    const currentEvent = props.event()
    setPending(true)
    setMessage(null)
    try {
      await saveToStorage({
        alarmAt,
        legacyMemoId: getLegacyMemoId(currentEvent),
        memoId: getMemoId(currentEvent.id),
        now,
        random: Math.random,
        text: m.calendar_alarm_dialogue({title: currentEvent.title}),
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
