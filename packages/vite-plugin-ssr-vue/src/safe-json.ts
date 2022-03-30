export const parseJson = <T = any>(value: string, defaultValue: T): T => {
  // eslint-disable-next-line functional/no-try-statement
  try {
    return JSON.parse(value)
  } catch {
    return defaultValue
  }
}

export const stringifyJson = <T>(value: T, defaultValue: string = '""'): string => {
  // eslint-disable-next-line functional/no-try-statement
  try {
    return JSON.stringify(value)
  } catch {
    return defaultValue
  }
}
