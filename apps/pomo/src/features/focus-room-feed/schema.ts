import {z} from 'zod'

import {SUPERTONIC_VOICES, type SupertonicVoiceId} from '../supertonic'

const MAXIMUM_FEED_URL_LENGTH = 2048

const supertonicVoiceIdSchema = z.custom<SupertonicVoiceId>((value) =>
  SUPERTONIC_VOICES.some((voice) => voice.id === value),
)
const isSupportedFeedUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export interface FeedConnection {
  readonly createdAt: string
  readonly id: string
  readonly updatedAt: string
  readonly url: string
  readonly version: 1
  readonly voiceId: SupertonicVoiceId
}

export const feedConnectionSchema: z.ZodType<FeedConnection> = z.object({
  createdAt: z.string().datetime(),
  id: z.string().min(1),
  updatedAt: z.string().datetime(),
  url: z.string().min(1).max(MAXIMUM_FEED_URL_LENGTH).refine(isSupportedFeedUrl),
  version: z.literal(1),
  voiceId: supertonicVoiceIdSchema,
})

interface ValidFeedUrl {
  readonly ok: true
  readonly value: string
}

interface InvalidFeedUrl {
  readonly ok: false
}

export type NormalizeFeedUrlResult = InvalidFeedUrl | ValidFeedUrl

/** Normalizes a user-entered HTTP(S) feed address for storage and duplicate checks. */
export const normalizeFeedUrl = (input: string): NormalizeFeedUrlResult => {
  const value = input.trim()

  if (value.length === 0 || value.length > MAXIMUM_FEED_URL_LENGTH) {
    return {ok: false}
  }

  try {
    const url = new URL(value)

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return {ok: false}
    }

    url.hash = ''
    return {ok: true, value: url.href}
  } catch {
    return {ok: false}
  }
}
