import type {MemoryMemo, MemoryRecallMode} from './schema'

const MINUTE = 60_000
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
// oxlint-disable eslint/no-magic-numbers -- These values are the user-facing recall schedule contract.
const TEN_MINUTES = 10 * MINUTE
const EIGHT_HOURS = 8 * MINUTES_PER_HOUR * MINUTE
const HOUR = MINUTES_PER_HOUR * MINUTE
const DAY = HOURS_PER_DAY * HOUR
const RANDOM_MINIMUM = TEN_MINUTES
const RANDOM_MAXIMUM = 2 * HOUR

export const MEMORY_REINFORCEMENT_INTERVALS = [
  TEN_MINUTES,
  EIGHT_HOURS,
  DAY,
  DAY * 3,
  DAY * 7,
  DAY * 14,
  DAY * 30,
] as const
// oxlint-enable eslint/no-magic-numbers

export type MemoryReminderKind = 'exact' | 'recall'

export interface GetNextRecallAtOptions {
  readonly mode: MemoryRecallMode
  readonly now: Date
  readonly random: () => number
  readonly reinforcementIndex: number
}

export interface CreateMemoryMemoOptions {
  readonly exactReminderAdvanceMinutes?: number
  readonly exactReminderAt: string | null
  readonly exactReminderRepeatIntervalMinutes?: number | null
  readonly exactReminderRepeatUntilMinutes?: number
  readonly id: string
  readonly now: Date
  readonly random: () => number
  readonly recallMode: MemoryRecallMode
  readonly text: string
}

export interface EditMemoryMemoOptions {
  readonly exactReminderAdvanceMinutes?: number
  readonly exactReminderAt: string | null
  readonly exactReminderRepeatIntervalMinutes?: number | null
  readonly exactReminderRepeatUntilMinutes?: number
  readonly memo: MemoryMemo
  readonly now: Date
  readonly random: () => number
  readonly recallMode: MemoryRecallMode
  readonly text: string
}

export interface AdvanceMemoryMemoOptions {
  readonly kind: MemoryReminderKind
  readonly memo: MemoryMemo
  readonly now: Date
  readonly random: () => number
}

const getRandomInterval = (random: () => number) => {
  const ratio = Math.min(1, Math.max(0, random()))
  return RANDOM_MINIMUM + ratio * (RANDOM_MAXIMUM - RANDOM_MINIMUM)
}

const getFirstExactReminderAt = (exactReminderAt: string | null, advanceMinutes: number) =>
  exactReminderAt === null
    ? null
    : new Date(Date.parse(exactReminderAt) - advanceMinutes * MINUTE).toISOString()

const getWholeMinutes = (value: number, minimum: number) => Math.max(minimum, Math.trunc(value))

const getExactReminderSchedule = (
  options: Pick<
    CreateMemoryMemoOptions,
    | 'exactReminderAdvanceMinutes'
    | 'exactReminderAt'
    | 'exactReminderRepeatIntervalMinutes'
    | 'exactReminderRepeatUntilMinutes'
  >,
) => {
  const exactReminderAdvanceMinutes =
    options.exactReminderAt === null
      ? 0
      : getWholeMinutes(options.exactReminderAdvanceMinutes ?? 0, 0)
  const exactReminderRepeatIntervalMinutes =
    options.exactReminderAt === null ||
    options.exactReminderRepeatIntervalMinutes === undefined ||
    options.exactReminderRepeatIntervalMinutes === null
      ? null
      : getWholeMinutes(options.exactReminderRepeatIntervalMinutes, 1)
  const exactReminderRepeatUntilMinutes =
    exactReminderRepeatIntervalMinutes === null
      ? 0
      : getWholeMinutes(options.exactReminderRepeatUntilMinutes ?? 0, 0)

  return {
    exactReminderAdvanceMinutes,
    exactReminderRepeatIntervalMinutes,
    exactReminderRepeatUntilMinutes,
    nextExactReminderAt: getFirstExactReminderAt(
      options.exactReminderAt,
      exactReminderAdvanceMinutes,
    ),
  }
}

export const getNextRecallAt = (options: GetNextRecallAtOptions): string | null => {
  switch (options.mode) {
    case 'none':
      return null
    case 'random':
      return new Date(options.now.getTime() + getRandomInterval(options.random)).toISOString()
    case 'reinforcement': {
      const interval =
        MEMORY_REINFORCEMENT_INTERVALS[options.reinforcementIndex] ??
        MEMORY_REINFORCEMENT_INTERVALS.at(-1)
      return new Date(options.now.getTime() + interval).toISOString()
    }
  }

  options.mode satisfies never
}

