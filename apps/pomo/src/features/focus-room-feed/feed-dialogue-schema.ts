import {z} from 'zod'

import {
  SUPERTONIC_MODEL_IDS,
  type SupertonicModelId,
  type SupertonicVoiceId,
} from '@winter-love/supertonic/model'
import {isSupertonicVoiceId} from '../supertonic/is-supertonic-voice-id'

const supertonicVoiceIdSchema = z.custom<SupertonicVoiceId>(isSupertonicVoiceId)
const modelIdSchema: z.ZodType<SupertonicModelId> = z.enum(SUPERTONIC_MODEL_IDS)

const EXPIRATION_HOURS = 48
const MINUTES_PER_HOUR = 60
const SECONDS_PER_MINUTE = 60
const MILLISECONDS_PER_SECOND = 1000

export const FEED_DIALOGUE_EXPIRATION_MS =
  EXPIRATION_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND
export const MAXIMUM_FEED_SCRIPT_LENGTH = 3000

const feedItemFieldsSchema = z.object({
  feedConnectionId: z.string().min(1),
  feedItemId: z.string().min(1),
  itemTitle: z.string().min(1),
  publishedAt: z.iso.datetime(),
  sourceTitle: z.string().min(1),
  sourceUrl: z.url(),
  version: z.literal(1),
})

type FeedItemFields = Readonly<z.infer<typeof feedItemFieldsSchema>>

const feedIdentityShape = feedItemFieldsSchema.pick({
  feedConnectionId: true,
  feedItemId: true,
}).shape
const feedSourceShape = feedItemFieldsSchema.pick({sourceTitle: true, sourceUrl: true}).shape

export interface FeedDialogueMetadata extends FeedItemFields {
  readonly createdAt: string
  readonly dialogueId: string
  readonly expiresAt: string
  readonly listenedAt: string | null
}

export const feedDialogueMetadataSchema: z.ZodType<FeedDialogueMetadata> = z.object({
  createdAt: z.iso.datetime(),
  dialogueId: z.string().min(1),
  expiresAt: z.iso.datetime(),
  ...feedIdentityShape,
  itemTitle: feedItemFieldsSchema.shape.itemTitle,
  listenedAt: z.iso.datetime().nullable(),
  publishedAt: feedItemFieldsSchema.shape.publishedAt,
  ...feedSourceShape,
  version: feedItemFieldsSchema.shape.version,
})

export type FeedDialogueJobStatus = 'failed' | 'generating' | 'interrupted' | 'pending' | 'queued'

export interface FeedDialogueJob extends FeedItemFields {
  readonly createdAt: string
  readonly errorMessage: string | null
  readonly id: string
  readonly modelId: SupertonicModelId
  readonly script: string
  readonly status: FeedDialogueJobStatus
  readonly updatedAt: string
  readonly voiceId: SupertonicVoiceId
}

export const feedDialogueJobSchema: z.ZodType<FeedDialogueJob> = z.object({
  createdAt: z.iso.datetime(),
  errorMessage: z.string().nullable(),
  ...feedIdentityShape,
  id: z.string().min(1),
  itemTitle: feedItemFieldsSchema.shape.itemTitle,
  modelId: modelIdSchema,
  publishedAt: feedItemFieldsSchema.shape.publishedAt,
  script: z.string().min(1).max(MAXIMUM_FEED_SCRIPT_LENGTH),
  ...feedSourceShape,
  status: z.enum(['failed', 'generating', 'interrupted', 'pending', 'queued']),
  updatedAt: z.iso.datetime(),
  version: feedItemFieldsSchema.shape.version,
  voiceId: supertonicVoiceIdSchema,
})

export type FeedItemStatus = 'dismissed' | 'failed' | 'ignored' | 'queued' | 'ready' | 'too-long'

export interface FeedItemRecord extends FeedItemFields {
  readonly contentLength: number
  readonly discoveredAt: string
  readonly id: string
  readonly message: string | null
  readonly status: FeedItemStatus
  readonly updatedAt: string
}

export const feedItemRecordSchema: z.ZodType<FeedItemRecord> = z.object({
  contentLength: z.number().int().nonnegative(),
  discoveredAt: z.iso.datetime(),
  ...feedIdentityShape,
  id: z.string().min(1),
  itemTitle: feedItemFieldsSchema.shape.itemTitle,
  message: z.string().nullable(),
  publishedAt: feedItemFieldsSchema.shape.publishedAt,
  ...feedSourceShape,
  status: z.enum(['dismissed', 'failed', 'ignored', 'queued', 'ready', 'too-long']),
  updatedAt: z.iso.datetime(),
  version: feedItemFieldsSchema.shape.version,
})

export const getFeedItemRecordId = (feedConnectionId: string, feedItemId: string) =>
  `${feedConnectionId}\u0000${feedItemId}`

/** Reports whether a persisted job is waiting for a user preparation or retry action. */
export const isFeedJobAwaitingAction = (job: FeedDialogueJob): boolean => {
  switch (job.status) {
    case 'pending':
    case 'failed':
    case 'interrupted':
      return true
    case 'queued':
    case 'generating':
      return false
  }
}
