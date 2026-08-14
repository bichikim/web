/** @vitest-environment jsdom */

import {expect, it, vi} from 'vitest'

import type {FeedDialogueRepository} from '../feed-dialogue-repository'
import type {FeedDialogueJob, FeedItemRecord} from '../feed-dialogue-schema'
import {synchronizeFeeds} from '../feed-sync'
import type {FeedConnection} from '../schema'

const CONNECTION: FeedConnection = {
  createdAt: '2026-08-14T00:03:00.000Z',
  id: 'feed-1',
  updatedAt: '2026-08-14T00:00:00.000Z',
  url: 'https://example.com/feed.xml',
  version: 1,
  voiceId: 'M2',
}
const DEFAULT_CONNECTION: FeedConnection = {...CONNECTION, id: 'feed-default', voiceId: 'default'}

const createRepository = () => {
  const items: Array<FeedItemRecord> = []
  const jobs: Array<FeedDialogueJob> = []
  const repository: FeedDialogueRepository = {
    complete: vi.fn(),
    deleteJobs: vi.fn(),
    dispose: vi.fn(),
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
    removeItem: vi.fn(),
    removeMetadata: vi.fn(),
    retryJobs: vi.fn(),
    saveItems: vi.fn(async (nextItems) => {
      items.push(...nextItems)
    }),
    updateJob: vi.fn(),
  }
  return {items, jobs, repository}
}

const createRss = (items: ReadonlyArray<{readonly id: string; readonly minute: string}>) => `
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

it('should queue only the newest item on the first subscription sync', async () => {
  const {items, jobs, repository} = createRepository()
  const summary = await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'job-1',
    defaultVoiceId: 'Yuna',
    fetcher: vi.fn(
      async () =>
        new Response(
          createRss([
            {id: 'old', minute: '00'},
            {id: 'new', minute: '05'},
          ]),
        ),
    ),
    modelId: 'int8',
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
  })

  expect(summary).toEqual({failures: [], queuedJobIds: ['job-1'], successfulConnections: 1})
  expect(jobs).toHaveLength(1)
  expect(jobs[0]).toMatchObject({
    feedItemId: 'new',
    modelId: 'int8',
    status: 'queued',
    voiceId: 'M2',
  })
  expect(items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({feedItemId: 'old', status: 'ignored'}),
      expect.objectContaining({feedItemId: 'new', status: 'queued'}),
    ]),
  )
})

it('should resolve a default feed voice from the automatic dialogue settings', async () => {
  const {jobs, repository} = createRepository()

  await synchronizeFeeds({
    connections: [DEFAULT_CONNECTION],
    createId: () => 'default-voice-job',
    defaultVoiceId: 'Yuna',
    fetcher: vi.fn(async () => new Response(createRss([{id: 'new', minute: '05'}]))),
    modelId: 'int8',
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
  })

  expect(jobs[0]).toMatchObject({modelId: 'int8', voiceId: 'Yuna'})
})

it('should ignore feed items published more than three days ago', async () => {
  const {items, jobs, repository} = createRepository()
  const summary = await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'unused',
    defaultVoiceId: 'Yuna',
    fetcher: vi.fn(
      async () =>
        new Response(`<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
          <channel><title>오래된 피드</title><item><title>지난 소식</title><guid>stale</guid>
          <link>https://example.com/stale</link><pubDate>Mon, 10 Aug 2026 00:00:00 GMT</pubDate>
          <content:encoded>지난 소식 본문</content:encoded></item></channel></rss>`),
    ),
    modelId: 'int8',
    now: new Date('2026-08-14T00:00:01.000Z'),
    repository,
  })

  expect(summary.queuedJobIds).toEqual([])
  expect(jobs).toHaveLength(0)
  expect(items[0]).toMatchObject({
    feedItemId: 'stale',
    message: '발행 후 3일이 지난 이전 항목이에요.',
    status: 'ignored',
  })
})

it('should accept a feed item published exactly three days ago', async () => {
  const {jobs, repository} = createRepository()
  const summary = await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'job-at-cutoff',
    defaultVoiceId: 'Yuna',
    fetcher: vi.fn(
      async () =>
        new Response(`<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
          <channel><title>경계 피드</title><item><title>3일 전 소식</title><guid>cutoff</guid>
          <link>https://example.com/cutoff</link><pubDate>Tue, 11 Aug 2026 00:00:00 GMT</pubDate>
          <content:encoded>3일 전 소식 본문</content:encoded></item></channel></rss>`),
    ),
    modelId: 'int8',
    now: new Date('2026-08-14T00:00:00.000Z'),
    repository,
  })

  expect(summary.queuedJobIds).toEqual(['job-at-cutoff'])
  expect(jobs[0]).toMatchObject({feedItemId: 'cutoff', status: 'queued'})
})

it('should retain an over-limit item without creating a partial speech job', async () => {
  const {items, jobs, repository} = createRepository()
  const longText = '가'.repeat(3001)
  await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'unused',
    defaultVoiceId: 'Yuna',
    fetcher: vi.fn(
      async () =>
        new Response(
          `<rss xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>긴 글</title><item><title>제목</title><guid>long</guid><link>https://example.com/long</link><content:encoded>${longText}</content:encoded></item></channel></rss>`,
        ),
    ),
    modelId: 'int8',
    now: new Date('2026-08-14T00:00:00.000Z'),
    repository,
  })

  expect(jobs).toHaveLength(0)
  expect(items[0]).toMatchObject({feedItemId: 'long', status: 'too-long'})
  expect(items[0]?.message).toContain('3,000자 제한')
})

