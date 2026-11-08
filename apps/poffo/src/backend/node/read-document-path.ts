import {readFile, stat} from 'node:fs/promises'
import {basename} from 'node:path'
import {initializePsdPixels} from '@winter-love/puppet/converter'
import {type DocumentReadResult, readDocumentSource} from '../read-document-source'
import {encodePsdTexture} from './encode-psd-texture'

/** Reads a path into the common parser without changing the source file. */
export const readDocumentPath = async (
  path: string,
  signal?: AbortSignal,
): Promise<DocumentReadResult> => {
  signal?.throwIfAborted()
  try {
    const metadata = await stat(path)
    if (!metadata.isFile()) {
      return {error: {code: 'invalid-file'}, ok: false}
    }
    initializePsdPixels()
    return await readDocumentSource({
      encodeTexture: encodePsdTexture,
      signal,
      source: {
        name: basename(path),
        read: (signal) => readFile(path, {signal}),
        size: metadata.size,
      },
    })
  } catch {
    signal?.throwIfAborted()
    return {error: {code: 'read-failed'}, ok: false}
  }
}
