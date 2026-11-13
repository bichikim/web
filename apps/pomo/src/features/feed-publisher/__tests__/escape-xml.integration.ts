/** @vitest-environment jsdom */

import {expect, it} from 'vitest'
import {createFeedResponse} from 'src/server/feed-publisher/create-feed-response'
import {createFeedRegistry, type FeedFormat, type FeedProvider} from '..'

it.each(['rss', 'atom'] as const)(
  'should preserve XML text and cache validators through the %s response boundary',
  async (format: FeedFormat) => {
    const text = `prefix ${'서울<&😀"\u0000\u000b\ud800'.repeat(2_000)} suffix`
    const expected = `prefix ${'서울<&😀"'.repeat(2_000)} suffix`
    const provider: FeedProvider = {
      definition: {
        description: 'History & records',
        homeUrl: 'https://pomo.example/history',
        language: 'ko-KR',
        slug: 'history',
        title: 'History',
      },
      listEntries: async () => [
        {
          contentHtml: text,
          id: 'entry',
          publishedAt: '2026-11-13T00:00:00.000Z',
          summary: 'A summary',
          title: text,
          url: 'https://pomo.example/history/entry?first=1&second=2',
        },
      ],
    }
    const registry = createFeedRegistry([provider])
    const url = `https://pomo.example/api/feeds/history/${format}.xml`
    const response = await createFeedResponse({
      format,
      registry,
      request: new Request(url),
      slug: 'history',
    })
    expect(response.status).toBe(200)
    const document = await response.text()
    const parsed = new DOMParser().parseFromString(document, 'application/xml')
    expect(parsed.querySelector('parsererror')).toBeNull()
    const entry = parsed.getElementsByTagName(format === 'rss' ? 'item' : 'entry').item(0)
    expect(entry?.getElementsByTagName('title').item(0)?.textContent).toBe(expected)
    const content =
      format === 'rss'
        ? entry
            ?.getElementsByTagNameNS('http://purl.org/rss/1.0/modules/content/', 'encoded')
            .item(0)
        : entry?.getElementsByTagName('content').item(0)
    expect(content?.textContent).toBe(expected)
    expect(document).toContain('&lt;&amp;')
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300')
    const entityTag = response.headers.get('ETag')!
    expect(entityTag).toMatch(/^"[\w-]+"$/u)

    const head = await createFeedResponse({
      format,
      registry,
      request: new Request(url, {method: 'HEAD'}),
      slug: 'history',
    })
    expect(head.status).toBe(200)
    expect(head.headers.get('ETag')).toBe(entityTag)
    await expect(head.text()).resolves.toBe('')

    const unchanged = await createFeedResponse({
      format,
      registry,
      request: new Request(url, {headers: {'If-None-Match': entityTag}}),
      slug: 'history',
    })
    expect(unchanged.status).toBe(304)
    expect(unchanged.headers.get('ETag')).toBe(entityTag)
    await expect(unchanged.text()).resolves.toBe('')
  },
)