it('should queue every item published after the subscription was created', async () => {
  const {jobs, repository} = createRepository()
  let nextId = 0

  await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => {
      nextId += 1
      return `job-${nextId}`
    },
    defaultVoiceId: 'Yuna',
    fetcher: vi.fn(
      async () =>
        new Response(
          createRss([
            {id: 'first', minute: '05'},
            {id: 'second', minute: '10'},
          ]),
        ),
    ),
    modelId: 'int8',
    now: new Date('2026-08-14T00:11:00.000Z'),
    repository,
  })

  expect(jobs.map((job) => job.feedItemId)).toEqual(['first', 'second'])
})

it('should not treat the feed XML itself as an article document', async () => {
  const {items, jobs, repository} = createRepository()
  const fetcher = vi.fn(
    async () =>
      new Response(`<rss><channel><title>Pomo 테스트</title><item>
        <title>안녕하세요</title><guid>self-link</guid>
        <link>https://example.com/feed.xml#self-link</link>
        <pubDate>Fri, 14 Aug 2026 00:05:00 GMT</pubDate>
        <description>안녕하세요</description></item></channel></rss>`),
  )

  await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'unused',
    defaultVoiceId: 'Yuna',
    fetcher,
    modelId: 'int8',
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
  })

  expect(fetcher).toHaveBeenCalledOnce()
  expect(jobs).toHaveLength(0)
  expect(items[0]).toMatchObject({
    message: '피드 항목이 원문 대신 피드 자체 주소를 가리키고 있어요.',
    status: 'failed',
  })
})

it('should reject an oversized feed response before parsing it', async () => {
  const {repository} = createRepository()
  const summary = await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'unused',
    defaultVoiceId: 'Yuna',
    fetcher: vi.fn(
      async () =>
        new Response('<rss />', {
          headers: {'Content-Length': '2000001'},
        }),
    ),
    modelId: 'int8',
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
  })

  expect(summary).toEqual({
    failures: [
      {
        connectionId: CONNECTION.id,
        message: '응답 크기가 안전한 처리 한도를 넘었어요.',
      },
    ],
    queuedJobIds: [],
    successfulConnections: 0,
  })
})
