export const parseJson = <T = any>(value: string, defaultValue: T): T => {
  try {
    return JSON.parse(value)
  } catch {
    return defaultValue
  }
}

export const stringifyJson = <T>(value: T, defaultValue: string = '""'): string => {
  try {
    return JSON.stringify(value)
  } catch {
    return defaultValue
  }
}
