/** @vitest-environment jsdom */

import {expect, it} from 'vitest'

import {createFeedScript, extractArticleText, parseFeedXml} from '../feed-parser'

it('should parse RSS content and preserve all readable text', () => {
  const feed = parseFeedXml(
    `<?xml version="1.0"?>
      <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>테스트 RSS</title><item>
        <title>새 소식</title><guid>rss-1</guid><link>/articles/1</link>
        <pubDate>Fri, 14 Aug 2026 00:00:00 GMT</pubDate>
        <content:encoded><![CDATA[<p>안녕하세요 <strong>RSS</strong>입니다.</p>]]></content:encoded>
      </item></channel></rss>`,
    'https://example.com/feed.xml',
  )

  expect(feed.title).toBe('테스트 RSS')
  expect(feed.items).toEqual([
    {
      content: '<p>안녕하세요 <strong>RSS</strong>입니다.</p>',
      contentKind: 'full',
      id: 'rss-1',
      link: 'https://example.com/articles/1',
      publishedAt: '2026-08-14T00:00:00.000Z',
      title: '새 소식',
    },
  ])
  expect(createFeedScript(feed.items[0]!.title, feed.items[0]!.content)).toBe(
    '새 소식\n\n안녕하세요 RSS입니다.',
  )
})

it('should parse Atom links and content', () => {
  const feed = parseFeedXml(
    `<?xml version="1.0"?>
      <feed xmlns="http://www.w3.org/2005/Atom"><title>테스트 Atom</title><entry>
        <title>Atom 소식</title><id>atom-1</id><link href="https://example.com/atom-1" />
        <updated>2026-08-14T01:00:00Z</updated><content>안녕하세요 Atom입니다.</content>
      </entry></feed>`,
    'https://example.com/atom.xml',
  )

  expect(feed.items[0]).toMatchObject({
    content: '안녕하세요 Atom입니다.',
    contentKind: 'full',
    id: 'atom-1',
    link: 'https://example.com/atom-1',
    title: 'Atom 소식',
  })
})

it('should extract article text without navigation or scripts', () => {
  expect(
    extractArticleText(
      '<nav>메뉴</nav><article><h1>제목</h1><p>본문 전체</p><script>광고()</script></article>',
    ),
  ).toBe('제목본문 전체')
})
