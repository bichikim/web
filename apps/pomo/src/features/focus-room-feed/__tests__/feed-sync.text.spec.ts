/** @vitest-environment jsdom */
import {expect, it, vi} from 'vitest'
import {synchronizeFeeds} from '../feed-sync'
import {CONNECTION, createRepository, createSettingsResolver} from './feed-sync.fixture'

it('should preserve escaped markup from a linked article in the queued script', async () => {
  const {items, jobs, repository} = createRepository()
  const xml = `<rss><channel><title>기술 소식</title><item>
    <title>태그 설명</title><guid>linked-markup</guid><link>https://example.com/article</link>
    <pubDate>Fri, 14 Aug 2026 00:05:00 GMT</pubDate><description>요약</description>
  </item></channel></rss>`
  const fetcher = vi.fn(
    async (url: string) =>
      new Response(
        url === CONNECTION.url ? xml : '<article><p>&lt;b&gt;tag&lt;/b&gt;</p></article>',
      ),
  )

  const summary = await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'linked-job',
    fetcher,
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })

  expect(summary).toEqual({failures: [], queuedJobIds: ['linked-job'], successfulConnections: 1})
  expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
    CONNECTION.url,
    'https://example.com/article',
  ])
  expect(jobs[0]?.script).toBe('태그 설명\n\n<b>tag</b>')
  expect(items[0]).toMatchObject({contentLength: 17, status: 'queued'})
})

it('should preserve escaped title markup with full feed content in the queued script', async () => {
  const {items, jobs, repository} = createRepository()
  const fetcher = vi.fn(
    async () =>
      new Response(`<rss xmlns:content="urn:content"><channel>
    <title>기술 소식</title><item><title><![CDATA[&lt;b&gt;제목&lt;/b&gt;]]></title>
    <guid>full-markup</guid><link>https://example.com/article</link>
    <pubDate>Fri, 14 Aug 2026 00:05:00 GMT</pubDate>
    <content:encoded><![CDATA[<p>&lt;i&gt;본문&lt;/i&gt;</p>]]></content:encoded>
  </item></channel></rss>`),
  )

  await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'full-job',
    fetcher,
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })

  expect(fetcher).toHaveBeenCalledOnce()
  expect(jobs[0]).toMatchObject({itemTitle: '<b>제목</b>', script: '<b>제목</b>\n\n<i>본문</i>'})
  expect(items[0]).toMatchObject({itemTitle: '<b>제목</b>', status: 'queued'})
})

it.each([
  {
    content: '<p>&lt;script&gt;example()&lt;/script&gt; &amp; 본문</p>',
    expected: '제목\n\n<script>example()</script> & 본문',
    title: '제목',
  },
  {
    content: '<p>같은 &lt;b&gt;내용&lt;/b&gt;</p>',
    expected: '같은 <b>내용</b>',
    title: '같은 &lt;b&gt;내용&lt;/b&gt;',
  },
  {
    content: `<nav>메뉴</nav><p> 본문\n 텍스트 </p><script>실행()</script><style>숨김</style>
      <noscript>대체</noscript><aside>광고</aside><form>입력</form><button>버튼</button>
      <iframe>프레임</iframe><svg><text>그림</text></svg><canvas>캔버스</canvas><template>틀</template>
      <footer data-pomo-speech="exclude">출처</footer>`,
    expected: '제목\n\n본문 텍스트',
    title: '<b>제목</b><script>실행()</script>',
  },
])(
  'should compose sanitized article text without reparsing it: $expected',
  async ({content, expected, title}) => {
    const {jobs, repository} = createRepository()
    const xml = `<rss><channel><item><title><![CDATA[${title}]]></title><guid>text-case</guid>
    <link>https://example.com/article</link><pubDate>Fri, 14 Aug 2026 00:05:00 GMT</pubDate>
    <description>요약</description></item></channel></rss>`
    await synchronizeFeeds({
      connections: [CONNECTION],
      createId: () => 'text-job',
      fetcher: async (url) =>
        new Response(url === CONNECTION.url ? xml : `<article>${content}</article>`),
      now: new Date('2026-08-14T00:06:00.000Z'),
      repository,
      resolveGenerationSettings: createSettingsResolver(),
    })

    expect(jobs[0]?.script).toBe(expected)
  },
)

it.each([3000, 3001])(
  'should enforce the script length limit on preserved article text: %s',
  async (length) => {
    const {items, jobs, repository} = createRepository()
    const text = `<b>${'가'.repeat(length - 10)}</b>`
    const xml = `<rss><channel><item><title>제</title><guid>length-case</guid>
    <link>https://example.com/article</link><pubDate>Fri, 14 Aug 2026 00:05:00 GMT</pubDate>
    <description>요약</description></item></channel></rss>`
    await synchronizeFeeds({
      connections: [CONNECTION],
      createId: () => 'length-job',
      fetcher: async (url) =>
        new Response(
          url === CONNECTION.url
            ? xml
            : `<article>&lt;b&gt;${'가'.repeat(length - 10)}&lt;/b&gt;</article>`,
        ),
      now: new Date('2026-08-14T00:06:00.000Z'),
      repository,
      resolveGenerationSettings: createSettingsResolver(),
    })

    expect(items[0]).toMatchObject({
      contentLength: length,
      status: length === 3000 ? 'queued' : 'too-long',
    })
    expect(jobs).toHaveLength(length === 3000 ? 1 : 0)
    if (length === 3000) {
      expect(jobs[0]?.script).toBe(`제\n\n${text}`)
    }
  },
)
