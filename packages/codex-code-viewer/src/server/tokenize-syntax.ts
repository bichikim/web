import Prism from 'prismjs'
import 'prismjs/components/prism-rust.js'
import 'prismjs/components/prism-yaml.js'
import 'prismjs/components/prism-toml.js'
import 'prismjs/components/prism-json.js'
import 'prismjs/components/prism-json5.js'
import {type CodeToken} from '../shared/contracts'
import {type SyntaxLanguage} from '../shared/file-formats'

interface SyntaxToken {
  readonly kind: CodeToken['kind']
  readonly text: string
  readonly navigation?: CodeToken['navigation']
}
const kinds = new Map<string, CodeToken['kind']>([
  ['comment', 'comment'],
  ['string', 'string'],
  ['char', 'string'],
  ['keyword', 'keyword'],
  ['boolean', 'keyword'],
  ['number', 'number'],
  ['property', 'identifier'],
  ['function', 'identifier'],
  ['class-name', 'identifier'],
  ['tag', 'keyword'],
  ['attr-name', 'keyword'],
  ['attr-value', 'string'],
  ['entity', 'string'],
  ['doctype', 'comment'],
  ['prolog', 'comment'],
])
const flattenTokens = (
  content: string | Prism.Token | (string | Prism.Token)[],
  inherited: CodeToken['kind'] = 'plain',
): SyntaxToken[] => {
  if (typeof content === 'string') {
    return [{kind: inherited, text: content}]
  }
  if (Array.isArray(content)) {
    return content.flatMap((token) => flattenTokens(token, inherited))
  }
  const names = [content.type, ...[content.alias ?? []].flat()]
  const kind = names.map((name) => kinds.get(name)).find((value) => value !== undefined)
  return flattenTokens(content.content, kind ?? inherited)
}

const rustIdentifiers = (token: SyntaxToken): SyntaxToken[] => {
  if (
    token.kind === 'string' ||
    token.kind === 'comment' ||
    token.kind === 'number' ||
    (token.kind === 'keyword' && !['self', 'Self', 'super', 'crate'].includes(token.text))
  ) {
    return [token]
  }
  return token.text
    .split(/(?<identifier>(?:r#)?[\p{XID_Start}_][\p{XID_Continue}]*)/u)
    .map((text, index) => ({
      ...token,
      navigation: index % 2 === 1 ? ('definition' as const) : null,
      text,
    }))
    .filter((item) => item.text.length > 0)
}

const rustGrammar = Prism.languages.insertBefore('rust', 'function-definition', {
  'raw-identifier': /r#[\p{XID_Start}_][\p{XID_Continue}]*/u,
})

export const tokenizeSyntax = (language: SyntaxLanguage, source: string): CodeToken[][] => {
  const grammar =
    language === 'rust' ? rustGrammar : Prism.languages[language === 'jsonc' ? 'json' : language]
  const highlighted = flattenTokens(Prism.tokenize(source, grammar))
  const tokens = language === 'rust' ? highlighted.flatMap(rustIdentifiers) : highlighted
  const lines: CodeToken[][] = [[]]
  let offset = 0
  for (const token of tokens) {
    for (const [index, text] of token.text.split(/(?<newline>\r\n|\n|\r)/u).entries()) {
      if (index % 2 === 1) {
        lines.push([])
      } else if (text.length > 0) {
        lines[lines.length - 1].push({
          kind: token.kind,
          navigation: token.navigation ?? null,
          offset,
          text,
        })
      }
      offset += text.length
    }
  }
  return lines
}
