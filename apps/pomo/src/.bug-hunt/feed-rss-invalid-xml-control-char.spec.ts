/** @vitest-environment jsdom */
import {describe, expect, it} from 'vitest'

import {renderRss} from '../features/feed-publisher/render-rss'

/** Published moment titles flow into RSS via escapeXmlText; invalid XML 1.0 chars must not reach the document. */
describe('feed RSS invalid XML control characters', () => {
  it('should produce parseable RSS when an entry title contains a disallowed control character', () => {
    const document = renderRss({
      definition: {
        description: 'd',
        homeUrl: 'https://example.com',
        language: 'ko',
        slug: 'today-in-history',
        title: '오늘의 역사',
      },
      entries: [
        {
          id: 'urn:pomo:history:sample',
          publishedAt: '2026-01-01T00:00:00.000Z',
          summary: '요약',
          title: '사건\x08제목',
          updatedAt: '2026-01-01T00:00:00.000Z',
          url: 'https://example.com/history/sample',
        },
      ],
      selfUrl: 'https://example.com/api/feeds/today-in-history/rss.xml',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    const parsed = new DOMParser().parseFromString(document, 'application/xml')
    expect(parsed.querySelector('parsererror')).toBeNull()
    expect(parsed.querySelector('item title')?.textContent).toBe('사건제목')
  })
})
