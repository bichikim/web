import {z} from 'zod'

export const MAX_MEMO_LENGTH = 4000
export const MAX_MEMO_ITEMS = 100
export const memoStateSchema = z.object({
  expanded: z.boolean(),
  items: z.array(z.string().trim().min(1).max(MAX_MEMO_LENGTH)).max(MAX_MEMO_ITEMS),
  visible: z.boolean(),
})
export const memoPatchSchema = memoStateSchema.partial()
export type MemoState = z.infer<typeof memoStateSchema>
export type MemoPatch = z.infer<typeof memoPatchSchema>

export const INITIAL_MEMOS: MemoState = {expanded: true, items: [], visible: false}
