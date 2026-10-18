import {MAX_TEXT_BYTES} from '../shared/reading-limits'
import {statSync} from 'node:fs'
import {relative} from 'node:path'
import {type CodeDocument, failure, type Result, success} from '../shared/contracts'
import {createBoundedCache} from '../shared/create-bounded-cache'
import {resolveFile} from './file-access'
import {fileRevision} from './file-revision'
import {readDocument} from './read-document'
import {hasDocumentSource} from '../shared/has-document-source'

export interface DocumentReader {
  dispose(): void
  read(path: string, line?: number, column?: number): Result<CodeDocument>
}
interface CachedDocument {
  readonly document: CodeDocument
  readonly revision: string
}

/** Reads current files with separate bounded caches for highlighted documents and readonly source. */
export const createDocumentReader = (root: string): DocumentReader => {
  const highlighted = createBoundedCache<CachedDocument>({
    maxEntries: 8,
    maxWeight: 250000,
    weight: (value) => value.document.lines.reduce((total, line) => total + line.length + 1, 0),
  })
  const sources = createBoundedCache<CachedDocument>({
    maxEntries: 2,
    maxWeight: MAX_TEXT_BYTES,
    weight: (value) => Buffer.byteLength(value.document.source, 'utf8'),
  })
  const cache = {
    clear: (): void => {
      highlighted.clear()
      sources.clear()
    },
    delete: (path: string): void => {
      highlighted.delete(path)
      sources.delete(path)
    },
    get: (path: string) => highlighted.get(path) ?? sources.get(path),
    set: (path: string, value: CachedDocument): void => {
      ;(value.document.readOnly === true ? sources : highlighted).set(path, value)
    },
  }
  const read = (path: string, line = 1, column = 1): Result<CodeDocument> => {
    const resolved = resolveFile(root, path)
    if (!resolved.ok) {
      return resolved
    }
    try {
      const revision = fileRevision(statSync(resolved.value, {bigint: true}))
      let entry = cache.get(resolved.value)
      if (entry === undefined || entry.revision !== revision) {
        cache.delete(resolved.value)
        const result = readDocument(root, resolved.value)
        if (!result.ok) {
          return result
        }
        entry = {document: result.value, revision}
        if (fileRevision(statSync(resolved.value, {bigint: true})) === revision) {
          cache.set(resolved.value, entry)
        }
      }
      return success({
        ...entry.document,
        location: {
          column: hasDocumentSource(entry.document) ? column : 1,
          line: hasDocumentSource(entry.document)
            ? Math.min(Math.max(1, line), entry.document.lineCount ?? entry.document.lines.length)
            : 1,
          path: relative(root, resolved.value),
        },
      })
    } catch {
      cache.delete(resolved.value)
      return failure('read-failed')
    }
  }
  return {dispose: cache.clear, read}
}
