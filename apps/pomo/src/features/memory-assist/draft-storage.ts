import {createDraftStorage, createJsonCodec} from '../value-storage'
import {z} from 'zod'

const MEMORY_MEMO_DRAFT_KEY = 'pomo:memory-memo:draft:v1'
const DEFAULT_EXACT_REPEAT_INTERVAL_MINUTES = 10
const DEFAULT_EXACT_REPEAT_UNTIL_MINUTES = 60

const memoryMemoDraftSchema = z.object({
  customDate: z.string(),
  exactEnabled: z.boolean(),
  exactReminderAdvanceMinutes: z.number().int().nonnegative().default(0),
  exactReminderRepeatEnabled: z.boolean().default(false),
  exactReminderRepeatIntervalMinutes: z
    .number()
    .int()
    .positive()
    .default(DEFAULT_EXACT_REPEAT_INTERVAL_MINUTES),
  exactReminderRepeatUntilMinutes: z
    .number()
    .int()
    .nonnegative()
    .default(DEFAULT_EXACT_REPEAT_UNTIL_MINUTES),
  recallMode: z.enum(['none', 'random', 'reinforcement']),
  reminderDay: z.enum(['custom', 'today', 'tomorrow']),
  reminderTime: z.string(),
  text: z.string(),
  version: z.literal(1),
})

export type MemoryMemoDraft = z.infer<typeof memoryMemoDraftSchema>

export interface MemoryMemoDraftStorage {
  readonly getItem: (key: string) => string | null
  readonly removeItem: (key: string) => void
  readonly setItem: (key: string, value: string) => void
}

const getDraftStorage = (storage?: MemoryMemoDraftStorage) =>
  createDraftStorage({
    ...createJsonCodec((value): MemoryMemoDraft | null => {
      const result = memoryMemoDraftSchema.safeParse(value)
      return result.success ? result.data : null
    }),
    key: MEMORY_MEMO_DRAFT_KEY,
    messages: {
      delete: 'Failed to delete the memory memo draft.',
      read: 'Failed to read the memory memo draft.',
      write: 'Failed to save the memory memo draft.',
    },
    storage: () => storage ?? globalThis.sessionStorage,
  })

export const readMemoryMemoDraft = (storage?: MemoryMemoDraftStorage): MemoryMemoDraft | null =>
  getDraftStorage(storage).read()

export const writeMemoryMemoDraft = (
  draft: MemoryMemoDraft,
  storage?: MemoryMemoDraftStorage,
): void => getDraftStorage(storage).write(draft)

export const deleteMemoryMemoDraft = (storage?: MemoryMemoDraftStorage): void =>
  getDraftStorage(storage).delete()
