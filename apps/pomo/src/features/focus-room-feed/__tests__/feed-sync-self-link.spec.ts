/** @vitest-environment jsdom */
import {CONNECTION, createRepository, createSettingsResolver} from './feed-sync.fixture'

import {expect, it, vi} from 'vitest'

import {synchronizeFeeds} from '../feed-sync'

it.each([
  {
    feedUrl: 'https://example.com/feed.xml',
    itemUrl: 'https://www.example.com/feed.xml',
    name: 'www-prefixed item URL',
  },
  {
    feedUrl: 'https://www.example.com/feed.xml',
    itemUrl: 'https://example.com/feed.xml',
    name: 'www-prefixed feed URL',
  },
])('should reject a self-link with only a www prefix difference ($name)', async (options) => {
  const connection = {...CONNECTION, url: options.feedUrl}
  const {items, jobs, repository} = createRepository()
  const fetcher = vi.fn(
    async () =>
      new Response(`<rss><channel><title>Pomo 테스트</title><item>
        <title>안녕하세요</title><guid>www-self-link</guid>
        <link>${options.itemUrl}</link>
        <pubDate>Fri, 14 Aug 2026 00:05:00 GMT</pubDate>
        <description>안녕하세요</description></item></channel></rss>`),
  )

  await synchronizeFeeds({
    connections: [connection],
    createId: () => 'unused',
    fetcher,
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(connection),
  })

  expect(fetcher).toHaveBeenCalledOnce()
  expect(jobs).toHaveLength(0)
  expect(items[0]).toMatchObject({
    message: '피드 항목이 원문 대신 피드 자체 주소를 가리키고 있어요.',
    status: 'failed',
  })
})
