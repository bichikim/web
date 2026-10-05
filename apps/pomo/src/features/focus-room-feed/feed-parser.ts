import {hasValidIsoCalendarDate} from 'src/utils/iso-calendar-date'
import DOMPurify from 'dompurify'

/* istanbul ignore next -- Wallaby inconsistently counts module initialization across workers. */
const BLOCKED_CONTENT_SELECTOR =
  'script, style, noscript, nav, aside, form, button, iframe, svg, canvas, template, [data-pomo-speech="exclude"]'
const ITEM_FINGERPRINT_PRIMARY_BASE = 31
const ITEM_FINGERPRINT_PRIMARY_MODULUS = 2_147_483_647
const ITEM_FINGERPRINT_RADIX = 36
const ITEM_FINGERPRINT_SECONDARY_BASE = 37
const ITEM_FINGERPRINT_SECONDARY_MODULUS = 2_147_483_629
const ISO_DATE_PREFIX_PATTERN = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/u
const MONTH_ABBREVIATIONS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const
const RFC_822_DATE_PREFIX_PATTERN =
  /^(?:[A-Z]{3},\s*)?(?<day>\d{1,2})\s+(?<month>[A-Z]{3})\s+(?<year>\d{2,4})\b/iu

export interface ParsedFeedItem {
  readonly content: string
  readonly contentKind: 'full' | 'none' | 'summary'
  readonly id: string
  readonly legacyId?: string
  readonly link: string
  readonly publishedAt: string | null
  readonly title: string
}

export interface ParsedFeed {
  readonly items: ReadonlyArray<ParsedFeedItem>
  readonly title: string
}

const getChildren = (element: Element) => Array.from(element.children)
const findPreferredChild = (element: Element, names: ReadonlyArray<string>) => {
  const children = getChildren(element)

  return (
    names
      .map((name) => children.find((child) => child.localName.toLowerCase() === name))
      .find((child): child is Element => child !== undefined) ?? null
  )
}
const hasItemAncestor = (element: Element, itemScope: Element, itemName: string) => {
  let ancestor = element.parentElement

  while (ancestor !== null && ancestor !== itemScope) {
    if (ancestor.localName.toLowerCase() === itemName) {
      return true
    }

    ancestor = ancestor.parentElement
  }

  return false
}
const getChildText = (element: Element, names: ReadonlyArray<string>) =>
  findPreferredChild(element, names)?.textContent?.trim() ?? ''
const getFeedTitle = (element: Element, feedUrl: string) => {
  const title = getChildText(element, ['title'])

  if (title.length > 0) {
    return title
  }

  try {
    return new URL(feedUrl).hostname
  } catch {
    return '제목 없는 피드'
  }
}
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
  const candidates = links.map((link) => ({
    hasHref: link.hasAttribute('href'),
    relationTokens:
      link
        .getAttribute('rel')
        ?.toLowerCase()
        .split(/[\t\n\f\r ]+/u) ?? null,
    url: resolveUrl(link.getAttribute('href') ?? link.textContent?.trim() ?? '', baseUrl),
  }))
  const preferred =
    candidates.find(
      ({relationTokens, url}) => relationTokens?.includes('alternate') === true && url.length > 0,
    ) ??
    candidates.find(({relationTokens, url}) => relationTokens === null && url.length > 0) ??
    candidates.find(
      ({hasHref, relationTokens, url}) =>
        hasHref && relationTokens?.includes('self') === true && url.length > 0,
    )
  return preferred?.url ?? ''
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
const isValidCalendarDate = (year: number, month: number, day: number) => {
  if (month < 1 || month > MONTH_ABBREVIATIONS.length || day < 1) {
    return false
  }

  const endOfMonth = new Date(0)
  endOfMonth.setUTCFullYear(year, month, 0)
  return day <= endOfMonth.getUTCDate()
}
const parseFeedTimestamp = (value: string): number | null => {
  const normalizedValue = value.trim()
  const isoDateParts = normalizedValue.match(ISO_DATE_PREFIX_PATTERN)?.groups

  if (isoDateParts !== undefined && !hasValidIsoCalendarDate(normalizedValue)) {
    return null
  }

  const rfc822DateParts = normalizedValue.match(RFC_822_DATE_PREFIX_PATTERN)?.groups

  if (rfc822DateParts !== undefined) {
    const day = Number(rfc822DateParts.day)
    const monthName = rfc822DateParts.month!.toLowerCase()
    const month = MONTH_ABBREVIATIONS.findIndex((abbreviation) => abbreviation === monthName) + 1
    const yearTimestamp = Date.parse(`1 ${monthName} ${rfc822DateParts.year} 00:00 GMT`)

    if (
      Number.isNaN(yearTimestamp) ||
      !isValidCalendarDate(new Date(yearTimestamp).getUTCFullYear(), month, day)
    ) {
      return null
    }
  }

  const timestamp = Date.parse(normalizedValue)
  return Number.isNaN(timestamp) ? null : timestamp
}
const getPublishedAt = (element: Element) => {
  const timestamp = ['published', 'pubdate', 'updated', 'date', 'created', 'issued']
    .map((name) => parseFeedTimestamp(getChildText(element, [name])))
    .find((value) => value !== null)

  return timestamp === undefined ? null : new Date(timestamp).toISOString()
}
const getItemFingerprint = (element: Element) => {
  const serializedItem = new XMLSerializer().serializeToString(element).replace(/>\s+</gu, '><')
  let primaryHash = 0
  let secondaryHash = 0

  for (const character of serializedItem) {
    const codePoint = character.codePointAt(0) ?? 0
    primaryHash =
      (primaryHash * ITEM_FINGERPRINT_PRIMARY_BASE + codePoint) % ITEM_FINGERPRINT_PRIMARY_MODULUS
    secondaryHash =
      (secondaryHash * ITEM_FINGERPRINT_SECONDARY_BASE + codePoint) %
      ITEM_FINGERPRINT_SECONDARY_MODULUS
  }

  return `${primaryHash.toString(ITEM_FINGERPRINT_RADIX)}-${secondaryHash.toString(ITEM_FINGERPRINT_RADIX)}`
}
const getItemIdentity = (
  element: Element,
  link: string,
  title: string,
  publishedAt: string | null,
): Pick<ParsedFeedItem, 'id' | 'legacyId'> => {
  const explicitId = getChildText(element, ['guid', 'id'])

  if (explicitId.length > 0) {
    return {id: explicitId}
  }

  if (link.length > 0) {
    return {id: link}
  }

  const fallbackId = `${title}\u0000${publishedAt ?? ''}`
  return {
    id: `${fallbackId}\u0000${getItemFingerprint(element)}`,
    ...(publishedAt === null ? {} : {legacyId: fallbackId}),
  }
}

