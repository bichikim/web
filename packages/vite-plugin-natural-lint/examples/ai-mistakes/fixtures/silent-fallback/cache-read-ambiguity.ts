declare const readCache: () => Promise<string>

export const findCachedValue = async (): Promise<string | undefined> => {
  try {
    return await readCache()
  } catch (error: unknown) {
    if (error instanceof Error) {
      return undefined
    }
    throw error
  }
}
