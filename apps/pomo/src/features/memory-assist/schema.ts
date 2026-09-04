import {z} from 'zod'

export const MEMORY_RECALL_MODES = ['none', 'random', 'reinforcement'] as const
export const MAXIMUM_MEMORY_MEMO_LENGTH = 200

export type MemoryRecallMode = (typeof MEMORY_RECALL_MODES)[number]

const memoryMemoSchema = z.object({
  createdAt: z.iso.datetime(),
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
  reminderHistory: z.array(z.iso.datetime()).readonly(),
  text: z.string().trim().min(1).max(MAXIMUM_MEMORY_MEMO_LENGTH),
  updatedAt: z.iso.datetime(),
  version: z.literal(1),
})

const normalizedMemoryMemoSchema = memoryMemoSchema.transform((memo) => {
  const hasExactReminder = memo.exactReminderAt !== null
  return {
    ...memo,
    nextExactReminderAt:
      memo.nextExactReminderAt === undefined ? memo.exactReminderAt : memo.nextExactReminderAt,
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
