interface LoadSpeechAssetOptions<Value> {
  /** 영속 모델 캐시를 열며 접근 실패는 다운로드를 막지 않는다. */
  readonly openCache: () => Promise<Pick<Cache, 'match' | 'put' | 'delete'>>
  /** 검증할 모델 원본을 요청한다. */
  readonly fetch: typeof fetch
  /** Absolute model asset URL, also used as the persistent cache key. */
  readonly url: string
  /** Consume and validate the response before its bytes may be persisted. */
  readonly parse: (response: Response) => Promise<Value>
}

export const SPEECH_ASSET_CACHE = 'wallpaper-speech-v1'

export const loadSpeechAsset = async <Value>(
  options: LoadSpeechAssetOptions<Value>,
): Promise<Value> => {
  let cache: Pick<Cache, 'match' | 'put' | 'delete'> | null = null
  let cached: Response | undefined
  try {
    cache = await options.openCache()
    cached = await cache.match(options.url)
  } catch (cause) {
    console.warn('Speech cache read failed', cause)
  }
  if (cached !== undefined) {
    try {
      return await options.parse(cached)
    } catch (cause) {
      console.warn('Invalid cached speech asset', cause)
      await cache?.delete(options.url).catch((error: unknown) => {
        console.warn('Speech cache removal failed', error)
      })
    }
  }
  const response = await options.fetch(options.url)
  if (!response.ok) {
    throw new Error(`Speech model download failed (${response.status})`)
  }
  const stored = response.clone()
  const value = await options.parse(response)
  await cache?.put(options.url, stored).catch((cause: unknown) => {
    console.warn('Speech cache write failed', cause)
  })
  return value
}
