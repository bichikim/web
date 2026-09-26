import {readBlobAsArrayBuffer} from 'src/utils/read-blob-as-array-buffer'
import {sha256Hex} from 'src/utils/sha256-hex'
import type {BackgroundMedia} from './model'

/** Computes a content identity independently of the file name and MIME label. */
export const hashMedia = async (blob: Blob): Promise<string> =>
  sha256Hex(await readBlobAsArrayBuffer(blob))

export interface DuplicateOptions {
  readonly hash: string
  readonly size: number
  readonly items: readonly BackgroundMedia[]
  readonly load: (id: string) => Promise<Blob>
}

/** Checks stored hashes and reads matching-size legacy files when their hash is absent. */
export const containsMedia = async (options: DuplicateOptions): Promise<boolean> => {
  for (const item of options.items) {
    if (item.size === options.size) {
      // Compare legacy candidates sequentially to avoid decoding many large files at once.
      // eslint-disable-next-line no-await-in-loop
      const hash = item.contentHash ?? (await hashMedia(await options.load(item.id)))
      if (hash === options.hash) {
        return true
      }
    }
  }
  return false
}
