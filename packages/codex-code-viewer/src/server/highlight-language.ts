import {classHighlighter, highlightTree} from '@lezer/highlight'
import type {CodeToken} from '../shared/contracts'
import {createSyntaxLanguage} from '../shared/create-syntax-language'
import type {SyntaxLanguage} from '../shared/file-formats'

const kinds = new Map<string, CodeToken['kind']>([
  ['tok-keyword', 'keyword'],
  ['tok-bool', 'keyword'],
  ['tok-atom', 'keyword'],
  ['tok-typeName', 'keyword'],
  ['tok-propertyName', 'keyword'],
  ['tok-heading', 'keyword'],
  ['tok-string', 'string'],
  ['tok-content', 'string'],
  ['tok-comment', 'comment'],
  ['tok-meta', 'comment'],
  ['tok-number', 'number'],
  ['tok-variableName', 'identifier'],
])

/** Highlights a document with its editor parser, retaining unstyled text and UTF-16 offsets. */
export const highlightLanguage = (language: SyntaxLanguage, source: string): CodeToken[] => {
  const support = createSyntaxLanguage(language)
  if (support === null) {
    throw new Error(`No document parser for ${language}.`)
  }
  const tokens: CodeToken[] = []
  let offset = 0
  highlightTree(support.language.parser.parse(source), classHighlighter, (from, to, classes) => {
    if (from > offset) {
      tokens.push({kind: 'plain', navigation: null, offset, text: source.slice(offset, from)})
    }
    const kind = classes
      .split(' ')
      .map((name) => kinds.get(name))
      .find((value) => value !== undefined)
    tokens.push({
      kind: kind ?? 'plain',
      navigation: null,
      offset: from,
      text: source.slice(from, to),
    })
    offset = to
  })
  if (offset < source.length) {
    tokens.push({kind: 'plain', navigation: null, offset, text: source.slice(offset)})
  }
  return tokens
}
