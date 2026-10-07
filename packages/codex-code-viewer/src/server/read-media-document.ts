import {relative} from 'node:path'
import {type CodeDocument, type Result, success} from '../shared/contracts'
import {readSource} from './file-access'
import {readMediaInfo} from './read-media-info'
import {tokenizeSyntax} from './tokenize-syntax'

interface MediaDocumentOptions {
  readonly root: string
  readonly path: string
  readonly line: number
  readonly column: number
}

/** Describes media and includes highlighted SVG source within the text size limit. */
export const readMediaDocument = (options: MediaDocumentOptions): Result<CodeDocument> => {
  const info = readMediaInfo(options.root, options.path)
  if (!info.ok) {
    return info
  }
  const document: CodeDocument = {
    lines: [[]],
    location: {column: 1, line: 1, path: relative(options.root, info.value.path)},
    media: info.value.media,
    revision: info.value.revision,
    source: '',
  }
  if (info.value.media.mimeType !== 'image/svg+xml') {
    return success(document)
  }
  const source = readSource(options.root, options.path)
  if (!source.ok) {
    return source.error.code === 'too-large' ? success(document) : source
  }
  const lines = tokenizeSyntax('html', source.value)
  return success({
    ...document,
    lines,
    location: {
      ...document.location,
      column: options.column,
      line: Math.min(Math.max(1, options.line), lines.length),
    },
    source: source.value,
  })
}
