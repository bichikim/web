import {z} from 'zod'

export const MEMORY_RECALL_MODES = ['none', 'random', 'reinforcement'] as const
export const MAXIMUM_MEMORY_MEMO_LENGTH = 200

export type MemoryRecallMode = (typeof MEMORY_RECALL_MODES)[number]

const MEMORY_REMINDER_KINDS = ['exact', 'recall'] as const
export type MemoryReminderKind = (typeof MEMORY_REMINDER_KINDS)[number]

const memoryReminderEventSchema = z.object({
  deliveredAt: z.iso.datetime(),
  kind: z.enum(MEMORY_REMINDER_KINDS),
  scheduledAt: z.iso.datetime(),
})

export type MemoryReminderEvent = z.infer<typeof memoryReminderEventSchema>

const memoryMemoSchema = z.object({
  createdAt: z.iso.datetime(),
  deletionPending: z.literal(true).optional(),
  dialogueId: z.string().min(1).nullable(),
  exactReminderAdvanceMinutes: z.number().int().nonnegative().default(0),
  exactReminderAt: z.iso.datetime().nullable(),
  exactReminderRepeatIntervalMinutes: z.number().int().positive().nullable().default(null),
  exactReminderRepeatUntilMinutes: z.number().int().nonnegative().default(0),
  id: z.string().min(1),
  nextExactReminderAt: z.iso.datetime().nullable().optional(),
  nextRecallAt: z.iso.datetime().nullable(),
  recallMode: z.enum(MEMORY_RECALL_MODES),
  reinforcementIndex: z.number().int().nonnegative(),
  // Preserve occurrence times for deliveries recorded by this version.
  reminderEvents: z.array(memoryReminderEventSchema).readonly().default([]),
  // Keep delivery-only timestamps for readers that only understand the v1 shape.
  reminderHistory: z.array(z.iso.datetime()).readonly(),
  retiredDialogueIds: z.array(z.string().min(1)).readonly().optional(),
  text: z.string().trim().min(1).max(MAXIMUM_MEMORY_MEMO_LENGTH),
  updatedAt: z.iso.datetime(),
  version: z.literal(1),
})

const hasConsumedExactReminder = (memo: z.infer<typeof memoryMemoSchema>) => {
  if (memo.exactReminderAt === null) {
    return false
  }

  if (memo.reminderEvents.length > 0) {
    return memo.reminderEvents.some((event) => event.kind === 'exact')
  }

  const exactReminderTime = Date.parse(memo.exactReminderAt)
  return memo.reminderHistory.some((deliveredAt) => Date.parse(deliveredAt) >= exactReminderTime)
}

const getNormalizedNextExactReminderAt = (memo: z.infer<typeof memoryMemoSchema>) => {
  if (memo.nextExactReminderAt !== undefined) {
    return memo.nextExactReminderAt
  }

  return hasConsumedExactReminder(memo) ? null : memo.exactReminderAt
}

const normalizedMemoryMemoSchema = memoryMemoSchema.transform((memo) => {
  const hasExactReminder = memo.exactReminderAt !== null
  return {
    ...memo,
    nextExactReminderAt: getNormalizedNextExactReminderAt(memo),
    nextRecallAt: hasExactReminder ? null : memo.nextRecallAt,
    recallMode: hasExactReminder ? ('none' as const) : memo.recallMode,
    reinforcementIndex: hasExactReminder ? 0 : memo.reinforcementIndex,
  }
})

export type MemoryMemo = z.infer<typeof normalizedMemoryMemoSchema>

export const parseMemoryMemos = (value: unknown): ReadonlyArray<MemoryMemo> | null => {
  const result = z.array(normalizedMemoryMemoSchema).readonly().safeParse(value)
  return result.success ? result.data : null
}
