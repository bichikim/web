/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {parseFeedXml} from '../features/focus-room-feed/feed-parser'

it('should prefer content:encoded over an earlier empty media:content', () => {
  const feed = parseFeedXml(
    `<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"
       xmlns:media="http://search.yahoo.com/mrss/"><channel><title>T</title><item>
       <title>A</title><guid>a</guid><link>https://example.com/a</link>
       <description>short summary</description>
       <media:content url="https://example.com/a.jpg" medium="image"/>
       <content:encoded><![CDATA[<p>full article body</p>]]></content:encoded>
     </item></channel></rss>`,
    'https://example.com/feed.xml',
  )

  expect(feed.items[0]).toMatchObject({
    content: '<p>full article body</p>',
    contentKind: 'full',
  })
})
