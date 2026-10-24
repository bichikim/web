import {createDraftStorage, createJsonCodec} from '../value-storage'
import {z} from 'zod'

const FEATURE_REQUEST_DRAFT_KEY = 'pomo:feature-request:draft:v1'

const featureRequestDraftSchema = z.object({
  description: z.string(),
  title: z.string(),
  version: z.literal(1),
})

export type FeatureRequestDraft = z.infer<typeof featureRequestDraftSchema>

export interface FeatureRequestDraftStorage {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
  readonly removeItem: (key: string) => void
}

const getDraftStorage = (storage?: FeatureRequestDraftStorage) =>
  createDraftStorage({
    ...createJsonCodec((value): FeatureRequestDraft | null => {
      const result = featureRequestDraftSchema.safeParse(value)
      return result.success ? result.data : null
    }),
    key: FEATURE_REQUEST_DRAFT_KEY,
    messages: {
      delete: 'Failed to delete the feature request draft.',
      read: 'Failed to read the feature request draft.',
      write: 'Failed to save the feature request draft.',
    },
    storage: () => storage ?? globalThis.sessionStorage,
  })

export const readFeatureRequestDraft = (
  storage?: FeatureRequestDraftStorage,
): FeatureRequestDraft | null => getDraftStorage(storage).read()

export const writeFeatureRequestDraft = (
  draft: FeatureRequestDraft,
  storage?: FeatureRequestDraftStorage,
): void => getDraftStorage(storage).write(draft)

export const deleteFeatureRequestDraft = (storage?: FeatureRequestDraftStorage): void =>
  getDraftStorage(storage).delete()
