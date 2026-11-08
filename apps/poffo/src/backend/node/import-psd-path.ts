import {readFile, stat} from 'node:fs/promises'
import {basename} from 'node:path'
import {
  type ImportPsdResult,
  importPsdSource,
  initializePsdPixels,
} from '@winter-love/puppet/converter'
import {encodePsdTexture} from './encode-psd-texture'

/** Reads a local PSD without modifying it. Each call owns its read and preserves the cancellation reason. */
export const importPsdPath = async (
  path: string,
  signal?: AbortSignal,
): Promise<ImportPsdResult> => {
  signal?.throwIfAborted()
  let size: number
  try {
    const metadata = await stat(path)
    if (!metadata.isFile()) {
      return {error: {code: 'invalid-file'}, ok: false}
    }
    ;({size} = metadata)
  } catch {
    signal?.throwIfAborted()
    return {error: {code: 'read-failed'}, ok: false}
  }
  signal?.throwIfAborted()
  initializePsdPixels()
  return importPsdSource({
    encodeTexture: encodePsdTexture,
    signal,
    source: {
      name: basename(path),
      read: (signal) => readFile(path, {signal}),
      size,
    },
  })
}