const extractReadableHtmlText = (
  html: string,
  resolveRoot: (fragment: DocumentFragment) => Element | DocumentFragment,
) => {
  const fragment = DOMPurify.sanitize(html, {RETURN_DOM_FRAGMENT: true})
  fragment.querySelectorAll(BLOCKED_CONTENT_SELECTOR).forEach((element) => element.remove())
  return (resolveRoot(fragment).textContent ?? '').replace(/\s+/gu, ' ').trim()
}

const findReadableElement = (fragment: DocumentFragment, selector: 'article' | 'main') =>
  Array.from(fragment.querySelectorAll(selector)).find((element) => element.textContent?.trim())

/** Removes markup and page chrome while preserving all readable text. */
export const cleanFeedText = (value: string) =>
  extractReadableHtmlText(value, (fragment) => fragment)

/** Extracts the main readable text from an article document without summarizing it. */
export const extractArticleText = (html: string) =>
  extractReadableHtmlText(
    html,
    (fragment) =>
      findReadableElement(fragment, 'article') ?? findReadableElement(fragment, 'main') ?? fragment,
  )

/** Parses RSS 2.x, RDF-style RSS, or Atom XML into one feed-owned shape. */
export const parseFeedXml = (xml: string, feedUrl: string): ParsedFeed => {
  const document = new DOMParser().parseFromString(xml, 'application/xml')

  if (document.querySelector('parsererror') !== null) {
    throw new Error('RSS/Atom XML 형식을 읽을 수 없어요.')
  }

  const root = document.documentElement
  const isAtom = root.localName.toLowerCase() === 'feed'
  const container = isAtom ? root : (findPreferredChild(root, ['channel']) ?? root)
  const itemName = isAtom ? 'entry' : 'item'
  const itemScope = isAtom ? container : root
  const itemElements = Array.from(itemScope.getElementsByTagNameNS('*', itemName)).filter(
    (element) => !hasItemAncestor(element, itemScope, itemName),
  )
  const title = getFeedTitle(container, feedUrl)
  const items = itemElements.map((element) => {
    const itemTitle = getChildText(element, ['title']) || '제목 없는 피드'
    const publishedAt = getPublishedAt(element)
    const link = getLink(element, feedUrl)
    const content = getContent(element)

    return {
      ...content,
      ...getItemIdentity(element, link, itemTitle, publishedAt),
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

  if (cleanTitle.length === 0) {
    return cleanContent
  }

  return cleanContent === cleanTitle ? cleanTitle : `${cleanTitle}\n\n${cleanContent}`
}
