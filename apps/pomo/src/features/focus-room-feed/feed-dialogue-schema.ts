import {z} from 'zod'

import {SUPERTONIC_VOICES, type SupertonicModelId, type SupertonicVoiceId} from '../supertonic'

const supertonicVoiceIdSchema = z.custom<SupertonicVoiceId>((value) =>
  SUPERTONIC_VOICES.some((voice) => voice.id === value),
)
const modelIdSchema: z.ZodType<SupertonicModelId> = z.enum(['full', 'int8'])

const EXPIRATION_HOURS = 48
const MINUTES_PER_HOUR = 60
const SECONDS_PER_MINUTE = 60
const MILLISECONDS_PER_SECOND = 1000

export const FEED_DIALOGUE_EXPIRATION_MS =
  EXPIRATION_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND
export const MAXIMUM_FEED_SCRIPT_LENGTH = 3000

export interface FeedDialogueMetadata {
  readonly createdAt: string
  readonly dialogueId: string
  readonly expiresAt: string
  readonly feedConnectionId: string
  readonly feedItemId: string
  readonly itemTitle: string
  readonly listenedAt: string | null
  readonly publishedAt: string
  readonly sourceTitle: string
  readonly sourceUrl: string
  readonly version: 1
}

export const feedDialogueMetadataSchema: z.ZodType<FeedDialogueMetadata> = z.object({
  createdAt: z.iso.datetime(),
  dialogueId: z.string().min(1),
  expiresAt: z.iso.datetime(),
  feedConnectionId: z.string().min(1),
  feedItemId: z.string().min(1),
  itemTitle: z.string().min(1),
  listenedAt: z.iso.datetime().nullable(),
  publishedAt: z.iso.datetime(),
  sourceTitle: z.string().min(1),
  sourceUrl: z.url(),
  version: z.literal(1),
})

export type FeedDialogueJobStatus = 'failed' | 'generating' | 'interrupted' | 'queued'

export interface FeedDialogueJob {
  readonly createdAt: string
  readonly errorMessage: string | null
  readonly feedConnectionId: string
  readonly feedItemId: string
  readonly id: string
  readonly itemTitle: string
  readonly modelId: SupertonicModelId
  readonly publishedAt: string
  readonly script: string
  readonly sourceTitle: string
  readonly sourceUrl: string
  readonly status: FeedDialogueJobStatus
  readonly updatedAt: string
  readonly version: 1
  readonly voiceId: SupertonicVoiceId
}

export const feedDialogueJobSchema: z.ZodType<FeedDialogueJob> = z.object({
  createdAt: z.iso.datetime(),
  errorMessage: z.string().nullable(),
  feedConnectionId: z.string().min(1),
  feedItemId: z.string().min(1),
  id: z.string().min(1),
  itemTitle: z.string().min(1),
  modelId: modelIdSchema,
  publishedAt: z.iso.datetime(),
  script: z.string().min(1).max(MAXIMUM_FEED_SCRIPT_LENGTH),
  sourceTitle: z.string().min(1),
  sourceUrl: z.url(),
  status: z.enum(['failed', 'generating', 'interrupted', 'queued']),
  updatedAt: z.iso.datetime(),
  version: z.literal(1),
  voiceId: supertonicVoiceIdSchema,
})

export type FeedItemStatus = 'dismissed' | 'failed' | 'ignored' | 'queued' | 'ready' | 'too-long'

export interface FeedItemRecord {
  readonly contentLength: number
  readonly discoveredAt: string
  readonly feedConnectionId: string
  readonly feedItemId: string
  readonly id: string
  readonly itemTitle: string
  readonly message: string | null
  readonly publishedAt: string
  readonly sourceTitle: string
  readonly sourceUrl: string
  readonly status: FeedItemStatus
  readonly updatedAt: string
  readonly version: 1
}

export const feedItemRecordSchema: z.ZodType<FeedItemRecord> = z.object({
  contentLength: z.number().int().nonnegative(),
  discoveredAt: z.iso.datetime(),
  feedConnectionId: z.string().min(1),
  feedItemId: z.string().min(1),
  id: z.string().min(1),
  itemTitle: z.string().min(1),
  message: z.string().nullable(),
  publishedAt: z.iso.datetime(),
  sourceTitle: z.string().min(1),
  sourceUrl: z.url(),
  status: z.enum(['dismissed', 'failed', 'ignored', 'queued', 'ready', 'too-long']),
  updatedAt: z.iso.datetime(),
  version: z.literal(1),
})

export const getFeedItemRecordId = (feedConnectionId: string, feedItemId: string) =>
  `${feedConnectionId}\u0000${feedItemId}`
