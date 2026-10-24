interface CacheError extends Error {
  readonly status: number
}

declare const requestCacheEntry: () => Promise<string>

const notFoundStatus = 404

/** Returns undefined when the cache entry is not found and preserves cache failures. */
export const findCacheEntry = async (): Promise<string | undefined> => {
  try {
    return await requestCacheEntry()
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'status' in error &&
      (error as CacheError).status === notFoundStatus
    ) {
      return undefined
    }
    throw error
  }
}
