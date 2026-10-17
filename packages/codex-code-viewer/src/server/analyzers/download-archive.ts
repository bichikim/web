const MAX_ARCHIVE_BYTES = 67108864
const DOWNLOAD_TIMEOUT_MS = 60000

/** 크기 상한과 제한 시간 안에 분석기 압축 파일을 내려받는다. */
export const downloadArchive = async (url: string): Promise<Uint8Array> => {
  const response = await fetch(url, {signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS)})
  if (!response.ok || response.body === null) {
    throw new Error(`Cannot download analyzer: ${response.status}`)
  }
  const chunks: Uint8Array[] = []
  let size = 0
  for await (const chunk of response.body) {
    size += chunk.byteLength
    if (size > MAX_ARCHIVE_BYTES) {
      throw new Error('Analyzer archive exceeds the download size limit')
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks, size)
}
