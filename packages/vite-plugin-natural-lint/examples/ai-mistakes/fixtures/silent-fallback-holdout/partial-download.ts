interface PartialDownload {
  readonly url: string
}

declare const readPartialDownload: (url: string) => Promise<PartialDownload>

/** Returns null only when no partial download exists for the URL. */
export const findPartialDownload = async (url: string): Promise<PartialDownload | null> => {
  try {
    return await readPartialDownload(url)
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      return null
    }
    throw error
  }
}
