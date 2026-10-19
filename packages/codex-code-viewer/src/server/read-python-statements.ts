import type {CodeToken} from '../shared/contracts'
import {tokenizeSyntax} from './tokenize-syntax'

export interface PythonStatement {
  readonly tokens: readonly CodeToken[]
  readonly indent: number
}
const compound = new Set([
  'if',
  'elif',
  'else',
  'def',
  'class',
  'for',
  'while',
  'with',
  'try',
  'except',
  'finally',
  'async',
])
const indentation = (source: string, offset: number): number => {
  const prefix =
    source.slice(source.lastIndexOf('\n', offset - 1) + 1, offset).match(/^[\t ]*/u)?.[0] ?? ''
  const TAB_WIDTH = 8
  return [...prefix].reduce(
    (column, character) =>
      character === '\t' ? (Math.floor(column / TAB_WIDTH) + 1) * TAB_WIDTH : column + 1,
    0,
  )
}
/** Groups Python logical statements, retaining source offsets and inline suite indentation. */
export const readPythonStatements = (source: string): readonly PythonStatement[] => {
  const statements: PythonStatement[] = []
  let tokens: CodeToken[] = []
  let depth = 0
  let inlineIndent: number | undefined
  let previous: CodeToken | undefined
  const flush = () => {
    if (tokens.length === 0) {
      return
    }
    const indent = inlineIndent ?? indentation(source, tokens[0].offset)
    let nesting = 0
    const colon = compound.has(tokens[0].text)
      ? tokens.findIndex((token) => {
          nesting +=
            Number(['(', '[', '{'].includes(token.text)) -
            Number([')', ']', '}'].includes(token.text))
          return nesting === 0 && token.text === ':'
        })
      : -1
    if (colon >= 0 && colon < tokens.length - 1) {
      inlineIndent = indent + 1
      statements.push(
        {indent, tokens: tokens.slice(0, colon + 1)},
        {indent: inlineIndent, tokens: tokens.slice(colon + 1)},
      )
    } else {
      statements.push({indent, tokens})
    }
    tokens = []
  }
  for (const token of tokenizeSyntax('python', source).flat()) {
    if (token.kind !== 'comment' && token.text.trim() !== '') {
      if (
        previous !== undefined &&
        depth === 0 &&
        previous.text !== '\\' &&
        /[\r\n]/u.test(source.slice(previous.offset + previous.text.length, token.offset))
      ) {
        flush()
        inlineIndent = undefined
      }
      if (token.text === ';' && depth === 0) {
        flush()
      } else {
        if (tokens.at(-1)?.text === '\\') {
          tokens.pop()
        }
        tokens.push(token)
        depth +=
          Number(['(', '[', '{'].includes(token.text)) -
          Number([')', ']', '}'].includes(token.text))
      }
      previous = token
    }
  }
  flush()
  return statements
}

const unwrap = (tokens: readonly CodeToken[]): readonly CodeToken[] => {
  if (tokens[0]?.text !== '(' || tokens.at(-1)?.text !== ')') {
    return tokens
  }
  let depth = 0
  const encloses = tokens.every((token, index) => {
    depth += Number(token.text === '(') - Number(token.text === ')')
    return depth > 0 || index === tokens.length - 1
  })
  return encloses ? unwrap(tokens.slice(1, -1)) : tokens
}
const split = (
  tokens: readonly CodeToken[],
  separator: string,
): readonly (readonly CodeToken[])[] => {
  const groups: CodeToken[][] = [[]]
  let depth = 0
  for (const token of tokens) {
    depth +=
      Number(['(', '[', '{'].includes(token.text)) - Number([')', ']', '}'].includes(token.text))
    if (depth === 0 && token.text === separator) {
      groups.push([])
    } else {
      groups[groups.length - 1].push(token)
    }
  }
  return groups
}
export interface PythonAssignment {
  readonly bindings: readonly CodeToken[]
  readonly value: readonly CodeToken[]
}
/** Reads simple, annotated, chained and positional tuple assignment components. */
export const pythonAssignments = (statement: PythonStatement): readonly PythonAssignment[] => {
  const groups = split(statement.tokens, '=')
  if (groups.length < 2) {
    return []
  }
  const values = split(unwrap(groups.at(-1) ?? []), ',').filter((group) => group.length > 0)
  const targets = groups.slice(0, -1).map((group) =>
    split(unwrap(group), ',').map((tokens) => {
      const colon = tokens.findIndex((token) => token.text === ':')
      return colon < 0 ? tokens : tokens.slice(0, colon)
    }),
  )
  return values.flatMap((value, index) => {
    const bindings = targets.flatMap((group) => {
      const target = group[index]
      return group.length === values.length &&
        target?.length === 1 &&
        target[0].navigation === 'definition'
        ? [target[0]]
        : []
    })
    return bindings.length === targets.length ? [{bindings, value: unwrap(value)}] : []
  })
}
