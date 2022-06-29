export const parseJson = (value: string, defaultValue: any = null) => {
  // eslint-disable-next-line functional/no-try-statement
  try {
    return JSON.parse(value)
  } catch {
    return defaultValue
  }
}

export const stringifyJson = (value: any) => {
  // eslint-disable-next-line functional/no-try-statement
  try {
    return JSON.stringify(value)
  } catch {
    return '""'
  }
}
