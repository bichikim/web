import type {CodeLocation} from '../shared/contracts'

export type FileInput = {kind: 'path'; location: CodeLocation} | {kind: 'search'; query: string}

const prefix = '(?:/|\\.\\.?/|[^/\\s()\\[\\]\\x22\\x27\\x60,]+/)'
const extension = '\\.(?:tsx?|mts|cts|jsx?|mjs|cjs|json)'
const position = '(?::(?<line>\\d+)(?::(?<column>\\d+))?)?(?:-\\d+(?::\\d+)?)?'
const directPath = new RegExp(`^(?<path>${prefix}.+?${extension})${position}$`, 'u')
const quotedPath = new RegExp(
  `^(?<path>(?:/|\\.\\.?/|[^/\\r\\n]+/).+?${extension})${position}$`,
  'u',
)
const quotedContent = /(?<quote>["'`])(?<content>.*?)\k<quote>/gu
const embeddedPath = new RegExp(
  `(?:^|[\\s(\\[\\x22\\x27\\x60])(?<path>${prefix}[^\\s()\\[\\]\\x22\\x27\\x60]+?${extension})` +
    `${position}(?=$|[\\s)\\]\\x22\\x27\\x60,])`,
  'u',
)

export const parseFileInput = (input: string): FileInput => {
  const query = input.trim()
  const candidate = query.replace(/^(?<quote>["'`])(?<content>[\s\S]+)\k<quote>$/u, '$<content>')
  const quotedMatch = Array.from(query.matchAll(quotedContent), (entry) =>
    quotedPath.exec(entry.groups?.content ?? ''),
  ).find((entry) => entry !== null)
  const match = directPath.exec(candidate) ?? quotedMatch ?? embeddedPath.exec(candidate)
  const path = match?.groups?.path
  return path === undefined
    ? {kind: 'search', query}
    : {
        kind: 'path',
        location: {
          column: Math.max(1, Number(match?.groups?.column ?? 1)),
          line: Math.max(1, Number(match?.groups?.line ?? 1)),
          path,
        },
      }
}
