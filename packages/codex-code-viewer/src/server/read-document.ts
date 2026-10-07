import {createHash} from 'node:crypto'
import {relative} from 'node:path'
import {type CodeDocument, type CodeToken, type Result, success} from '../shared/contracts'
import {fileFormat} from '../shared/file-formats'
import {readSource, resolveFile} from './file-access'
import {readMediaDocument} from './read-media-document'
import {tokenizeSource} from './tokenize-source'
import {tokenizeSyntax} from './tokenize-syntax'

const plainLines = (source: string): CodeToken[][] => {
  let offset = 0
  return source.split(/\r\n|\n|\r/u).map((text) => {
    const token: CodeToken = {kind: 'plain', navigation: null, offset, text}
    offset +=
      text.length +
      (source.slice(offset + text.length, offset + text.length + 2) === '\r\n' ? 2 : 1)
    return [token]
  })
}
export const readDocument = (
  root: string,
  path: string,
  line = 1,
  column = 1,
): Result<CodeDocument> => {
  const resolved = resolveFile(root, path)
  if (!resolved.ok) {
    return resolved
  }
  const location = {column: 1, line: 1, path: relative(root, resolved.value)}
  const format = fileFormat(resolved.value)
  if (format !== undefined && 'mimeType' in format) {
    return readMediaDocument({column, line, path, root})
  }
  const source = readSource(root, path)
  if (!source.ok) {
    return source
  }
  const lines =
    format?.kind === 'syntax'
      ? tokenizeSyntax(format.language, source.value)
      : format?.kind === 'code'
        ? tokenizeSource(path, source.value)
        : plainLines(source.value)
  return success({
    lines,
    location: {...location, column, line: Math.min(Math.max(1, line), lines.length)},
    revision: createHash('sha256').update(source.value).digest('hex'),
    source: source.value,
  })
}
