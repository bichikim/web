import {z} from 'zod'

import {createDraftStorage, createJsonCodec} from '../value-storage'
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

const draft = createDraftStorage({
  ...createJsonCodec((value) => {
    const parsed = storedJobSchema.safeParse(value)
    return parsed.success ? parsed.data : null
  }),
  key: STORAGE_KEY,
  messages: {
    delete: 'Failed to clear the AI text job.',
    read: 'Failed to read the AI text job.',
    write: 'Failed to store the AI text job.',
  },
  reportError: () => undefined,
  storage: () => globalThis.sessionStorage,
})

export const browserAiJobStorage: AiJobStorage = {
  clear: draft.delete,
  read: draft.read,
  write: draft.write,
}
