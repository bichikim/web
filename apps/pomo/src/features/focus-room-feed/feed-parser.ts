/* istanbul ignore next -- Wallaby inconsistently counts module initialization across workers. */
const BLOCKED_CONTENT_SELECTOR =
  'script, style, noscript, nav, aside, form, button, iframe, svg, canvas, template, [data-pomo-speech="exclude"]'

export interface ParsedFeedItem {
  readonly content: string
  readonly contentKind: 'full' | 'none' | 'summary'
  readonly id: string
  readonly link: string
  readonly publishedAt: string | null
  readonly title: string
}

export interface ParsedFeed {
  readonly items: ReadonlyArray<ParsedFeedItem>
  readonly title: string
}

const getChildren = (element: Element) => Array.from(element.children)
const findChild = (element: Element, names: ReadonlyArray<string>) =>
  getChildren(element).find((child) => names.includes(child.localName.toLowerCase())) ?? null
const getChildText = (element: Element, names: ReadonlyArray<string>) =>
  findChild(element, names)?.textContent?.trim() ?? ''
const resolveUrl = (value: string, baseUrl: string) => {
  if (value.length === 0) {
    return ''
  }

  try {
    return new URL(value, baseUrl).href
  } catch {
    return ''
  }
}
const getLink = (element: Element, baseUrl: string) => {
  const links = getChildren(element).filter((child) => child.localName.toLowerCase() === 'link')
  const preferred = links.find((link) => {
    const relation = link.getAttribute('rel')
    return relation === null || relation === 'alternate'
  })
  const value = preferred?.getAttribute('href') ?? preferred?.textContent?.trim() ?? ''
  return resolveUrl(value, baseUrl)
}
const getContent = (element: Element) => {
  const fullContent = getChildText(element, ['encoded', 'content'])

  if (fullContent.length > 0) {
    return {content: fullContent, contentKind: 'full' as const}
  }

  const summary = getChildText(element, ['description', 'summary'])
  return summary.length > 0
    ? {content: summary, contentKind: 'summary' as const}
    : {content: '', contentKind: 'none' as const}
}
const getPublishedAt = (element: Element) => {
  const value = getChildText(element, ['published', 'pubdate', 'updated', 'date'])

  if (value.length === 0) {
    return null
  }

  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString()
}
const getItemId = (element: Element, link: string, title: string, publishedAt: string | null) => {
  const explicitId = getChildText(element, ['guid', 'id'])

  if (explicitId.length > 0) {
    return explicitId
  }

  if (link.length > 0) {
    return link
  }

  return `${title}\u0000${publishedAt ?? ''}`
}

/** Removes markup and page chrome while preserving all readable text. */
export const cleanFeedText = (value: string) => {
  const document = new DOMParser().parseFromString(value, 'text/html')
  document.querySelectorAll(BLOCKED_CONTENT_SELECTOR).forEach((element) => element.remove())
  return (document.body.textContent ?? '').replace(/\s+/gu, ' ').trim()
}

/** Extracts the main readable text from an article document without summarizing it. */
export const extractArticleText = (html: string) => {
  const document = new DOMParser().parseFromString(html, 'text/html')
  document.querySelectorAll(BLOCKED_CONTENT_SELECTOR).forEach((element) => element.remove())
  const content =
    document.querySelector('article') ?? document.querySelector('main') ?? document.body
  return (content.textContent ?? '').replace(/\s+/gu, ' ').trim()
}

/** Parses RSS 2.x, RDF-style RSS, or Atom XML into one feed-owned shape. */
export const parseFeedXml = (xml: string, feedUrl: string): ParsedFeed => {
  const document = new DOMParser().parseFromString(xml, 'application/xml')

  if (document.querySelector('parsererror') !== null) {
    throw new Error('RSS/Atom XML 형식을 읽을 수 없어요.')
  }

  const root = document.documentElement
  const isAtom = root.localName.toLowerCase() === 'feed'
  const container = isAtom ? root : (findChild(root, ['channel']) ?? root)
  const itemName = isAtom ? 'entry' : 'item'
  const itemScope = isAtom ? container : root
  const itemElements = Array.from(itemScope.getElementsByTagNameNS('*', itemName))
  const title = getChildText(container, ['title']) || new URL(feedUrl).hostname
  const items = itemElements.map((element) => {
    const itemTitle = getChildText(element, ['title']) || '제목 없는 피드'
    const publishedAt = getPublishedAt(element)
    const link = getLink(element, feedUrl)
    const content = getContent(element)

    return {
      ...content,
      id: getItemId(element, link, itemTitle, publishedAt),
      link,
      publishedAt,
      title: itemTitle,
    }
  })

  return {items, title}
}

export const createFeedScript = (title: string, content: string) => {
  const cleanTitle = cleanFeedText(title)
  const cleanContent = cleanFeedText(content)

  if (cleanContent.length === 0) {
    return cleanTitle
  }

  return cleanContent === cleanTitle ? cleanTitle : `${cleanTitle}\n\n${cleanContent}`
}
