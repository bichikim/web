export const parsePreferences = (source: string): object => {
  try {
    return JSON.parse(source) as object
  } catch {
    return {}
  }
}
