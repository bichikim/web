/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import {afterEach, expect, it} from 'vitest'
import {createFeedDialogueRepository} from '../feed-dialogue-repository'
import {parseFeedXml} from '../feed-parser'
import {synchronizeFeeds} from '../feed-sync'
import {CONNECTION, createRss, createSettingsResolver} from './feed-sync.fixture'

const entry = `<item><title>Same article</title><guid>same-guid</guid><link>https://example.com/article</link><pubDate>Fri, 14 Aug 2026 00:05:00 GMT</pubDate><content:encoded>Same full article body</content:encoded></item>`
const xml = `<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>News</title>${entry}${entry.replace('Same full article body', 'Conflicting second body')}</channel></rss>`

const repositories: Array<ReturnType<typeof createFeedDialogueRepository>> = []
afterEach(async () => {
  repositories.forEach((repository) => repository.dispose())
  repositories.length = 0
  await Dexie.delete('pomo-focus-room')
})

it('should persist only the first same-GUID RSS entry and none on the next sync', async () => {
  const parsed = parseFeedXml(xml, CONNECTION.url)
  expect(parsed.items).toHaveLength(2)
  expect(parsed.items[0]?.id).toBe(parsed.items[1]?.id)
  expect(parsed.items[0]?.content).not.toBe(parsed.items[1]?.content)
  const repository = createFeedDialogueRepository({deleteDialogueAudio: async () => undefined})
  repositories.push(repository)
  let nextId = 0
  const options = {
    connections: [CONNECTION],
    createId: () => {
      nextId += 1
      return `job-${nextId}`
    },
    fetcher: async () => new Response(xml),
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  }

  const first = await synchronizeFeeds(options)
  const jobs = await repository.listJobs()
  const items = await repository.listItems(CONNECTION.id)
  expect({failures: first.failures, items: items.length, jobs: jobs.length}).toEqual({
    failures: [],
    items: 1,
    jobs: 1,
  })
  expect(first.queuedJobIds).toEqual(['job-1'])
  expect(jobs[0]).toMatchObject({
    feedItemId: 'same-guid',
    script: 'Same article\n\nSame full article body',
    status: 'queued',
  })
  expect(items[0]).toMatchObject({feedItemId: 'same-guid', status: 'queued'})

  expect(await synchronizeFeeds(options)).toEqual({
    failures: [],
    queuedJobIds: [],
    successfulConnections: 1,
  })
  expect(await repository.listJobs()).toEqual(jobs)
})

it('should process the saved undated overflow after a reload even if the publisher dropped it', async () => {
  const legacy = new Dexie('pomo-focus-room')
  legacy.version(2).stores({
    dialogues: 'id, updatedAt',
    eventBindings: 'event',
    feedDialogueJobs: 'id, status, updatedAt, feedConnectionId, [feedConnectionId+feedItemId]',
    feedDialogueMetadata:
      'dialogueId, expiresAt, feedConnectionId, listenedAt, [feedConnectionId+feedItemId]',
    feedItems: 'id, feedConnectionId, status, discoveredAt',
  })
  try {
    const time = '2026-08-14T00:05:00.000Z'
    await legacy.table('feedItems').put({
      contentLength: 4,
      discoveredAt: time,
      feedConnectionId: CONNECTION.id,
      feedItemId: 'seed',
      id: `${CONNECTION.id}\u0000seed`,
      itemTitle: 'Seed',
      message: null,
      publishedAt: time,
      sourceTitle: 'News',
      sourceUrl: 'https://example.com/seed',
      status: 'ready',
      updatedAt: time,
      version: 1,
    })
  } finally {
    legacy.close()
  }
  const original = createFeedDialogueRepository({deleteDialogueAudio: async () => undefined})
  repositories.push(original)
  expect(await original.listItems(CONNECTION.id)).toContainEqual(
    expect.objectContaining({feedItemId: 'seed', status: 'ready'}),
  )
  let job = 0
  const options = {
    connections: [CONNECTION],
    createId: () => {
      job += 1
      return `job-${job}`
    },
    now: new Date('2026-08-14T00:40:00.000Z'),
    resolveGenerationSettings: createSettingsResolver(),
  }
  const current = createRss(
    Array.from({length: 20}, (_, index) => ({id: `article-${index}`, minute: String(index + 10)})),
  )
  const overflow = current.replace(
    '</channel>',
    '<item><guid>undated</guid><title>Undated</title>' +
      '<content:encoded>Persist this article.</content:encoded></item></channel>',
  )
  const first = await synchronizeFeeds({
    ...options,
    fetcher: async () => new Response(overflow),
    repository: original,
  })
  expect(first.queuedJobIds).toHaveLength(20)
  expect(await original.listJobs()).not.toContainEqual(
    expect.objectContaining({feedItemId: 'undated'}),
  )
  original.dispose()

  const reopened = createFeedDialogueRepository({deleteDialogueAudio: async () => undefined})
  const parallel = createFeedDialogueRepository({deleteDialogueAudio: async () => undefined})
  repositories.push(reopened, parallel)
  const next = {...options, fetcher: async () => new Response(current), repository: reopened}
  const attempts = await Promise.all([
    synchronizeFeeds(next),
    synchronizeFeeds({...next, repository: parallel}),
  ])
  expect(attempts.flatMap(({failures}) => failures)).toEqual([])
  expect(attempts.flatMap(({queuedJobIds}) => queuedJobIds)).toHaveLength(1)
  expect(await reopened.listJobs()).toContainEqual(
    expect.objectContaining({feedItemId: 'undated', script: 'Undated\n\nPersist this article.'}),
  )
  expect((await synchronizeFeeds(next)).queuedJobIds).toEqual([])
})
