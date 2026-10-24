interface SearchError extends Error {
  readonly code: string
}

declare const requestSearch: () => Promise<ReadonlyArray<string>>

export const searchOrEmpty = async (): Promise<ReadonlyArray<string>> => {
  try {
    return await requestSearch()
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as SearchError).code === 'TIMEOUT') {
      return []
    }
    throw error
  }
}
