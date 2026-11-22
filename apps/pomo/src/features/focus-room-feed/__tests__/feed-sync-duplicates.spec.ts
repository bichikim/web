/** @vitest-environment jsdom */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import {afterEach, expect, it} from 'vitest'
import {createFeedDialogueRepository} from '../feed-dialogue-repository'
import {parseFeedXml} from '../feed-parser'
import {synchronizeFeeds} from '../feed-sync'
import {CONNECTION, createSettingsResolver} from './feed-sync.fixture'

const entry = `<item><title>Same article</title><guid>same-guid</guid><link>https://example.com/article</link><pubDate>Fri, 14 Aug 2026 00:05:00 GMT</pubDate><content:encoded>Same full article body</content:encoded></item>`
const xml = `<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>News</title>${entry}${entry}</channel></rss>`

const repositories: Array<ReturnType<typeof createFeedDialogueRepository>> = []
afterEach(async () => {
  repositories.forEach((repository) => repository.dispose())
  repositories.length = 0
  await Dexie.delete('pomo-focus-room')
})

it('should persist one job for identical parsed RSS entries and none on the next sync', async () => {
  const parsed = parseFeedXml(xml, CONNECTION.url)
  expect(parsed.items).toHaveLength(2)
  expect(parsed.items[0]).toEqual(parsed.items[1])
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
  expect(jobs[0]).toMatchObject({feedItemId: 'same-guid', status: 'queued'})
  expect(items[0]).toMatchObject({feedItemId: 'same-guid', status: 'queued'})

  expect(await synchronizeFeeds(options)).toEqual({
    failures: [],
    queuedJobIds: [],
    successfulConnections: 1,
  })
  expect(await repository.listJobs()).toEqual(jobs)
})
