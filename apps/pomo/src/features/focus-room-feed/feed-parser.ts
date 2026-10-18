import {hasValidIsoCalendarDate} from 'src/utils/iso-calendar-date'
import DOMPurify from 'dompurify'
import {groupBy} from 'es-toolkit/array'

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

interface ChildGroups {
  readonly [name: string]: ReadonlyArray<Element> | undefined
}

const findPreferredChild = (children: ChildGroups, names: ReadonlyArray<string>) =>
  names.map((name) => children[name]?.[0]).find((child) => child !== undefined) ?? null
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
const getChildText = (children: ChildGroups, names: ReadonlyArray<string>) =>
  findPreferredChild(children, names)?.textContent?.trim() ?? ''
const getFeedTitle = (children: ChildGroups, feedUrl: string) => {
  const title = getChildText(children, ['title'])

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
const getLink = (children: ChildGroups, baseUrl: string) => {
  const links = children.link ?? []
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
const getContent = (children: ChildGroups) => {
  const fullContent = getChildText(children, ['encoded', 'content'])

  if (fullContent.length > 0) {
    return {content: fullContent, contentKind: 'full' as const}
  }

  const summary = getChildText(children, ['description', 'summary'])
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

  // #2827 정책: ISO 형식의 24:00:00은 다음 날 00:00:00으로 허용한다.
  // 두 표기는 같은 순간이므로 ISO 문자열로 정규화해 날짜가 바뀌어도 발행 시각 오류로 취급하지 않는다.
  // 근거: https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-time-string-format
  const timestamp = Date.parse(normalizedValue)
  return Number.isNaN(timestamp) ? null : timestamp
}
const getPublishedAt = (children: ChildGroups) => {
  const timestamp = ['published', 'pubdate', 'updated', 'date', 'created', 'issued']
    .map((name) => parseFeedTimestamp(getChildText(children, [name])))
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
interface GetItemIdentityOptions {
  readonly children: ChildGroups
  readonly element: Element
  readonly link: string
  readonly title: string
  readonly publishedAt: string | null
}

const getItemIdentity = (
  options: GetItemIdentityOptions,
): Pick<ParsedFeedItem, 'id' | 'legacyId'> => {
  const explicitId = getChildText(options.children, ['guid', 'id'])

  if (explicitId.length > 0) {
    return {id: explicitId}
  }

  if (options.link.length > 0) {
    return {id: options.link}
  }

  const fallbackId = `${options.title}\u0000${options.publishedAt ?? ''}`
  return {
    id: `${fallbackId}\u0000${getItemFingerprint(options.element)}`,
    ...(options.publishedAt === null ? {} : {legacyId: fallbackId}),
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
  const rootChildren = groupBy(Array.from(root.children), (child) => child.localName.toLowerCase())
  const container = isAtom ? root : (findPreferredChild(rootChildren, ['channel']) ?? root)
  const containerChildren =
    container === root
      ? rootChildren
      : groupBy(Array.from(container.children), (child) => child.localName.toLowerCase())
  const itemName = isAtom ? 'entry' : 'item'
  const itemScope = isAtom ? container : root
  const itemElements = Array.from(itemScope.getElementsByTagNameNS('*', itemName)).filter(
    (element) => !hasItemAncestor(element, itemScope, itemName),
  )
  const title = getFeedTitle(containerChildren, feedUrl)
  const items = itemElements.map((element) => {
    const children = groupBy(Array.from(element.children), (child) => child.localName.toLowerCase())
    const itemTitle = getChildText(children, ['title']) || '제목 없는 피드'
    const publishedAt = getPublishedAt(children)
    const link = getLink(children, feedUrl)
    const content = getContent(children)

    return {
      ...content,
      ...getItemIdentity({children, element, link, publishedAt, title: itemTitle}),
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
