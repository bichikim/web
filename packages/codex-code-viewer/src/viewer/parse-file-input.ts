import {TEXT_FILE_NAMES} from '../shared/file-formats'
import type {CodeLocation} from '../shared/contracts'

export type FileInput =
  | {kind: 'path'; location: CodeLocation; restoreView: boolean}
  | {kind: 'search'; query: string}

const prefix = '(?:/|\\.\\.?/|[^/\\s()\\[\\]\\x22\\x27\\x60,]+/)'
const filename = `(?:.*?\\.[\\p{L}\\p{N}_-]+|(?:[^/]+/)*(?:${TEXT_FILE_NAMES.join('|')}))`
const position = '(?::(?<line>\\d+)(?::(?<column>\\d+))?)?(?:-\\d+(?::\\d+)?)?'
const directPath = new RegExp(`^(?<path>${prefix}${filename})${position}$`, 'iu')
const quotedPath = new RegExp(`^(?<path>(?:/|\\.\\.?/|[^/\\r\\n]+/)${filename})${position}$`, 'iu')
const quotedContent = /(?<quote>["'`])(?<content>.*?)\k<quote>/gu
const embeddedPath = new RegExp(
  `(?:^|[\\s(\\[\\x22\\x27\\x60])` +
    `(?<path>${prefix}[^\\s()\\[\\]\\x22\\x27\\x60]*?(?:\\.[\\p{L}\\p{N}_-]+|${TEXT_FILE_NAMES.join('|')}))` +
    `${position}(?=$|[\\s)\\]\\x22\\x27\\x60,])`,
  'iu',
)

export const parseFileInput = (input: string): FileInput => {
  const query = input.trim()
  const candidate = query.replace(/^(?<quote>["'`])(?<content>[\s\S]+)\k<quote>$/u, '$<content>')
  const quotedMatch = Array.from(query.matchAll(quotedContent), (entry) =>
    quotedPath.exec(entry.groups?.content ?? ''),
  ).find((entry) => entry !== null)
  const explicitPath =
    /^(?<path>(?:\/|\.\.?\/).+?)(?::(?<line>\d+)(?::(?<column>\d+))?)?(?:-\d+(?::\d+)?)?$/u
  const match =
    explicitPath.exec(candidate) ??
    directPath.exec(candidate) ??
    quotedMatch ??
    embeddedPath.exec(candidate)
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
        restoreView: match?.groups?.line === undefined,
      }
}
