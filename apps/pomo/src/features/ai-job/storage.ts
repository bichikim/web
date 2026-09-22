import {z} from 'zod'

import {type AiTextJobInput, aiTextJobInputSchema} from './contracts'

const STORAGE_KEY = 'pomo:ai-text-job:v1'
const MINIMUM_IDEMPOTENCY_KEY_LENGTH = 8

const storedJobSchema = z.object({
  idempotencyKey: z.string().min(MINIMUM_IDEMPOTENCY_KEY_LENGTH),
  input: aiTextJobInputSchema,
  jobId: z.string().min(1).nullable(),
})

export interface StoredAiTextJob {
  readonly idempotencyKey: string
  readonly input: AiTextJobInput
  readonly jobId: string | null
}

export interface AiJobStorage {
  readonly clear: () => void
  readonly read: () => StoredAiTextJob | null
  readonly write: (job: StoredAiTextJob) => void
}

const getSessionStorage = (): Storage | null => {
  try {
    return globalThis.sessionStorage
  } catch {
    return null
  }
}

export const browserAiJobStorage: AiJobStorage = {
  clear: () => {
    try {
      getSessionStorage()?.removeItem(STORAGE_KEY)
    } catch {}
  },
  read: () => {
    try {
      const value = getSessionStorage()?.getItem(STORAGE_KEY)
      if (value === null || value === undefined) {
        return null
      }

      const parsed = storedJobSchema.safeParse(JSON.parse(value))
      return parsed.success ? parsed.data : null
    } catch {
      return null
    }
  },
  write: (job) => {
    try {
      getSessionStorage()?.setItem(STORAGE_KEY, JSON.stringify(job))
    } catch {}
  },
}
