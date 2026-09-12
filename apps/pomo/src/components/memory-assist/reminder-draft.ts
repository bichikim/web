import dayjs from 'dayjs'
import {formatLocalDate} from 'src/utils/format-local-date'
import {
  MEMORY_REINFORCEMENT_INTERVALS,
  type MemoryMemo,
  type MemoryRecallMode,
} from '../../features/memory-assist'
import type {ReminderDay, ReminderDraft} from './ReminderFields'

const [DEFAULT_REMINDER_DELAY] = MEMORY_REINFORCEMENT_INTERVALS
const DEFAULT_EXACT_REPEAT_INTERVAL_MINUTES = 10
const DEFAULT_EXACT_REPEAT_UNTIL_MINUTES = 60
const MILLISECONDS_PER_MINUTE = 60_000

const getTimeInputValue = (date: Date) => dayjs(date).format('HH:mm')

const getDefaultReminderDate = (now: Date) =>
  dayjs(now).add(DEFAULT_REMINDER_DELAY, 'millisecond').startOf('minute').toDate()

export const resolveReminderAt = (
  day: ReminderDay,
  customDate: string,
  time: string,
  now: Date,
) => {
  const date = dayjs(now)
    .add(day === 'tomorrow' ? 1 : 0, 'day')
    .toDate()

  const dateValue = day === 'custom' ? customDate : formatLocalDate(date)
  const reminder = new Date(`${dateValue}T${time}`)
  return Number.isNaN(reminder.getTime()) ? null : reminder.toISOString()
}

export const isFirstReminderInFuture = (
  exactReminderAt: string | null,
  advanceMinutes: number,
  now: Date,
) =>
  exactReminderAt !== null &&
  Date.parse(exactReminderAt) - advanceMinutes * MILLISECONDS_PER_MINUTE > now.getTime()

interface CreateReminderDraftOptions {
  readonly exactReminderAdvanceMinutes?: number
  readonly exactReminderAt: string | null
  readonly exactReminderRepeatIntervalMinutes?: number | null
  readonly exactReminderRepeatUntilMinutes?: number
  readonly now: Date
  readonly recallMode: MemoryRecallMode
}

export const createReminderDraft = (options: CreateReminderDraftOptions): ReminderDraft => {
  const reminder =
    options.exactReminderAt === null
      ? getDefaultReminderDate(options.now)
      : new Date(options.exactReminderAt)
  const reminderDate = formatLocalDate(reminder)
  const today = formatLocalDate(options.now)
  const tomorrowDate = dayjs(options.now).add(1, 'day').format('YYYY-MM-DD')
  const reminderDay =
    reminderDate === today ? 'today' : reminderDate === tomorrowDate ? 'tomorrow' : 'custom'

  return {
    customDate: reminderDate,
    exactEnabled: options.exactReminderAt !== null,
    exactReminderAdvanceMinutes: options.exactReminderAdvanceMinutes ?? 0,
    exactReminderRepeatEnabled:
      options.exactReminderRepeatIntervalMinutes !== undefined &&
      options.exactReminderRepeatIntervalMinutes !== null,
    exactReminderRepeatIntervalMinutes:
      options.exactReminderRepeatIntervalMinutes ?? DEFAULT_EXACT_REPEAT_INTERVAL_MINUTES,
    exactReminderRepeatUntilMinutes:
      options.exactReminderRepeatUntilMinutes ?? DEFAULT_EXACT_REPEAT_UNTIL_MINUTES,
    recallMode: options.recallMode,
    reminderDay,
    reminderTime: getTimeInputValue(reminder),
  }
}

export const createStoredReminderDraft = (memo: MemoryMemo) =>
  createReminderDraft({
    exactReminderAdvanceMinutes: memo.exactReminderAdvanceMinutes,
    exactReminderAt: memo.exactReminderAt,
    exactReminderRepeatIntervalMinutes: memo.exactReminderRepeatIntervalMinutes,
    exactReminderRepeatUntilMinutes: memo.exactReminderRepeatUntilMinutes,
    now: new Date(),
    recallMode: memo.recallMode,
  })

export const areReminderDraftsEqual = (left: ReminderDraft, right: ReminderDraft) =>
  left.exactEnabled === right.exactEnabled &&
  left.recallMode === right.recallMode &&
  (!left.exactEnabled ||
    (left.exactReminderAdvanceMinutes === right.exactReminderAdvanceMinutes &&
      left.exactReminderRepeatEnabled === right.exactReminderRepeatEnabled &&
      (!left.exactReminderRepeatEnabled ||
        (left.exactReminderRepeatIntervalMinutes === right.exactReminderRepeatIntervalMinutes &&
          left.exactReminderRepeatUntilMinutes === right.exactReminderRepeatUntilMinutes)) &&
      left.customDate === right.customDate &&
      left.reminderDay === right.reminderDay &&
      left.reminderTime === right.reminderTime))
