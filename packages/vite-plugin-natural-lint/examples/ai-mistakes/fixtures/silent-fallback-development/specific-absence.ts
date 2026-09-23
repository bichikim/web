declare const openSavedReport: () => Promise<string>

/** Returns null only when no saved report exists. */
export const findSavedReport = async (): Promise<string | null> => {
  try {
    return await openSavedReport()
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      return null
    }
    throw error
  }
}
