const MAX_ARCHIVE_BYTES = 67108864
const DOWNLOAD_TIMEOUT_MS = 60000

/** Downloads a bounded analyzer archive, rejecting incomplete or unsuccessful responses. */
export const downloadArchive = async (url: string): Promise<Uint8Array> => {
  const response = await fetch(url, {signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS)})
  if (!response.ok || response.body === null) {
    throw new Error(`Cannot download Rust analyzer: ${response.status}`)
  }
  const chunks: Uint8Array[] = []
  let size = 0
  for await (const chunk of response.body) {
    size += chunk.byteLength
    if (size > MAX_ARCHIVE_BYTES) {
      throw new Error('Rust analyzer archive exceeds the download size limit')
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks, size)
}
