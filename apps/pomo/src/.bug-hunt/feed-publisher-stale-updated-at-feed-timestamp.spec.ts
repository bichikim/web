/** @vitest-environment node */
import {expect, it} from 'vitest'

import {normalizeFeed} from '../features/feed-publisher/normalize-feed'

it('should use the later of publishedAt and updatedAt when updatedAt is stale', () => {
  const entries = [
    {
      id: 'history-1',
      publishedAt: '2026-08-20T12:00:00.000Z',
      summary: '요약',
      title: '제목',
      updatedAt: '2020-01-01T00:00:00.000Z',
      url: 'https://example.com/history/1',
    },
  ]

  expect(normalizeFeed(entries).updatedAt).toBe('2026-08-20T12:00:00.000Z')
})
