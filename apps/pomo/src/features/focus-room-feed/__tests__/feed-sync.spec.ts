/** @vitest-environment jsdom */

import {expect, it, vi} from 'vitest'

import type {FeedDialogueRepository} from '../feed-dialogue-repository'
import type {FeedDialogueJob, FeedItemRecord} from '../feed-dialogue-schema'
import {createFeedScript, type ParsedFeedItem, parseFeedXml} from '../feed-parser'
import {synchronizeFeeds} from '../feed-sync'
import type {FeedConnection} from '../schema'

vi.mock('../feed-parser', async () => {
  const actual = await vi.importActual<typeof import('../feed-parser')>('../feed-parser')

  return {
    ...actual,
    createFeedScript: vi.fn(actual.createFeedScript),
    parseFeedXml: vi.fn(actual.parseFeedXml),
  }
})

const CONNECTION: FeedConnection = {
  createdAt: '2026-08-14T00:03:00.000Z',
  id: 'feed-1',
  updatedAt: '2026-08-14T00:00:00.000Z',
  url: 'https://example.com/feed.xml',
  version: 1,
  voiceId: 'M2',
}
const DEFAULT_CONNECTION: FeedConnection = {...CONNECTION, id: 'feed-default', voiceId: 'default'}
const createSettingsResolver = (connection: FeedConnection = CONNECTION) =>
  vi.fn(async (connectionId: string) =>
    connectionId === connection.id
      ? {
          modelId: 'int8' as const,
          voiceId: connection.voiceId === 'default' ? ('Yuna' as const) : connection.voiceId,
        }
      : null,
  )

const createRepository = () => {
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

const createBodylessResponse = (text: string): Response =>
  ({
    body: null,
    headers: new Headers(),
    ok: true,
    status: 200,
    text: vi.fn(async () => text),
  }) as unknown as Response

it('should queue only the newest item on the first subscription sync', async () => {
  const {items, jobs, repository} = createRepository()
  const summary = await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'job-1',
    fetcher: vi.fn(
      async () =>
        new Response(
          createRss([
            {id: 'old', minute: '00'},
            {id: 'new', minute: '05'},
          ]),
        ),
    ),
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
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
    fetcher: vi.fn(async () => new Response(createRss([{id: 'new', minute: '05'}]))),
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(DEFAULT_CONNECTION),
  })

  expect(jobs[0]).toMatchObject({modelId: 'int8', voiceId: 'Yuna'})
})

it('should queue with generation settings resolved after fetching the feed item', async () => {
  const {jobs, repository} = createRepository()
  const resolveGenerationSettings = vi.fn(async () => ({
    modelId: 'full' as const,
    voiceId: 'Yuna' as const,
  }))

  await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'latest-settings-job',
    fetcher: vi.fn(async () => new Response(createRss([{id: 'new', minute: '05'}]))),
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings,
  })

  expect(resolveGenerationSettings).toHaveBeenCalledWith(CONNECTION.id)
  expect(jobs[0]).toMatchObject({modelId: 'full', voiceId: 'Yuna'})
})

it('should not queue an item whose connection was removed during synchronization', async () => {
  const {jobs, repository} = createRepository()

  const summary = await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'removed-connection-job',
    fetcher: vi.fn(async () => new Response(createRss([{id: 'new', minute: '05'}]))),
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: vi.fn(async () => null),
  })

  expect(summary.queuedJobIds).toEqual([])
  expect(jobs).toHaveLength(0)
})

