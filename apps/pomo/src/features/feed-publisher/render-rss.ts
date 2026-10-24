import type {FeedEntry, FeedRenderInput} from './contract'
import {escapeXmlAttribute, escapeXmlText} from './escape-xml'
import {sortFeedEntries, toRssDate} from './render-helpers'

const renderContent = (entry: FeedEntry): string => {
  if (entry.contentHtml === undefined) {
    return ''
  }

  return `\n      <content:encoded>${escapeXmlText(entry.contentHtml)}</content:encoded>`
}

const renderEntry = (entry: FeedEntry): string => `    <item>
      <title>${escapeXmlText(entry.title)}</title>
      <link>${escapeXmlText(entry.url)}</link>
      <guid isPermaLink="false">${escapeXmlText(entry.id)}</guid>
      <pubDate>${toRssDate(entry.publishedAt)}</pubDate>
      <description>${escapeXmlText(entry.summary)}</description>${renderContent(entry)}
    </item>`

/** Serializes a deterministic RSS 2.0 document from validated feed data. */
export const renderRss = (input: FeedRenderInput): string => {
  const entries = sortFeedEntries(input.entries).map(renderEntry).join('\n')
  const itemXml = entries.length === 0 ? '' : `\n${entries}`
  const selfUrl = escapeXmlAttribute(input.selfUrl)

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXmlText(input.definition.title)}</title>
    <link>${escapeXmlText(input.definition.homeUrl)}</link>
    <description>${escapeXmlText(input.definition.description)}</description>
    <language>${escapeXmlText(input.definition.language)}</language>
    <lastBuildDate>${toRssDate(input.updatedAt)}</lastBuildDate>
    <atom:link href="${selfUrl}" rel="self" type="application/rss+xml" />${itemXml}
  </channel>
</rss>
`
}
