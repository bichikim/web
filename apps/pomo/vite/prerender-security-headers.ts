import {createHash} from 'node:crypto'

type InlineElementName = 'script' | 'style'

interface HtmlAttribute {
  readonly hasValue: boolean
  readonly name: string
  readonly nextIndex: number
}

const HTML_COMMENT_START = '<!--'
const HTML_COMMENT_END = '-->'

const isHtmlWhitespace = (character: string): boolean =>
  character === ' ' ||
  character === '\t' ||
  character === '\n' ||
  character === '\f' ||
  character === '\r'

const findTagEnd = (html: string, startIndex: number): number => {
  let quote: '"' | "'" | undefined

  for (let index = startIndex; index < html.length; index += 1) {
    const character = html[index]

    if (quote === undefined) {
      if (character === '"' || character === "'") {
        quote = character
      } else if (character === '>') {
        return index
      }
    } else if (character === quote) {
      quote = undefined
    }
  }

  return -1
}

const skipHtmlWhitespace = (value: string, startIndex: number): number => {
  let index = startIndex
  while (isHtmlWhitespace(value[index] ?? '')) {
    index += 1
  }
  return index
}

const readAttribute = (attributes: string, startIndex: number): HtmlAttribute | undefined => {
  let index = skipHtmlWhitespace(attributes, startIndex)
  if (index >= attributes.length || attributes[index] === '/') {
    return undefined
  }

  const nameStart = index
  while (
    index < attributes.length &&
    !isHtmlWhitespace(attributes[index]) &&
    attributes[index] !== '=' &&
    attributes[index] !== '/'
  ) {
    index += 1
  }

  const name = attributes.slice(nameStart, index).toLowerCase()
  index = skipHtmlWhitespace(attributes, index)
  if (attributes[index] !== '=') {
    return {hasValue: false, name, nextIndex: index}
  }

  index = skipHtmlWhitespace(attributes, index + 1)
  const quote = attributes[index]
  if (quote === '"' || quote === "'") {
    index += 1
    while (index < attributes.length && attributes[index] !== quote) {
      index += 1
    }
    index += 1
  } else {
    while (index < attributes.length && !isHtmlWhitespace(attributes[index])) {
      index += 1
    }
  }

  return {hasValue: true, name, nextIndex: index}
}

const hasNonceAttribute = (attributes: string): boolean => {
  let index = 0
  while (index < attributes.length) {
    const attribute = readAttribute(attributes, index)
    if (attribute === undefined) {
      return false
    }
    if (attribute.hasValue && attribute.name === 'nonce') {
      return true
    }
    index = attribute.nextIndex
  }

  return false
}

const findClosingTag = (
  lowercaseHtml: string,
  elementName: InlineElementName,
  startIndex: number,
): {readonly start: number; readonly end: number} | undefined => {
  const prefix = `</${elementName}`
  let index = lowercaseHtml.indexOf(prefix, startIndex)

  while (index >= 0) {
    let end = index + prefix.length
    const hasNameBoundary = isHtmlWhitespace(lowercaseHtml[end] ?? '') || lowercaseHtml[end] === '>'
    if (hasNameBoundary) {
      end = skipHtmlWhitespace(lowercaseHtml, end)
      if (lowercaseHtml[end] === '>') {
        return {end, start: index}
      }
    }
    index = lowercaseHtml.indexOf(prefix, end)
  }

  return undefined
}

const readNonceMarkedContents = (
  html: string,
  elementName: InlineElementName,
): ReadonlyArray<string> => {
  const lowercaseHtml = html.toLowerCase()
  const prefix = `<${elementName}`
  const contents: Array<string> = []
  let index = 0

  while (index < html.length) {
    const tagStart = lowercaseHtml.indexOf('<', index)
    if (tagStart < 0) {
      break
    } else if (lowercaseHtml.startsWith(HTML_COMMENT_START, tagStart)) {
      const commentEnd = lowercaseHtml.indexOf(
        HTML_COMMENT_END,
        tagStart + HTML_COMMENT_START.length,
      )
      index = commentEnd < 0 ? html.length : commentEnd + HTML_COMMENT_END.length
    } else if (lowercaseHtml.startsWith(prefix, tagStart)) {
      const attributesStart = tagStart + prefix.length
      const hasNameBoundary =
        isHtmlWhitespace(lowercaseHtml[attributesStart] ?? '') ||
        lowercaseHtml[attributesStart] === '>'
      if (hasNameBoundary) {
        const openingTagEnd = findTagEnd(html, attributesStart)
        if (openingTagEnd < 0) {
          break
        }

        const contentStart = openingTagEnd + 1
        const closingTag = findClosingTag(lowercaseHtml, elementName, contentStart)
        if (closingTag === undefined) {
          break
        }

        const content = html.slice(contentStart, closingTag.start)
        const attributes = html.slice(attributesStart, openingTagEnd)
        if (content.length > 0 && hasNonceAttribute(attributes)) {
          contents.push(content)
        }

        index = closingTag.end + 1
      } else {
        index = attributesStart
      }
    } else {
      index = tagStart + 1
    }
  }

  return contents
}

export interface InlineContentHashes {
  readonly scriptHashes: ReadonlyArray<string>
  readonly styleHashes: ReadonlyArray<string>
}

const createContentHash = (content: string): string =>
  `sha256-${createHash('sha256').update(content).digest('base64')}`

const createHashes = (html: string, elementName: InlineElementName): ReadonlyArray<string> => [
  ...new Set(readNonceMarkedContents(html, elementName).map(createContentHash)),
]

export const createInlineContentHashes = (html: string): InlineContentHashes => ({
  scriptHashes: createHashes(html, 'script'),
  styleHashes: createHashes(html, 'style'),
})
