import {createHash} from 'node:crypto'
import type {CodeDocument} from '../shared/contracts'
import {MAX_CODE_BYTES} from '../shared/editing-limits'
import {fileFormat} from '../shared/file-formats'
import {tokenizeDocument} from './tokenize-document'
import {tokenizeSyntax} from './tokenize-syntax'

interface SourceDocumentOptions {
  readonly path: string
  readonly source: string
  readonly line?: number
  readonly column?: number
}

/** Builds highlighted small documents or readonly source for viewport rendering. */
export const createSourceDocument = ({
  path,
  source,
  line = 1,
  column = 1,
}: SourceDocumentOptions): CodeDocument => {
  const readOnly = Buffer.byteLength(source, 'utf8') > MAX_CODE_BYTES
  const format = fileFormat(path)
  const lines = readOnly
    ? []
    : format !== undefined && 'mimeType' in format && format.mimeType === 'image/svg+xml'
      ? tokenizeSyntax('html', source)
      : tokenizeDocument(path, source)
  const lineCount = readOnly
    ? source.matchAll(/\r\n|\n|\r/gu).reduce((count) => count + 1, 1)
    : lines.length
  return {
    lines,
    ...(readOnly ? {lineCount, readOnly: true} : {}),
    location: {column, line: Math.min(Math.max(1, line), lineCount), path},
    revision: createHash('sha256').update(source).digest('hex'),
    source,
  }
}
