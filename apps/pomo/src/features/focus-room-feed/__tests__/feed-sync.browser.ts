import {expect, it} from 'vitest'
import {createPDatabase} from '../../focus-room-dialogue/database'
import {createFeedDialogueRepository} from '../feed-dialogue-repository'
import {synchronizeFeeds} from '../feed-sync'
import {CONNECTION, createSettingsResolver} from './feed-sync.fixture'

it.each(['summary', 'full'] as const)(
  'should persist literal speech text after sanitizing %s HTML in the browser',
  async (kind) => {
    const database = createPDatabase()
    const repository = createFeedDialogueRepository({deleteDialogueAudio: async () => undefined})
    const content = `<p>&lt;b&gt;tag&lt;/b&gt; &amp; &lt;script&gt;example()&lt;/script&gt;</p>
      <script>throw new Error('script content')</script><nav>메뉴</nav>
      <aside>광고</aside><form>입력</form><button>버튼</button><iframe>프레임</iframe>
      <svg><text>그림</text></svg><canvas>캔버스</canvas><template>틀</template>
      <footer data-pomo-speech="exclude">출처</footer>`
    const body =
      kind === 'full'
        ? `<content:encoded><![CDATA[${content}]]></content:encoded>`
        : '<description>요약</description>'
    const xml = `<rss xmlns:content="urn:content"><channel><title>기술 소식</title><item>
      <title><![CDATA[&lt;i&gt;제목&lt;/i&gt;<script>숨김</script>]]></title>
      <guid>browser-${kind}</guid><link>https://example.com/article</link>
      <pubDate>Fri, 14 Aug 2026 00:05:00 GMT</pubDate>${body}
    </item></channel></rss>`
    const script = '<i>제목</i>\n\n<b>tag</b> & <script>example()</script>'
    const requested: Array<string> = []

    try {
      await database.feedDialogueJobs.clear()
      await database.feedItems.clear()
      const summary = await synchronizeFeeds({
        connections: [CONNECTION],
        createId: () => `browser-job-${kind}`,
        fetcher: async (url) => {
          requested.push(url)
          return new Response(url === CONNECTION.url ? xml : `<article>${content}</article>`)
        },
        now: new Date('2026-08-14T00:06:00.000Z'),
        repository,
        resolveGenerationSettings: createSettingsResolver(),
      })

      expect(summary).toEqual({
        failures: [],
        queuedJobIds: [`browser-job-${kind}`],
        successfulConnections: 1,
      })
      expect(requested).toEqual(
        kind === 'full' ? [CONNECTION.url] : [CONNECTION.url, 'https://example.com/article'],
      )
      repository.dispose()
      const reopened = createFeedDialogueRepository({deleteDialogueAudio: async () => undefined})
      try {
        expect(await reopened.listJobs()).toEqual([
          expect.objectContaining({itemTitle: '<i>제목</i>', script}),
        ])
        expect(await reopened.listItems(CONNECTION.id)).toEqual([
          expect.objectContaining({
            contentLength: script.length,
            itemTitle: '<i>제목</i>',
            status: 'queued',
          }),
        ])
      } finally {
        reopened.dispose()
      }
    } finally {
      repository.dispose()
      await database.delete()
    }
  },
)
