import {relative} from 'node:path'
import {type CodeDocument, type Result, success} from '../shared/contracts'
import {readSource} from './file-access'
import {readMediaInfo} from './read-media-info'
import {createSourceDocument} from './create-source-document'

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
    return source.error.code === 'text-too-large' ? success(document) : source
  }
  return success({
    ...document,
    ...createSourceDocument({
      column: options.column,
      line: options.line,
      path: document.location.path,
      source: source.value,
    }),
    revision: document.revision,
  })
}
