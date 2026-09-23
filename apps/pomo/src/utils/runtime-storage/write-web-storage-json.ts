/** Writes JSON to best-effort browser storage and returns the platform error on failure. */
export const writeWebStorageJson = (key: string, value: unknown): unknown | null => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return null
  } catch (error: unknown) {
    return error
  }
}
