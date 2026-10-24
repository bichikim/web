declare const readTheme: () => string

/** Falls back to the system theme when preference storage is unavailable. */
export const resolveTheme = (): string => {
  try {
    return readTheme()
  } catch {
    return 'system'
  }
}
