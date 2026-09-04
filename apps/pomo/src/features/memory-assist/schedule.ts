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
  readonly exactReminderAt: string | null
  readonly id: string
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
  return {
    createdAt: timestamp,
    dialogueId: null,
    exactReminderAt: options.exactReminderAt,
    id: options.id,
    nextRecallAt: getNextRecallAt({
      mode: options.recallMode,
      now: options.now,
      random: options.random,
      reinforcementIndex: 0,
    }),
    recallMode: options.recallMode,
    reinforcementIndex: 0,
    reminderHistory: [],
    text: options.text.trim(),
    updatedAt: timestamp,
    version: 1,
  }
}

export const getDueMemoryReminder = (memo: MemoryMemo, now: Date): MemoryReminderKind | null => {
  const nowTime = now.getTime()

  if (memo.exactReminderAt !== null && Date.parse(memo.exactReminderAt) <= nowTime) {
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

  return {
    ...options.memo,
    exactReminderAt: options.kind === 'exact' ? null : options.memo.exactReminderAt,
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