it('should ignore feed items published more than three days ago', async () => {
  const {items, jobs, repository} = createRepository()
  const summary = await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'unused',
    fetcher: vi.fn(
      async () =>
        new Response(`<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
          <channel><title>오래된 피드</title><item><title>지난 소식</title><guid>stale</guid>
          <link>https://example.com/stale</link><pubDate>Mon, 10 Aug 2026 00:00:00 GMT</pubDate>
          <content:encoded>지난 소식 본문</content:encoded></item></channel></rss>`),
    ),
    now: new Date('2026-08-14T00:00:01.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
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
    fetcher: vi.fn(
      async () =>
        new Response(`<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
          <channel><title>경계 피드</title><item><title>3일 전 소식</title><guid>cutoff</guid>
          <link>https://example.com/cutoff</link><pubDate>Tue, 11 Aug 2026 00:00:00 GMT</pubDate>
          <content:encoded>3일 전 소식 본문</content:encoded></item></channel></rss>`),
    ),
    now: new Date('2026-08-14T00:00:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
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
    fetcher: vi.fn(
      async () =>
        new Response(
          `<rss xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>긴 글</title><item><title>제목</title><guid>long</guid><link>https://example.com/long</link><content:encoded>${longText}</content:encoded></item></channel></rss>`,
        ),
    ),
    now: new Date('2026-08-14T00:00:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
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
    fetcher: vi.fn(
      async () =>
        new Response(
          createRss([
            {id: 'first', minute: '05'},
            {id: 'second', minute: '10'},
          ]),
        ),
    ),
    now: new Date('2026-08-14T00:11:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
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
    fetcher,
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
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
    fetcher: vi.fn(
      async () =>
        new Response('<rss />', {
          headers: {'Content-Length': '2000001'},
        }),
    ),
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
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

it('should synchronize connections concurrently and isolate an unknown connection failure', async () => {
  let releaseFeed: (response: Response) => void = () => undefined
  const feedResponse = new Promise<Response>((resolve) => {
    releaseFeed = resolve
  })
  const secondConnection = {...CONNECTION, id: 'feed-2', url: 'https://example.com/feed-2.xml'}
  const {items, repository} = createRepository()
  items.push({
    contentLength: 1,
    discoveredAt: '2026-08-14T00:00:00.000Z',
    feedConnectionId: CONNECTION.id,
    feedItemId: 'stored',
    id: 'feed-1\u0000stored',
    itemTitle: '저장된 항목',
    message: null,
    publishedAt: '2026-08-14T00:00:00.000Z',
    sourceTitle: '저장된 피드',
    sourceUrl: 'https://example.com/stored',
    status: 'ready',
    updatedAt: '2026-08-14T00:00:00.000Z',
    version: 1,
  })
  const fetcher = vi.fn((url: string) =>
    url === CONNECTION.url ? feedResponse : Promise.reject(new Error('')),
  )

  const synchronization = synchronizeFeeds({
    connections: [CONNECTION, secondConnection],
    createId: () => 'unused',
    fetcher,
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })

  expect(fetcher).toHaveBeenCalledTimes(2)
  releaseFeed(createBodylessResponse('<rss><channel><title>빈 피드</title></channel></rss>'))

  await expect(synchronization).resolves.toEqual({
    failures: [{connectionId: secondConnection.id, message: '피드를 가져오지 못했어요.'}],
    queuedJobIds: [],
    successfulConnections: 1,
  })
})

it('should reject an oversized bodyless feed response after reading its text', async () => {
  const {repository} = createRepository()
  const summary = await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'unused',
    fetcher: vi.fn(async () => createBodylessResponse('가'.repeat(2_000_001))),
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })

  expect(summary.failures[0]?.message).toBe('응답 크기가 안전한 처리 한도를 넘었어요.')
})

it('should cancel an oversized streamed feed response', async () => {
  const {repository} = createRepository()
  const summary = await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'unused',
    fetcher: vi.fn(async () => new Response(new Uint8Array(2_000_001))),
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })

  expect(summary.failures[0]?.message).toBe('응답 크기가 안전한 처리 한도를 넘었어요.')
})

it('should report a non-successful feed response', async () => {
  const {repository} = createRepository()
  const summary = await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'unused',
    fetcher: vi.fn(async () => new Response('', {status: 503})),
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })

  expect(summary.failures[0]?.message).toBe('피드 서버가 503 응답을 보냈어요.')
})

it('should fetch and extract a linked article when a feed only provides a summary', async () => {
  const {items, jobs, repository} = createRepository()
  const feedXml = `<rss><channel><title>요약 피드</title><item><title>연결된 글</title>
    <guid>linked</guid><link>https://example.com/article</link>
    <pubDate>Fri, 14 Aug 2026 00:05:00 GMT</pubDate><description>요약</description>
    </item></channel></rss>`
  const fetcher = vi.fn(async (url: string) =>
    url === CONNECTION.url
      ? new Response(feedXml)
      : new Response('<html><article>연결된 전체 원문</article></html>'),
  )

  await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'linked-job',
    fetcher,
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })

  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(jobs[0]?.script).toBe('연결된 글\n\n연결된 전체 원문')
  expect(items[0]).toMatchObject({feedItemId: 'linked', status: 'queued'})
})

