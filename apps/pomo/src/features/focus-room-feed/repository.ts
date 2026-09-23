import {z} from 'zod'

import {createJsonCodec, createValueStorage} from '../value-storage'
import {type FeedConnection, feedConnectionSchema} from './schema'

const STORAGE_KEY = 'pomo:focus-room-feed-connections:v1'
const feedConnectionCollectionSchema = z.object({
  connections: z.array(feedConnectionSchema).readonly(),
  version: z.literal(1),
})

export interface FeedConnectionStorage {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
}

export interface FeedConnectionRepository {
  readonly list: () => ReadonlyArray<FeedConnection>
  readonly save: (connections: ReadonlyArray<FeedConnection>) => void
}

/** Persists the complete feed connection collection as one versioned setting. */
export const createFeedConnectionRepository = (
  storage: FeedConnectionStorage,
): FeedConnectionRepository => {
  const codec = createJsonCodec((value) => feedConnectionCollectionSchema.parse(value))
  const value = createValueStorage({
    ...codec,
    decode: (stored) => {
      try {
        return codec.decode(stored)
      } catch (error: unknown) {
        throw new Error('저장된 피드 연결 정보가 올바르지 않아요.', {cause: error})
      }
    },
    key: STORAGE_KEY,
    storage: () => storage,
  })
  return {
    list: () => value.read()?.connections ?? [],
    save: (connections) => {
      value.write(feedConnectionCollectionSchema.parse({connections, version: 1}))
    },
  }
}
