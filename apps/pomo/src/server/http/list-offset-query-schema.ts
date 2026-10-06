import {z} from 'zod'
const MAXIMUM_LIST_OFFSET = 10_000
export const listOffsetQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).max(MAXIMUM_LIST_OFFSET).default(0),
})
