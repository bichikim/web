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

const getStorage = (storage?: MemoryMemoDraftStorage): MemoryMemoDraftStorage =>
  storage ?? globalThis.sessionStorage

export const readMemoryMemoDraft = (storage?: MemoryMemoDraftStorage): MemoryMemoDraft | null => {
  try {
    const storedDraft = getStorage(storage).getItem(MEMORY_MEMO_DRAFT_KEY)
    if (storedDraft === null) {
      return null
    }

    const result = memoryMemoDraftSchema.safeParse(JSON.parse(storedDraft))
    return result.success ? result.data : null
  } catch (error: unknown) {
    console.warn('Failed to read the memory memo draft.', error)
    return null
  }
}

export const writeMemoryMemoDraft = (draft: MemoryMemoDraft, storage?: MemoryMemoDraftStorage) => {
  try {
    getStorage(storage).setItem(MEMORY_MEMO_DRAFT_KEY, JSON.stringify(draft))
  } catch (error: unknown) {
    console.warn('Failed to save the memory memo draft.', error)
  }
}

export const deleteMemoryMemoDraft = (storage?: MemoryMemoDraftStorage): void => {
  try {
    getStorage(storage).removeItem(MEMORY_MEMO_DRAFT_KEY)
  } catch (error: unknown) {
    console.warn('Failed to delete the memory memo draft.', error)
  }
}
