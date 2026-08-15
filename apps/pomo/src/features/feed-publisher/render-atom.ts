import type {FeedEntry, FeedRenderInput} from './contract'
import {escapeXmlAttribute, escapeXmlText} from './escape-xml'
import {sortFeedEntries, toAtomDate} from './render-helpers'

const renderContent = (entry: FeedEntry): string => {
  if (entry.contentHtml === undefined) {
    return ''
  }

  return `\n    <content type="html">${escapeXmlText(entry.contentHtml)}</content>`
}

const renderEntry = (entry: FeedEntry): string => `  <entry>
    <title>${escapeXmlText(entry.title)}</title>
    <id>${escapeXmlText(entry.id)}</id>
    <link href="${escapeXmlAttribute(entry.url)}" rel="alternate" />
    <published>${toAtomDate(entry.publishedAt)}</published>
    <updated>${toAtomDate(entry.updatedAt ?? entry.publishedAt)}</updated>
    <summary>${escapeXmlText(entry.summary)}</summary>${renderContent(entry)}
  </entry>`

/** Serializes a deterministic Atom 1.0 document from validated feed data. */
export const renderAtom = (input: FeedRenderInput): string => {
  const entries = sortFeedEntries(input.entries).map(renderEntry).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${escapeXmlAttribute(input.definition.language)}">
  <title>${escapeXmlText(input.definition.title)}</title>
  <subtitle>${escapeXmlText(input.definition.description)}</subtitle>
  <id>${escapeXmlText(input.selfUrl)}</id>
  <link href="${escapeXmlAttribute(input.selfUrl)}" rel="self" type="application/atom+xml" />
  <link href="${escapeXmlAttribute(input.definition.homeUrl)}" rel="alternate" />
  <updated>${toAtomDate(input.updatedAt)}</updated>${entries.length === 0 ? '' : `\n${entries}`}
</feed>
`
}
