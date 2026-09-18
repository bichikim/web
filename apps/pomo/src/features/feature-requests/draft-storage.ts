import {z} from 'zod'

const FEATURE_REQUEST_DRAFT_KEY = 'pomo:feature-request:draft:v1'

const featureRequestDraftSchema = z.object({
  description: z.string(),
  title: z.string(),
  version: z.literal(1),
})

export type FeatureRequestDraft = z.infer<typeof featureRequestDraftSchema>

export const readFeatureRequestDraft = (): FeatureRequestDraft | null => {
  try {
    const storedDraft = globalThis.sessionStorage.getItem(FEATURE_REQUEST_DRAFT_KEY)
    if (storedDraft === null) {
      return null
    }

    const result = featureRequestDraftSchema.safeParse(JSON.parse(storedDraft))
    return result.success ? result.data : null
  } catch (error: unknown) {
    console.warn('Failed to read the feature request draft.', error)
    return null
  }
}

export const writeFeatureRequestDraft = (draft: FeatureRequestDraft) => {
  try {
    globalThis.sessionStorage.setItem(FEATURE_REQUEST_DRAFT_KEY, JSON.stringify(draft))
  } catch (error: unknown) {
    console.warn('Failed to save the feature request draft.', error)
  }
}

export const deleteFeatureRequestDraft = () => {
  try {
    globalThis.sessionStorage.removeItem(FEATURE_REQUEST_DRAFT_KEY)
  } catch (error: unknown) {
    console.warn('Failed to delete the feature request draft.', error)
  }
}
