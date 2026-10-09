import Prism from 'prismjs'
import 'prismjs/components/prism-rust.js'
import 'prismjs/components/prism-python.js'
import 'prismjs/components/prism-ruby.js'
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
  ['variable', 'identifier'],
  ['constant', 'identifier'],
  ['symbol', 'string'],
  ['regex', 'string'],
  ['ruby-identifier', 'identifier'],
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

const rubyGrammar: Prism.Grammar = Object.fromEntries(
  Object.entries(Prism.languages.ruby).flatMap(([name, grammar]) => {
    if (name === 'operator') {
      return [
        ['ruby-identifier', /[@$]{0,2}[\p{XID_Start}_][\p{XID_Continue}]*[!?]?/u],
        [name, grammar],
      ]
    }
    if (name === 'method-definition') {
      return [
        [
          name,
          {
            alias: 'function',
            lookbehind: true,
            pattern:
              /(?<prefix>\bdef\s+)(?:[\p{XID_Start}_][\p{XID_Continue}]*\.)?[\p{XID_Start}_][\p{XID_Continue}]*[!?]?/u,
          },
        ],
      ]
    }
    return [[name, grammar]]
  }),
)

const pythonIdentifiers = (token: SyntaxToken): SyntaxToken[] => {
  if (['keyword', 'string', 'comment', 'number'].includes(token.kind)) {
    return [token]
  }
  return token.text
    .split(/(?<identifier>[\p{XID_Start}_][\p{XID_Continue}]*)/u)
    .map((text, index) => ({
      ...token,
      navigation: index % 2 === 1 ? ('definition' as const) : null,
      text,
    }))
    .filter((entry) => entry.text.length > 0)
}

const rubyIdentifiers = (token: SyntaxToken): SyntaxToken[] => {
  if (['keyword', 'string', 'comment', 'number'].includes(token.kind)) {
    return [token]
  }
  return token.text
    .split(/(?<identifier>[@$]{0,2}[\p{XID_Start}_][\p{XID_Continue}]*[!?]?)/u)
    .map((text, index) => ({
      ...token,
      navigation: index % 2 === 1 ? ('definition' as const) : null,
      text,
    }))
    .filter((entry) => entry.text.length > 0)
}

const rubyPaths = (token: SyntaxToken, index: number, tokens: SyntaxToken[]): SyntaxToken[] => {
  if (token.kind !== 'string') {
    return [token]
  }
  const literal = /^(?<quote>['"])(?<path>[^\\\r\n#'"]+)\k<quote>$/u.exec(token.text)
  if (literal?.groups === undefined) {
    return [token]
  }
  const previous = previousToken(tokens, index)
  const call = tokens[previous]?.text === '(' ? previousToken(tokens, previous) : previous
  const method = tokens[call]
  if (method === undefined || !['require', 'require_relative'].includes(method.text)) {
    return [token]
  }
  return [
    {...token, text: literal.groups.quote},
    {...token, navigation: 'path', text: literal.groups.path},
    {...token, text: literal.groups.quote},
  ]
}

const previousToken = (tokens: readonly SyntaxToken[], index: number): number => {
  for (let position = index - 1; position >= 0; position -= 1) {
    if (tokens[position].text.trim() !== '') {
      return position
    }
  }
  return -1
}

const navigableTokens = (language: SyntaxLanguage, tokens: SyntaxToken[]): SyntaxToken[] => {
  switch (language) {
    case 'rust':
      return tokens.flatMap(rustIdentifiers)
    case 'python':
      return tokens.flatMap(pythonIdentifiers)
    case 'ruby':
      return tokens.flatMap(rubyIdentifiers).flatMap(rubyPaths)
    case 'yaml':
    case 'toml':
    case 'json':
    case 'jsonc':
    case 'json5':
    case 'html':
      return tokens
    default: {
      const unsupported: never = language
      return unsupported
    }
  }
}

export const tokenizeSyntax = (language: SyntaxLanguage, source: string): CodeToken[][] => {
  const grammars = new Map<SyntaxLanguage, Prism.Grammar>([
    ['rust', rustGrammar],
    ['ruby', rubyGrammar],
  ])
  const grammar =
    grammars.get(language) ?? Prism.languages[language === 'jsonc' ? 'json' : language]
  const highlighted = flattenTokens(Prism.tokenize(source, grammar))
  const tokens = navigableTokens(language, highlighted)
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