it('should retain a linked item when the article has no readable text', async () => {
  const {items, repository} = createRepository()
  const feedXml = `<rss><channel><title>요약 피드</title><item><title>빈 글</title>
    <guid>empty-article</guid><link>https://example.com/empty</link>
    <pubDate>Fri, 14 Aug 2026 00:05:00 GMT</pubDate><description>요약</description>
    </item></channel></rss>`

  await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'unused',
    fetcher: vi.fn(async (url: string) =>
      url === CONNECTION.url
        ? new Response(feedXml)
        : new Response('<html><body><script>숨김</script></body></html>'),
    ),
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })

  expect(items[0]).toMatchObject({
    message: '연결된 페이지에서 전체 원문을 찾지 못했어요.',
    status: 'failed',
  })
})

it('should retain a summary item that has no article link', async () => {
  const {items, repository} = createRepository()
  await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'unused',
    fetcher: vi.fn(
      async () =>
        new Response(`<rss><channel><title>링크 없는 피드</title><item><title>링크 없음</title>
          <guid>no-link</guid><pubDate>Fri, 14 Aug 2026 00:05:00 GMT</pubDate>
          <description>요약</description></item></channel></rss>`),
    ),
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })

  expect(items[0]).toMatchObject({
    message: '피드가 전체 원문이나 원문 주소를 제공하지 않았어요.',
    sourceUrl: CONNECTION.url,
    status: 'failed',
  })
})

it('should retain a parser item whose generated script is empty with defensive defaults', async () => {
  const {items, repository} = createRepository()
  vi.mocked(parseFeedXml).mockReturnValueOnce({
    items: [
      {
        content: '본문',
        contentKind: 'full',
        id: 'empty-script',
        link: '',
        publishedAt: null,
        title: '',
      },
    ],
    title: '',
  })
  vi.mocked(createFeedScript).mockReturnValueOnce('')

  await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'unused',
    fetcher: vi.fn(async () => new Response('<rss />')),
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })

  expect(items[0]).toMatchObject({
    itemTitle: '제목 없는 피드',
    message: '읽을 수 있는 원문이 없어요.',
    publishedAt: '2026-08-14T00:06:00.000Z',
    sourceTitle: 'example.com',
    sourceUrl: CONNECTION.url,
    status: 'failed',
  })
})

it('should normalize defensive defaults while ignoring a stale parser item', async () => {
  const {items, repository} = createRepository()
  let publishedAtReads = 0
  const staleItem: ParsedFeedItem = {
    content: '본문',
    contentKind: 'full',
    id: 'stale-parser-item',
    link: '',
    get publishedAt() {
      publishedAtReads += 1
      return publishedAtReads <= 2 ? '2026-08-01T00:00:00.000Z' : null
    },
    title: '',
  }
  vi.mocked(parseFeedXml).mockReturnValueOnce({items: [staleItem], title: ''})

  await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'unused',
    fetcher: vi.fn(async () => new Response('<rss />')),
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })

  expect(items[0]).toMatchObject({
    itemTitle: '제목 없는 피드',
    publishedAt: '2026-08-14T00:06:00.000Z',
    sourceTitle: 'example.com',
    sourceUrl: CONNECTION.url,
    status: 'ignored',
  })
})

it('should queue multiple undated feed items without inventing a sort timestamp', async () => {
  const {jobs, repository} = createRepository()
  let nextId = 0

  await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => {
      nextId += 1
      return `undated-job-${nextId}`
    },
    fetcher: vi.fn(
      async () =>
        new Response(`<rss xmlns:content="http://purl.org/rss/1.0/modules/content/">
          <channel><title>날짜 없는 피드</title>
            <item><title>첫 항목</title><guid>undated-1</guid>
              <content:encoded>첫 본문</content:encoded></item>
            <item><title>둘째 항목</title><guid>undated-2</guid>
              <content:encoded>둘째 본문</content:encoded></item>
          </channel></rss>`),
    ),
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })

  expect(jobs.map((job) => job.feedItemId)).toEqual(['undated-1', 'undated-2'])
})
