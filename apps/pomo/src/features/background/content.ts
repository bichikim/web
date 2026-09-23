import type {BackgroundMedia} from './model'

const HEX_RADIX = 16

/** Computes a content identity independently of the file name and MIME label. */
export const hashMedia = async (blob: Blob): Promise<string> => {
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result)
      } else {
        reject(new Error('Unable to read media bytes.'))
      }
    }
    reader.readAsArrayBuffer(blob)
  })
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(HEX_RADIX).padStart(2, '0'),
  ).join('')
}

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
