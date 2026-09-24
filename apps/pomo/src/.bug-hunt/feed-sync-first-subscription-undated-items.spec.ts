/** @vitest-environment jsdom */
import {CONNECTION, createRepository, createSettingsResolver} from '../features/focus-room-feed/__tests__/feed-sync.fixture'
import {expect, it, vi} from 'vitest'

import {parseFeedXml} from '../features/focus-room-feed/feed-parser'
import {synchronizeFeeds} from '../features/focus-room-feed/feed-sync'

vi.mock('../features/focus-room-feed/feed-parser', async () => {
  const actual = await vi.importActual<typeof import('../features/focus-room-feed/feed-parser')>(
    '../features/focus-room-feed/feed-parser',
  )

  return {
    ...actual,
    parseFeedXml: vi.fn(actual.parseFeedXml),
  }
})

it('should queue only one item on first subscription when every unseen entry lacks publishedAt', async () => {
  vi.mocked(parseFeedXml).mockReturnValueOnce({
    items: [
      {
        content: '첫 항목',
        contentKind: 'full',
        id: 'first',
        link: 'https://example.com/first',
        publishedAt: null,
        title: '첫 항목',
      },
      {
        content: '두 번째',
        contentKind: 'full',
        id: 'second',
        link: 'https://example.com/second',
        publishedAt: null,
        title: '두 번째',
      },
    ],
    title: '테스트 피드',
  })

  const {jobs, repository} = createRepository()
  const summary = await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => `job-${jobs.length + 1}`,
    fetcher: vi.fn(async () => new Response('<rss />')),
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })

  expect(summary.queuedJobIds).toHaveLength(1)
  expect(jobs).toHaveLength(1)
})
