import {createHash} from 'node:crypto'
import {relative} from 'node:path'
import {type CodeDocument, type Result, success} from '../shared/contracts'
import {fileFormat} from '../shared/file-formats'
import {readSource, resolveFile} from './file-access'
import {readMediaDocument} from './read-media-document'
import {tokenizeDocument} from './tokenize-document'
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
  const lines = tokenizeDocument(resolved.value, source.value)
  return success({
    lines,
    location: {...location, column, line: Math.min(Math.max(1, line), lines.length)},
    revision: createHash('sha256').update(source.value).digest('hex'),
    source: source.value,
  })
}
