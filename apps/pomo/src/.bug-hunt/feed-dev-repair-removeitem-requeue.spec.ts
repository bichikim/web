/** @vitest-environment jsdom */
import {expect, it, vi} from 'vitest'

import type {PDialogue, PDialogueRepository} from '../features/focus-room-dialogue'
import {repairStoredDevFeedDialogues} from '../features/focus-room-feed/feed-dialogue-repair'
import type {FeedDialogueMetadata} from '../features/focus-room-feed/feed-dialogue-schema'
import type {FeedConnection} from '../features/focus-room-feed/schema'
import {synchronizeFeeds} from '../features/focus-room-feed/feed-sync'
import {
  CONNECTION,
  createRepository,
  createRss,
  createSettingsResolver,
} from '../features/focus-room-feed/__tests__/feed-sync.fixture'

it('should keep a dedupe tombstone when malformed dev feed dialogues are repaired', async () => {
  const {items, jobs, repository} = createRepository()
  const rss = createRss([{id: 'malformed', minute: '05'}])
  const fetcher = vi.fn(async () => new Response(rss))

  await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'job-initial',
    fetcher,
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })

  expect(jobs).toHaveLength(1)
  const malformedMetadata: FeedDialogueMetadata = {
    createdAt: '2026-08-14T00:06:00.000Z',
    dialogueId: 'malformed',
    expiresAt: '2026-08-16T00:06:00.000Z',
    feedConnectionId: CONNECTION.id,
    feedItemId: 'malformed',
    itemTitle: '안녕하세요 05',
    listenedAt: null,
    publishedAt: '2026-08-14T00:05:00.000Z',
    sourceTitle: 'Pomo 테스트',
    sourceUrl: 'https://example.test/__dev/feeds/rss.xml',
    version: 1,
  }
  const dialogueRepository = {
    deleteDialogue: vi.fn(async () => undefined),
    getDialogue: vi.fn(async (id: string) =>
      id === 'malformed' ? ({id, text: 'pomo-dev-feed: leaked'} as PDialogue) : null,
    ),
  } as unknown as PDialogueRepository
  vi.mocked(repository.listMetadata).mockResolvedValue([malformedMetadata])

  await repairStoredDevFeedDialogues({
    connections: [{id: CONNECTION.id} as FeedConnection],
    dialogueRepository,
    feedRepository: repository,
  })

  jobs.length = 0
  await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'job-after-repair',
    fetcher,
    now: new Date('2026-08-14T00:07:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })

  expect(jobs).toHaveLength(0)
  expect(items).toEqual([
    expect.objectContaining({feedItemId: 'malformed', status: 'dismissed'}),
  ])
})
