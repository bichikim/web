import {expect, it} from 'vitest'

import {
  createFeedConnectionRepository,
  type FeedConnection,
  type FeedConnectionStorage,
  normalizeFeedUrl,
} from '..'

const createMemoryStorage = (initialValue?: string) => {
  const values = new Map<string, string>()

  if (initialValue !== undefined) {
    values.set('pomo:focus-room-feed-connections:v1', initialValue)
  }

  const storage: FeedConnectionStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
  return storage
}

const CONNECTION: FeedConnection = {
  createdAt: '2026-08-14T00:00:00.000Z',
  id: 'feed-1',
  updatedAt: '2026-08-14T00:00:00.000Z',
  url: 'https://example.com/feed.xml',
  version: 1,
  voiceId: 'M1',
}

it('should persist a feed address and its selected voice', () => {
  const storage = createMemoryStorage()
  const repository = createFeedConnectionRepository(storage)

  repository.save([CONNECTION])

  expect(repository.list()).toEqual([CONNECTION])
})

it('should reject malformed persisted feed connections', () => {
  const repository = createFeedConnectionRepository(
    createMemoryStorage('{"connections":[{"url":"https://example.com"}],"version":1}'),
  )

  expect(() => repository.list()).toThrow('저장된 피드 연결 정보가 올바르지 않아요.')
})

it('should normalize only HTTP and HTTPS feed addresses', () => {
  expect(normalizeFeedUrl(' https://example.com/feed.xml#latest ')).toEqual({
    ok: true,
    value: 'https://example.com/feed.xml',
  })
  expect(normalizeFeedUrl('file:///feed.xml')).toEqual({ok: false})
  expect(normalizeFeedUrl('example.com/feed.xml')).toEqual({ok: false})
})
