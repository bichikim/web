import {z} from 'zod'

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
): FeedConnectionRepository => ({
  list() {
    const storedValue = storage.getItem(STORAGE_KEY)

    if (storedValue === null) {
      return []
    }

    try {
      return feedConnectionCollectionSchema.parse(JSON.parse(storedValue) as unknown).connections
    } catch (error: unknown) {
      throw new Error('저장된 피드 연결 정보가 올바르지 않아요.', {cause: error})
    }
  },
  save(connections) {
    const snapshot = feedConnectionCollectionSchema.parse({connections, version: 1})
    storage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  },
})
