import {describe, expect, it} from 'vitest'

import type {FeedRenderInput} from '../contract'
import {renderRss} from '../render-rss'

const createInput = (): FeedRenderInput => ({
  definition: {
    description: '날짜별 사건 & 인물 <요약>',
    homeUrl: 'https://pomo.example/feeds/history?view=all&lang=ko',
    language: 'ko-KR',
    slug: 'today-in-history',
    title: '오늘의 역사 & 기록',
  },
  entries: [
    {
      id: 'urn:pomo:history:older',
      publishedAt: '2026-08-14T00:00:00.000Z',
      summary: '오래된 항목의 요약',
      title: '오래된 항목',
      updatedAt: '2026-08-15T12:00:00.000Z',
      url: 'https://pomo.example/history/older',
    },
    {
      contentHtml: '<p>서울 & 세계의 <strong>기록</strong></p>',
      id: 'urn:pomo:history:newer&stable',
      publishedAt: '2026-08-15T01:02:03.000Z',
      summary: '새로운 사건 > 이전 사건',
      title: '새로운 <사건>',
      url: 'https://pomo.example/history/newer?source=one&lang=ko',
    },
  ],
  selfUrl: 'https://pomo.example/feeds/today-in-history/rss.xml?label="오늘"&owner=민수\'s',
  updatedAt: '2026-08-15T12:00:00.000Z',
})

describe('renderRss', () => {
  it('should render deterministic RSS with escaped metadata and stable entry ids', () => {
    const input = createInput()
    const document = renderRss(input)

    expect(renderRss(input)).toBe(document)
    expect(document).toContain('<title>오늘의 역사 &amp; 기록</title>')
    expect(document).toContain('<description>날짜별 사건 &amp; 인물 &lt;요약&gt;</description>')
    expect(document).toContain(
      'href="https://pomo.example/feeds/today-in-history/rss.xml?label=&quot;오늘&quot;&amp;owner=민수&apos;s"',
    )
    expect(document).toContain('<guid isPermaLink="false">urn:pomo:history:newer&amp;stable</guid>')
    expect(document).toContain(
      '<content:encoded>&lt;p&gt;서울 &amp; 세계의 &lt;strong&gt;기록&lt;/strong&gt;&lt;/p&gt;</content:encoded>',
    )
  })

  it('should sort entries by publication date and serialize RSS dates', () => {
    const document = renderRss(createInput())

    expect(document.indexOf('urn:pomo:history:newer')).toBeLessThan(
      document.indexOf('urn:pomo:history:older'),
    )
    expect(document).toContain('<pubDate>Sat, 15 Aug 2026 01:02:03 GMT</pubDate>')
    expect(document).toContain('<lastBuildDate>Sat, 15 Aug 2026 12:00:00 GMT</lastBuildDate>')
  })

  it('should omit item markup and optional content when entries are absent', () => {
    const input = createInput()
    const document = renderRss({...input, entries: []})

    expect(document).not.toContain('<item>')
    expect(document).not.toContain('<content:encoded>')
  })
})
