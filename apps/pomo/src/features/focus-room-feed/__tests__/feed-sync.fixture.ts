import {vi} from 'vitest'
import type {FeedDialogueRepository} from '../feed-dialogue-repository'
import type {FeedDialogueJob, FeedItemRecord} from '../feed-dialogue-schema'
import type {FeedConnection} from '../schema'
export const CONNECTION: FeedConnection = {
  createdAt: '2026-08-14T00:03:00.000Z',
  id: 'feed-1',
  updatedAt: '2026-08-14T00:00:00.000Z',
  url: 'https://example.com/feed.xml',
  version: 1,
  voiceId: 'M2',
}
export const DEFAULT_CONNECTION: FeedConnection = {
  ...CONNECTION,
  id: 'feed-default',
  voiceId: 'default',
}
export const createSettingsResolver = (connection: FeedConnection = CONNECTION) =>
  vi.fn(async (connectionId: string) =>
    connectionId === connection.id
      ? {
          modelId: 'int8' as const,
          voiceId: connection.voiceId === 'default' ? ('Yuna' as const) : connection.voiceId,
        }
      : null,
  )

export const createRepository = () => {
  const items: Array<FeedItemRecord> = []
  const jobs: Array<FeedDialogueJob> = []
  const repository: FeedDialogueRepository = {
    complete: vi.fn(),
    deleteJobs: vi.fn(),
    dispose: vi.fn(),
    failJob: vi.fn(async () => true),
    interruptUnfinishedJobs: vi.fn(async () => []),
    listExpiredMetadata: vi.fn(async () => []),
    listItems: vi.fn(async (connectionId) =>
      items.filter((item) => item.feedConnectionId === connectionId),
    ),
    listJobs: vi.fn(async () => jobs),
    listMetadata: vi.fn(async () => []),
    markListened: vi.fn(),
    queue: vi.fn(async (job, item) => {
      jobs.push(job)
      items.push(item)
    }),
    recoverMissingDialogue: vi.fn(),
    removeItem: vi.fn(),
    removeMetadata: vi.fn(),
    retryJobs: vi.fn(),
    saveItems: vi.fn(async (nextItems) => {
      items.push(...nextItems)
    }),
    startJob: vi.fn(),
  }
  return {items, jobs, repository}
}

export const createRss = (items: ReadonlyArray<{readonly id: string; readonly minute: string}>) => `
  <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Pomo 테스트</title>
    ${items
      .map(
        (item) => `<item><title>안녕하세요 ${item.minute}</title><guid>${item.id}</guid>
          <link>https://example.com/${item.id}</link>
          <pubDate>Fri, 14 Aug 2026 00:${item.minute}:00 GMT</pubDate>
          <content:encoded>안녕하세요 ${item.minute}</content:encoded></item>`,
      )
      .join('')}
  </channel></rss>`
