import {relative} from 'node:path'
import {type CodeDocument, type Result, success} from '../shared/contracts'
import {fileFormat} from '../shared/file-formats'
import {readSource, resolveFile} from './file-access'
import {readMediaDocument} from './read-media-document'
import {createSourceDocument} from './create-source-document'
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
  return success(createSourceDocument({column, line, path: location.path, source: source.value}))
}
