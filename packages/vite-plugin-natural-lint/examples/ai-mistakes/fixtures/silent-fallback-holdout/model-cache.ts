interface ModelCache {
  readonly bytes: Uint8Array
}

declare const readCachedModel: () => Promise<ModelCache>

export const loadCachedModel = async (): Promise<ModelCache | null> => {
  try {
    return await readCachedModel()
  } catch (error: unknown) {
    console.warn('Cached model could not be read.', error)
    return null
  }
}
