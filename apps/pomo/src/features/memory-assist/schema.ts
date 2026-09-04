import {z} from 'zod'

export const MEMORY_RECALL_MODES = ['none', 'random', 'reinforcement'] as const
export const MAXIMUM_MEMORY_MEMO_LENGTH = 200

export type MemoryRecallMode = (typeof MEMORY_RECALL_MODES)[number]

const memoryMemoSchema = z.object({
  createdAt: z.iso.datetime(),
  dialogueId: z.string().min(1).nullable(),
  exactReminderAt: z.iso.datetime().nullable(),
  id: z.string().min(1),
  nextRecallAt: z.iso.datetime().nullable(),
  recallMode: z.enum(MEMORY_RECALL_MODES),
  reinforcementIndex: z.number().int().nonnegative(),
  reminderHistory: z.array(z.iso.datetime()).readonly(),
  text: z.string().trim().min(1).max(MAXIMUM_MEMORY_MEMO_LENGTH),
  updatedAt: z.iso.datetime(),
  version: z.literal(1),
})

export type MemoryMemo = z.infer<typeof memoryMemoSchema>

export const parseMemoryMemos = (value: unknown): ReadonlyArray<MemoryMemo> | null => {
  const result = z.array(memoryMemoSchema).readonly().safeParse(value)
  return result.success ? result.data : null
}
