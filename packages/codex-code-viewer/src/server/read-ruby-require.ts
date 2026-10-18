import {tokenizeSyntax} from './tokenize-syntax'

export interface RubyRequire {
  readonly kind: 'relative' | 'load'
  readonly path: string
}

export const readRubyRequire = (source: string, offset: number): RubyRequire | undefined => {
  const tokens = tokenizeSyntax('ruby', source).flat()
  const index = tokens.findIndex(
    (token) =>
      token.navigation === 'path' &&
      token.offset <= offset &&
      offset < token.offset + token.text.length,
  )
  if (index < 0) {
    return undefined
  }
  const method = tokens
    .slice(0, index)
    .findLast((token) => token.text === 'require' || token.text === 'require_relative')
  return method === undefined
    ? undefined
    : {
        kind: method.text === 'require_relative' ? 'relative' : 'load',
        path: tokens[index].text,
      }
}