export const createMemoryMemo = (options: CreateMemoryMemoOptions): MemoryMemo => {
  const timestamp = options.now.toISOString()
  const exactSchedule = getExactReminderSchedule(options)
  const recallMode = options.exactReminderAt === null ? options.recallMode : 'none'
  return {
    createdAt: timestamp,
    dialogueId: null,
    ...exactSchedule,
    exactReminderAt: options.exactReminderAt,
    id: options.id,
    nextRecallAt: getNextRecallAt({
      mode: recallMode,
      now: options.now,
      random: options.random,
      reinforcementIndex: 0,
    }),
    recallMode,
    reinforcementIndex: 0,
    reminderHistory: [],
    text: options.text.trim(),
    updatedAt: timestamp,
    version: 1,
  }
}

export const editMemoryMemo = (options: EditMemoryMemoOptions): MemoryMemo => {
  const nextText = options.text.trim()
  const recallMode = options.exactReminderAt === null ? options.recallMode : 'none'
  const recallChanged = recallMode !== options.memo.recallMode
  const exactSchedule = getExactReminderSchedule(options)
  const exactScheduleChanged =
    options.exactReminderAt !== options.memo.exactReminderAt ||
    exactSchedule.exactReminderAdvanceMinutes !== options.memo.exactReminderAdvanceMinutes ||
    exactSchedule.exactReminderRepeatIntervalMinutes !==
      options.memo.exactReminderRepeatIntervalMinutes ||
    exactSchedule.exactReminderRepeatUntilMinutes !== options.memo.exactReminderRepeatUntilMinutes

  return {
    ...options.memo,
    dialogueId: nextText === options.memo.text ? options.memo.dialogueId : null,
    exactReminderAdvanceMinutes: exactSchedule.exactReminderAdvanceMinutes,
    exactReminderAt: options.exactReminderAt,
    exactReminderRepeatIntervalMinutes: exactSchedule.exactReminderRepeatIntervalMinutes,
    exactReminderRepeatUntilMinutes: exactSchedule.exactReminderRepeatUntilMinutes,
    nextExactReminderAt: exactScheduleChanged
      ? exactSchedule.nextExactReminderAt
      : options.memo.nextExactReminderAt,
    nextRecallAt: recallChanged
      ? getNextRecallAt({
          mode: recallMode,
          now: options.now,
          random: options.random,
          reinforcementIndex: 0,
        })
      : options.memo.nextRecallAt,
    recallMode,
    reinforcementIndex: recallChanged ? 0 : options.memo.reinforcementIndex,
    text: nextText,
    updatedAt: options.now.toISOString(),
  }
}

export const getDueMemoryReminder = (memo: MemoryMemo, now: Date): MemoryReminderKind | null => {
  const nowTime = now.getTime()

  if (memo.nextExactReminderAt !== null && Date.parse(memo.nextExactReminderAt) <= nowTime) {
    return 'exact'
  }

  if (memo.nextRecallAt !== null && Date.parse(memo.nextRecallAt) <= nowTime) {
    return 'recall'
  }

  return null
}

export const advanceMemoryMemo = (options: AdvanceMemoryMemoOptions): MemoryMemo => {
  const shouldAdvanceRecall =
    options.kind === 'recall' ||
    (options.memo.nextRecallAt !== null &&
      Date.parse(options.memo.nextRecallAt) <= options.now.getTime())
  const nextReinforcementIndex =
    shouldAdvanceRecall && options.memo.recallMode === 'reinforcement'
      ? options.memo.reinforcementIndex + 1
      : options.memo.reinforcementIndex
  const nextExactReminderAt = (() => {
    if (
      options.kind !== 'exact' ||
      options.memo.exactReminderAt === null ||
      options.memo.exactReminderRepeatIntervalMinutes === null
    ) {
      return options.kind === 'exact' ? null : options.memo.nextExactReminderAt
    }

    const interval = options.memo.exactReminderRepeatIntervalMinutes * MINUTE
    const scheduledTime = Date.parse(options.memo.nextExactReminderAt ?? options.now.toISOString())
    const elapsedIntervals = Math.floor(
      Math.max(0, options.now.getTime() - scheduledTime) / interval,
    )
    const nextTime = scheduledTime + (elapsedIntervals + 1) * interval
    const endTime =
      Date.parse(options.memo.exactReminderAt) +
      options.memo.exactReminderRepeatUntilMinutes * MINUTE
    return nextTime <= endTime ? new Date(nextTime).toISOString() : null
  })()

  return {
    ...options.memo,
    exactReminderAt:
      options.kind === 'exact' && nextExactReminderAt === null
        ? null
        : options.memo.exactReminderAt,
    nextExactReminderAt,
    nextRecallAt: shouldAdvanceRecall
      ? getNextRecallAt({
          mode: options.memo.recallMode,
          now: options.now,
          random: options.random,
          reinforcementIndex: nextReinforcementIndex,
        })
      : options.memo.nextRecallAt,
    reinforcementIndex: nextReinforcementIndex,
    reminderHistory: [...options.memo.reminderHistory, options.now.toISOString()],
    updatedAt: options.now.toISOString(),
  }
}
